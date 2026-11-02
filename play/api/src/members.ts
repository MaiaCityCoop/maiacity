// Maia City's members (play/SPEC.md §1, §3): everyone who signs up is a traveler; an admin's invite makes a citizen
// (for the coming game); admins are the coop's owners. An admin changes levels, and Maia City always keeps one admin.
import { randomBytes } from "node:crypto";
import type { Db, Queryable } from "./pg";
import { COOP, Denied, must, type Level, type Me } from "./access";
import { cleanName } from "./auth";

export class MemberError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const LEVELS: Level[] = ["admin", "citizen", "traveler"];
const INVITE_DAYS = 14;

export async function listMembers(db: Queryable, me: Me | null) {
  must(me, "manage", "members");
  const { rows } = await db.query<any>(
    `SELECT h.id, h.name, h.founder_number, m.level, m.granted_at, g.name AS granted_by
       FROM play.memberships m JOIN play.humans h ON h.id = m.human_id LEFT JOIN play.humans g ON g.id = m.granted_by
      WHERE m.coop_id = $1 ORDER BY array_position(ARRAY['admin','citizen','traveler'], m.level), h.name`,
    [COOP],
  );
  return rows;
}

export async function setLevel(db: Db, me: Me | null, humanId: string, level: string) {
  const admin = must(me, "manage", "members");
  if (!LEVELS.includes(level as Level)) throw new MemberError(`${level} is not a level.`);
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<{ level: Level }>(`SELECT level FROM play.memberships WHERE coop_id = $1 AND human_id = $2 FOR UPDATE`, [COOP, humanId]);
    if (!rows[0]) throw new MemberError("That human is not a member of Maia City.", 404);
    if (rows[0].level === "admin" && level !== "admin") {
      const { rows: n } = await tx.query<{ n: string }>(`SELECT count(*) AS n FROM play.memberships WHERE coop_id = $1 AND level = 'admin'`, [COOP]);
      if (Number(n[0].n) <= 1) throw new MemberError("Maia City needs at least one admin.", 409);
    }
    await tx.query(`UPDATE play.memberships SET level = $3, granted_by = $4, granted_at = now() WHERE coop_id = $1 AND human_id = $2`, [COOP, humanId, level, admin.id]);
    return { human: humanId, level };
  });
}

/** An admin renames a member: the same rule for a name as at sign-up (./auth.ts cleanName, two characters at least). */
export async function renameMember(db: Queryable, me: Me | null, humanId: string, name: unknown) {
  must(me, "manage", "members");
  const clean = cleanName(name);
  if (clean.length < 2) throw new MemberError("Please give a name with at least two characters.");
  const { rows } = await db.query<{ id: string }>(
    `UPDATE play.humans h SET name = $3 FROM play.memberships m
      WHERE h.id = $2 AND m.human_id = h.id AND m.coop_id = $1 RETURNING h.id`,
    [COOP, humanId, clean],
  );
  if (!rows[0]) throw new MemberError("That human is not a member of Maia City.", 404);
  return { human: humanId, name: clean };
}

/**
 * An admin removes a member: the human goes, with their passkeys and membership. Not oneself, never Maia City's last
 * admin, and not anyone in an asset version's history (its author or who accepted it): versions are frozen, so their
 * name stays on them; change their level instead.
 */
export async function removeMember(db: Db, me: Me | null, humanId: string) {
  const admin = must(me, "manage", "members");
  if (humanId === admin.id) throw new MemberError("You can't remove yourself.", 409);
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<{ level: Level; name: string }>(
      `SELECT m.level, h.name FROM play.memberships m JOIN play.humans h ON h.id = m.human_id
        WHERE m.coop_id = $1 AND m.human_id = $2 FOR UPDATE`,
      [COOP, humanId],
    );
    if (!rows[0]) throw new MemberError("That human is not a member of Maia City.", 404);
    if (rows[0].level === "admin") {
      const { rows: n } = await tx.query<{ n: string }>(`SELECT count(*) AS n FROM play.memberships WHERE coop_id = $1 AND level = 'admin'`, [COOP]);
      if (Number(n[0].n) <= 1) throw new MemberError("Maia City needs at least one admin.", 409);
    }
    const { rows: kept } = await tx.query<{ n: string }>(
      `SELECT count(*) AS n FROM play.asset_versions WHERE author = $1 OR approved_by = $1`,
      [humanId],
    );
    if (Number(kept[0].n) > 0)
      throw new MemberError(`${rows[0].name || "They"} made or accepted ${kept[0].n} asset version${kept[0].n === "1" ? "" : "s"}, kept as they are: change their level instead.`, 409);
    await tx.query(`DELETE FROM play.humans WHERE id = $1`, [humanId]);
    return { human: humanId, removed: true };
  });
}

export async function makeInvite(db: Queryable, me: Me | null) {
  const admin = must(me, "manage", "invites");
  const code = randomBytes(18).toString("base64url");
  const { rows } = await db.query<{ expires_at: Date }>(
    `INSERT INTO play.invites (code, coop_id, level, made_by, expires_at) VALUES ($1, $2, 'citizen', $3, now() + make_interval(days => $4)) RETURNING expires_at`,
    [code, COOP, admin.id, INVITE_DAYS],
  );
  return { code, level: "citizen", expires: rows[0].expires_at };
}

export async function inviteOpen(db: Queryable, code: string) {
  const { rows } = await db.query(`SELECT 1 FROM play.invites WHERE code = $1 AND used_by IS NULL AND expires_at > now()`, [code]);
  return !!rows[0];
}

/** a signed-in human claims an invite: a traveler becomes a citizen (an admin stays an admin); an invite works once */
export async function claimInvite(db: Db, me: Me | null, code: string) {
  if (!me) throw new Denied("Please sign in first.", 401);
  return db.transaction(async (tx) => {
    const { rows } = await tx.query(
      `UPDATE play.invites SET used_by = $2, used_at = now() WHERE code = $1 AND used_by IS NULL AND expires_at > now() RETURNING made_by`,
      [code, me.id],
    );
    if (!rows[0]) throw new MemberError("This invite is used up or has expired.", 410);
    await tx.query(
      `UPDATE play.memberships SET level = 'citizen', granted_by = $3, granted_at = now(), via_invite = $4
        WHERE coop_id = $1 AND human_id = $2 AND level = 'traveler'`,
      [COOP, me.id, (rows[0] as any).made_by, code],
    );
    return { level: me.level === "admin" ? "admin" : "citizen" };
  });
}

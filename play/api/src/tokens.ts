// A person's access tokens (migration 0007), for an agent working for them over MCP (./mcp.ts): `play_` and 32 random
// bytes, shown once; only its SHA-256 is kept. Admins alone make them for now (Samuel 2026-11-02), and a token opens
// nothing once its owner is no longer an admin, or once it is revoked.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Queryable } from "./kit/pg";
import { admin, Denied, meOf, type Me } from "./access";

const PREFIX = "play_";
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const TOKEN_ADMINS = "Only Maia City's admins may make access tokens, for now.";

/** a new token for `me`, named so they know it again: the token itself is in this answer alone */
export async function makeToken(db: Queryable, me: Me | null, name: unknown) {
  const who = admin(me, TOKEN_ADMINS);
  const clean = `${name ?? ""}`.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!clean) throw new Denied("Name the token (where it is used, say), so you know it again.", 400);
  const token = PREFIX + randomBytes(32).toString("base64url");
  const id = randomUUID();
  await db.query(`INSERT INTO play.api_tokens (id, human_id, name, token_hash) VALUES ($1, $2, $3, $4)`, [id, who.id, clean, sha256(token)]);
  return { id, name: clean, token };
}

/** `me`'s tokens, never the tokens themselves */
export async function listTokens(db: Queryable, me: Me | null) {
  const who = admin(me, TOKEN_ADMINS);
  const { rows } = await db.query(
    `SELECT id, name, created, last_used, revoked_at, avenbox FROM play.api_tokens WHERE human_id = $1 ORDER BY created DESC`,
    [who.id],
  );
  return rows;
}

/** one of `me`'s tokens revoked: it opens nothing from now on */
export async function revokeToken(db: Queryable, me: Me | null, id: string) {
  if (!me) throw new Denied("Please sign in first.", 401);
  const { rows } = await db.query(
    `UPDATE play.api_tokens SET revoked_at = now() WHERE id::text = $1 AND human_id = $2 AND revoked_at IS NULL RETURNING id`,
    [id, me.id],
  );
  if (!rows[0]) throw new Denied("You have no such token, or it is revoked already.", 404);
  return { id, revoked: true };
}

/**
 * One of `me`'s tokens marked as avenBOX's, or no longer (play/SPEC.md §4.12, "Only the box's run is evidence"): the
 * token kept as the repository's secret PLAY_MCP_TOKEN, held only by main's play/avenbox/intent.ts in the GitHub runs
 * of the intents' checks. A code intent's test and measure results are taken from such a token alone.
 */
export async function markAvenbox(db: Queryable, me: Me | null, id: string, avenbox: unknown) {
  const who = admin(me, TOKEN_ADMINS);
  if (typeof avenbox !== "boolean") throw new Denied("avenbox is true or false.", 400);
  const { rows } = await db.query(
    `UPDATE play.api_tokens SET avenbox = $3 WHERE id::text = $1 AND human_id = $2 AND revoked_at IS NULL RETURNING id, name, avenbox`,
    [id, who.id, avenbox],
  );
  if (!rows[0]) throw new Denied("You have no such token, or it is revoked.", 404);
  return rows[0];
}

/** the admin a request's bearer token speaks for, or null: unknown, revoked, or its owner no admin */
export async function adminByToken(db: Queryable, req: Request): Promise<Me | null> {
  const auth = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(play_[A-Za-z0-9_-]{20,})$/.exec(auth.trim());
  if (!m) return null;
  const { rows } = await db.query<{ id: string; human_id: string; avenbox: boolean }>(
    `UPDATE play.api_tokens SET last_used = now() WHERE token_hash = $1 AND revoked_at IS NULL RETURNING id, human_id, avenbox`,
    [sha256(m[1])],
  );
  if (!rows[0]) return null;
  const me = await meOf(db, rows[0].human_id);
  return me && me.level === "admin" ? { ...me, token: rows[0].id, ...(rows[0].avenbox ? { box: true } : {}) } : null;
}

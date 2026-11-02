// What a human may do (play/SPEC.md §1, §3): their level in Maia City, checked against that level's rule as data
// (play.level_rules). Visitors (no session) may do nothing but sign in or up.
import type { Queryable } from "./pg";

export const COOP = "maia-city";
export type Level = "admin" | "citizen" | "traveler";
export type Rule = { read?: string[]; propose?: string[]; decide?: string[]; manage?: string[] };
export type Action = keyof Rule;
export type Me = { id: string; name: string; level: Level; rule: Rule; founder_number: number | null };

export class Denied extends Error {
  constructor(message: string, public status = 403) {
    super(message);
  }
}

/** the human `id` with their level and its rule, or null */
export async function meOf(db: Queryable, id: string | null): Promise<Me | null> {
  if (!id) return null;
  const { rows } = await db.query<Me>(
    `SELECT h.id, h.name, h.founder_number, m.level, r.rule FROM play.humans h
       JOIN play.memberships m ON m.human_id = h.id AND m.coop_id = $2
       JOIN play.level_rules r ON r.coop_id = m.coop_id AND r.level = m.level
      WHERE h.id = $1`,
    [id, COOP],
  );
  return rows[0] ?? null;
}

export const may = (me: Me | null, action: Action, what: string) => {
  const list = me?.rule?.[action] ?? [];
  return list.includes("*") || list.includes(what);
};

/** `me`, if they may do `action` on `what`; else throws: 401 for a visitor, 403 for a human without the right */
export function must(me: Me | null, action: Action, what: string): Me {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (!may(me, action, what)) throw new Denied(`A ${me.level} may not ${action} ${what.replace(/_/g, " ")}.`);
  return me;
}

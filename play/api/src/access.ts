// What a human may do (play/SPEC.md §1, §3): their level in Maia City, checked against that level's rule as data
// (play.level_rules). Visitors (no session) may do nothing but sign in or up.
import type { Queryable } from "./kit/pg";

export { COOP } from "./kit/ids";
import { COOP } from "./kit/ids";
export type Level = "admin" | "citizen" | "traveler";
export type Rule = { read?: string[]; propose?: string[]; decide?: string[]; manage?: string[] };
type Action = keyof Rule;
/** who decided, where a rule did: the rule (its UUID, its label only shown), the rule set's version and the rule's reason */
export type AutoBy = { rule: string; label: string; rules: string; reason: string };
import { HttpError } from "./kit/errors";
/** a human signed in; `token`, the id of the access token they came by, when it is an agent over MCP (./tokens.ts);
 *  `box`, that token is avenBOX's (the GitHub runs of the intents' checks: play/SPEC.md §4.12); `auto`, set only where
 *  a rule decides in this admin's request (./decide.ts autoMove): the rule, written as who decided */
export type Me = { id: string; name: string; level: Level; rule: Rule; founder_number: number | null; token?: string; box?: boolean; auto?: AutoBy };

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
  if (!me) throw new HttpError("Please sign in first.", 401);
  if (!may(me, action, what)) throw new HttpError(`A ${me.level} may not ${action} ${what.replace(/_/g, " ")}.`, 403);
  return me;
}

/** `me`, if they are one of Maia City's admins; else throws: 401 for a visitor, 403 with `why` for anyone else */
export function admin(me: Me | null, why: string): Me {
  if (!me) throw new HttpError("Please sign in first.", 401);
  if (me.level !== "admin") throw new HttpError(why, 403);
  return me;
}

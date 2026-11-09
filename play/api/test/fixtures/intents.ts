// An intent taken to where a test needs it, the way the suites all did it (intent 5884ade4): specified over MCP, its
// spec approved by an admin on the board, its one must passed; and Ship emptied between tests.
import { expect } from "bun:test";
import type { Db } from "../../src/kit/pg";
import type { Answer } from "../kit";

/** a spec of one must, a test whose run passes (`c1`) */
export const spec = (goal: string, scope: string) => ({
  goal,
  nothing_to_reduce: "A test fixture: nothing to reduce.",
  scope,
  checks: [{ check: "It holds", how: "test", by: "true", run: "true" }],
});

/** how a suite's agent and admin reach play: an MCP tool call, and an admin's Approve spec on the board */
export type Hands = { tool: (name: string, args: Record<string, unknown>) => Promise<any>; approve: (id: string) => Promise<Answer | void> };

/**
 * An intent added over MCP (`add` beside its title), specified (`spec`), its spec approved, its must c1 passed
 * (`evidence`): at Proposal. `strict` asserts it was in Build once approved and at Proposal once checked.
 */
export async function readyIntent(h: Hands, title: string, o: { spec: object; add?: Record<string, unknown>; evidence?: string; strict?: boolean }) {
  const i = await h.tool("add_intent", { title, ...o.add });
  await h.tool("specify_intent", { intent: i.id, ...o.spec });
  const approved = await h.approve(i.id);
  if (o.strict) expect(approved?.data.stage).toBe("build");
  const checked = await h.tool("check_intent", { intent: i.id, results: [{ check: "c1", pass: true, evidence: o.evidence ?? "exit 0" }] });
  if (o.strict) expect(checked.stage).toBe("proposal");
  return i.id as string;
}

/** every intent in Ship archived, so the next test's ship is the only one */
export const clearShips = (db: Db) => db.query(`UPDATE play.intents SET stage = 'archived' WHERE stage = 'ship'`);

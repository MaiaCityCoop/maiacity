// An intent one stage back, over MCP, always with its reason (intent 5a78e0b7-c221-4f3f-9148-590727d1e154, Samuel
// 2026-11-07: "the step back to Specify should be exposed via MCP and never be a manual button, to self-serve"). The
// agent that finds its spec unbuildable sends it back itself and specifies it again; the admin's gate stays where it is:
// only Approve spec moves it forward again (./intents.ts decideIntent), so until then no check is recorded for it and
// nothing is proposed for it.
//
//   Build, or Proposal with no work of play's waiting → Specify: its spec kept; its approval and results cleared.
//   Specify → Idea: its spec dropped, its whole text kept with the step in the intent's history.
//
// Refused at Idea, at Proposal while work of play's waits there (it is decided first), and in Ship, Accepted and
// Archived. Each step is kept on the intent (`steps`, migration 0036): when, who (over MCP), from which stage to which,
// its reason, and the spec it dropped; the board shows them under the intent's note.
import type { Me } from "./access";
import type { Queryable } from "./pg";
import { admin, IntentError, intentRow, LINE_MOST, waiting } from "./intents";

/** one step back, as it is kept on the intent */
export type Step = { at: string; by: string | null; human: string; via: "mcp"; from: string; to: string; reason: string; spec?: unknown };

const reasonOf = (v: unknown) => {
  const r = `${v ?? ""}`.replace(/\s+/g, " ").trim();
  if (!r) throw new IntentError("A step back needs its reason: why the intent goes back, in a line.");
  if (r.length > LINE_MOST) throw new IntentError(`A step back's reason is one line, at most ${LINE_MOST} characters.`);
  return r;
};

/** The intent one stage back with its reason, by an admin's agent over MCP (step_back_intent). */
export async function stepBack(db: Queryable, me: Me | null, id: string, reason: unknown) {
  const who = admin(me);
  const why = reasonOf(reason);
  const intent = await intentRow(db, id);
  const refuse = (because: string): never => {
    throw new IntentError(`Intent ${intent.id} is at the ${intent.stage} stage: ${because}.`, 409);
  };
  let to: "specify" | "idea";
  if (intent.stage === "build" || intent.stage === "proposal") {
    if (waiting(intent)) refuse("its work of play's waits for a decision there; it is decided first");
    if (!intent.spec) refuse("it has no spec to go back to");
    to = "specify";
  } else if (intent.stage === "specify") to = "idea";
  else if (intent.stage === "idea") return refuse("it is at the first stage already");
  else return refuse(intent.stage === "ship" ? "it is accepted and on its way to production" : "it is decided already (an admin reopens it)");
  const step: Step = { at: new Date().toISOString(), by: who.name, human: who.id, via: "mcp", from: intent.stage, to, reason: why, ...(to === "idea" ? { spec: intent.spec } : {}) };
  await db.query(
    to === "specify"
      ? `UPDATE play.intents SET stage = 'specify', approved_by = NULL, approved_at = NULL, results = NULL, steps = steps || ($2::text)::jsonb WHERE id = $1`
      : `UPDATE play.intents SET stage = 'idea', spec = NULL, specified_by = NULL, specified_at = NULL, approved_by = NULL, approved_at = NULL, results = NULL,
                steps = steps || ($2::text)::jsonb WHERE id = $1`,
    [intent.id, JSON.stringify([step])],
  );
  return intentRow(db, intent.id);
}

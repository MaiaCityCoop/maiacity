// An intent one stage back over MCP, always with its reason (intent 5a78e0b7, Samuel 2026-11-07: "the step back to
// Specify should be exposed via MCP and never be a manual button, to self-serve"); only Approve spec moves it forward
// again. Build (or Proposal with no work of play's waiting) → Specify, spec kept, approval and results cleared;
// Specify → Idea, spec dropped and kept in the history. Refused at Idea, while work waits at Proposal, and once decided.
// Kept on the intent's `steps` (migration 0036), shown under its note.
import { admin, type Me } from "./access";
import type { Queryable } from "./kit/pg";
import { INTENT_ADMINS, intentRow, waiting, reasonOf, moveBack } from "./intents";
import { HttpError } from "./kit/errors";

/** one step back, as it is kept on the intent */
export type Step = { at: string; by: string | null; human: string; via: "mcp"; from: string; to: string; reason: string; spec?: unknown };

/** The intent one stage back with its reason, by an admin's agent over MCP (step_back_intent). */
export async function stepBack(db: Queryable, me: Me | null, id: string, reason: unknown) {
  const who = admin(me, INTENT_ADMINS);
  const why = reasonOf(reason, "A step back", "why the intent goes back");
  const intent = await intentRow(db, id);
  const refuse = (because: string): never => {
    throw new HttpError(`Intent ${intent.id} is at the ${intent.stage} stage: ${because}.`, 409);
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
  await moveBack(db, intent.id, to, JSON.stringify([step]));
  return intentRow(db, intent.id);
}

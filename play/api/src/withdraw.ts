// A document withdrawn from an intent's work before it is decided, always with its reason (intent ee0a7455, Samuel
// 2026-11-07): by the intent's agent over MCP (withdraw_doc) or an admin on the board (POST /api/intents/<id>/withdraw),
// both through ./held.ts dropDoc (a draft through closeVariant, so the next doc_edit seeds anew from Main). Build stays
// in Build; Proposal goes back to Build, its results kept. Kept on the intent's `steps` (migration 0036). Refused for a
// decided or unbuilt intent, a document it holds no variant of, and anyone but an admin or an admin's agent.
import { admin, type Me } from "./access";
import type { Db } from "./kit/pg";
import { UUID } from "./kit/uuid";
import { INTENT_ADMINS, intentFor, intentRow, reasonOf, moveBack } from "./intents";
import { closeVariant, dropDoc, ownColumns, variantsOf, workOf } from "./held";
import { HttpError } from "./kit/errors";

/** a withdrawal, as it is kept on the intent beside its steps back */
type Withdrawal = { at: string; by: string | null; human: string; via: "mcp" | "site"; from: string; to: string; reason: string; doc: string };

/** Document `doc` (its UUID, or `<kind>:<uuid>`) taken out of intent `id`'s work, with its reason. Gives back the intent. */
export async function withdrawDoc(db: Db, me: Me | null, id: string, doc: unknown, reason: unknown, via: "mcp" | "site") {
  const who = admin(me, INTENT_ADMINS);
  const why = reasonOf(reason, "A withdrawal", "why the document goes");
  const intent = await intentFor(db, who, id);
  const named = `${doc ?? ""}`.trim().toLowerCase();
  await db.transaction(async (tx) => {
    const w = await workOf(tx, intent.id, true);
    if (w.stage !== "build" && w.stage !== "proposal")
      throw new HttpError(`Intent ${intent.id} is at the ${w.stage} stage: a document is withdrawn only while it is in Build or at Proposal.`, 409);
    const held = await variantsOf(tx, intent.id);
    const it = held.find((h) => h.doc_id.toLowerCase() === named || (UUID.test(named) && h.doc_id.split(":")[1]?.toLowerCase() === named));
    // its drafts of that document: open variants of the intent's, never proposed
    const { rows: drafts } = await tx.query<{ id: string; doc_id: string }>(
      `SELECT id, doc_id FROM play.doc_variants WHERE intent_id = $1 AND status = 'open' AND (lower(doc_id) = $2 OR ($3 AND lower(split_part(doc_id, ':', 2)) = $2)) ORDER BY id`,
      [intent.id, named, UUID.test(named)],
    );
    if (!it && !drafts.length)
      throw new HttpError(`Document ${named || "(none named)"} has no open or proposed variant on intent ${intent.id}${held.length ? `: its work holds ${held.map((h) => h.doc_id).join(", ")}` : ""}.`, 409);
    const docId = it?.doc_id ?? drafts[0].doc_id;
    if (it) await dropDoc(tx, who, intent.id, it.doc_id);
    for (const d of drafts) await closeVariant(tx, who, d.doc_id, Number(d.id));
    // none left: the intent names no work of play's any more
    if (!(await variantsOf(tx, intent.id)).length)
      await ownColumns(tx, intent.id);
    const step: Withdrawal = { at: new Date().toISOString(), by: who.name, human: who.id, via, from: w.stage, to: "build", reason: why, doc: docId };
    // at Proposal it goes back to Build, its results kept; nothing is decided by it
    await moveBack(tx, intent.id, "withdrawn", JSON.stringify([step]));
  });
  return intentRow(db, intent.id);
}

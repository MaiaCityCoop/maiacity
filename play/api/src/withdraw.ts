// A document withdrawn from an intent's work before it is decided (intent ee0a7455-c34d-40bf-ac8f-c9a186dfe280,
// Samuel 2026-11-07): one document proposed by mistake, taken out by the intent's own agent over MCP (withdraw_doc) or
// by an admin on the board's review (POST /api/intents/<id>/withdraw), always with its reason. Both go through
// ./held.ts dropDoc, the one way a document leaves an intent's work: its intent variant closed and kept in the history,
// the rest of the work as it was. A draft (the intent's open variant of a document, never proposed) is closed the same
// way, by ./held.ts closeVariant (intent ee0a7455, widened: e03d7a44's drafts seeded below their heads), so the next
// doc_edit of it for the intent seeds a new variant from Main (./versioned.ts variantFor).
//
//   Build: it stays in Build.  Proposal: it goes back to Build, its results kept.
//
// Each withdrawal is kept on the intent beside its steps back (`steps`, migration 0036): when, who, how, from which
// stage to which, the document and its reason. Refused for a decided intent (Ship, Accepted, Archived) or one not yet
// built, a document it holds no open or proposed variant of, and anyone but an admin (or an admin's agent).
import { admin, type Me } from "./access";
import type { Db } from "./kit/pg";
import { UUID } from "./kit/uuid";
import { INTENT_ADMINS, intentRow, LINE_MOST } from "./intents";
import { seesIntent } from "./owners";
import { closeVariant, dropDoc, variantsOf, workOf } from "./held";
import { HttpError } from "./kit/errors";

/** a withdrawal, as it is kept on the intent beside its steps back */
export type Withdrawal = { at: string; by: string | null; human: string; via: "mcp" | "site"; from: string; to: string; reason: string; doc: string };

const reasonOf = (v: unknown) => {
  const r = `${v ?? ""}`.replace(/\s+/g, " ").trim();
  if (!r) throw new HttpError("A withdrawal needs its reason: why the document goes, in a line.");
  if (r.length > LINE_MOST) throw new HttpError(`A withdrawal's reason is one line, at most ${LINE_MOST} characters.`);
  return r;
};

/** Document `doc` (its UUID, or `<kind>:<uuid>`) taken out of intent `id`'s work, with its reason. Gives back the intent. */
export async function withdrawDoc(db: Db, me: Me | null, id: string, doc: unknown, reason: unknown, via: "mcp" | "site") {
  const who = admin(me, INTENT_ADMINS);
  const why = reasonOf(reason);
  const intent = await intentRow(db, id);
  if (!(await seesIntent(db, who, intent.id))) throw new HttpError("There is no such intent.", 404);
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
      await tx.query(`UPDATE play.intents SET work = NULL, asset_id = NULL, base = NULL, version = NULL, story_id = NULL, story_base = NULL, story_version = NULL WHERE id = $1`, [intent.id]);
    const step: Withdrawal = { at: new Date().toISOString(), by: who.name, human: who.id, via, from: w.stage, to: "build", reason: why, doc: docId };
    // at Proposal it goes back to Build, its results kept; nothing is decided by it
    await tx.query(`UPDATE play.intents SET stage = 'build', auto = auto - 'accept', steps = steps || ($2::text)::jsonb WHERE id = $1`, [intent.id, JSON.stringify([step])]);
  });
  return intentRow(db, intent.id);
}

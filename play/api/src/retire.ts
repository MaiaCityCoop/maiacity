// A document retired by an intent (intent 08566782, Samuel 2026-11-07; play/SPEC.md §4.15 "Retire"). The coconut film
// accepted twice was the case: one story the film, the other an identical stray copy, both on Main.
import { admin, type Me } from "./access";
import * as docs from "./docs";
import type { Db, Queryable } from "./kit/pg";
import { INTENT_ADMINS, intentFor, intentRow, putAtProposal, reasonOf } from "./intents";
import { authorOf, docRef, type Ctx } from "./kinds";
import { HttpError } from "./kit/errors";

/** when document `docId` was retired and by which intent, or null while it is not */
export async function retiredOf(q: Queryable, docId: string): Promise<{ at: string; intent: string | null } | null> {
  const { rows } = await q.query<{ retired_at: Date | null; retired_by: string | null }>(`SELECT retired_at, retired_by FROM play.docs WHERE id = $1`, [docId]);
  const r = rows[0];
  return r?.retired_at ? { at: new Date(r.retired_at).toISOString(), intent: r.retired_by } : null;
}

/**
 * Document `doc` (its UUID) proposed retired as intent `id`'s work, with its reason. Refused: no reason, a document
 * never accepted or retired already, an intent not in Build or at Proposal (its gate). Gives back the intent.
 */
export async function retireDoc(ctx: Ctx, me: Me | null, id: string, doc: unknown, reason: unknown, via: "mcp" | "web") {
  const who = admin(me, INTENT_ADMINS);
  const why = reasonOf(reason, "A retire", "why the document goes");
  const intent = await intentFor(ctx.db, who, id);
  await (ctx.db as Db).transaction(async (tx) => {
    const { kind, uuid, docId } = await docRef(tx, ctx, `${doc ?? ""}`.trim().split(":").at(-1), who);
    if (!(await docs.versionsOf(tx, docId)).length) throw new HttpError(`The ${kind.label} ${uuid} has no accepted version: there is nothing on Main to retire (withdraw_doc takes a document out of an intent before its Accept).`, 409);
    if (await retiredOf(tx, docId)) throw new HttpError(`The ${kind.label} ${uuid} is retired already.`, 409);
    const author = authorOf(who, via === "mcp" ? "mcp" : "site");
    const note = `Retires ${kind.label} ${uuid}: ${why}`;
    const v = await docs.variant(tx, docId, { author, note });
    // proposed as it is: a retire changes nothing of its content, so it has no edits
    await tx.query(`UPDATE play.doc_variants SET status = 'proposed', proposed_at = now() WHERE id = $1`, [v.id]);
    await putAtProposal(tx, who, { intent: intent.id, work: { kind: kind.work, doc_id: docId, doc_variant: v.id, retire: why }, note, via });
  });
  return intentRow(ctx.db, intent.id);
}

/** Accepted (in the Accept's transaction): document `docId` retired by intent `intent`, its variant `v` accepted, no new version. */
export async function retireAccepted(tx: Queryable, me: Pick<Me, "id">, intent: string, docId: string, v: number): Promise<string | null> {
  if (await retiredOf(tx, docId)) return `The document ${docId.split(":")[1]} is retired already.`;
  await tx.query(`UPDATE play.docs SET retired_at = now(), retired_by = $2 WHERE id = $1`, [docId, intent]);
  await tx.query(`UPDATE play.doc_variants SET status = 'accepted', decided_by = $2, decided_at = now() WHERE id = $1`, [v, me.id]);
  return null;
}

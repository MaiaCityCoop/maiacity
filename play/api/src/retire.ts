// A document retired by an intent (intent 08566782, Samuel 2026-11-07; play/SPEC.md §4.15 "Retire"): an accepted
// document taken off every list, as an intent's work decided by an admin's Accept, nothing deleted. The coconut film
// accepted twice was the case: one story the film, the other an identical stray copy, both on Main.
//
//   propose: retire_doc over MCP or POST /api/intents/<id>/retire, with its reason. The intent holds an intent variant of
//            the document seeded from Main, with no edits, its refs saying `retire` (the reason): ./work.ts putAtProposal,
//            gated as any work (Build or Proposal, the intent's declared kinds).
//   Accept:  ./versioned.ts decideWork marks the document retired (play.docs retired_at, retired_by: the intent), its
//            variant accepted, Main's content as it was (no new version). Every list leaves it out (./listed.ts).
//   Archive: its variant closed like any other, the document as it was.
//
// Its history stays, read by its UUID (doc_history, doc_at, get_story: `retired` says when and by which intent), and
// nothing that names it by hash changes: its files, its frozen versions, a story linking one of them.
import { admin, type Me } from "./access";
import * as docs from "./docs";
import type { Db, Queryable } from "./kit/pg";
import { INTENT_ADMINS, IntentError, intentRow, LINE_MOST } from "./intents";
import { seesIntent } from "./owners";
import { authorOf } from "./storydocs";
import { docRef, VersionError, type Ctx } from "./versioned";
import { putAtProposal, WorkError } from "./work";

const reasonOf = (v: unknown) => {
  const r = `${v ?? ""}`.replace(/\s+/g, " ").trim();
  if (!r) throw new IntentError("A retire needs its reason: why the document goes, in a line.");
  if (r.length > LINE_MOST) throw new IntentError(`A retire's reason is one line, at most ${LINE_MOST} characters.`);
  return r;
};

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
  const why = reasonOf(reason);
  const intent = await intentRow(ctx.db, id);
  if (!(await seesIntent(ctx.db, who, intent.id))) throw new IntentError("There is no such intent.", 404);
  await (ctx.db as Db).transaction(async (tx) => {
    const { kind, uuid, docId } = await docRef(tx, ctx, `${doc ?? ""}`.trim().split(":").at(-1), who);
    if (!(await docs.versionsOf(tx, docId)).length) throw new VersionError(`The ${kind.label} ${uuid} has no accepted version: there is nothing on Main to retire (withdraw_doc takes a document out of an intent before its Accept).`, 409);
    if (await retiredOf(tx, docId)) throw new VersionError(`The ${kind.label} ${uuid} is retired already.`, 409);
    const author = authorOf(who, via === "mcp" ? "mcp" : "site");
    const note = `Retires ${kind.label} ${uuid}: ${why}`;
    const v = await docs.variant(tx, docId, { author, note });
    // proposed as it is: a retire changes nothing of its content, so it has no edits
    await tx.query(`UPDATE play.doc_variants SET status = 'proposed', proposed_at = now() WHERE id = $1`, [v.id]);
    await putAtProposal(tx, who, { intent: intent.id, work: { kind: kind.work, doc_id: docId, doc_variant: v.id, retire: why }, note, via });
  }).catch((e) => Promise.reject(e instanceof WorkError ? new IntentError(e.message, e.status) : e));
  return intentRow(ctx.db, intent.id);
}

/** Accepted (in the Accept's transaction): document `docId` retired by intent `intent`, its variant `v` accepted, no new version. */
export async function retireAccepted(tx: Queryable, me: Pick<Me, "id">, intent: string, docId: string, v: number): Promise<string | null> {
  if (await retiredOf(tx, docId)) return `The document ${docId.split(":")[1]} is retired already.`;
  await tx.query(`UPDATE play.docs SET retired_at = now(), retired_by = $2 WHERE id = $1`, [docId, intent]);
  await tx.query(`UPDATE play.doc_variants SET status = 'accepted', decided_by = $2, decided_at = now() WHERE id = $1`, [v, me.id]);
  return null;
}

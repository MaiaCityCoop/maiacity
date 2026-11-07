// An intent's work (play/SPEC.md §4.12; Samuel 2026-11-06: "not a proposal belongs to an intent: the intent has a state,
// proposal"). One record, the intent: what it changes is on it (the kind of work; the documents it changes, each by an
// intent variant of its own, play.intent_variants, ./versioned.ts; an asset's or story's frozen version and the one it
// was made on), with what the work says of itself, who proposed it, how and when. Proposal is only a
// stage: its work done and checked, waiting for the decision. To propose is to put an intent at Proposal: the intent
// named (its gate held before, ./intents.ts intentReady) takes the work; no work without an intent (intent 706ed873):
// with none named, nothing is taken. An intent holds all its work (intents 847c5d38 and 7c8986c5, Samuel 2026-11-06/07):
// any number of documents, whatever their kind (an asset's or story's version among them, its refs on its own intent
// variant), each going in beside the others (its variant of that same document replaced), and a pull request beside
// them; they are all accepted in one transaction or archived together, and with code, once its code is live
// (./ship.ts reconcile). Deciding settles it: accepted, or archived (a moved base archives it too; its intent then goes
// back to Build, to be built on the new head).
import type { Me } from "./access";
import { COOP } from "./access";
import * as docs from "./docs";
import type { Queryable } from "./pg";
import { UUID } from "./uuid";
import { decisions, gate, IntentError, type By } from "./intents";
import { SCHEMA } from "./ids";

/** what a piece of work names: its kind ("<kind>_version" of a versioned kind, ./versioned.ts) and its refs (play.intents' work columns, and its document's variant: play.intent_variants) */
export type Work = {
  kind: string;
  doc_id?: string | null; doc_variant?: number | null;
  asset_id?: string; base?: string | null; version?: string;
  story_id?: string; story_base?: string | null; story_version?: string;
};
const REFS = ["asset_id", "base", "version", "story_id", "story_base", "story_version"] as const;

/** the SQL of the status of an intent's (`i`) work: proposed while it waits on the intent, at Proposal or in Ship (its code on its way) or in Build holding a proposed variant (intent 94061718; one archived by itself, its intent back in Build, is not), accepted, else archived */
export const WORK_STATUS = `CASE WHEN i.stage IN ('proposal', 'ship') OR (i.stage = 'build' AND EXISTS (SELECT 1 FROM play.intent_variants wv JOIN play.doc_variants dv ON dv.id = wv.variant_id
  WHERE wv.intent_id = i.id AND dv.status = 'proposed')) THEN 'proposal' WHEN i.stage = 'accepted' THEN 'accepted' ELSE 'archived' END`;

/** the SQL of an intent's (`i`) first document and its variant: its work's own */
export const DOC_OF = `(SELECT iv.doc_id FROM play.intent_variants iv WHERE iv.intent_id = i.id ORDER BY iv.position LIMIT 1)`;
export const VARIANT_OF = `(SELECT iv.variant_id FROM play.intent_variants iv WHERE iv.intent_id = i.id ORDER BY iv.position LIMIT 1)`;

/**
 * An intent's work as what decides it reads it: its refs (its first document and variant, and every one it holds), and
 * (named as the work's) its kind, note, who proposed it, how and when, and its status, which is the intent's stage
 * (waiting at Proposal, accepted, else archived).
 */
export const WORK_OF = `i.id, i.coop_id, i.work AS kind, ${DOC_OF} AS doc_id, ${VARIANT_OF} AS doc_variant,
  COALESCE((SELECT json_agg(json_build_object('doc_id', iv.doc_id, 'doc_variant', iv.variant_id, 'refs', to_jsonb(iv)->'refs') ORDER BY iv.position) FROM play.intent_variants iv WHERE iv.intent_id = i.id), '[]'::json) AS variants,
  i.asset_id, i.base, i.version, i.story_id, i.story_base, i.story_version,
  COALESCE(i.work_note, '') AS note, i.proposed_by AS author, i.proposed_via AS via, i.proposed_at AS created,
  i.stage, ${WORK_STATUS} AS status, i.pull_request,
  i.decided_by, i.decided_at, i.spec, i.approved_at, i.title AS intent_title`;

/** no work without an intent (play/SPEC.md §4.12): what a propose without one is told */
export const NO_INTENT =
  "No work without an intent: name the intent this is the work of (`intent`, its id), one in Build or at Proposal. add_intent adds one and specify_intent specifies it; once its spec is approved it is in Build.";

export class WorkError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** intent `id`'s work (null: no such intent), locked for its decision where `lock` */
export async function workOf(q: Queryable, id: string, lock = false): Promise<any | null> {
  if (!UUID.test(`${id}`)) return null;
  const { rows } = await q.query<any>(`SELECT ${WORK_OF} FROM play.intents i WHERE i.id = $1 AND i.coop_id = $2${lock ? " FOR UPDATE" : ""}`, [id, COOP]);
  if (rows[0]) rows[0].variants = (rows[0].variants ?? []).map((v: any) => ({ ...(v.refs ?? {}), doc_id: v.doc_id, doc_variant: Number(v.doc_variant) }));
  return rows[0] ?? null;
}

/** The intent an id names (a UUID, lowercase or not), or null where it names none. */
export async function intentIdOf(q: Queryable, id: string): Promise<string | null> {
  const s = `${id ?? ""}`.toLowerCase();
  if (!UUID.test(s)) return null;
  const { rows } = await q.query<{ id: string }>(`SELECT id FROM play.intents WHERE id = $1 AND coop_id = $2`, [s, COOP]);
  return rows[0]?.id ?? null;
}

/** an intent's variants, the first its work's own: each its document and its variant */
export async function variantsOf(q: Queryable, intent: string): Promise<{ doc_id: string; doc_variant: number }[]> {
  const { rows } = await q.query<{ doc_id: string; variant_id: string }>(`SELECT doc_id, variant_id FROM play.intent_variants WHERE intent_id = $1 ORDER BY position`, [intent]);
  return rows.map((r) => ({ doc_id: r.doc_id, doc_variant: Number(r.variant_id) }));
}

/** an intent variant closed (archived) while it is still open or proposed, its edits kept on their own line in the history */
async function closeVariant(q: Queryable, me: Pick<Me, "id"> | null, docId: string, v: number) {
  const { rows } = await q.query<{ status: string }>(`SELECT status FROM play.doc_variants WHERE id = $1`, [v]);
  if (rows[0] && (rows[0].status === "open" || rows[0].status === "proposed"))
    await docs.close(q, docId, v, { author: { human: me?.id ?? null, via: "site" }, status: "archived" });
}

/** the SQL of an intent's (`$1`) own refs, as its first variant keeps them (play.intent_variants' refs) */
const OWN_REFS = `(SELECT jsonb_strip_nulls(jsonb_build_object('kind', w.work, 'asset_id', w.asset_id, 'base', w.base, 'version', w.version,
  'story_id', w.story_id, 'story_base', w.story_base, 'story_version', w.story_version)) FROM play.intents w WHERE w.id = $1 AND w.work IS NOT NULL)`;

/**
 * An intent variant made the intent's work on its document, in place of any it held there before (that one closed),
 * beside every other document it holds; a piece's goes in after any it holds of that piece, its next version (intent
 * 02e3a85f). `refs` is what its version names beyond its document (its kind, an asset's or
 * story's version and the one it was made on); none given, a variant already held keeps its own, and an intent's first
 * takes the intent's own columns (a variant made for work kept from before).
 */
export async function holdVariant(q: Queryable, me: Pick<Me, "id"> | null, intent: string, docId: string, variant: number, refs?: Record<string, unknown>) {
  const given = refs === undefined ? null : JSON.stringify(refs);
  // a piece may be held in several versions, in order (intent 02e3a85f): each variant goes in after the others
  const piece = docId.startsWith("piece:");
  const { rows } = await q.query<{ variant_id: string }>(
    `SELECT variant_id FROM play.intent_variants WHERE intent_id = $1 AND doc_id = $2${piece ? " AND variant_id = $3" : ""}`,
    piece ? [intent, docId, variant] : [intent, docId],
  );
  if (rows[0] && Number(rows[0].variant_id) !== variant) await closeVariant(q, me, docId, Number(rows[0].variant_id));
  if (!rows[0] || Number(rows[0].variant_id) !== variant)
    await q.query(
      `INSERT INTO play.intent_variants (intent_id, doc_id, variant_id, seed, position, refs)
         SELECT $1, $2, v.id, v.seed, COALESCE((SELECT max(position) + 1 FROM play.intent_variants WHERE intent_id = $1), 0),
                COALESCE(($4::text)::jsonb, CASE WHEN NOT EXISTS (SELECT 1 FROM play.intent_variants WHERE intent_id = $1) THEN ${OWN_REFS} END, '{}'::jsonb)
           FROM play.doc_variants v WHERE v.id = $3
       ${piece ? "" : `ON CONFLICT (intent_id, doc_id) WHERE doc_id NOT LIKE 'piece:%' DO UPDATE SET variant_id = EXCLUDED.variant_id, seed = EXCLUDED.seed,
         refs = CASE WHEN $4::text IS NULL THEN play.intent_variants.refs ELSE EXCLUDED.refs END`}`,
      [intent, docId, variant, given],
    );
  else if (given !== null) await q.query(`UPDATE play.intent_variants SET refs = ($4::text)::jsonb WHERE intent_id = $1 AND doc_id = $2 AND variant_id = $3`, [intent, docId, variant, given]);
  await q.query(`UPDATE play.doc_variants SET intent_id = $2 WHERE id = $1`, [variant, intent]);
}

/** every intent variant of a piece of work closed (archived), their edits kept on their own lines in the history */
export async function closeWork(q: Queryable, me: Pick<Me, "id"> | null, w: { id?: string; doc_id?: string | null; doc_variant?: string | number | null }) {
  const held = w.id && UUID.test(w.id) ? await variantsOf(q, w.id) : [];
  if (!held.length && w.doc_id && w.doc_variant != null) held.push({ doc_id: w.doc_id, doc_variant: Number(w.doc_variant) });
  for (const h of held) await closeVariant(q, me, h.doc_id, h.doc_variant);
}

/**
 * Puts work on an intent (in the caller's transaction): intent `intent`, in Build or at Proposal (its gate,
 * ./intents.ts mayMove's work). At Proposal it stays there; in Build it moves to Proposal with it only where every must
 * passes already, else the work waits on it in Build and goes to Proposal with it when its last must passes. No work
 * without an intent: none named, nothing is taken. One way to hold work (intent 7c8986c5): every document goes in
 * beside the others the intent holds, whatever its kind, its version's refs on its own intent variant; proposing a
 * document again replaces only that document's variant. The intent's own columns name its first document's. Gives back its id.
 */
export async function putAtProposal(q: Queryable, who: Me, o: { intent?: string | null; work: Work; note: string; via: "web" | "mcp" }): Promise<string> {
  if (!o.intent) throw new WorkError(NO_INTENT, 400);
  const was = await workOf(q, o.intent, true);
  if (!was) throw new WorkError("There is no such intent.", 404);
  // the kind of work it is (an intent that declares its kinds takes only those): its document's schema
  const schema = o.work.doc_id
    ? (await q.query<{ schema_id: string | null }>(`SELECT schema_id FROM play.docs WHERE id = $1`, [o.work.doc_id])).rows[0]?.schema_id ?? null
    : o.work.story_id ? SCHEMA.story : o.work.asset_id ? SCHEMA.asset : null;
  const no = await gate.mayMove(q, was.id, "work", { schema }).catch((e) => (e instanceof IntentError ? { why: e.message } : Promise.reject(e)));
  if (no) throw new WorkError(no.why, 409);
  if (!o.work.doc_id || o.work.doc_variant == null) throw new WorkError("Work of play's is a document's version: name its document and its intent variant.", 500);
  const id: string = was.id;
  // variants of work decided before (archived, the intent back in Build) are no longer its work
  await q.query(`DELETE FROM play.intent_variants iv USING play.doc_variants v WHERE iv.intent_id = $1 AND v.id = iv.variant_id AND v.status NOT IN ('open', 'proposed')`, [id]);
  const refs: Record<string, unknown> = { kind: o.work.kind };
  for (const k of REFS) if ((o.work as any)[k] != null) refs[k] = (o.work as any)[k];
  await holdVariant(q, who, id, o.work.doc_id, Number(o.work.doc_variant), refs);
  await ownColumns(q, id);
  // in Build, the work waits on the intent until its last must passes (intent 94061718): it then moves to Proposal with
  // all of it (./intents.ts recordChecks); one whose musts pass already moves now
  const moves = !(await gate.mayMove(q, id, "proposal"));
  await q.query(
    `UPDATE play.intents SET work_note = $2, proposed_by = $3, proposed_via = $4, proposed_at = now(), stage = CASE WHEN $5 THEN 'proposal' ELSE stage END, decided_by = NULL, decided_at = NULL, auto = auto - 'accept' WHERE id = $1`,
    [id, o.note, who.id, o.via, moves],
  );
  return id;
}

/** the intent's own work columns (its kind of work and refs) set from its first document's intent variant */
async function ownColumns(q: Queryable, id: string) {
  const first = (await q.query<{ refs: any }>(`SELECT refs FROM play.intent_variants WHERE intent_id = $1 ORDER BY position LIMIT 1`, [id])).rows[0]?.refs;
  if (!first?.kind) return;
  await q.query(`UPDATE play.intents SET work = $2, ${REFS.map((k, i) => `${k} = $${i + 3}`).join(", ")} WHERE id = $1`, [id, first.kind, ...REFS.map((k) => first[k] ?? null)]);
}

/**
 * Document `docId` taken out of intent `intent`'s work (a story folded into another: its work moved to the timeline it
 * is now): its intent variant closed, kept in the history, the intent's own columns naming its first document again.
 */
export async function dropDoc(q: Queryable, me: Pick<Me, "id"> | null, intent: string, docId: string) {
  const { rows } = await q.query<{ variant_id: string }>(`DELETE FROM play.intent_variants WHERE intent_id = $1 AND doc_id = $2 RETURNING variant_id`, [intent, docId]);
  for (const r of rows) await closeVariant(q, me, docId, Number(r.variant_id));
  await ownColumns(q, intent);
}

/** an intent's documents with their refs, the first its work's own: each its document, its variant and what its version names */
export async function heldWith(q: Queryable, intent: string): Promise<({ doc_id: string; doc_variant: number } & Record<string, any>)[]> {
  const { rows } = await q.query<{ doc_id: string; variant_id: string; refs: any }>(`SELECT doc_id, variant_id, refs FROM play.intent_variants WHERE intent_id = $1 ORDER BY position`, [intent]);
  return rows.map((r) => ({ ...(r.refs ?? {}), doc_id: r.doc_id, doc_variant: Number(r.variant_id) }));
}

/** the stage intent `id` is at after its work is put on it: at Proposal, or still in Build, its work waiting on it */
export async function stageAfter(q: Queryable, id: string): Promise<"build" | "proposal"> {
  const { rows } = await q.query<{ stage: string }>(`SELECT stage FROM play.intents WHERE id = $1`, [id]);
  return rows[0]?.stage === "build" ? "build" : "proposal";
}

/**
 * Settles an intent's work (in the decision's transaction): accepted, or archived. Archived by a person (`by`), it ends
 * archived; archived by itself (no `by`: its base moved and it no longer holds there), it goes back to Build (every
 * intent with work has an approved spec), its results cleared, to be built again on the new head. Its stage is what it
 * settled to.
 */
export async function settle(q: Queryable, id: string, outcome: "accepted" | "archived", by: By | null): Promise<string> {
  // accepted: the one decision path (./intents.ts decided), a person's or a rule's
  if (outcome === "accepted") {
    await decisions.decided(q, id, "accept_work", by ?? "");
    return "accepted";
  }
  if (by !== null && typeof by !== "string") throw new WorkError("A rule only accepts: archiving is a person's, or the work's own.", 500);
  const { rows } = await q.query<{ stage: string }>(
    `UPDATE play.intents SET
        stage = CASE WHEN $2 = 'accepted' THEN 'accepted' WHEN $3::text IS NULL THEN 'build' ELSE 'archived' END,
        results = CASE WHEN $2 = 'archived' AND $3::text IS NULL THEN NULL ELSE results END,
        decided_by = CASE WHEN $2 = 'archived' AND $3::text IS NULL THEN NULL ELSE $3 END,
        decided_at = CASE WHEN $2 = 'archived' AND $3::text IS NULL THEN NULL ELSE now() END,
        auto = auto - 'accept'
      WHERE id = $1 RETURNING stage`,
    [id, outcome, by],
  );
  return rows[0]?.stage ?? outcome;
}

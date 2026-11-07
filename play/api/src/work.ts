// An intent's work (play/SPEC.md §4.12; Samuel 2026-11-06: "not a proposal belongs to an intent: the intent has a state,
// proposal"). One record, the intent: what it changes is on it (the kind of work; the documents it changes, each by an
// intent variant of its own, play.intent_variants, ./versioned.ts; an asset's or story's frozen version and the one it
// was made on), with what the work says of itself, who proposed it, how and when. Proposal is only a
// stage: its work done and checked, waiting for the decision. To propose is to put an intent at Proposal: the intent
// named (its gate held before, ./intents.ts intentReady) takes the work; no work without an intent (intent 706ed873):
// with none named, nothing is taken. An intent may change several documents at once (intent 847c5d38, Samuel
// 2026-11-06): a document's version goes in beside what the intent holds (its variant of that same document replaced),
// and they are all accepted in one transaction or archived together; an asset's or story's version (or a kind's that decides its own way)
// is the intent's whole work, in place of what it held. Deciding settles it: accepted, or archived (a moved base
// archives it too; its intent then goes back to Build, to be built on the new head).
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
const JSON_REFS = new Set<string>();

/** the SQL of an intent's (`i`) first document and its variant: its work's own */
export const DOC_OF = `(SELECT iv.doc_id FROM play.intent_variants iv WHERE iv.intent_id = i.id ORDER BY iv.position LIMIT 1)`;
export const VARIANT_OF = `(SELECT iv.variant_id FROM play.intent_variants iv WHERE iv.intent_id = i.id ORDER BY iv.position LIMIT 1)`;

/**
 * An intent's work as what decides it reads it: its refs (its first document and variant, and every one it holds), and
 * (named as the work's) its kind, note, who proposed it, how and when, and its status, which is the intent's stage
 * (waiting at Proposal, accepted, else archived).
 */
export const WORK_OF = `i.id, i.coop_id, i.work AS kind, ${DOC_OF} AS doc_id, ${VARIANT_OF} AS doc_variant,
  COALESCE((SELECT json_agg(json_build_object('doc_id', iv.doc_id, 'doc_variant', iv.variant_id) ORDER BY iv.position) FROM play.intent_variants iv WHERE iv.intent_id = i.id), '[]'::json) AS variants,
  i.asset_id, i.base, i.version, i.story_id, i.story_base, i.story_version,
  COALESCE(i.work_note, '') AS note, i.proposed_by AS author, i.proposed_via AS via, i.proposed_at AS created,
  i.stage, CASE i.stage WHEN 'proposal' THEN 'proposal' WHEN 'accepted' THEN 'accepted' ELSE 'archived' END AS status,
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
  if (rows[0]) rows[0].variants = (rows[0].variants ?? []).map((v: any) => ({ doc_id: v.doc_id, doc_variant: Number(v.doc_variant) }));
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

/** an intent variant made the intent's work on its document, in place of any it held there before (that one closed) */
export async function holdVariant(q: Queryable, me: Pick<Me, "id"> | null, intent: string, docId: string, variant: number) {
  const { rows } = await q.query<{ variant_id: string }>(`SELECT variant_id FROM play.intent_variants WHERE intent_id = $1 AND doc_id = $2`, [intent, docId]);
  if (rows[0] && Number(rows[0].variant_id) !== variant) await closeVariant(q, me, docId, Number(rows[0].variant_id));
  if (!rows[0] || Number(rows[0].variant_id) !== variant)
    await q.query(
      `INSERT INTO play.intent_variants (intent_id, doc_id, variant_id, seed, position)
         SELECT $1, $2, v.id, v.seed, COALESCE((SELECT max(position) + 1 FROM play.intent_variants WHERE intent_id = $1), 0) FROM play.doc_variants v WHERE v.id = $3
       ON CONFLICT (intent_id, doc_id) DO UPDATE SET variant_id = EXCLUDED.variant_id, seed = EXCLUDED.seed`,
      [intent, docId, variant],
    );
  await q.query(`UPDATE play.doc_variants SET intent_id = $2 WHERE id = $1`, [variant, intent]);
}

/** every intent variant of a piece of work closed (archived), their edits kept on their own lines in the history */
export async function closeWork(q: Queryable, me: Pick<Me, "id"> | null, w: { id?: string; doc_id?: string | null; doc_variant?: string | number | null }) {
  const held = w.id && UUID.test(w.id) ? await variantsOf(q, w.id) : [];
  if (!held.length && w.doc_id && w.doc_variant != null) held.push({ doc_id: w.doc_id, doc_variant: Number(w.doc_variant) });
  for (const h of held) await closeVariant(q, me, h.doc_id, h.doc_variant);
}

/**
 * Puts an intent at Proposal with its work (in the caller's transaction): intent `intent`, in Build or at Proposal (its
 * gate, ./intents.ts mayMove's work). No work without an intent: none named, nothing is taken. A document's version
 * alone goes in beside the documents the intent holds; anything else replaces its work. Gives back its id.
 */
export async function putAtProposal(q: Queryable, who: Me, o: { intent?: string | null; work: Work; note: string; via: "web" | "mcp"; whole?: boolean }): Promise<string> {
  const cols = REFS.map((k) => (o.work as any)[k] ?? null).map((v, i) => (JSON_REFS.has(REFS[i]) && v !== null ? JSON.stringify(v) : v));
  const set = REFS.map((k, i) => `${k} = ${JSON_REFS.has(k) ? `($${i + 2}::text)::jsonb` : `$${i + 2}`}`).join(", ");
  const n = REFS.length + 2;
  // (`whole`: a document whose kind decides its own way, a schema's version, is its intent's whole work too)
  const alone = !o.whole && !!o.work.doc_id && REFS.every((k) => (o.work as any)[k] == null);
  if (!o.intent) throw new WorkError(NO_INTENT, 400);
  const was = await workOf(q, o.intent, true);
  if (!was) throw new WorkError("There is no such intent.", 404);
  // the kind of work it is (an intent that declares its kinds takes only those): its document's schema
  const schema = o.work.doc_id
    ? (await q.query<{ schema_id: string | null }>(`SELECT schema_id FROM play.docs WHERE id = $1`, [o.work.doc_id])).rows[0]?.schema_id ?? null
    : o.work.story_id ? SCHEMA.story : o.work.asset_id ? SCHEMA.asset : null;
  const no = await gate.mayMove(q, was.id, "work", { schema }).catch((e) => (e instanceof IntentError ? { why: e.message } : Promise.reject(e)));
  if (no) throw new WorkError(no.why, 409);
  const id: string = was.id;
  // variants of work decided before (archived, the intent back in Build) are no longer its work
  await q.query(`DELETE FROM play.intent_variants iv USING play.doc_variants v WHERE iv.intent_id = $1 AND v.id = iv.variant_id AND v.status NOT IN ('open', 'proposed')`, [id]);
  if (!(alone && was.kind)) {
    // the work it held before is replaced: its intent variants closed (but the one proposed now), kept in the history
    const keep = o.work.doc_variant == null ? null : Number(o.work.doc_variant);
    for (const h of await variantsOf(q, id)) if (h.doc_variant !== keep) await closeVariant(q, who, h.doc_id, h.doc_variant);
    await q.query(`DELETE FROM play.intent_variants WHERE intent_id = $1 AND variant_id IS DISTINCT FROM $2::bigint`, [id, keep]);
    await q.query(`UPDATE play.intents SET work = $${n}, ${set} WHERE id = $1`, [id, ...cols, o.work.kind]);
  }
  await q.query(
    `UPDATE play.intents SET work_note = $2, proposed_by = $3, proposed_via = $4, proposed_at = now(), stage = 'proposal', decided_by = NULL, decided_at = NULL, auto = auto - 'accept' WHERE id = $1`,
    [id, o.note, who.id, o.via],
  );
  if (o.work.doc_id && o.work.doc_variant != null) await holdVariant(q, who, id, o.work.doc_id, Number(o.work.doc_variant));
  return id;
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

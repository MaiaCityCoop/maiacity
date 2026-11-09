// An intent's work (play/SPEC.md §4.12; Samuel 2026-11-06: "not a proposal belongs to an intent: the intent has a state,
// proposal"): the documents it changes (each its intent variant, play.intent_variants), a frozen version and its base,
// and a pull request, all accepted in one transaction or archived together (intents 847c5d38, 7c8986c5, 706ed873).
// This module is the work's SQL; its stage moves (putAtProposal, settle) are ./intents.ts'.
import type { Me } from "./access";
import { COOP } from "./kit/ids";
import * as docs from "./docs";
import type { Queryable } from "./kit/pg";
import { UUID } from "./kit/uuid";
import { gistOf } from "./gist";
import { kindOfDoc } from "./kinds";

/** what a piece of work names: its kind ("<kind>_version" of a versioned kind, ./versioned.ts) and its refs (play.intents' work columns, and its document's variant: play.intent_variants) */
export type Work = {
  kind: string;
  doc_id?: string | null; doc_variant?: number | null;
  asset_id?: string; base?: string | null; version?: string;
  story_id?: string; story_base?: string | null; story_version?: string;
  /** a retire (./retire.ts): its reason; the variant changes nothing, its Accept takes the document off every list */
  retire?: string;
};
export const REFS = ["asset_id", "base", "version", "story_id", "story_base", "story_version"] as const;

/** the SQL of the status of an intent's (`i`) work: proposed while it waits on the intent, at Proposal or in Ship (its code on its way) or in Build holding a proposed variant (intent 94061718; one archived by itself, its intent back in Build, is not), accepted, else archived */
export const WORK_STATUS = `CASE WHEN i.stage IN ('proposal', 'ship') OR (i.stage = 'build' AND EXISTS (SELECT 1 FROM play.intent_variants wv JOIN play.doc_variants dv ON dv.id = wv.variant_id
  WHERE wv.intent_id = i.id AND dv.status = 'proposed')) THEN 'proposal' WHEN i.stage = 'accepted' THEN 'accepted' ELSE 'archived' END`;

/** the SQL of an intent's (`i`) first document and its variant: its work's own */
const DOC_OF = `(SELECT iv.doc_id FROM play.intent_variants iv WHERE iv.intent_id = i.id ORDER BY iv.position LIMIT 1)`;
const VARIANT_OF = `(SELECT iv.variant_id FROM play.intent_variants iv WHERE iv.intent_id = i.id ORDER BY iv.position LIMIT 1)`;

/**
 * An intent's work as what decides it reads it: its refs (its first document and variant, and every one it holds), and
 * (named as the work's) its kind, note, who proposed it, how and when, and its status, which is the intent's stage
 * (waiting at Proposal, accepted, else archived).
 */
export const WORK_OF = `i.id, i.coop_id, i.work AS kind, ${DOC_OF} AS doc_id, ${VARIANT_OF} AS doc_variant,
  COALESCE((SELECT json_agg(json_build_object('doc_id', iv.doc_id, 'doc_variant', iv.variant_id, 'refs', iv.refs) ORDER BY iv.position) FROM play.intent_variants iv WHERE iv.intent_id = i.id), '[]'::json) AS variants,
  ${REFS.map((k) => `i.${k}`).join(", ")},
  COALESCE(i.work_note, '') AS note, i.proposed_by AS author, i.proposed_via AS via, i.proposed_at AS created,
  i.stage, ${WORK_STATUS} AS status, i.pull_request,
  i.decided_by, i.decided_at, i.spec, i.approved_at, i.title AS intent_title`;

/** no work without an intent (play/SPEC.md §4.12): what a propose without one is told */
export const NO_INTENT =
  "No work without an intent: name the intent this is the work of (`intent`, its id), one in Build or at Proposal. add_intent adds one and specify_intent specifies it; once its spec is approved it is in Build.";

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
export async function closeVariant(q: Queryable, me: Pick<Me, "id"> | null, docId: string, v: number) {
  const { rows } = await q.query<{ status: string }>(`SELECT status FROM play.doc_variants WHERE id = $1`, [v]);
  if (rows[0] && (rows[0].status === "open" || rows[0].status === "proposed"))
    await docs.close(q, docId, v, { author: { human: me?.id ?? null, via: "site" }, status: "archived" });
}

/** the SQL of an intent's (`$1`) own refs, as its first variant keeps them (play.intent_variants' refs) */
const OWN_REFS = `(SELECT jsonb_strip_nulls(jsonb_build_object('kind', w.work, ${REFS.map((k) => `'${k}', w.${k}`).join(", ")})) FROM play.intents w WHERE w.id = $1 AND w.work IS NOT NULL)`;

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
  const piece = !!kindOfDoc(docId)?.manyPerIntent;
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
  // its brief made now, so the intent's detail lists it without reading it again (intent 2df30a21, ./gist.ts)
  await gistOf(q, docId, variant);
}

/** every intent variant of a piece of work closed (archived), their edits kept on their own lines in the history */
export async function closeWork(q: Queryable, me: Pick<Me, "id"> | null, w: { id?: string; doc_id?: string | null; doc_variant?: string | number | null }) {
  const held = w.id && UUID.test(w.id) ? await variantsOf(q, w.id) : [];
  if (!held.length && w.doc_id && w.doc_variant != null) held.push({ doc_id: w.doc_id, doc_variant: Number(w.doc_variant) });
  for (const h of held) await closeVariant(q, me, h.doc_id, h.doc_variant);
}

/** the intent's own work columns (its kind of work and refs) set from its first document's intent variant; holding none, all null */
export async function ownColumns(q: Queryable, id: string) {
  const row = (await q.query<{ refs: any }>(`SELECT refs FROM play.intent_variants WHERE intent_id = $1 ORDER BY position LIMIT 1`, [id])).rows[0];
  const first = row ? row.refs : {};
  if (row && !first?.kind) return;
  await q.query(`UPDATE play.intents SET work = $2, ${REFS.map((k, i) => `${k} = $${i + 3}`).join(", ")} WHERE id = $1`, [id, first.kind ?? null, ...REFS.map((k) => first[k] ?? null)]);
}

/**
 * Document `docId` taken out of intent `intent`'s work (a story folded into another: its work moved to the timeline it
 * is now; or withdrawn, proposed by mistake: ./withdraw.ts): its intent variant closed, kept in the history, the intent's own columns naming its first document again.
 */
export async function dropDoc(q: Queryable, me: Pick<Me, "id"> | null, intent: string, docId: string) {
  for (const v of await unhold(q, intent, docId)) await closeVariant(q, me, docId, v);
  await ownColumns(q, intent);
}

/**
 * The one way variants leave an intent's work (intent ee0a7455): those of document `docId`, or, none named, every one
 * decided already (archived or accepted). Gives back the variants taken out.
 */
export async function unhold(q: Queryable, intent: string, docId: string | null): Promise<number[]> {
  const { rows } = await q.query<{ variant_id: string }>(
    `DELETE FROM play.intent_variants iv USING play.doc_variants v WHERE iv.intent_id = $1 AND v.id = iv.variant_id
       AND (CASE WHEN $2::text IS NULL THEN v.status NOT IN ('open', 'proposed') ELSE iv.doc_id = $2 END) RETURNING iv.variant_id`,
    [intent, docId],
  );
  return rows.map((r) => Number(r.variant_id));
}

/** the stage intent `id` is at after its work is put on it: at Proposal, or still in Build, its work waiting on it */
export async function stageAfter(q: Queryable, id: string): Promise<"build" | "proposal"> {
  const { rows } = await q.query<{ stage: string }>(`SELECT stage FROM play.intents WHERE id = $1`, [id]);
  return rows[0]?.stage === "build" ? "build" : "proposal";
}

/** the documents an intent's work holds, each its document, its variant and what its version names (its refs), the first its work's own */
export const heldOf = (p: any): ({ doc_id: string; doc_variant: number | null } & Record<string, any>)[] =>
  p.variants?.length ? p.variants : p.doc_id ? [{ doc_id: p.doc_id, doc_variant: p.doc_variant == null ? null : Number(p.doc_variant) }] : [];

/** the work `p` as one of its documents (`h`) is decided or reviewed by its own kind: its kind of work, its document and variant, its version's refs */
export const asOne = (p: any, h: { doc_id: string; doc_variant: number | null } & Record<string, any>, k: { work: string }) => {
  const out: any = { ...p, kind: k.work, doc_id: h.doc_id, doc_variant: h.doc_variant };
  const isFirst = h.doc_id === (p.variants?.[0]?.doc_id ?? p.doc_id);
  for (const r of REFS) out[r] = h[r] ?? (isFirst ? p[r] : null) ?? null;
  return out;
};

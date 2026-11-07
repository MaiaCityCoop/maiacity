// An intent's work (play/SPEC.md §4.12; Samuel 2026-11-06: "not a proposal belongs to an intent: the intent has a state,
// proposal"). One record, the intent: what it changes is on it (the kind of work, the document it changes and its
// intent variant of that document, ./versioned.ts; an asset's or story's frozen version and the one it was made on; a
// sandbox's change), with what the work says of itself, who proposed it, how and when. Proposal is only a stage: its work done and checked, waiting for
// the decision. To propose is to put an intent at Proposal: the intent named (its gate held before, ./intents.ts
// intentReady) takes the work, any it held before replaced (that one's intent variant closed, kept in the history), or, with no
// intent named, a new intent is made at Proposal, its title what it proposes. Deciding settles it: accepted, or archived
// (a moved base archives it too; one with an approved spec then goes back to Build, to be built on the new head).
import type { Me } from "./access";
import { COOP } from "./access";
import * as docs from "./docs";
import type { Queryable } from "./pg";
import { newId, UUID } from "./uuid";

/** the work an intent holds that is no document's: a sandbox's change, until sandbox layouts are documents too */
export const SANDBOX_WORK = "sandbox_change";

/** what a piece of work names: its kind ("<kind>_version" of a versioned kind, ../versioned.ts, or a sandbox's change) and its refs (play.intents' work columns) */
export type Work = {
  kind: string;
  doc_id?: string | null; doc_variant?: number | null;
  asset_id?: string; base?: string | null; version?: string;
  story_id?: string; story_base?: string | null; story_version?: string;
  sandbox_id?: string; sandbox_base?: string; sandbox_change?: unknown; sandbox_diff?: unknown;
};
const REFS = ["doc_id", "doc_variant", "asset_id", "base", "version", "story_id", "story_base", "story_version", "sandbox_id", "sandbox_base", "sandbox_change", "sandbox_diff"] as const;
const JSON_REFS = new Set(["sandbox_change", "sandbox_diff"]);

/**
 * An intent's work as what decides it reads it: its refs, and (named as the work's) its kind, note, who proposed it, how
 * and when, and its status, which is the intent's stage (waiting at Proposal, accepted, else archived).
 */
export const WORK_OF = `i.id, i.coop_id, i.work AS kind, i.doc_id, i.doc_variant, i.asset_id, i.base, i.version, i.story_id, i.story_base, i.story_version,
  i.sandbox_id, i.sandbox_base, i.sandbox_change, i.sandbox_diff,
  COALESCE(i.work_note, '') AS note, i.proposed_by AS author, i.proposed_via AS via, i.proposed_at AS created,
  i.stage, CASE i.stage WHEN 'proposal' THEN 'proposal' WHEN 'accepted' THEN 'accepted' ELSE 'archived' END AS status,
  i.decided_by, i.decided_at, i.spec, i.approved_at, i.title AS intent_title`;

export class WorkError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** intent `id`'s work (null: no such intent), locked for its decision where `lock` */
export async function workOf(q: Queryable, id: string, lock = false): Promise<any | null> {
  if (!UUID.test(`${id}`)) return null;
  const { rows } = await q.query<any>(`SELECT ${WORK_OF} FROM play.intents i WHERE i.id = $1 AND i.coop_id = $2${lock ? " FOR UPDATE" : ""}`, [id, COOP]);
  return rows[0] ?? null;
}

/** The intent an id names (a UUID, lowercase or not), or null where it names none. */
export async function intentIdOf(q: Queryable, id: string): Promise<string | null> {
  const s = `${id ?? ""}`.toLowerCase();
  if (!UUID.test(s)) return null;
  const { rows } = await q.query<{ id: string }>(`SELECT id FROM play.intents WHERE id = $1 AND coop_id = $2`, [s, COOP]);
  return rows[0]?.id ?? null;
}

/** a piece of work's intent variant closed (archived), its edits kept on their own line in the history */
export async function closeWork(q: Queryable, me: Pick<Me, "id"> | null, w: { doc_id?: string | null; doc_variant?: string | number | null }) {
  if (!w.doc_id || w.doc_variant == null) return;
  const { rows } = await q.query<{ status: string }>(`SELECT status FROM play.doc_variants WHERE id = $1`, [w.doc_variant]);
  if (rows[0] && (rows[0].status === "open" || rows[0].status === "proposed"))
    await docs.close(q, w.doc_id, Number(w.doc_variant), { author: { human: me?.id ?? null, via: "site" }, status: "archived" });
}

// a new intent's title: what its work proposes (an asset's or story's label and the version it would be, a sandbox's
// change), else the title its proposer gives (a document's label)
const TITLED = `UPDATE play.intents i SET title = left(COALESCE(NULLIF(btrim(CASE
    WHEN i.asset_id IS NOT NULL THEN (SELECT a.label || ' v' || COALESCE(v.number, COALESCE(b.number, 0) + 1) FROM play.assets a
                                 LEFT JOIN play.asset_versions v ON v.id = i.version LEFT JOIN play.asset_versions b ON b.id = i.base WHERE a.id = i.asset_id)
    WHEN i.story_id IS NOT NULL THEN (SELECT sv.title || ' v' || COALESCE(sv.number, COALESCE(sb.number, 0) + 1) FROM play.story_versions sv
                                 LEFT JOIN play.story_versions sb ON sb.id = i.story_base WHERE sv.id = i.story_version)
    WHEN i.sandbox_id IS NOT NULL THEN (SELECT sx.title || ': ' || jsonb_array_length(COALESCE(i.sandbox_diff, '[]'::jsonb)) || ' changes' FROM play.sandboxes sx WHERE sx.id = i.sandbox_id)
    ELSE $2 END), ''), 'A proposal'), 200)
  WHERE i.id = $1`;

/**
 * Puts an intent at Proposal with its work (in the caller's transaction): intent `intent` (its gate held by the caller,
 * ./intents.ts intentReady), whose work this replaces, or, with none named, a new intent of its own. Gives back its id.
 */
export async function putAtProposal(q: Queryable, who: Me, o: { intent?: string | null; work: Work; note: string; via: "web" | "mcp"; title?: string }): Promise<string> {
  const cols = REFS.map((k) => (o.work as any)[k] ?? null).map((v, i) => (JSON_REFS.has(REFS[i]) && v !== null ? JSON.stringify(v) : v));
  const set = REFS.map((k, i) => `${k} = ${JSON_REFS.has(k) ? `($${i + 2}::text)::jsonb` : `$${i + 2}`}`).join(", ");
  const n = REFS.length + 2;
  let id: string;
  if (o.intent) {
    const was = await workOf(q, o.intent, true);
    if (!was) throw new WorkError("There is no such intent.", 404);
    if (was.stage !== "build" && was.stage !== "proposal") throw new WorkError(`Intent ${was.id} is at the ${was.stage} stage: it takes no work now.`, 409);
    // work it held before, still waiting, is replaced: its intent variant closed, kept in the history
    if (was.kind && was.stage === "proposal" && `${was.doc_variant}` !== `${o.work.doc_variant ?? null}`) await closeWork(q, who, was);
    id = was.id;
    await q.query(
      `UPDATE play.intents SET work = $${n}, ${set}, work_note = $${n + 1}, proposed_by = $${n + 2}, proposed_via = $${n + 3}, proposed_at = now(),
              stage = 'proposal', decided_by = NULL, decided_at = NULL WHERE id = $1`,
      [id, ...cols, o.work.kind, o.note, who.id, o.via],
    );
  } else {
    id = newId();
    // what it is: a new asset or story is something to make; anything else improves what there is
    const kind = (o.work.asset_id && !o.work.base) || (o.work.story_id && !o.work.story_base) ? "idea" : "improve";
    await q.query(
      `INSERT INTO play.intents (id, coop_id, kind, title, note, stage, author, via, work, ${REFS.join(", ")}, work_note, proposed_by, proposed_via, proposed_at)
       VALUES ($1, $${n + 4}, $${n + 5}, 'A proposal', $${n + 1}, 'proposal', $${n + 2}, $${n + 3}, $${n}, ${REFS.map((k, i) => (JSON_REFS.has(k) ? `($${i + 2}::text)::jsonb` : `$${i + 2}`)).join(", ")}, $${n + 1}, $${n + 2}, $${n + 3}, now())`,
      [id, ...cols, o.work.kind, o.note, who.id, o.via, COOP, kind],
    );
    await q.query(TITLED, [id, o.title ?? null]);
  }
  if (o.work.doc_variant != null) await q.query(`UPDATE play.doc_variants SET intent_id = $2 WHERE id = $1`, [o.work.doc_variant, id]);
  return id;
}

/**
 * Settles an intent's work (in the decision's transaction): accepted, or archived. Archived by a person (`by`), it ends
 * archived; archived by itself (no `by`: its base moved and it no longer holds there), one whose spec was approved goes
 * back to Build, its results cleared, to be built again on the new head. Its stage is what it settled to.
 */
export async function settle(q: Queryable, id: string, outcome: "accepted" | "archived", by: string | null, extra: { sandbox_diff?: unknown } = {}): Promise<string> {
  const diff = extra.sandbox_diff === undefined ? null : JSON.stringify(extra.sandbox_diff);
  const { rows } = await q.query<{ stage: string }>(
    `UPDATE play.intents SET
        stage = CASE WHEN $2 = 'accepted' THEN 'accepted' WHEN $3::text IS NULL AND approved_at IS NOT NULL THEN 'build' ELSE 'archived' END,
        results = CASE WHEN $2 = 'archived' AND $3::text IS NULL AND approved_at IS NOT NULL THEN NULL ELSE results END,
        decided_by = CASE WHEN $2 = 'archived' AND $3::text IS NULL AND approved_at IS NOT NULL THEN NULL ELSE $3 END,
        decided_at = CASE WHEN $2 = 'archived' AND $3::text IS NULL AND approved_at IS NOT NULL THEN NULL ELSE now() END,
        sandbox_diff = COALESCE(($4::text)::jsonb, sandbox_diff)
      WHERE id = $1 RETURNING stage`,
    [id, outcome, by, diff],
  );
  return rows[0]?.stage ?? outcome;
}

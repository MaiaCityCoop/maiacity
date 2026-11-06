// An intent's work (play/SPEC.md §4.12; Samuel 2026-11-06: "not a proposal belongs to an intent: the intent has a state,
// proposal"). One record, the intent: what it changes is on it (the kind of work, the asset, story, sandbox, factory or
// config or skill it changes, the base it was made on, the version it would be, its branch of that one's document), with what the
// work says of itself, who proposed it, how and when. Proposal is only a stage: its work done and checked, waiting for
// the decision. To propose is to put an intent at Proposal: the intent named (its gate held before, ./intents.ts
// intentReady) takes the work, any it held before replaced (that one's branch closed, kept in the history), or, with no
// intent named, a new intent is made at Proposal, its title what it proposes. Deciding settles it: accepted, or archived
// (a moved base archives it too; one with an approved spec then goes back to Build, to be built on the new head).
import type { Me } from "./access";
import { COOP } from "./access";
import * as docs from "./docs";
import type { Queryable } from "./pg";
import { newId, UUID } from "./uuid";

export const WORK_KINDS = ["asset_version", "story_version", "sandbox_change", "factory_version", "game_config_version", "skill_version"] as const;
export type WorkKind = (typeof WORK_KINDS)[number];

/** what a piece of work names: its kind and the refs of that kind (play.intents' work columns) */
export type Work = {
  kind: WorkKind;
  asset_id?: string; base?: string | null; version?: string;
  story_id?: string; story_base?: string | null; story_version?: string;
  sandbox_id?: string; sandbox_base?: string; sandbox_change?: unknown; sandbox_diff?: unknown;
  factory_id?: string; game_config_id?: string; skill_id?: string;
  doc_branch?: number | null;
};
const REFS = ["asset_id", "base", "version", "story_id", "story_base", "story_version", "sandbox_id", "sandbox_base", "sandbox_change", "sandbox_diff", "factory_id", "game_config_id", "skill_id", "doc_branch"] as const;
const JSON_REFS = new Set(["sandbox_change", "sandbox_diff"]);

/**
 * An intent's work as what decides it reads it: its refs, and (named as the work's) its kind, note, who proposed it, how
 * and when, and its status, which is the intent's stage (waiting at Proposal, accepted, else archived).
 */
export const WORK_OF = `i.id, i.coop_id, i.work AS kind, i.asset_id, i.base, i.version, i.story_id, i.story_base, i.story_version,
  i.sandbox_id, i.sandbox_base, i.sandbox_change, i.sandbox_diff, i.factory_id, i.game_config_id, i.skill_id, i.doc_branch,
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

/**
 * The intent an id names now: the intent itself, or the intent an old proposal's id is (play.proposal_ids, migration
 * 0029), so a link made before the two were one still finds it. Null where it names neither.
 */
export async function intentIdOf(q: Queryable, id: string): Promise<string | null> {
  const s = `${id ?? ""}`.toLowerCase();
  if (!UUID.test(s)) return null;
  const { rows } = await q.query<{ id: string }>(
    `SELECT id FROM play.intents WHERE id = $1 AND coop_id = $2
     UNION ALL SELECT intent_id FROM play.proposal_ids WHERE proposal_id = $3 LIMIT 1`,
    [s, COOP, s],
  );
  return rows[0]?.id ?? null;
}

/** the document a piece of work changes, by its kind (a sandbox's change has none) */
export const docIdOfWork = (w: { kind: string | null; asset_id?: string | null; story_id?: string | null; factory_id?: string | null; game_config_id?: string | null; skill_id?: string | null }) =>
  w.kind === "asset_version" ? `asset:${w.asset_id}` : w.kind === "story_version" ? `story:${w.story_id}` : w.kind === "factory_version" ? `factory:${w.factory_id}` : w.kind === "game_config_version" ? `game:${w.game_config_id}` : w.kind === "skill_version" ? `skill:${w.skill_id}` : null;

/** a piece of work's branch closed (archived), its steps kept on their side line in the history */
export async function closeWork(q: Queryable, me: Pick<Me, "id"> | null, w: { kind: string | null; doc_branch?: string | number | null } & Parameters<typeof docIdOfWork>[0]) {
  const docId = docIdOfWork(w);
  if (!docId || w.doc_branch == null) return;
  const { rows } = await q.query<{ status: string }>(`SELECT status FROM play.doc_branches WHERE id = $1`, [w.doc_branch]);
  if (rows[0] && (rows[0].status === "open" || rows[0].status === "proposed"))
    await docs.close(q, docId, Number(w.doc_branch), { author: { human: me?.id ?? null, via: "site" }, status: "archived" });
}

// a new intent's title: what its work proposes (an asset's or story's label and the version it would be, a sandbox's
// change, a factory's, config's or skill's label), as migration 0026 titled the proposals made before
const TITLED = `UPDATE play.intents i SET title = left(COALESCE(NULLIF(btrim(CASE i.work
    WHEN 'asset_version' THEN (SELECT a.label || ' v' || COALESCE(v.number, COALESCE(b.number, 0) + 1) FROM play.assets a
                                 LEFT JOIN play.asset_versions v ON v.id = i.version LEFT JOIN play.asset_versions b ON b.id = i.base WHERE a.id = i.asset_id)
    WHEN 'story_version' THEN (SELECT sv.title || ' v' || COALESCE(sv.number, COALESCE(sb.number, 0) + 1) FROM play.story_versions sv
                                 LEFT JOIN play.story_versions sb ON sb.id = i.story_base WHERE sv.id = i.story_version)
    WHEN 'sandbox_change' THEN (SELECT sx.title || ': ' || jsonb_array_length(COALESCE(i.sandbox_diff, '[]'::jsonb)) || ' changes' FROM play.sandboxes sx WHERE sx.id = i.sandbox_id)
    WHEN 'factory_version' THEN (SELECT fx.label FROM play.factories fx WHERE fx.id = i.factory_id)
    WHEN 'game_config_version' THEN (SELECT gc.label FROM play.game_configs gc WHERE gc.id = i.game_config_id)
    WHEN 'skill_version' THEN (SELECT sk.label FROM play.skills sk WHERE sk.id = i.skill_id) END), ''), 'A proposal'), 200)
  WHERE i.id = $1`;

/**
 * Puts an intent at Proposal with its work (in the caller's transaction): intent `intent` (its gate held by the caller,
 * ./intents.ts intentReady), whose work this replaces, or, with none named, a new intent of its own. Gives back its id.
 */
export async function putAtProposal(q: Queryable, who: Me, o: { intent?: string | null; work: Work; note: string; via: "web" | "mcp" }): Promise<string> {
  const cols = REFS.map((k) => (o.work as any)[k] ?? null).map((v, i) => (JSON_REFS.has(REFS[i]) && v !== null ? JSON.stringify(v) : v));
  const set = REFS.map((k, i) => `${k} = ${JSON_REFS.has(k) ? `($${i + 2}::text)::jsonb` : `$${i + 2}`}`).join(", ");
  const n = REFS.length + 2;
  let id: string;
  if (o.intent) {
    const was = await workOf(q, o.intent, true);
    if (!was) throw new WorkError("There is no such intent.", 404);
    if (was.stage !== "build" && was.stage !== "proposal") throw new WorkError(`Intent ${was.id} is at the ${was.stage} stage: it takes no work now.`, 409);
    // work it held before, still waiting, is replaced: its branch closed, kept in the history
    if (was.kind && was.stage === "proposal" && `${was.doc_branch}` !== `${o.work.doc_branch ?? null}`) await closeWork(q, who, was);
    id = was.id;
    await q.query(
      `UPDATE play.intents SET work = $${n}, ${set}, work_note = $${n + 1}, proposed_by = $${n + 2}, proposed_via = $${n + 3}, proposed_at = now(),
              stage = 'proposal', decided_by = NULL, decided_at = NULL WHERE id = $1`,
      [id, ...cols, o.work.kind, o.note, who.id, o.via],
    );
  } else {
    id = newId();
    // what it is: a new asset or story is something to make; anything else improves what there is
    const kind = (o.work.kind === "asset_version" && !o.work.base) || (o.work.kind === "story_version" && !o.work.story_base) ? "idea" : "improve";
    await q.query(
      `INSERT INTO play.intents (id, coop_id, kind, title, note, stage, author, via, work, ${REFS.join(", ")}, work_note, proposed_by, proposed_via, proposed_at)
       VALUES ($1, $${n + 4}, $${n + 5}, 'A proposal', $${n + 1}, 'proposal', $${n + 2}, $${n + 3}, $${n}, ${REFS.map((k, i) => (JSON_REFS.has(k) ? `($${i + 2}::text)::jsonb` : `$${i + 2}`)).join(", ")}, $${n + 1}, $${n + 2}, $${n + 3}, now())`,
      [id, ...cols, o.work.kind, o.note, who.id, o.via, COOP, kind],
    );
    await q.query(TITLED, [id]);
  }
  if (o.work.doc_branch != null) await q.query(`UPDATE play.doc_branches SET intent_id = $2 WHERE id = $1`, [o.work.doc_branch, id]);
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

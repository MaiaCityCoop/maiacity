// Every story is a Loro document too (play/SPEC.md §4.4, §12, "Version control"): `story:<id>`, holding its title and
// its timeline, every change an edit. The story's versions (play.story_versions, content-addressed, numbered on accept)
// stay what people and pins read, frozen; the document keeps every edit under them: an agent drafts a change edit by
// edit on an intent variant (doc_edit), proposes it (propose_doc_version), and accepting merges it into Main and
// numbers the version, the document's version of the same number. The first time a story is touched here its document
// is made from its history: each accepted version an edit at its own date, named its number; each intent's work
// waiting at Proposal an intent variant seeded at its base.
import type { Me } from "./access";
import type { Db, Queryable } from "./kit/pg";
import * as docs from "./docs";
import { versionAt } from "./kinds";
import { holdVariant } from "./work";
import { SCHEMA } from "./kit/ids";

export type Clip = { id: string; at: number; duration: number; [field: string]: unknown };
export type Track = { id: string; kind: string; gain?: number; mute?: boolean; clips: Clip[] };
export type StoryBody = { schema: string; format: string; fps: number; duration: number; tracks: Track[] };
/** the name a story's document gives its schema (only shown: the schema is named by its UUID, SCHEMA.story) */
export const STORY_SCHEMA = docs.seedType(SCHEMA.story).name;

export const docIdOf = (story: string) => `story:${story}`;
export const asDoc = (title: string, body: StoryBody) => ({ ...body, schema: STORY_SCHEMA, title });
export function asStory(json: any): { title: string; body: StoryBody } {
  const { title, ...body } = json ?? {};
  return { title, body: body as StoryBody };
}
/** a story not accepted yet stands on an empty timeline: its intent's variant fills it */
const BLANK = (title: string) => ({ schema: STORY_SCHEMA, title, format: "9:16", fps: 30, duration: 0, tracks: [] });
export const authorOf = (me: Pick<Me, "id"> | null, via: string | null | undefined): docs.Author => ({ human: me?.id ?? null, via: via === "mcp" ? "mcp" : via === "import" ? "import" : "site" });

type VersionRow = { id: string; number: number; title: string; body: StoryBody; note: string; author: string | null; approved_by: string | null; created: Date };

/** the frontiers of the document's version `number` */
async function frontiersOf(q: Queryable, docId: string, number: number): Promise<docs.Frontiers> {
  const { rows } = await q.query<{ frontiers: docs.Frontiers }>(`SELECT frontiers FROM play.doc_versions WHERE doc_id = $1 AND number = $2`, [docId, number]);
  if (!rows[0]) throw new docs.DocError(`${docId} has no version ${number}`, 500);
  return rows[0].frontiers;
}

/**
 * The story's document, made from the story's history the first time (in the caller's transaction, the story's row
 * locked): every accepted version an edit at its date and named its number, every intent's work at Proposal an intent variant seeded at its base.
 */
export async function ensureStoryDoc(q: Queryable, story: string): Promise<string> {
  const id = docIdOf(story);
  const { rows: s } = await q.query<{ title: string }>(`SELECT title FROM play.stories WHERE id = $1 FOR UPDATE`, [story]);
  if (!s[0]) throw new docs.DocError(`there is no story ${story}`, 404);
  const { rows: have } = await q.query(`SELECT 1 FROM play.docs WHERE id = $1`, [id]);
  if (!have.length) {
    const { rows: vs } = await q.query<VersionRow>(
      `SELECT id, number, title, body, note, author, approved_by, created FROM play.story_versions WHERE story_id = $1 AND number IS NOT NULL ORDER BY number`,
      [story],
    );
    if (!vs.length) await docs.createDoc(q, { id, schema: SCHEMA.story, json: BLANK(s[0].title), author: { human: null, via: "system" }, message: "a new story, not yet accepted" });
    for (const v of vs) {
      const json = asDoc(v.title, v.body), author: docs.Author = { human: v.author, via: "import" };
      if (v.number === 1) await docs.createDoc(q, { id, schema: SCHEMA.story, json, author, message: `v1: ${v.note || "the first version"}`, at: v.created, version: v.note });
      else {
        await docs.commit(q, id, { target: json, message: `v${v.number}: ${v.note || "a new version"}`, author, kind: "import", at: v.created });
        await docs.nameVersion(q, id, { note: v.note, author: { human: v.approved_by, via: "import" }, at: v.created });
      }
    }
  }
  // each intent's work at Proposal made before the document: an intent variant seeded at its base, the proposed timeline its one edit
  const { rows: open } = await q.query<{ id: string; author: string | null; via: string | null; note: string; base_number: number | null; title: string; body: StoryBody; created: Date }>(
    `SELECT i.id, i.proposed_by AS author, i.proposed_via AS via, COALESCE(i.work_note, '') AS note, b.number AS base_number, v.title, v.body, i.proposed_at AS created
       FROM play.intents i JOIN play.story_versions v ON v.id = i.story_version LEFT JOIN play.story_versions b ON b.id = i.story_base
      WHERE i.story_id = $1 AND i.stage = 'proposal' AND NOT EXISTS (SELECT 1 FROM play.intent_variants iv WHERE iv.intent_id = i.id) ORDER BY i.proposed_at`,
    [story],
  );
  for (const p of open) {
    const author = authorOf({ id: p.author ?? "" }, p.via);
    if (!p.author) author.human = null;
    const at = p.base_number ? await frontiersOf(q, id, p.base_number) : undefined;
    const b = await docs.variant(q, id, { author, note: p.note, ...(at ? { at } : {}) });
    await docs.commit(q, id, { variant: b.id, target: asDoc(p.title, p.body), message: p.note || "proposed", author, at: p.created });
    await docs.propose(q, id, b.id, { note: p.note, author });
    await holdVariant(q, null, p.id, id, Number(b.id));
  }
  return id;
}

/** every story's document, made where it is missing (the deploy's import, ../import/stories.ts) */
export async function ensureStoryDocs(db: Db): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT s.id FROM play.stories s WHERE NOT EXISTS (SELECT 1 FROM play.docs d WHERE d.id = 'story:' || s.id)
        OR EXISTS (SELECT 1 FROM play.intents i WHERE i.story_id = s.id AND i.stage = 'proposal' AND NOT EXISTS (SELECT 1 FROM play.intent_variants iv WHERE iv.intent_id = i.id)) ORDER BY s.id`,
  );
  for (const r of rows) await db.transaction((q) => ensureStoryDoc(q, r.id));
  return rows.map((r) => r.id);
}

/** the story's document on Main, or on intent variant `v`, as a title and a timeline */
export async function storyDocAt(q: Queryable, story: string, v?: number): Promise<{ title: string; body: StoryBody }> {
  return asStory((await docs.readDoc(q, docIdOf(story), v === undefined ? {} : { variant: v })).json);
}

/** the story's version number whose point of the document is `frontiers` (a variant's seed), or null */
export async function versionAtFrontiers(q: Queryable, story: string, frontiers: docs.Frontiers): Promise<number | null> {
  return versionAt(await docs.versionsOf(q, docIdOf(story)), frontiers);
}

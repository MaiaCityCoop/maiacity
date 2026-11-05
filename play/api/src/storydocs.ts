// Every story is a Loro document too (play/SPEC.md §4.4, §12): `story:<id>`, holding its title and its timeline, every
// change a step. The story's versions (play.story_versions, content-addressed, numbered on accept) stay what people and
// pins read; the document keeps every step under them: an agent drafts a change step by step on a branch (story_edit),
// proposes the branch as a version, and accepting merges the branch and numbers the version, the document's named
// version of the same number. The first time a story is touched here its document is made from its history: each
// accepted version a step at its own date, named its number; each open proposal a branch at its base.
import type { Me } from "./access";
import type { Db, Queryable } from "./pg";
import * as docs from "./docs";
import { canonical } from "./hash";
import type { StoryBody } from "./stories";

export const docIdOf = (story: string) => `story:${story}`;
export const asDoc = (title: string, body: StoryBody) => ({ ...body, schema: "story/1", title });
export function asStory(json: any): { title: string; body: StoryBody } {
  const { title, ...body } = json ?? {};
  return { title, body: body as StoryBody };
}
/** a story not accepted yet stands on an empty timeline: its proposal is the branch that fills it */
const BLANK = (title: string) => ({ schema: "story/1", title, format: "9:16", fps: 30, duration: 0, tracks: [] });
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
 * locked): every accepted version a step at its date and named its number, every open proposal a branch at its base.
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
    if (!vs.length) await docs.createDoc(q, { id, schema: "story/1", json: BLANK(s[0].title), author: { human: null, via: "system" }, message: "a new story, not yet accepted" });
    for (const v of vs) {
      const json = asDoc(v.title, v.body), author: docs.Author = { human: v.author, via: "import" };
      if (v.number === 1) await docs.createDoc(q, { id, schema: "story/1", json, author, message: `v1: ${v.note || "the first version"}`, at: v.created, version: v.note });
      else {
        await docs.commit(q, id, { target: json, message: `v${v.number}: ${v.note || "a new version"}`, author, kind: "import", at: v.created });
        await docs.nameVersion(q, id, { note: v.note, author: { human: v.approved_by, via: "import" }, at: v.created });
      }
    }
  }
  // each open proposal made before the document: a branch at its base, the proposed timeline its one step
  const { rows: open } = await q.query<{ id: string; author: string | null; via: string | null; note: string; base_number: number | null; title: string; body: StoryBody; created: Date }>(
    `SELECT p.id, p.author, p.via, p.note, b.number AS base_number, v.title, v.body, p.created FROM play.proposals p
       JOIN play.story_versions v ON v.id = p.story_version LEFT JOIN play.story_versions b ON b.id = p.story_base
      WHERE p.story_id = $1 AND p.kind = 'story_version' AND p.status = 'proposed' AND p.doc_branch IS NULL ORDER BY p.created`,
    [story],
  );
  for (const p of open) {
    const author = authorOf({ id: p.author ?? "" }, p.via);
    if (!p.author) author.human = null;
    const at = p.base_number ? await frontiersOf(q, id, p.base_number) : undefined;
    const b = await docs.branch(q, id, { author, note: p.note, ...(at ? { at } : {}) });
    await docs.commit(q, id, { branch: b.id, target: asDoc(p.title, p.body), message: p.note || "proposed", author, at: p.created });
    await docs.propose(q, id, b.id, { note: p.note, author });
    await q.query(`UPDATE play.proposals SET doc_branch = $2 WHERE id = $1`, [p.id, b.id]);
  }
  return id;
}

/** every story's document, made where it is missing (the deploy's import, ../import/stories.ts) */
export async function ensureStoryDocs(db: Db): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT s.id FROM play.stories s WHERE NOT EXISTS (SELECT 1 FROM play.docs d WHERE d.id = 'story:' || s.id)
        OR EXISTS (SELECT 1 FROM play.proposals p WHERE p.story_id = s.id AND p.status = 'proposed' AND p.doc_branch IS NULL) ORDER BY s.id`,
  );
  for (const r of rows) await db.transaction((q) => ensureStoryDoc(q, r.id));
  return rows.map((r) => r.id);
}

/** the story's document on its main line, or on branch `b`, as a title and a timeline */
export async function storyDocAt(q: Queryable, story: string, b?: number): Promise<{ title: string; body: StoryBody }> {
  return asStory((await docs.readDoc(q, docIdOf(story), b === undefined ? {} : { branch: b })).json);
}

/** the story's version number whose point of the document is `frontiers` (a branch's base), or null */
export async function versionAtFrontiers(q: Queryable, story: string, frontiers: docs.Frontiers): Promise<number | null> {
  const want = canonical([...frontiers].sort((a, b) => (a.peer < b.peer ? -1 : 1)));
  for (const v of await docs.versionsOf(q, docIdOf(story))) if (canonical([...v.frontiers].sort((a, b) => (a.peer < b.peer ? -1 : 1))) === want) return v.number;
  return null;
}

/** do two sets of changed paths touch the same field (one the other's, or inside it)? */
export function overlap(a: string[], b: string[]): string[] {
  const inside = (x: string, y: string) => x === y || x.startsWith(y + ".") || x.startsWith(y + "[");
  return a.filter((x) => b.some((y) => inside(x, y) || inside(y, x)));
}

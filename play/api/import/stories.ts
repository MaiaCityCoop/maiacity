// The stories kept in the repo (import/stories/<folder>/story.json, its `id` a UUID, in format story/1, its frames beside it in frames/): each
// is written into play's Postgres as its accepted v1 only when play holds no story of its id yet, its shots' frames kept
// among play's files by their hash. From then on play's Postgres is the source of truth: a story changes only by
// proposal (over MCP), and nothing here writes over it. Run with every deploy, by ./run.ts.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { BlobStore } from "../src/blobs";
import type { Db } from "../src/kit/pg";
import { foldStories, putFrame, seedStory, STORY_ID, type Fold, type FoldReport } from "../src/stories";
import { ensureStoryDocs } from "../src/storydocs";
import "../src/allkinds";

export const STORIES = join(import.meta.dir, "stories");

export type StoriesReport = { seeded: string[]; present: string[]; errors: string[]; documents?: string[]; folds?: FoldReport };

export async function seedStories(db: Db, store: BlobStore, dir = STORIES): Promise<StoriesReport> {
  const out: StoriesReport = { seeded: [], present: [], errors: [] };
  let ids: string[] = [];
  try {
    ids = readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory()).sort();
  } catch {
    return out;
  }
  for (const folder of ids) {
    // a story is named by the UUID its story.json gives it (its folder's name is only where it is kept)
    let id = folder;
    try {
      const story = JSON.parse(readFileSync(join(dir, folder, "story.json"), "utf8"));
      id = `${story.id ?? ""}`;
      if (!STORY_ID.test(id)) throw new Error("its story.json names no id (a UUID)");
      const { rows } = await db.query(`SELECT 1 FROM play.stories WHERE id = $1`, [id]);
      if (rows.length) {
        out.present.push(id);
        continue;
      }
      // each shot's frame, named by its file beside the story, kept among play's files and named by its hash from then on
      for (const t of story.tracks ?? [])
        if (t?.kind === "shots")
          for (const c of t.clips ?? []) if (c?.frame) c.frame = (await putFrame(db, store, new Uint8Array(readFileSync(join(dir, folder, "frames", c.frame))))).hash;
      const { title, note, id: _id, ...body } = story;
      if (await seedStory(db, id, title, note ?? "", body)) out.seeded.push(id);
      else out.present.push(id);
    } catch (e) {
      out.errors.push(`story ${folder} (${id}): ${(e as Error).message}`);
    }
  }
  // every story's Loro document (play/SPEC.md §4.4), made from its history where it has none yet
  try {
    out.documents = await ensureStoryDocs(db);
  } catch (e) {
    out.errors.push(`stories' documents: ${(e as Error).message}`);
  }
  // one film, one timeline (Samuel 2026-11-03): the stories folds.json brings into another, each its versions in turn
  try {
    const folds: Fold[] = JSON.parse(readFileSync(join(dir, "folds.json"), "utf8"));
    out.folds = await foldStories(db, folds);
    out.errors.push(...out.folds.errors.map((e) => `fold ${e}`));
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code !== "ENOENT") out.errors.push(`folds: ${(e as Error).message}`);
  }
  return out;
}

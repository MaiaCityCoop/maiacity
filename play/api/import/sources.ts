// The readable sources of the imported versions (Samuel 2026-11-03: every asset's source, so people and agents start
// from code they can read). Legacy bundled each asset's library and minified it into the recipe files play imported;
// each library was made again from SNAPSHOT_2611101 by legacy's own bundler (its box/plugin.js `bundleAsset`,
// rolldown 1.2.8) at the commit its file was seeded from, minified to check that it is that file byte for byte, and
// unminified to keep: legacy/sources/<group>/<id>@<commit>.js, listed in legacy/sources/index.json with the recipe
// files each was checked against. How they were made: legacy/sources/README.md.
//
// Here each is checked against its own hash and the recipe files it was checked against against the asset, version
// and variant their last line names, kept among play's files, and given as the source of every imported version and
// variant whose recipe is one of them and that has none yet (play.version_is_frozen lets a source be set once).
//
// Each is kept as its own text and the pieces it shares with others (intent 5a15e468; ./legacy-pieces.ts): a line
// `//#piece <hash>` stands for the piece pieces/<hash>.js, put back (and held to its hash) before the source is read.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BlobStore } from "../src/blobs";
import { keyOf } from "../src/blobs";
import { hashText } from "../src/kit/hash";
import type { Db } from "../src/kit/pg";
import { labelOf } from "../src/recipes";

export const SOURCES = join(import.meta.dir, "legacy/sources");

/** a line naming a piece: the whole line, its newline included, is the piece's text */
export const PIECE_LINE = /^\/\/#piece ([0-9a-f]{64})\n/gm;
export const pieceFile = (hash: string) => `pieces/${hash}.js`;

/** a kept text with every piece it names put back, each held to its hash; throws on a piece missing, not its hash or
 * naming itself */
export function rebuild(dir: string, text: string, seen: string[] = []): string {
  return text.replace(PIECE_LINE, (_, hash: string) => {
    if (seen.includes(hash)) throw new Error(`piece ${hash} names itself`);
    const whole = rebuild(dir, readFileSync(join(dir, pieceFile(hash)), "utf8"), [...seen, hash]);
    if (hashText(whole) !== hash) throw new Error(`piece ${hash}: its text is not its hash`);
    return whole;
  });
}

/** the pieces a kept text names itself (not those inside them) */
export const piecesIn = (text: string): string[] => [...text.matchAll(PIECE_LINE)].map((m) => m[1]);

/** a source as it was made, from its file under legacy/sources and its pieces */
export const readSource = (file: string, dir = SOURCES): string => rebuild(dir, readFileSync(join(dir, file), "utf8"));

export type SourceIndex = {
  /** each source by its BLAKE3 hash: its file, under legacy/sources */
  sources: Record<string, string>;
  /** each recipe file it was checked against, by the recipe's hash: what it builds and the source it was made from */
  recipes: Record<string, { asset: string; v: number; variant: string | null; source: string; commit: string }>;
  /** every piece the sources share, by its hash: pieces/<hash>.js */
  pieces?: string[];
};

export type SourcesReport = { files: number; attached: number; recipesAbsent: number; errors: string[] };

export async function importSources(db: Db, store: BlobStore, dir = SOURCES): Promise<SourcesReport> {
  const out: SourcesReport = { files: 0, attached: 0, recipesAbsent: 0, errors: [] };
  const index: SourceIndex = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
  // each source, checked against its own hash (the repo's files: no call to the store)
  const texts = new Map<string, string>();
  for (const [hash, file] of Object.entries(index.sources)) {
    let text: string;
    try {
      text = readSource(file, dir);
    } catch (e) {
      out.errors.push(`${file}: ${(e as Error).message}`);
      continue;
    }
    if (hashText(text) !== hash) out.errors.push(`${file}: its text is not ${hash}`);
    else texts.set(hash, text);
  }
  // in one query, which of the index's recipe files play holds, and whether a version or variant of it lacks its source:
  // only those are fetched and checked, so a deploy where every one has its source asks the store nothing
  const recipes = Object.keys(index.recipes);
  const { rows } = await db.query<{ recipe: string; lacking: boolean }>(
    `SELECT recipe_hash AS recipe, bool_or(source_hash IS NULL) AS lacking FROM (
        SELECT recipe_hash, source_hash FROM play.asset_versions WHERE recipe_hash = ANY($1::text[])
        UNION ALL SELECT recipe_hash, source_hash FROM play.asset_variants WHERE recipe_hash = ANY($1::text[])) r
      GROUP BY recipe_hash`,
    [recipes],
  );
  const held = new Map(rows.map((r) => [r.recipe, r.lacking]));
  const kept = new Set<string>();
  for (const [recipe, r] of Object.entries(index.recipes)) {
    const text = texts.get(r.source);
    if (!text) {
      if (!index.sources[r.source]) out.errors.push(`${recipe}: its source ${r.source} is not listed`);
      continue;
    }
    if (!held.has(recipe)) {
      out.recipesAbsent++;
      continue;
    }
    if (!held.get(recipe)) continue; // every version and variant of it has its source
    // the recipe file must build what the index says the source was checked for
    const bytes = await store.get(recipe);
    const label = bytes ? labelOf(new TextDecoder().decode(bytes)) : null;
    const [, slug] = r.asset.split("/");
    if (!label || label.id !== slug || label.v !== r.v || label.variant !== r.variant) {
      out.errors.push(`${recipe}: the recipe file builds ${label ? `${label.id}@${label.v}${label.variant ? `:${label.variant}` : ""}` : "nothing we read"}, not ${r.asset}@${r.v}${r.variant ? `:${r.variant}` : ""}`);
      continue;
    }
    if (!kept.has(r.source)) {
      const b = new TextEncoder().encode(text);
      const key = (await store.has(r.source)) ? keyOf(r.source) : await store.put(r.source, b, "text/javascript");
      const f = await db.query(
        `INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, 'text/javascript', $3) ON CONFLICT (hash) DO NOTHING`,
        [r.source, b.length, key],
      );
      out.files += f.affectedRows;
      kept.add(r.source);
    }
    const v = await db.query(`UPDATE play.asset_versions SET source_hash = $1 WHERE recipe_hash = $2 AND source_hash IS NULL`, [r.source, recipe]);
    const x = await db.query(`UPDATE play.asset_variants SET source_hash = $1 WHERE recipe_hash = $2 AND source_hash IS NULL`, [r.source, recipe]);
    out.attached += v.affectedRows + x.affectedRows;
  }
  return out;
}

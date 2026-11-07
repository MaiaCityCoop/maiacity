// The import into play (play/SPEC.md §6), run by every deploy. The legacy import ran once (kept in play.imports)
// and its source was retired on 2026-11-05: play's Postgres is the one source of truth for its
// assets, members and sandboxes. A run only adds what play lacks from the repo: its site's media (play/media), the
// imported versions' readable sources (./sources.ts), the stories, factories, game configs and skills kept in the repo,
// and every asset's Loro document. Nothing it adds can override what play changed. A media file the site names that is
// neither among play's files nor in play/media is an error naming its hash: play mends its files from their second
// copy (src/blobs.ts) and a database is restored from the backups (restore.yml), never from a feed.
//
//   DATABASE_URL=… [PLAY_BUCKET=… | PLAY_BLOBS=./blobs] bun import/run.ts [--report <file>]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { blobStore, keyOf, type BlobStore } from "../src/blobs";
import { hashBytes } from "../src/hash";
import { connect, type Db, type Queryable } from "../src/pg";
import { migrate } from "../src/migrations";
import { importSources, type SourcesReport } from "./sources";
import { seedStories, type StoriesReport } from "./stories";
import { ensureAssetDocs, type AssetDocsReport } from "../src/assetdocs";
import { seedFactories, type FactoriesReport } from "./factories";
import { seedGameConfigs, type GameConfigsReport } from "./gameconfigs";
import { seedSkills, type SkillsReport } from "./skills";

// the repo root: three up from play/api/import in a checkout; PLAY_REPO in the image (/app)
const ROOT = process.env.PLAY_REPO ?? join(import.meta.dir, "../../..");
const args = process.argv.slice(2);
const option = (f: string) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);

export type Report = {
  at: string;
  written: { media: number };
  verified: { mediaErrors: string[] };
  /** the imported versions' readable sources (./sources.ts) */
  sources: SourcesReport;
  /** the stories kept in the repo, each written once into play's Postgres (./stories.ts) */
  stories: StoriesReport;
  /** the factories kept in the repo, each written once into play's Postgres as its document's v1 (./factories.ts) */
  factories: FactoriesReport;
  /** the game's configs kept in the repo, each written once into play's Postgres as its document's v1 (./gameconfigs.ts) */
  gameConfigs: GameConfigsReport;
  /** the skills kept in the repo (what play teaches its agents), each written once into play's Postgres as its document's v1 (./skills.ts) */
  skills: SkillsReport;
  /** every asset's Loro document, made from its history where it has none (../src/assetdocs.ts) */
  assetDocs: AssetDocsReport;
  /** when the legacy import ran (play.imports), or null where it never did (a database not restored from play's) */
  legacy: { ran: string | null };
  ok: boolean;
};

export async function runImport(db: Db, store: BlobStore, opts: { media?: boolean; sources?: string; log?: (s: string) => void } = {}): Promise<Report> {
  const log = opts.log ?? ((s: string) => console.error(s));
  await migrate(db);
  const report: Report = {
    at: new Date().toISOString(),
    written: { media: 0 },
    verified: { mediaErrors: [] },
    sources: { files: 0, attached: 0, recipesAbsent: 0, errors: [] },
    stories: { seeded: [], present: [], errors: [] },
    factories: { seeded: [], present: [], errors: [] },
    gameConfigs: { seeded: [], present: [], errors: [] },
    skills: { seeded: [], present: [], errors: [] },
    assetDocs: { made: 0, variants: 0, kept: 0, breeds: 0, edits: 0, versions: 0, bytes: 0, errors: [] },
    legacy: { ran: await legacyRan(db) },
    ok: false,
  };
  if (!report.legacy.ran) log("no legacy import is kept in play.imports: this database holds only what play made itself");
  if (opts.media !== false) await importMedia(db, store, report);
  log("giving the imported versions their readable sources…");
  report.sources = await importSources(db, store, opts.sources);
  report.stories = await seedStories(db, store);
  report.factories = await seedFactories(db);
  report.gameConfigs = await seedGameConfigs(db);
  report.skills = await seedSkills(db);
  log("making every asset's document from its history…");
  report.assetDocs = await ensureAssetDocs(db, store);
  // no sweep of the store here (intent 5ab64b8e): the deploy's file check is the backup's, one listing of the store
  // before anything changes (deploy/backup.sh stops the deploy if a file is missing), and play mends a file its
  // bucket lacks from that second copy on read (blobs.ts mirroredStore). Reading every file again is server.yml's.
  report.ok = !report.verified.mediaErrors.length && !report.sources.errors.length && !report.stories.errors.length && !report.factories.errors.length && !report.gameConfigs.errors.length && !report.skills.errors.length && !report.assetDocs.errors.length;
  return report;
}

/** when the legacy import ran, or null if it never did */
export async function legacyRan(db: Queryable): Promise<string | null> {
  const { rows } = await db.query<{ ran: Date | string }>(`SELECT ran FROM play.imports WHERE name = 'legacy'`);
  return rows[0] ? new Date(rows[0].ran).toISOString() : null;
}

const MEDIA_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", mp3: "audio/mpeg" };

/** every media file play's site names by its hash (`<hash>.<ending>` in play/site/src: the sandboxes' covers, their sounds) */
export function mediaNamed(): { hash: string; ending: string }[] {
  const dir = join(ROOT, "play/site/src");
  const out = new Map<string, string>();
  try {
    statSync(dir);
  } catch {
    throw new Error(`play's site sources are not at ${dir}: the media they name can't be found`);
  }
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|ts|svelte)$/.test(f)) for (const m of readFileSync(p, "utf8").matchAll(/\b([0-9a-f]{64})\.(jpg|jpeg|png|webp|mp4|mp3)\b/g)) out.set(m[1], m[2]);
    }
  };
  walk(dir);
  // the animals' sounds (./sounds.json) too
  for (const s of Object.values(SOUNDS)) {
    const m = /^([0-9a-f]{64})\.(mp3)$/.exec(s.file);
    if (m) out.set(m[1], m[2]);
  }
  return [...out].map(([hash, ending]) => ({ hash, ending }));
}

/** each animal's sound, by its asset's id (./sounds.json): the recording, imported as media, and its gain */
const SOUNDS: Record<string, { name?: string; file: string; gain: number }> = Object.fromEntries(
  Object.entries(JSON.parse(readFileSync(join(import.meta.dir, "sounds.json"), "utf8"))).filter(([k]) => k !== "_"),
) as Record<string, { name?: string; file: string; gain: number }>;

/** the media play's site shows, each among play's files: one it lacks is taken from play/media/<hash>.<ending> (the
 * covers it made), held to its hash; one that is in neither is an error naming its hash */
async function importMedia(db: Db, store: BlobStore, report: Report) {
  let named: { hash: string; ending: string }[] = [];
  try {
    named = mediaNamed();
  } catch (e) {
    report.verified.mediaErrors.push((e as Error).message);
  }
  for (const { hash, ending } of named) {
    try {
      // a file with its row is present: play keeps a file before its row (and the backup's listing checks the store)
      if ((await db.query(`SELECT 1 FROM play.files WHERE hash = $1`, [hash])).rows.length > 0) continue;
      // play's own media (the covers it made: play/media/<hash>.<ending>)
      const own = Bun.file(join(ROOT, "play/media", `${hash}.${ending}`));
      if (!(await own.exists())) throw new Error("not among play's files, nor in play/media: mend it from play's second copy or restore the backup");
      const bytes = new Uint8Array(await own.arrayBuffer());
      if (hashBytes(bytes) !== hash) throw new Error("its bytes don't hash to its name");
      await store.put(hash, bytes, MEDIA_TYPES[ending]);
      await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [hash, bytes.length, MEDIA_TYPES[ending], keyOf(hash)]);
      report.written.media++;
    } catch (e) {
      report.verified.mediaErrors.push(`media ${hash}.${ending}: ${(e as Error).message}`);
    }
  }
}

export function reportText(r: Report): string {
  const lines = [
    `# play import report, ${r.at}`,
    ``,
    `**${r.ok ? "OK" : "FAILED"}**`,
    ``,
    r.legacy.ran ? `The legacy import ran on ${r.legacy.ran}; play's Postgres is the source of truth, and this run added only what play lacked from the repo.` : `No legacy import is kept in play.imports: this database holds only what play made itself.`,
    ``,
    `| | |`,
    `|---|---|`,
    `| Media files (covers, sounds) | ${r.written.media} written, ${r.verified.mediaErrors.length} failed |`,
    `| Readable sources (legacy's code, checked against the recipe files) | ${r.sources.files} written, ${r.sources.attached} versions and variants given theirs now, ${r.sources.errors.length} failed |`,
    `| Stories from the repo (written once, then play's own) | ${r.stories.seeded.length ? `${r.stories.seeded.join(", ")} written` : "none written"}; ${r.stories.present.length} already in play; ${r.stories.errors.length} failed; ${r.stories.documents?.length ?? 0} documents made from their history; ${r.stories.folds?.folded.length ? `${r.stories.folds.folded.join(", ")} brought into one timeline` : "none folded"} |`,
    `| Assets as Loro documents (their history, edit by edit) | ${r.assetDocs.made} made now from their history (${r.assetDocs.kept} kept edits between versions put in), ${r.assetDocs.variants} intents given their intent variant; in all ${r.assetDocs.docs ?? 0} documents, ${r.assetDocs.versions} versions, ${r.assetDocs.edits} edits, ${(r.assetDocs.bytes / 1e6).toFixed(2)} MB of edits; ${r.assetDocs.errors.length} failed |`,
  ];
  const errs = [...r.verified.mediaErrors, ...r.sources.errors, ...r.stories.errors, ...r.factories.errors, ...r.gameConfigs.errors, ...r.skills.errors, ...r.assetDocs.errors];
  if (errs.length) lines.push(``, `## Errors`, ``, ...errs.map((e) => `- ${e}`));
  return lines.join("\n") + "\n";
}

if (import.meta.main) {
  const db = connect();
  const report = await runImport(db, blobStore());
  const text = reportText(report);
  const out = option("--report");
  if (out) {
    await Bun.write(out, text);
    await Bun.write(out.replace(/\.md$/, "") + ".json", JSON.stringify(report, null, 2));
  }
  console.log(text);
  process.exit(report.ok ? 0 : 1);
}

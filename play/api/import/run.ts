// The one-time import into play (play/SPEC.md §6), safe to run again: it writes only what is missing, never changes a
// version, and stops with a report naming what failed. Legacy is only read.
//
//   DATABASE_URL=… [PLAY_BUCKET=… | PLAY_BLOBS=./blobs] bun import/run.ts
//       [--cache <dir>] [--report <file>] [--founders] [--admin <founder number>,…] [--dry]
//
//   --founders   copy the legacy founders and their passkeys (public.founders, public.passkeys) as humans; each
//                becomes a traveler of Maia City
//   --admin      the founders (by number) who are Maia City's admins, its owners
//   --dry        plan and verify the files, write nothing
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { blobStore, keyOf, type BlobStore } from "../src/blobs";
import { hashBytes } from "../src/hash";
import { connect, type Db, type Queryable } from "../src/pg";
import { migrate } from "../src/migrations";
import { FEED, fileOf, rowsOf, viewOf, type EntryView, type FeedRow } from "./feed";
import { broughtOf, gardenWithSlots, hashRefs, parseRef, planAsset, planPins, plantWords, SANDBOX_3, FACTORIES, PlanError, type PlannedAsset, type PlannedFile } from "./plan";
import { importSources, type SourcesReport } from "./sources";

// the repo root: three up from play/api/import in a checkout; PLAY_REPO in the image (/app)
const ROOT = process.env.PLAY_REPO ?? join(import.meta.dir, "../../..");
const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const option = (f: string) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const COOP = "maia-city";
const MEDIA = "text/javascript";

async function inParallel<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

export type Report = {
  at: string;
  feed: { recipes: number; files: number; bytes: number };
  assets: { planned: number; byGroup: Record<string, number>; versions: number; variants: number; hashedRefs: number; plantWords: number; sounds: number; failed: string[] };
  written: { files: number; assets: number; versions: number; variants: number; pins: number; humans: number; passkeys: number; media: number };
  verified: { filesReadBack: number; fileErrors: string[]; groupsMatch: boolean; dbByGroup: Record<string, number>; pinsResolved: number; pinErrors: string[]; mediaErrors: string[] };
  /** the imported versions' readable sources (./sources.ts) */
  sources: SourcesReport;
  ok: boolean;
};

async function writeAssets(tx: Queryable, assets: PlannedAsset[], files: PlannedFile[], keyOf: Map<string, string>, w: Report["written"]) {
  for (const f of files) {
    const r = await tx.query(
      `INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, $3, $4) ON CONFLICT (hash) DO NOTHING`,
      [f.hash, f.size, MEDIA, keyOf.get(f.hash)],
    );
    w.files += r.affectedRows;
  }
  for (const a of assets) {
    const r = await tx.query(
      `INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label WHERE play.assets.label <> EXCLUDED.label`,
      [a.id, COOP, a.grp, a.slug, a.label],
    );
    w.assets += r.affectedRows;
    for (const v of a.versions) {
      const imported = { from: "avendb", ...a.imported, edits: v.edits };
      const rv = await tx.query(
        `INSERT INTO play.asset_versions (id, asset_id, parents, number, recipe_hash, default_variant, card, engine, note, imported)
         VALUES ($1, $2, $3, $4, $5, $6, ($7::text)::jsonb, $8, $9, ($10::text)::jsonb) ON CONFLICT (id) DO NOTHING`,
        [v.id, a.id, v.parents, v.number, v.recipe, v.defaultVariant, JSON.stringify(v.card), v.engine, v.note, JSON.stringify(imported)],
      );
      w.versions += rv.affectedRows;
      for (const [name, x] of Object.entries(v.variants)) {
        const rn = await tx.query(
          `INSERT INTO play.asset_variants (version_id, name, recipe_hash, card) VALUES ($1, $2, $3, ($4::text)::jsonb) ON CONFLICT DO NOTHING`,
          [v.id, name, x.recipe, JSON.stringify(x.card)],
        );
        w.variants += rn.affectedRows;
      }
    }
    const head = a.versions.at(-1)!.id;
    await tx.query(`UPDATE play.assets SET head = $2 WHERE id = $1 AND head IS DISTINCT FROM $2`, [a.id, head]);
  }
}

async function writePins(tx: Queryable, sandbox: string, pins: ReturnType<typeof planPins>, w: Report["written"], errors: string[]) {
  for (const p of pins) {
    // a pin names its asset by the name legacy gave it (`<grp>/<slug>`), resolved here to the asset's UUID, once
    const { rows } = await tx.query<{ id: string }>(
      `SELECT v.id FROM play.asset_versions v JOIN play.assets a ON a.id = v.asset_id WHERE a.grp || '/' || a.slug = $1 AND v.number = $2`,
      [p.asset, p.number],
    );
    if (!rows[0]) {
      errors.push(`${sandbox} ${p.slot}: ${p.asset}@${p.number} is not imported`);
      continue;
    }
    if (p.variant) {
      const { rows: vr } = await tx.query(`SELECT 1 FROM play.asset_variants WHERE version_id = $1 AND name = $2`, [rows[0].id, p.variant]);
      if (!vr[0]) {
        errors.push(`${sandbox} ${p.slot}: ${p.asset}@${p.number} has no variant ${p.variant}`);
        continue;
      }
    }
    const r = await tx.query(
      `INSERT INTO play.sandbox_pins (sandbox_id, slot, version_id, variant, params) VALUES ($1, $2, $3, $4, ($5::text)::jsonb)
       ON CONFLICT (sandbox_id, slot) DO NOTHING`,
      [sandbox, p.slot, rows[0].id, p.variant, p.params ? JSON.stringify(p.params) : null],
    );
    w.pins += r.affectedRows;
  }
}

async function writeFounders(tx: Queryable, admins: number[], w: Report["written"]) {
  const { rows: founders } = await tx.query<{ id: string; name: string; number: string }>(
    `SELECT id, name, number FROM public.founders ORDER BY number`,
  );
  for (const f of founders) {
    const r = await tx.query(
      `INSERT INTO play.humans (id, name, founder_number) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [f.id, f.name, f.number],
    );
    w.humans += r.affectedRows;
    const level = admins.includes(Number(f.number)) ? "admin" : "traveler";
    await tx.query(
      `INSERT INTO play.memberships (coop_id, human_id, level) VALUES ($1, $2, $3)
       ON CONFLICT (coop_id, human_id) DO UPDATE SET level = EXCLUDED.level
       WHERE play.memberships.level = 'traveler' AND EXCLUDED.level = 'admin'`,
      [COOP, f.id, level],
    );
  }
  const r = await tx.query(
    `INSERT INTO play.passkeys (id, human_id, public_key, counter, transports, created)
     SELECT p.id, p.founder_id, p.public_key, p.counter, p.transports, p.created FROM public.passkeys p
     JOIN play.humans h ON h.id = p.founder_id ON CONFLICT (id) DO NOTHING`,
  );
  w.passkeys += r.affectedRows;
  const missing = admins.filter((n) => !founders.some((f) => Number(f.number) === n));
  if (missing.length) throw new Error(`no founder numbered ${missing.join(", ")}`);
}

export async function runImport(db: Db, store: BlobStore, opts: { cache: string; founders: boolean; admins: number[]; dry: boolean; log?: (s: string) => void }): Promise<Report> {
  const log = opts.log ?? ((s: string) => console.error(s));
  const report: Report = {
    at: new Date().toISOString(),
    feed: { recipes: 0, files: 0, bytes: 0 },
    assets: { planned: 0, byGroup: {}, versions: 0, variants: 0, hashedRefs: 0, plantWords: 0, sounds: 0, failed: [] },
    written: { files: 0, assets: 0, versions: 0, variants: 0, pins: 0, humans: 0, passkeys: 0, media: 0 },
    verified: { filesReadBack: 0, fileErrors: [], groupsMatch: false, dbByGroup: {}, pinsResolved: 0, pinErrors: [], mediaErrors: [] },
    sources: { files: 0, attached: 0, recipesAbsent: 0, errors: [] },
    ok: false,
  };

  log("reading the feed's recipes…");
  const rows: FeedRow[] = (await rowsOf("recipe")).filter((r) => !(r.tags ?? []).includes("avendb:deleted"));
  report.feed.recipes = rows.length;
  log(`${rows.length} recipes; reading each entry's versions and variants…`);
  const views: EntryView[] = await inParallel(rows, 8, (r) => viewOf(r, opts.cache));
  const all = views.flatMap((view) => broughtOf(view).flatMap((b) => (b.files ?? []).map((f) => ({ view, f }))));
  report.feed.files = all.length;
  log(`${all.length} files; downloading…`);
  const bytesOf = new Map<string, Uint8Array>();
  await inParallel(all, 8, async ({ view, f }) => {
    const b = await fileOf(view, f, opts.cache);
    bytesOf.set(f.root, b);
    report.feed.bytes += b.length;
  });

  const assets: PlannedAsset[] = [];
  const files = new Map<string, PlannedFile>();
  for (const view of views) {
    try {
      const p = planAsset(view, bytesOf);
      if (assets.some((a) => a.name === p.asset.name)) throw new PlanError(`${p.asset.name}: two entries name it`);
      assets.push(p.asset);
      for (const f of p.files) files.set(f.hash, f);
    } catch (e) {
      report.assets.failed.push((e as Error).message);
    }
  }
  try {
    report.assets.plantWords = plantWords(assets, JSON.parse(readFileSync(join(import.meta.dir, "plants.json"), "utf8")));
    report.assets.hashedRefs = hashRefs(assets);
  } catch (e) {
    report.assets.failed.push((e as Error).message);
  }
  report.assets.planned = assets.length;
  for (const a of assets) {
    report.assets.byGroup[a.grp] = (report.assets.byGroup[a.grp] ?? 0) + 1;
    report.assets.versions += a.versions.length;
    report.assets.variants += a.versions.reduce((n, v) => n + Object.keys(v.variants).length, 0);
  }
  log(`${assets.length} assets, ${report.assets.versions} versions, ${report.assets.variants} variants planned; ${report.assets.failed.length} failed`);

  const entryOf = new Map(assets.map((a) => [a.name, a.imported.entry]));
  const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
  let pins: ReturnType<typeof planPins> = [];
  try {
    pins = planPins(
      read("play/api/import/legacy/sandbox-4/assets/config.json"),
      read("play/api/import/legacy/sandbox-4/garden/config.json"),
      read("play/api/import/legacy/pins.fixture.json"),
      entryOf,
    );
  } catch (e) {
    report.verified.pinErrors.push((e as Error).message);
  }

  // Sandbox 3's pins: V2's world's assets by their slots, each at the version V2 drew (the newest where it named none)
  const pins3: ReturnType<typeof planPins> = [];
  for (const [slot, ref] of Object.entries(SANDBOX_3)) {
    if (/@[0-9]/.test(ref)) {
      const r = parseRef(ref);
      pins3.push({ slot, asset: r.asset, number: r.number, variant: r.variant, params: r.params });
    } else {
      const a = assets.find((x) => x.name === ref);
      if (a) pins3.push({ slot, asset: ref, number: a.versions.at(-1)!.number, variant: null, params: null });
      else report.verified.pinErrors.push(`sandbox-3 ${slot}: ${ref} is not imported`);
    }
  }
  // the Factories' pins: what its lines draw of ours, each at the version its line was built on
  const pinsF: ReturnType<typeof planPins> = [];
  for (const [slot, ref] of Object.entries(FACTORIES)) {
    const r = parseRef(ref);
    pinsF.push({ slot, asset: r.asset, number: r.number, variant: r.variant, params: r.params });
  }
  const garden = gardenWithSlots(read("play/api/import/legacy/sandbox-4/garden/config.json"));
  // the plants Sandbox 1's interior puts by species (its beds, pots, vines and shrubs: play/site's
  // content/sandbox-2/interior/legacy.js), each at the version the stand-ins were traded for, v1, as `plant/<id>`
  for (const a of assets.filter((x) => x.grp === "plants"))
    if (a.versions.some((v) => v.number === 1)) pins.push({ slot: `plant/${a.slug}`, asset: a.name, number: 1, variant: null, params: null });

  if (opts.dry) {
    report.ok = !report.assets.failed.length && !report.verified.pinErrors.length;
    return report;
  }

  log(`uploading ${files.size} files…`);
  const keyFor = new Map<string, string>();
  await inParallel([...files.values()], 8, async (f) => {
    keyFor.set(f.hash, (await store.has(f.hash)) ? keyOf(f.hash) : await store.put(f.hash, f.bytes, MEDIA));
  });

  await migrate(db);
  await db.transaction(async (tx) => {
    await writeAssets(tx, assets, [...files.values()], keyFor, report.written);
    await writePins(tx, "sandbox-1", pins, report.written, report.verified.pinErrors);
    await writePins(tx, "sandbox-3", pins3, report.written, report.verified.pinErrors);
    await writePins(tx, "factories", pinsF, report.written, report.verified.pinErrors);
    // Sandbox 1's garden, each planting by its slot of the pins; written once, then play's own
    await tx.query(
      `INSERT INTO play.sandbox_configs (sandbox_id, name, data) VALUES ('sandbox-1', 'garden', ($1::text)::jsonb) ON CONFLICT DO NOTHING`,
      [JSON.stringify(garden)],
    );
    if (opts.founders) await writeFounders(tx, opts.admins, report.written);
    if (report.verified.pinErrors.length) throw new Error(`pins failed: ${report.verified.pinErrors.join("; ")}`);
  });

  log("verifying…");
  const { rows: kept } = await db.query<{ hash: string }>(`SELECT hash FROM play.files`);
  await inParallel(kept, 8, async ({ hash }) => {
    try {
      if (!(await store.get(hash))) throw new Error("missing");
      report.verified.filesReadBack++;
    } catch (e) {
      report.verified.fileErrors.push(`${hash}: ${(e as Error).message}`);
    }
  });
  await importMedia(db, store, report);
  await importSounds(db, report);
  log("giving the imported versions their readable sources…");
  report.sources = await importSources(db, store);
  const { rows: groups } = await db.query<{ grp: string; n: string }>(`SELECT grp, count(*) AS n FROM play.assets GROUP BY grp`);
  report.verified.dbByGroup = Object.fromEntries(groups.map((g) => [g.grp, Number(g.n)]));
  const feedByGroup: Record<string, number> = {};
  for (const r of rows) feedByGroup[r.record?.card?.group] = (feedByGroup[r.record?.card?.group] ?? 0) + 1;
  report.verified.groupsMatch = JSON.stringify(Object.entries(feedByGroup).sort()) === JSON.stringify(Object.entries(report.verified.dbByGroup).sort());
  const { rows: pinned } = await db.query<{ n: string }>(
    `SELECT count(*) AS n FROM play.sandbox_pins p JOIN play.asset_versions v ON v.id = p.version_id`,
  );
  report.verified.pinsResolved = Number(pinned[0].n);
  if (report.verified.pinsResolved !== pins.length + pins3.length + pinsF.length)
    report.verified.pinErrors.push(`${report.verified.pinsResolved} of ${pins.length + pins3.length + pinsF.length} pins resolve`);
  report.ok = !report.assets.failed.length && !report.verified.fileErrors.length && report.verified.groupsMatch && !report.verified.pinErrors.length && !report.verified.mediaErrors.length && !report.sources.errors.length;
  return report;
}

const MEDIA_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", mp3: "audio/mpeg" };

/** every media file play's site names by its hash (`<hash>.<ending>` in play/site/src: the sandboxes' covers, their sounds) */
function mediaNamed(): { hash: string; ending: string }[] {
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

/** each animal's sound, by its asset's slug (./sounds.json): the recording, imported as media, and its gain */
const SOUNDS: Record<string, { file: string; gain: number }> = Object.fromEntries(
  Object.entries(JSON.parse(readFileSync(join(import.meta.dir, "sounds.json"), "utf8"))).filter(([k]) => k !== "_"),
) as Record<string, { file: string; gain: number }>;

/** the animals' sounds onto their assets, once their recordings are among play's files */
async function importSounds(db: Db, report: Report) {
  for (const [slug, s] of Object.entries(SOUNDS)) {
    const hash = s.file.slice(0, 64);
    const { rows } = await db.query(
      `UPDATE play.assets SET sound = $2, sound_gain = $3 WHERE grp = 'actors' AND slug = $1 AND EXISTS (SELECT 1 FROM play.files WHERE hash = $2) RETURNING id`,
      [slug, hash, s.gain],
    );
    if (rows.length) report.assets.sounds++;
    else report.verified.mediaErrors.push(`sound of ${slug}: no such animal, or its recording ${hash.slice(0, 12)}… is not among play's files`);
  }
}

/** the media play's site shows — its own (play/media/<hash>.<ending>: the covers it made) or legacy's public media
 * (avenDB's feed, /feed/media/<hash>) — each held to its hash, into play's files: play serves them itself
 * (/api/files/<hash>), nothing from legacy */
async function importMedia(db: Db, store: BlobStore, report: Report) {
  let named: { hash: string; ending: string }[] = [];
  try {
    named = mediaNamed();
  } catch (e) {
    report.verified.mediaErrors.push((e as Error).message);
  }
  for (const { hash, ending } of named) {
    try {
      const known = (await db.query(`SELECT 1 FROM play.files WHERE hash = $1`, [hash])).rows.length > 0;
      if (known && (await store.has(hash))) continue;
      // play's own media (the covers it made: play/media/<hash>.<ending>), else legacy's public media
      const own = Bun.file(join(ROOT, "play/media", `${hash}.${ending}`));
      let bytes: Uint8Array;
      if (await own.exists()) bytes = new Uint8Array(await own.arrayBuffer());
      else {
        const r = await fetch(`${FEED}/media/${hash}.${ending}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        bytes = new Uint8Array(await r.arrayBuffer());
      }
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
    `| | |`,
    `|---|---|`,
    `| Feed | ${r.feed.recipes} recipes, ${r.feed.files} files, ${(r.feed.bytes / 1e6).toFixed(1)} MB |`,
    `| Planned | ${r.assets.planned} assets (${Object.entries(r.assets.byGroup).map(([g, n]) => `${g} ${n}`).join(", ")}), ${r.assets.versions} versions, ${r.assets.variants} variants |`,
    `| Refs to other assets rewritten as hashes | ${r.assets.hashedRefs} (the pickup's to the Power Cube dropped) |`,
    `| Plant versions with their words (Latin, layer, origin, stages) | ${r.assets.plantWords} |`,
    `| Written now | ${Object.entries(r.written).map(([k, n]) => `${k} ${n}`).join(", ")} |`,
    `| Files read back and hash-checked | ${r.verified.filesReadBack} |`,
    `| Assets per group match the feed | ${r.verified.groupsMatch ? "yes" : "no"} |`,
    `| Sandbox pins resolving (Sandbox 1 and 3, the Factories) | ${r.verified.pinsResolved} |`,
    `| Media files (covers, sounds) | ${r.written.media} written, ${r.verified.mediaErrors.length} failed |`,
    `| Animals with their sound | ${r.assets.sounds} |`,
    `| Readable sources (legacy's code, checked against the recipe files) | ${r.sources.files} written, ${r.sources.attached} versions and variants given theirs now, ${r.sources.errors.length} failed |`,
  ];
  const errs = [...r.assets.failed, ...r.verified.fileErrors, ...r.verified.pinErrors, ...r.verified.mediaErrors, ...r.sources.errors];
  if (errs.length) lines.push(``, `## Errors`, ``, ...errs.map((e) => `- ${e}`));
  return lines.join("\n") + "\n";
}

if (import.meta.main) {
  const db = connect();
  const report = await runImport(db, blobStore(), {
    cache: option("--cache") ?? ".import-cache",
    founders: flag("--founders"),
    admins: (option("--admin") ?? "").split(",").filter(Boolean).map(Number),
    dry: flag("--dry"),
  });
  const text = reportText(report);
  const out = option("--report");
  if (out) {
    await Bun.write(out, text);
    await Bun.write(out.replace(/\.md$/, "") + ".json", JSON.stringify(report, null, 2));
  }
  console.log(text);
  process.exit(report.ok ? 0 : 1);
}

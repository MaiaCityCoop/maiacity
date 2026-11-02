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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { blobStore, type BlobStore } from "../src/blobs";
import { connect, type Db, type Queryable } from "../src/pg";
import { migrate } from "../src/migrations";
import { fileOf, rowsOf, viewOf, type EntryView, type FeedRow } from "./feed";
import { broughtOf, planAsset, planPins, PlanError, type PlannedAsset, type PlannedFile } from "./plan";

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
  assets: { planned: number; byGroup: Record<string, number>; versions: number; variants: number; failed: string[] };
  written: { files: number; assets: number; versions: number; variants: number; pins: number; humans: number; passkeys: number };
  verified: { filesReadBack: number; fileErrors: string[]; groupsMatch: boolean; dbByGroup: Record<string, number>; pinsResolved: number; pinErrors: string[] };
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
    const { rows } = await tx.query<{ id: string }>(`SELECT id FROM play.asset_versions WHERE asset_id = $1 AND number = $2`, [p.asset, p.number]);
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
    assets: { planned: 0, byGroup: {}, versions: 0, variants: 0, failed: [] },
    written: { files: 0, assets: 0, versions: 0, variants: 0, pins: 0, humans: 0, passkeys: 0 },
    verified: { filesReadBack: 0, fileErrors: [], groupsMatch: false, dbByGroup: {}, pinsResolved: 0, pinErrors: [] },
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
      if (assets.some((a) => a.id === p.asset.id)) throw new PlanError(`${p.asset.id}: two entries name it`);
      assets.push(p.asset);
      for (const f of p.files) files.set(f.hash, f);
    } catch (e) {
      report.assets.failed.push((e as Error).message);
    }
  }
  report.assets.planned = assets.length;
  for (const a of assets) {
    report.assets.byGroup[a.grp] = (report.assets.byGroup[a.grp] ?? 0) + 1;
    report.assets.versions += a.versions.length;
    report.assets.variants += a.versions.reduce((n, v) => n + Object.keys(v.variants).length, 0);
  }
  log(`${assets.length} assets, ${report.assets.versions} versions, ${report.assets.variants} variants planned; ${report.assets.failed.length} failed`);

  const entryOf = new Map(assets.map((a) => [a.id, a.imported.entry]));
  const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
  let pins: ReturnType<typeof planPins> = [];
  try {
    pins = planPins(
      read("maia/content/code/configs/sandbox-4/assets/config.json"),
      read("maia/content/code/configs/sandbox-4/garden/config.json"),
      read("maia/content/assets/pins.fixture.json"),
      entryOf,
    );
  } catch (e) {
    report.verified.pinErrors.push((e as Error).message);
  }

  if (opts.dry) {
    report.ok = !report.assets.failed.length && !report.verified.pinErrors.length;
    return report;
  }

  log(`uploading ${files.size} files…`);
  const keyOf = new Map<string, string>();
  await inParallel([...files.values()], 8, async (f) => {
    keyOf.set(f.hash, (await store.has(f.hash)) ? (await import("../src/blobs")).keyOf(f.hash) : await store.put(f.hash, f.bytes, MEDIA));
  });

  await migrate(db);
  await db.transaction(async (tx) => {
    await writeAssets(tx, assets, [...files.values()], keyOf, report.written);
    await writePins(tx, "sandbox-1", pins, report.written, report.verified.pinErrors);
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
  const { rows: groups } = await db.query<{ grp: string; n: string }>(`SELECT grp, count(*) AS n FROM play.assets GROUP BY grp`);
  report.verified.dbByGroup = Object.fromEntries(groups.map((g) => [g.grp, Number(g.n)]));
  const feedByGroup: Record<string, number> = {};
  for (const r of rows) feedByGroup[r.record?.card?.group] = (feedByGroup[r.record?.card?.group] ?? 0) + 1;
  report.verified.groupsMatch = JSON.stringify(Object.entries(feedByGroup).sort()) === JSON.stringify(Object.entries(report.verified.dbByGroup).sort());
  const { rows: pinned } = await db.query<{ n: string }>(
    `SELECT count(*) AS n FROM play.sandbox_pins p JOIN play.asset_versions v ON v.id = p.version_id WHERE p.sandbox_id = 'sandbox-1'`,
  );
  report.verified.pinsResolved = Number(pinned[0].n);
  if (report.verified.pinsResolved !== pins.length) report.verified.pinErrors.push(`${report.verified.pinsResolved} of ${pins.length} pins resolve`);
  report.ok = !report.assets.failed.length && !report.verified.fileErrors.length && report.verified.groupsMatch && !report.verified.pinErrors.length;
  return report;
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
    `| Written now | ${Object.entries(r.written).map(([k, n]) => `${k} ${n}`).join(", ")} |`,
    `| Files read back and hash-checked | ${r.verified.filesReadBack} |`,
    `| Assets per group match the feed | ${r.verified.groupsMatch ? "yes" : "no"} |`,
    `| Sandbox 1 pins resolving | ${r.verified.pinsResolved} |`,
  ];
  const errs = [...r.assets.failed, ...r.verified.fileErrors, ...r.verified.pinErrors];
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

// Every asset is a Loro document too (play/SPEC.md §4.4, "Version control"): `asset:<uuid>`, holding its readable
// source as text (kept line by line and character by character), its label, note, engine and card, and its variants.
// The asset's versions (play.asset_versions, content-addressed, numbered on accept) stay what the catalog, the pins and
// the box read; the document keeps every edit under them: an agent drafts a change edit by edit in an intent variant
// (doc_edit, ./versioned.ts), proposes the variant as a version (./assetversions.ts), and accepting merges it and
// numbers the version, the document's named version of the same number. The first time an asset is touched here its
// document is made from its history: each accepted version an edit at its own date, named its own number (the work
// kept between two versions, ../import/history, as the edits between them); each proposal not accepted a variant at
// its seed, closed as it was decided.
//
// A source is code: it is never merged unseen. An asset's proposal is accepted only on the head it was made on (a
// moved head archives it, ./proposals.ts), so the merged result is the proposed version itself, the one the
// intents' board built and showed in the asset box; the document's own rule (a code merge that met other edits needs
// the hash of its previewed result) stands behind it.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Denied, type Me } from "./access";
import { keyOf, type BlobStore } from "./blobs";
import * as docs from "./docs";
import { canonical, hashText } from "./hash";
import type { Db, Queryable } from "./pg";
import { NOTE_MOST } from "./notes";
import { libraryOf, RECIPE_HEAD, recipeTail } from "./recipes";
import { UUID } from "./uuid";
import { named, versionAt, VersionError } from "./versioned";

export const HISTORY = join(import.meta.dir, "../import/history");
export const assetDocId = (asset: string) => `asset:${asset}`;
export class AssetDocError extends VersionError {}

export type AssetJson = {
  schema: "asset/1";
  label: string;
  note?: string;
  source: string;
  engine?: number;
  card?: any;
  defaultVariant?: string;
  variants?: { name: string; source?: string; card?: any }[];
};

export const authorOf = (me: Pick<Me, "id"> | null, via: string | null | undefined): docs.Author => ({
  human: me?.id || null,
  via: via === "mcp" ? "mcp" : via === "import" ? "import" : via === "system" ? "system" : "site",
});
const firstLine = (s: string, n = 160) => (s ?? "").split("\n")[0].slice(0, n);
const libsOf = (code: string) => [...new Set([...code.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]))];

/** a document's errors said as the API's (MCP shows them to the agent) */
async function asAssetError<R>(fn: () => Promise<R>): Promise<R> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof docs.DocError) throw new AssetDocError(e.message, e.status);
    if (e instanceof docs.SchemaError || e instanceof docs.OpError) throw new AssetDocError(e.message);
    throw e;
  }
}

// ---- an asset version as a document's state

/**
 * A version as the document holds it: the version's own source (or, for a kind of variants, its default variant's) as
 * `source`; each variant's card, and its source only where it differs from that one.
 */
export function asAssetJson(label: string, v: { note?: string | null; engine?: number | null; card?: any; defaultVariant?: string | null; source: string; variants?: { name: string; source: string; card?: any }[] }): AssetJson {
  const json: AssetJson = { schema: "asset/1", label: label || "An asset", source: v.source };
  if (v.note) json.note = `${v.note}`.slice(0, NOTE_MOST);
  if (Number.isInteger(v.engine) && (v.engine as number) >= 1) json.engine = v.engine as number;
  if (v.card && typeof v.card === "object" && !Array.isArray(v.card)) json.card = v.card;
  if (v.variants?.length) {
    json.variants = [...v.variants].sort((a, b) => (a.name < b.name ? -1 : 1)).map((x) => ({ name: x.name, ...(x.source !== v.source ? { source: x.source } : {}), ...(x.card ? { card: x.card } : {}) }));
    if (v.defaultVariant) json.defaultVariant = v.defaultVariant;
  }
  return json;
}

async function textOf(store: BlobStore, hash: string | null): Promise<string | null> {
  if (!hash) return null;
  const b = await store.get(hash);
  return b ? new TextDecoder().decode(b) : null;
}
/** a version's readable source: its own, else the library its recipe file wraps (the code the box runs) */
async function sourceOf(store: BlobStore, source: string | null, recipe: string | null): Promise<string> {
  const own = await textOf(store, source);
  if (own !== null) return own;
  const file = await textOf(store, recipe);
  const lib = file ? libraryOf(file) : null;
  if (lib !== null) return lib;
  throw new AssetDocError(`a version's source can't be read (source ${source ?? "none"}, recipe ${recipe ?? "none"})`, 500);
}

type VersionRow = { id: string; number: number | null; recipe_hash: string | null; source_hash: string | null; default_variant: string | null; card: any; engine: number | null; note: string; author: string | null; approved_by: string | null; created: Date; imported: any; via: string | null };

/** one version of an asset, from play's tables, as its document's state */
async function versionJson(q: Queryable, store: BlobStore, label: string, v: VersionRow): Promise<AssetJson> {
  const { rows: xs } = await q.query<{ name: string; recipe_hash: string; source_hash: string | null; card: any }>(
    `SELECT name, recipe_hash, source_hash, card FROM play.asset_variants WHERE version_id = $1 ORDER BY name`, [v.id],
  );
  const variants = await Promise.all(xs.map(async (x) => ({ name: x.name, source: await sourceOf(store, x.source_hash, x.recipe_hash), card: x.card })));
  const own = v.recipe_hash ? await sourceOf(store, v.source_hash, v.recipe_hash) : variants.find((x) => x.name === v.default_variant)?.source ?? variants[0]?.source ?? "";
  return asAssetJson(label, { note: v.note, engine: v.engine, card: v.card, defaultVariant: v.default_variant, source: own, variants });
}

const VERSIONS = `SELECT v.id, v.number, v.recipe_hash, v.source_hash, v.default_variant, v.card, v.engine, v.note, v.author, v.approved_by, v.created, v.imported,
         (SELECT i.proposed_via FROM play.intents i WHERE i.version = v.id AND i.stage = 'accepted' LIMIT 1) AS via
    FROM play.asset_versions v`;

// ---- the work kept between two versions (../import/history)

type Kept = { asset: string; name?: string; after: number; before: number; from: string; lands: string; by: "before"; via: string; steps: { file: string; hash: string; at: string; message: string }[]; final?: { file: string; hash: string } };
/** the edits kept for the asset `asset` (its UUID: the folder ../import/history/<uuid>), or null */
export function keptFor(asset: string, dir = HISTORY): (Kept & { dir: string }) | null {
  if (!UUID.test(asset)) return null;
  const at = join(dir, asset);
  if (!existsSync(join(at, "index.json"))) return null;
  const k = JSON.parse(readFileSync(join(at, "index.json"), "utf8")) as Kept;
  if (k.asset !== asset) throw new AssetDocError(`${at}/index.json names ${k.asset}`, 500);
  return { ...k, dir: at };
}
/** one kept edit's text, held to its hash */
function keptText(k: Kept & { dir: string }, file: string, hash: string): string {
  const text = readFileSync(join(k.dir, file), "utf8");
  if (hashText(text) !== hash) throw new AssetDocError(`${k.asset}: ${file} is not ${hash}`, 500);
  return text;
}

// ---- making an asset's document from its history

/** the frontiers of the document's version `number` */
async function versionFrontiers(q: Queryable, docId: string, number: number): Promise<docs.Frontiers | null> {
  const { rows } = await q.query<{ frontiers: docs.Frontiers }>(`SELECT frontiers FROM play.doc_versions WHERE doc_id = $1 AND number = $2`, [docId, number]);
  return rows[0]?.frontiers ?? null;
}

/**
 * The asset's document, made from its history the first time (in the caller's transaction, the asset's row locked):
 * every accepted version an edit at its date, named its own number, and the edits kept between two of them; then a
 * variant for each intent's work on it that has none yet (at Proposal proposed, the rest closed as they ended).
 */
export async function ensureAssetDoc(q: Queryable, store: BlobStore, asset: string, dir = HISTORY): Promise<{ id: string; made: boolean; variants: number; kept: number }> {
  const id = assetDocId(asset);
  const { rows: a } = await q.query<{ grp: string; slug: string; label: string }>(`SELECT grp, slug, label FROM play.assets WHERE id = $1 FOR UPDATE`, [asset]);
  if (!a[0]) throw new AssetDocError(`there is no asset ${asset}`, 404);
  const { slug } = a[0];
  const label = a[0].label || slug;
  const { rows: have } = await q.query(`SELECT 1 FROM play.docs WHERE id = $1`, [id]);
  let made = false, keptSteps = 0;
  if (!have.length) {
    made = true;
    const { rows: vs } = await q.query<VersionRow>(`${VERSIONS} WHERE v.asset_id = $1 AND v.number IS NOT NULL ORDER BY v.number`, [asset]);
    // an asset not accepted yet stands on an empty source: its proposal is the variant that fills it
    if (!vs.length) await docs.createDoc(q, { id, schema: "asset/1", json: { schema: "asset/1", label, source: "" }, author: { human: null, via: "system" }, message: "a new asset, not yet accepted", label, grp: a[0].grp });
    const kept = keptFor(asset, dir);
    let prev: AssetJson | null = null;
    for (const [i, v] of vs.entries()) {
      const json = await versionJson(q, store, label, v);
      const via = v.imported ? "import" : v.via === "mcp" ? "mcp" : "site";
      // the work kept between the version before and this one, where the two are exactly the versions it ran between
      if (kept && prev && vs[i - 1].number === kept.after && v.number === kept.before && vs[i - 1].source_hash === kept.from && v.source_hash === kept.lands) {
        const by: docs.Author = { human: v.author, via: kept.via === "mcp" ? "mcp" : "site" };
        for (const s of kept.steps) {
          const e = await docs.commit(q, id, { target: { ...prev, source: keptText(kept, s.file, s.hash) }, message: s.message, author: by, kind: "edit", at: new Date(s.at) });
          if (e) keptSteps++;
        }
        if (kept.final && keptText(kept, kept.final.file, kept.final.hash) !== json.source) throw new AssetDocError(`${kept.asset}: the kept edits do not lead to v${v.number}'s source`, 500);
      }
      const message = `v${v.number}: ${firstLine(v.note) || (i === 0 ? "its first version" : "a new version")}`;
      if (i === 0) await docs.createDoc(q, { id, schema: "asset/1", json, author: { human: v.author, via }, message, at: v.created, version: v.note ?? "", number: v.number!, label, grp: a[0].grp });
      else {
        await docs.commit(q, id, { target: json, message, author: { human: v.author, via }, kind: "import", at: v.created });
        await docs.nameVersion(q, id, { note: v.note ?? "", author: { human: v.approved_by, via: v.imported ? "import" : "site" }, at: v.created, number: v.number! });
      }
      prev = json;
    }
  }
  // each intent's work that has no variant yet: a variant at its seed, the proposed version its one edit
  const { rows: ps } = await q.query<{ id: string; status: string; base_number: number | null; author: string | null; via: string | null; note: string; created: Date; version: string }>(
    `SELECT i.id, CASE i.stage WHEN 'proposal' THEN 'proposal' ELSE 'archived' END AS status, b.number AS base_number, i.proposed_by AS author,
            i.proposed_via AS via, COALESCE(i.work_note, '') AS note, i.proposed_at AS created, i.version
       FROM play.intents i LEFT JOIN play.asset_versions b ON b.id = i.base
      WHERE i.asset_id = $1 AND i.work = 'asset_version' AND i.doc_variant IS NULL AND i.stage <> 'accepted' ORDER BY i.proposed_at`,
    [asset],
  );
  for (const p of ps) {
    const { rows: v } = await q.query<VersionRow>(`${VERSIONS} WHERE v.id = $1`, [p.version]);
    const json = await versionJson(q, store, label, v[0]);
    const b = await variantAt(q, id, p.base_number, { human: p.author, via: p.via === "mcp" ? "mcp" : "site" }, p.note);
    await docs.commit(q, id, { variant: b, target: json, message: firstLine(p.note) || "proposed", author: { human: p.author, via: p.via === "mcp" ? "mcp" : "site" }, at: p.created });
    await docs.propose(q, id, b, { note: p.note, author: { human: p.author, via: p.via === "mcp" ? "mcp" : "site" } });
    if (p.status !== "proposal") await docs.close(q, id, b, { author: { human: null, via: "system" }, status: p.status as "archived" });
    await q.query(`UPDATE play.intents SET doc_variant = $2, doc_id = $3 WHERE id = $1`, [p.id, b, id]);
    await q.query(`UPDATE play.doc_variants SET intent_id = $1 WHERE id = $2`, [p.id, b]);
  }
  return { id, made, variants: ps.length, kept: keptSteps };
}

/**
 * The asset's document for reading (its history, an edit, the recipe at an edit): where it is there already and every
 * intent's work has its variant, its id straight away, with no transaction and no lock on the asset; only where something is
 * missing, made under the lock as ensureAssetDoc does. A read never waits behind another's work or proposal.
 */
export async function assetDocFor(db: Db, store: BlobStore, asset: string): Promise<{ id: string }> {
  const id = assetDocId(asset);
  const { rows } = await db.query<{ ready: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM play.docs WHERE id = $1)
            AND NOT EXISTS (SELECT 1 FROM play.intents i WHERE i.asset_id = $2 AND i.work = 'asset_version' AND i.doc_variant IS NULL AND i.stage <> 'accepted') AS ready`,
    [id, asset],
  );
  if (rows[0]?.ready) return { id };
  return db.transaction((q) => ensureAssetDoc(q, store, asset));
}

/**
 * A new variant of the asset's document seeded at version `seed` (the head a proposal was made on), or, for a new
 * asset's first version, at the document's empty start (a variant made on it merges into it field by field).
 */
async function variantAt(q: Queryable, docId: string, seed: number | null, author: docs.Author, note: string): Promise<number> {
  let at: docs.Frontiers | undefined;
  if (seed !== null) {
    const f = await versionFrontiers(q, docId, seed);
    if (!f) throw new AssetDocError(`${docId} has no version ${seed}`, 500);
    at = f;
  } else if ((await docs.versionsOf(q, docId)).length) at = [];
  return (await docs.variant(q, docId, { author, note, ...(at ? { seed: at } : {}) })).id;
}

/** every asset's document, made where it is missing or where an intent's work on it has no variant yet (the deploy's import) */
export async function ensureAssetDocs(db: Db, store: BlobStore, dir = HISTORY): Promise<AssetDocsReport> {
  const out: AssetDocsReport = { made: 0, variants: 0, kept: 0, edits: 0, versions: 0, bytes: 0, errors: [] };
  const { rows } = await db.query<{ id: string; grp: string; slug: string }>(
    `SELECT a.id, a.grp, a.slug FROM play.assets a
      WHERE NOT EXISTS (SELECT 1 FROM play.docs d WHERE d.id = 'asset:' || a.id::text)
         OR EXISTS (SELECT 1 FROM play.intents i WHERE i.asset_id = a.id AND i.work = 'asset_version' AND i.doc_variant IS NULL AND i.stage <> 'accepted')
      ORDER BY a.grp, a.slug`,
  );
  for (const r of rows) {
    try {
      const got = await db.transaction((q) => ensureAssetDoc(q, store, r.id, dir));
      out.made += got.made ? 1 : 0;
      out.variants += got.variants;
      out.kept += got.kept;
    } catch (e) {
      out.errors.push(`${r.grp}/${r.slug}: ${(e as Error).message}`);
    }
  }
  const { rows: t } = await db.query<{ docs: string; edits: string; bytes: string; versions: string }>(
    `SELECT (SELECT count(*) FROM play.docs WHERE type = 'asset') AS docs,
            (SELECT count(*) FROM play.doc_edits u JOIN play.docs d ON d.id = u.doc_id WHERE d.type = 'asset') AS edits,
            (SELECT COALESCE(sum(length(u.bytes)), 0) FROM play.doc_edits u JOIN play.docs d ON d.id = u.doc_id WHERE d.type = 'asset') AS bytes,
            (SELECT count(*) FROM play.doc_versions v JOIN play.docs d ON d.id = v.doc_id WHERE d.type = 'asset') AS versions`,
  );
  out.docs = Number(t[0].docs);
  out.edits = Number(t[0].edits);
  out.bytes = Number(t[0].bytes);
  out.versions = Number(t[0].versions);
  return out;
}
export type AssetDocsReport = { made: number; variants: number; kept: number; edits: number; versions: number; bytes: number; docs?: number; errors: string[] };

// ---- an intent's work as a variant (./assetversions.ts, ./work.ts)

/** a variant's state: the whole asset as it stands on that variant */
export async function variantState(q: Queryable, asset: string, b: number): Promise<AssetJson> {
  return (await docs.readDoc(q, assetDocId(asset), { variant: b })).json as AssetJson;
}

/**
 * The variant of an intent's work (in the proposing transaction, the asset's document made first): the one it was made
 * on, its last edit the version as proposed; or a new variant seeded at the head it was made on, the version its one
 * edit. Proposed.
 */
export async function proposalVariant(q: Queryable, store: BlobStore, o: { asset: string; seed: number | null; json: AssetJson; note: string; author: docs.Author; variant?: number }): Promise<number> {
  return asAssetError(async () => {
    const { id } = await ensureAssetDoc(q, store, o.asset);
    const message = firstLine(o.note) || "proposed";
    const b = o.variant !== undefined ? o.variant : await variantAt(q, id, o.seed, o.author, o.note);
    await docs.commit(q, id, { variant: b, target: o.json, message, author: o.author });
    await docs.propose(q, id, b, { note: o.note, author: o.author });
    return b;
  });
}

/** an intent's accepted work: its variant merged into the asset's document and named its version `n` */
export async function acceptVariant(q: Queryable, store: BlobStore, p: { id: string; asset_id: string; note: string }, me: Me, n: number): Promise<void> {
  await asAssetError(async () => {
    const { id } = await ensureAssetDoc(q, store, p.asset_id);
    const { rows } = await q.query<{ doc_variant: string | null }>(`SELECT doc_variant FROM play.intents WHERE id = $1`, [p.id]);
    const b = rows[0]?.doc_variant;
    if (b == null) throw new AssetDocError(`intent ${p.id}'s work has no variant`, 500);
    const v = await docs.accept(q, id, Number(b), { author: authorOf(me, "site"), note: p.note });
    if (v.number !== n) throw new Error(`asset ${p.asset_id} and its document disagree: version ${n} against ${v.number}`);
  });
}

// ---- editing (doc_edit, ./versioned.ts)

/** a replace by its text into the range operation it is, against the text as the operations before it left it */
function rangeOps(cur: AssetJson, edits: unknown): docs.Op[] {
  if (!Array.isArray(edits) || !edits.length) throw new AssetDocError("Give the edits as a list.");
  if (edits.length > 500) throw new AssetDocError("At most 500 operations an edit.");
  const texts = new Map<string, string>();
  const textAt = (path: (string | number)[]) => {
    const k = JSON.stringify(path);
    if (!texts.has(k)) {
      let v: any = cur;
      for (const p of path) v = v?.[p as any];
      texts.set(k, typeof v === "string" ? v : "");
    }
    return texts.get(k)!;
  };
  return edits.map((e: any, i) => {
    if (!e || typeof e !== "object") throw new AssetDocError(`Edit ${i + 1} is not an edit.`);
    if (Array.isArray(e.path) && e.path[0] === "schema") throw new AssetDocError(`Edit ${i + 1}: an asset's schema is not edited.`);
    if (e.op === "replace") {
      const field = e.field === "note" ? "note" : "source";
      let path: (string | number)[] = [field];
      if (e.variant !== undefined) {
        const j = (cur.variants ?? []).findIndex((v) => v.name === e.variant);
        if (j < 0) throw new AssetDocError(`Edit ${i + 1}: there is no variant ${e.variant}.`);
        if (typeof cur.variants![j].source !== "string") throw new AssetDocError(`Edit ${i + 1}: variant ${e.variant} has the asset's own source: edit that.`);
        path = ["variants", j, "source"];
      }
      if (typeof e.find !== "string" || !e.find) throw new AssetDocError(`Edit ${i + 1}: say what to find.`);
      if (typeof e.replace !== "string") throw new AssetDocError(`Edit ${i + 1}: say what to replace it with.`);
      const t = textAt(path);
      const at = t.indexOf(e.find);
      if (at < 0) throw new AssetDocError(`Edit ${i + 1}: the text to find is not in the ${path.join(".")}.`);
      if (t.indexOf(e.find, at + 1) >= 0) throw new AssetDocError(`Edit ${i + 1}: the text to find is in the ${path.join(".")} more than once: give more of it.`);
      texts.set(JSON.stringify(path), t.slice(0, at) + e.replace + t.slice(at + e.find.length));
      return { op: "text", path, index: at, delete: e.find.length, insert: e.replace } as docs.Op;
    }
    if (e.op === "text" && Array.isArray(e.path)) {
      const t = textAt(e.path);
      const idx = Number(e.index), del = Number(e.delete ?? 0), ins = `${e.insert ?? ""}`;
      texts.set(JSON.stringify(e.path), t.slice(0, idx) + ins + t.slice(idx + del));
    }
    if (!["set", "insert", "delete", "move", "text"].includes(e.op)) throw new AssetDocError(`Edit ${i + 1}: an edit is one of replace, text, set, insert, delete, move.`);
    return e as docs.Op;
  });
}

/**
 * An edit of an asset's variant, as the asset reads it (./versioned.ts keepEdit): operations (a replace by its text, a
 * range of a text, a card field set), the whole asset, or a few of its fields (its source, label, note).
 */
export async function assetChange(cur: AssetJson, c: { edits?: unknown; whole?: unknown; fields?: Record<string, unknown> }): Promise<{ ops: docs.Op[] } | { target: unknown }> {
  if (c.edits !== undefined) return { ops: rangeOps(cur, c.edits) };
  if (c.whole !== undefined) {
    if (!c.whole || typeof c.whole !== "object") throw new AssetDocError("A whole asset is an object (doc_at's `json`).");
    return { target: { ...(c.whole as object), schema: cur.schema } };
  }
  const f = c.fields ?? {};
  const target: AssetJson = { ...cur };
  if (f.source !== undefined) {
    if (typeof f.source !== "string") throw new AssetDocError("The source is text.");
    target.source = f.source;
  }
  if (f.label !== undefined) target.label = `${f.label}`.trim().slice(0, 200);
  if (f.note !== undefined) target.note = `${f.note}`.slice(0, NOTE_MOST);
  for (const k of Object.keys(f)) if (!["source", "label", "note"].includes(k)) throw new AssetDocError(`An asset's fields set so are its source, label and note, not ${k}.`);
  return { target };
}

function admin(me: Me | null): Me {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (me.level !== "admin") throw new Denied("An asset's history, edit by edit, is for Maia City's admins.");
  return me;
}

/**
 * The version an edit leads to: the version it was named, where it was; else the one after the last version before
 * it (an edit on an intent variant: the one after its seed).
 */
async function numberAt(q: Queryable, docId: string, seq: number): Promise<{ n: number; exact: number | null }> {
  const { rows } = await q.query<{ variant: string | null; seed: docs.Frontiers | null }>(
    `SELECT e.variant, v.seed FROM play.doc_edits e LEFT JOIN play.doc_variants v ON v.id = e.variant WHERE e.doc_id = $1 AND e.seq = $2`, [docId, seq],
  );
  if (!rows[0]) throw new AssetDocError(`no edit ${seq}`, 404);
  const versions = await docs.versionsOf(q, docId);
  const edits = await named(q, await docs.history(q, docId), versions);
  const i = edits.findIndex((s) => s.seq === seq);
  if (i < 0) {
    const seed = rows[0].seed ? await versionAt(q, docId, rows[0].seed) : null;
    return { n: (seed ?? 0) + 1, exact: null };
  }
  if (edits[i].version) return { n: edits[i].version!, exact: edits[i].version! };
  let last = 0;
  for (let j = 0; j < i; j++) if (edits[j].version) last = edits[j].version!;
  return { n: last + 1, exact: null };
}

/**
 * The recipe file asset `asset` builds at edit `seq`, as the catalog lists a build (its hash, its size, its record), so
 * the asset viewer builds it in the box like any other: at an edit that is a version, that version's own recipe file;
 * at any other edit, one made the same way (the box's header, the edit's source, the line naming the asset and the
 * version the edit leads to), kept among play's files by its hash. Admins only.
 */
export async function recipeAtEdit(db: Db, store: BlobStore, me: Me | null, asset: string, seq: number) {
  admin(me);
  if (!Number.isInteger(seq) || seq < 1) throw new AssetDocError(`${seq} is not an edit.`, 404);
  return asAssetError(async () => {
    const { id: docId } = await assetDocFor(db, store, asset);
    const { rows: a } = await db.query<{ grp: string; slug: string; label: string }>(`SELECT grp, slug, label FROM play.assets WHERE id = $1`, [asset]);
    const json = (await docs.stateAt(db, docId, { edit: seq })) as AssetJson;
    const { n, exact } = await numberAt(db, docId, seq);
    const variant = json.defaultVariant ?? null;
    const v = variant ? json.variants?.find((x) => x.name === variant) : undefined;
    const record = (v?.card ?? json.card ?? {}) as any;
    const base = { asset, group: a[0].grp, slug: a[0].slug, v: n, variant, first: true, label: record?.card?.label ?? json.label, edit: seq };
    // a version's point: its own recipe file, as the catalog has it, where the edit holds that version's source
    if (exact !== null) {
      const { rows } = await db.query<{ hash: string; size: string; card: any; source_hash: string | null }>(
        `SELECT COALESCE(x.recipe_hash, v.recipe_hash) AS hash, f.size, COALESCE(x.card, v.card) AS card, COALESCE(x.source_hash, v.source_hash) AS source_hash
           FROM play.asset_versions v LEFT JOIN play.asset_variants x ON x.version_id = v.id AND x.name = v.default_variant
           JOIN play.files f ON f.hash = COALESCE(x.recipe_hash, v.recipe_hash)
          WHERE v.asset_id = $1 AND v.number = $2`,
        [asset, exact],
      );
      const src = v?.source ?? json.source;
      if (rows[0] && (rows[0].source_hash === null || rows[0].source_hash === hashText(src))) return { ...base, hash: rows[0].hash, size: Number(rows[0].size), record: rows[0].card, version: exact };
    }
    const source = v?.source ?? json.source;
    const text = RECIPE_HEAD + source + recipeTail(a[0].slug, n, variant);
    const hash = hashText(text);
    const bytes = new TextEncoder().encode(text);
    const key = (await store.has(hash)) ? keyOf(hash) : await store.put(hash, bytes, "text/javascript");
    await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, 'text/javascript', $3) ON CONFLICT (hash) DO NOTHING`, [hash, bytes.length, key]);
    const made = { ...record, manifest: { ...(record.manifest ?? {}), libs: libsOf(source) }, card: { ...(record.card ?? {}), recipe: hash, version: n, v: n, ...(variant ? { variant } : {}) } };
    return { ...base, hash, size: bytes.length, record: made, version: null };
  });
}

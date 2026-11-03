// Every asset is a Loro document too (play/SPEC.md §4.4): `asset:<uuid>`, holding its readable source as text (kept line
// by line and character by character), its label, note, engine and card, and its variants. The asset's versions
// (play.asset_versions, content-addressed, numbered on accept) stay what the catalog, the pins and the box read; the
// document keeps every step under them: an agent drafts a change step by step on a branch (asset_edit), proposes the
// branch as a version, and accepting merges the branch and numbers the version, the document's named version of the
// same number. The first time an asset is touched here its document is made from its history: each accepted version a
// step at its own date, named its own number (the work kept between two versions, ../import/history, as the steps
// between them); each proposal not accepted a branch at its base, closed as it was decided.
//
// A source is code: it is never merged unseen. An asset's proposal is accepted only on the head it was made on (a
// moved head makes it stale, ./proposals.ts), so the merged result is the proposed version itself, the one the
// Proposals page built and showed in the asset box; the document's own rule (a code merge that met other edits needs
// the hash of its previewed result) stands behind it.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Denied, must, type Me } from "./access";
import { keyOf, type BlobStore } from "./blobs";
import * as docs from "./docs";
import { EditError } from "./docs/core";
import { canonical, hashText } from "./hash";
import type { Db, Queryable } from "./pg";
import { libraryOf, RECIPE_HEAD, recipeTail } from "./recipes";
import { named } from "./stories";

export const HISTORY = join(import.meta.dir, "../import/history");
export const assetDocId = (asset: string) => `asset:${asset}`;
export class AssetDocError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

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
    if (e instanceof docs.SchemaError || e instanceof EditError) throw new AssetDocError(e.message);
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
  if (v.note) json.note = `${v.note}`.slice(0, 20000);
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
         (SELECT p.via FROM play.proposals p WHERE p.version = v.id AND p.status = 'accepted' LIMIT 1) AS via
    FROM play.asset_versions v`;

// ---- the work kept between two versions (../import/history)

type Kept = { asset: string; after: number; before: number; from: string; lands: string; by: "before"; via: string; steps: { file: string; hash: string; at: string; message: string }[]; final?: { file: string; hash: string } };
/** the steps kept for asset `grp/slug`, or null */
export function keptFor(grp: string, slug: string, dir = HISTORY): (Kept & { dir: string }) | null {
  const at = join(dir, grp, slug);
  if (!existsSync(join(at, "index.json"))) return null;
  const k = JSON.parse(readFileSync(join(at, "index.json"), "utf8")) as Kept;
  if (k.asset !== `${grp}/${slug}`) throw new AssetDocError(`${at}/index.json names ${k.asset}`, 500);
  return { ...k, dir: at };
}
/** every asset with kept steps: group/slug */
export function keptAssets(dir = HISTORY): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const g of readdirSync(dir)) if (statSync(join(dir, g)).isDirectory()) for (const s of readdirSync(join(dir, g))) if (existsSync(join(dir, g, s, "index.json"))) out.push(`${g}/${s}`);
  return out;
}
/** one kept step's text, held to its hash */
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
 * every accepted version a step at its date, named its own number, and the steps kept between two of them; then a
 * branch for each of its proposals that has none yet (open ones proposed, decided ones closed as they were).
 */
export async function ensureAssetDoc(q: Queryable, store: BlobStore, asset: string, dir = HISTORY): Promise<{ id: string; made: boolean; branches: number; kept: number }> {
  const id = assetDocId(asset);
  const { rows: a } = await q.query<{ grp: string; slug: string; label: string }>(`SELECT grp, slug, label FROM play.assets WHERE id = $1 FOR UPDATE`, [asset]);
  if (!a[0]) throw new AssetDocError(`there is no asset ${asset}`, 404);
  const { grp, slug } = a[0];
  const label = a[0].label || slug;
  const { rows: have } = await q.query(`SELECT 1 FROM play.docs WHERE id = $1`, [id]);
  let made = false, keptSteps = 0;
  if (!have.length) {
    made = true;
    const { rows: vs } = await q.query<VersionRow>(`${VERSIONS} WHERE v.asset_id = $1 AND v.number IS NOT NULL ORDER BY v.number`, [asset]);
    // an asset not accepted yet stands on an empty source: its proposal is the branch that fills it
    if (!vs.length) await docs.createDoc(q, { id, schema: "asset/1", json: { schema: "asset/1", label, source: "" }, author: { human: null, via: "system" }, message: "a new asset, not yet accepted" });
    const kept = keptFor(grp, slug, dir);
    let prev: AssetJson | null = null;
    for (const [i, v] of vs.entries()) {
      const json = await versionJson(q, store, label, v);
      const via = v.imported ? "import" : v.via === "mcp" ? "mcp" : "site";
      // the work kept between the version before and this one, where the two are exactly the versions it ran between
      if (kept && prev && vs[i - 1].number === kept.after && v.number === kept.before && vs[i - 1].source_hash === kept.from && v.source_hash === kept.lands) {
        const by: docs.Author = { human: v.author, via: kept.via === "mcp" ? "mcp" : "site" };
        for (const s of kept.steps) {
          const step = await docs.commit(q, id, { target: { ...prev, source: keptText(kept, s.file, s.hash) }, message: s.message, author: by, kind: "edit", at: new Date(s.at) });
          if (step) keptSteps++;
        }
        if (kept.final && keptText(kept, kept.final.file, kept.final.hash) !== json.source) throw new AssetDocError(`${kept.asset}: the kept steps do not lead to v${v.number}'s source`, 500);
      }
      const message = `v${v.number}: ${firstLine(v.note) || (i === 0 ? "its first version" : "a new version")}`;
      if (i === 0) await docs.createDoc(q, { id, schema: "asset/1", json, author: { human: v.author, via }, message, at: v.created, version: v.note ?? "", number: v.number! });
      else {
        await docs.commit(q, id, { target: json, message, author: { human: v.author, via }, kind: "import", at: v.created });
        await docs.nameVersion(q, id, { note: v.note ?? "", author: { human: v.approved_by, via: v.imported ? "import" : "site" }, at: v.created, number: v.number! });
      }
      prev = json;
    }
  }
  // each proposal that has no branch yet: a branch at its base, the proposed version its one step
  const { rows: ps } = await q.query<{ id: string; status: string; base_number: number | null; author: string | null; via: string | null; note: string; created: Date; version: string }>(
    `SELECT p.id, p.status, b.number AS base_number, p.author, p.via, p.note, p.created, p.version
       FROM play.proposals p LEFT JOIN play.asset_versions b ON b.id = p.base
      WHERE p.asset_id = $1 AND p.kind = 'asset_version' AND p.doc_branch IS NULL AND p.status <> 'accepted' ORDER BY p.created`,
    [asset],
  );
  for (const p of ps) {
    const { rows: v } = await q.query<VersionRow>(`${VERSIONS} WHERE v.id = $1`, [p.version]);
    const json = await versionJson(q, store, label, v[0]);
    const b = await branchAt(q, id, p.base_number, { human: p.author, via: p.via === "mcp" ? "mcp" : "site" }, p.note);
    await docs.commit(q, id, { branch: b, target: json, message: firstLine(p.note) || "proposed", author: { human: p.author, via: p.via === "mcp" ? "mcp" : "site" }, at: p.created });
    await docs.propose(q, id, b, { note: p.note, author: { human: p.author, via: p.via === "mcp" ? "mcp" : "site" } });
    if (p.status !== "open") await docs.close(q, id, b, { author: { human: null, via: "system" }, status: p.status as "rejected" | "withdrawn" | "stale" });
    await q.query(`UPDATE play.proposals SET doc_branch = $2 WHERE id = $1`, [p.id, b]);
  }
  return { id, made, branches: ps.length, kept: keptSteps };
}

/**
 * A new branch of the asset's document at version `base` (the head a proposal was made on), or, for a new asset's
 * first version, at the document's empty start (a branch made on it merges into it field by field).
 */
async function branchAt(q: Queryable, docId: string, base: number | null, author: docs.Author, note: string): Promise<number> {
  let at: docs.Frontiers | undefined;
  if (base !== null) {
    const f = await versionFrontiers(q, docId, base);
    if (!f) throw new AssetDocError(`${docId} has no version ${base}`, 500);
    at = f;
  } else if ((await docs.versionsOf(q, docId)).length) at = [];
  return (await docs.branch(q, docId, { author, note, ...(at ? { at } : {}) })).id;
}

/** every asset's document, made where it is missing or where a proposal has no branch yet (the deploy's import) */
export async function ensureAssetDocs(db: Db, store: BlobStore, dir = HISTORY): Promise<AssetDocsReport> {
  const out: AssetDocsReport = { made: 0, branches: 0, kept: 0, steps: 0, versions: 0, bytes: 0, errors: [] };
  const { rows } = await db.query<{ id: string; grp: string; slug: string }>(
    `SELECT a.id, a.grp, a.slug FROM play.assets a
      WHERE NOT EXISTS (SELECT 1 FROM play.docs d WHERE d.id = 'asset:' || a.id::text)
         OR EXISTS (SELECT 1 FROM play.proposals p WHERE p.asset_id = a.id AND p.kind = 'asset_version' AND p.doc_branch IS NULL AND p.status <> 'accepted')
      ORDER BY a.grp, a.slug`,
  );
  for (const r of rows) {
    try {
      const got = await db.transaction((q) => ensureAssetDoc(q, store, r.id, dir));
      out.made += got.made ? 1 : 0;
      out.branches += got.branches;
      out.kept += got.kept;
    } catch (e) {
      out.errors.push(`${r.grp}/${r.slug}: ${(e as Error).message}`);
    }
  }
  const { rows: t } = await db.query<{ docs: string; steps: string; bytes: string; versions: string }>(
    `SELECT (SELECT count(*) FROM play.docs WHERE type = 'asset') AS docs,
            (SELECT count(*) FROM play.doc_updates u JOIN play.docs d ON d.id = u.doc_id WHERE d.type = 'asset') AS steps,
            (SELECT COALESCE(sum(length(u.bytes)), 0) FROM play.doc_updates u JOIN play.docs d ON d.id = u.doc_id WHERE d.type = 'asset') AS bytes,
            (SELECT count(*) FROM play.doc_versions v JOIN play.docs d ON d.id = v.doc_id WHERE d.type = 'asset') AS versions`,
  );
  out.docs = Number(t[0].docs);
  out.steps = Number(t[0].steps);
  out.bytes = Number(t[0].bytes);
  out.versions = Number(t[0].versions);
  return out;
}
export type AssetDocsReport = { made: number; branches: number; kept: number; steps: number; versions: number; bytes: number; docs?: number; errors: string[] };

// ---- proposals as branches (./proposals.ts)

/** an asset's open draft branch `b`, and the version it was made on */
export async function draftOf(q: Queryable, asset: string, b: unknown): Promise<{ id: number; base: number | null; status: string }> {
  const n = Number(b);
  if (!Number.isInteger(n) || n < 1) throw new AssetDocError("A draft is named by its number.");
  const docId = assetDocId(asset);
  const { rows } = await q.query<{ id: string; status: string; base: docs.Frontiers }>(`SELECT id, status, base FROM play.doc_branches WHERE id = $1 AND doc_id = $2`, [n, docId]);
  if (!rows[0]) throw new AssetDocError(`This asset has no draft ${n}.`, 404);
  if (rows[0].status !== "open") throw new AssetDocError(`Draft ${n} was ${rows[0].status}: start a new one.`, 409);
  return { id: n, base: await versionAt(q, docId, rows[0].base), status: rows[0].status };
}
/** the version number whose point of the document is `frontiers`, or null */
async function versionAt(q: Queryable, docId: string, frontiers: docs.Frontiers): Promise<number | null> {
  const key = (f: docs.Frontiers) => canonical([...f].sort((a, b) => (a.peer < b.peer ? -1 : 1)));
  const want = key(frontiers);
  for (const v of await docs.versionsOf(q, docId)) if (key(v.frontiers) === want) return v.number;
  return null;
}
/** a draft's state: the whole asset as it stands on that branch */
export async function draftState(q: Queryable, asset: string, b: number): Promise<AssetJson> {
  return (await docs.readDoc(q, assetDocId(asset), { branch: b })).json as AssetJson;
}

/**
 * A proposal's branch (in the proposal's transaction, the asset's document made first): the draft it was made on, its
 * last step the version as proposed; or a new branch at the head it was made on, the version its one step. Proposed.
 */
export async function proposalBranch(q: Queryable, store: BlobStore, o: { asset: string; base: number | null; json: AssetJson; note: string; author: docs.Author; draft?: number }): Promise<number> {
  return asAssetError(async () => {
    const { id } = await ensureAssetDoc(q, store, o.asset);
    const message = firstLine(o.note) || "proposed";
    let b: number;
    if (o.draft !== undefined) {
      b = (await draftOf(q, o.asset, o.draft)).id;
      await docs.commit(q, id, { branch: b, target: o.json, message, author: o.author });
    } else {
      b = await branchAt(q, id, o.base, o.author, o.note);
      await docs.commit(q, id, { branch: b, target: o.json, message, author: o.author });
    }
    await docs.propose(q, id, b, { note: o.note, author: o.author });
    return b;
  });
}

/** an accepted proposal's branch merged into the asset's document and named its version `n` */
export async function acceptBranch(q: Queryable, store: BlobStore, p: { id: string; asset_id: string; note: string }, me: Me, n: number): Promise<void> {
  await asAssetError(async () => {
    const { id } = await ensureAssetDoc(q, store, p.asset_id);
    const { rows } = await q.query<{ doc_branch: string | null }>(`SELECT doc_branch FROM play.proposals WHERE id = $1`, [p.id]);
    const b = rows[0]?.doc_branch;
    if (b == null) throw new AssetDocError(`proposal ${p.id} has no branch`, 500);
    const v = await docs.accept(q, id, Number(b), { author: authorOf(me, "site"), note: p.note });
    if (v.number !== n) throw new Error(`asset ${p.asset_id} and its document disagree: version ${n} against ${v.number}`);
  });
}

/** a decided proposal's branch closed (rejected, withdrawn, stale): its steps stay in the history, on their side line */
export async function closeBranch(q: Queryable, asset: string, branch: string | number | null | undefined, me: Me | null, status: "rejected" | "withdrawn" | "stale"): Promise<void> {
  if (branch == null) return;
  const { rows } = await q.query<{ status: string }>(`SELECT status FROM play.doc_branches WHERE id = $1`, [branch]);
  if (rows[0] && (rows[0].status === "open" || rows[0].status === "proposed")) await docs.close(q, assetDocId(asset), Number(branch), { author: authorOf(me, "site"), status });
}

// ---- drafting step by step (MCP asset_edit)

export type AssetEdit =
  | docs.Edit
  | { op: "replace"; find: string; replace: string; field?: "source" | "note"; variant?: string };
export type AssetDraft = { asset: string; message: string; branch?: number; edits?: unknown; source?: unknown; label?: unknown; note?: unknown };

/** a replace by its text into the range edit it is, against the text as the edits before it left it */
function rangeEdits(cur: AssetJson, edits: unknown): docs.Edit[] {
  if (!Array.isArray(edits) || !edits.length) throw new AssetDocError("Give the edits as a list.");
  if (edits.length > 500) throw new AssetDocError("At most 500 edits a step.");
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
      return { op: "text", path, index: at, delete: e.find.length, insert: e.replace } as docs.Edit;
    }
    if (e.op === "text" && Array.isArray(e.path)) {
      const t = textAt(e.path);
      const idx = Number(e.index), del = Number(e.delete ?? 0), ins = `${e.insert ?? ""}`;
      texts.set(JSON.stringify(e.path), t.slice(0, idx) + ins + t.slice(idx + del));
    }
    if (!["set", "insert", "delete", "move", "text"].includes(e.op)) throw new AssetDocError(`Edit ${i + 1}: an edit is one of replace, text, set, insert, delete, move.`);
    return e as docs.Edit;
  });
}

/**
 * One step of a draft change to an asset: edits (a replace by its text, a range of a text, or a field of its card set),
 * a whole new source, a new label or note, on draft `branch`, or on a new draft from the head. Every step is kept with
 * its message, who made it and when; the draft is proposed as a version with propose_version (its `branch`).
 */
export async function editAsset(db: Db, store: BlobStore, me: Me | null, p: AssetDraft) {
  const who = must(me, "propose", "asset_version");
  if (who.level !== "admin") throw new Denied("Drafting an asset step by step is for Maia City's admins, over MCP.");
  const message = `${p.message ?? ""}`.trim().slice(0, 500);
  if (!message) throw new AssetDocError("Every step says what it does: give its message.");
  return asAssetError(() =>
    db.transaction(async (tx) => {
      const author = authorOf(who, "mcp");
      const { id: docId } = await ensureAssetDoc(tx, store, p.asset);
      const b = p.branch == null ? (await docs.branch(tx, docId, { author, note: message })).id : (await draftOf(tx, p.asset, p.branch)).id;
      const cur = await draftState(tx, p.asset, b);
      let step: docs.Step | null;
      if (p.edits !== undefined) step = await docs.commit(tx, docId, { branch: b, edits: rangeEdits(cur, p.edits), message, author });
      else {
        const target: AssetJson = { ...cur };
        if (p.source !== undefined) {
          if (typeof p.source !== "string") throw new AssetDocError("The source is text.");
          target.source = p.source;
        }
        if (p.label !== undefined) target.label = `${p.label}`.trim().slice(0, 200);
        if (p.note !== undefined) target.note = `${p.note}`.slice(0, 20000);
        if (p.source === undefined && p.label === undefined && p.note === undefined) throw new AssetDocError("Give edits, a whole source, a label or a note.");
        step = await docs.commit(tx, docId, { branch: b, target, message, author });
      }
      const now = await draftState(tx, p.asset, b);
      const steps = await docs.history(tx, docId, { branch: b });
      return { asset: p.asset, branch: b, step: step?.seq ?? null, changed: !!step, steps: steps.length, sourceLength: now.source.length, sourceHash: hashText(now.source) };
    }),
  );
}

// ---- an asset's history, step by step

function admin(me: Me | null): Me {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (me.level !== "admin") throw new Denied("An asset's history, step by step, is for Maia City's admins.");
  return me;
}

/** every step of asset `asset` (its main line with each accepted proposal's steps, or one draft's), its versions and drafts */
export async function assetHistory(db: Db, store: BlobStore, me: Me | null, asset: string, o: { branch?: number } = {}) {
  admin(me);
  return asAssetError(async () => {
    const { id: docId } = await db.transaction((q) => ensureAssetDoc(q, store, asset));
    const versions = await docs.versionsOf(db, docId);
    const steps = await named(db, await docs.history(db, docId, o.branch === undefined ? {} : { branch: o.branch }), versions);
    const { rows: drafts } = await db.query<any>(
      `SELECT b.id, b.status, b.note, b.created, h.name AS author, p.id AS proposal, p.status AS proposal_status,
              (SELECT count(*) FROM play.doc_updates u WHERE u.branch = b.id) AS steps
         FROM play.doc_branches b LEFT JOIN play.humans h ON h.id = b.created_by LEFT JOIN play.proposals p ON p.doc_branch = b.id
        WHERE b.doc_id = $1 ORDER BY b.id`,
      [docId],
    );
    return {
      asset,
      steps,
      versions: versions.map((v) => ({ number: v.number, note: firstLine(v.note, 300), at: new Date(v.created).toISOString(), contentHash: v.contentHash })),
      drafts: drafts.map((d) => ({ id: Number(d.id), status: d.status, note: firstLine(d.note, 300), at: new Date(d.created).toISOString(), author: d.author, proposal: d.proposal, steps: Number(d.steps) })),
    };
  });
}

/** asset `asset` as it was at step `seq` of its history: its whole state, its source as text */
export async function assetAtStep(db: Db, store: BlobStore, me: Me | null, asset: string, seq: number) {
  admin(me);
  if (!Number.isInteger(seq) || seq < 1) throw new AssetDocError(`${seq} is not a step.`, 404);
  return asAssetError(async () => {
    const { id: docId } = await db.transaction((q) => ensureAssetDoc(q, store, asset));
    const json = (await docs.stateAt(db, docId, { step: seq })) as AssetJson;
    return { asset, step: seq, ...json, sourceHash: hashText(json.source) };
  });
}

/**
 * The version a step leads to: the version it was named, where it was; else the one after the last version before
 * it (a step on a draft: the one after the version the draft was made on).
 */
async function numberAt(q: Queryable, docId: string, seq: number): Promise<{ n: number; exact: number | null }> {
  const { rows } = await q.query<{ branch: string | null; base: docs.Frontiers | null }>(
    `SELECT u.branch, b.base FROM play.doc_updates u LEFT JOIN play.doc_branches b ON b.id = u.branch WHERE u.doc_id = $1 AND u.seq = $2`, [docId, seq],
  );
  if (!rows[0]) throw new AssetDocError(`no step ${seq}`, 404);
  const versions = await docs.versionsOf(q, docId);
  const steps = await named(q, await docs.history(q, docId), versions);
  const i = steps.findIndex((s) => s.seq === seq);
  if (i < 0) {
    const base = rows[0].base ? await versionAt(q, docId, rows[0].base) : null;
    return { n: (base ?? 0) + 1, exact: null };
  }
  if (steps[i].version) return { n: steps[i].version!, exact: steps[i].version! };
  let last = 0;
  for (let j = 0; j < i; j++) if (steps[j].version) last = steps[j].version!;
  return { n: last + 1, exact: null };
}

/**
 * The recipe file asset `asset` builds at step `seq`, as the catalog lists a build (its hash, its size, its record), so
 * the asset viewer builds it in the box like any other: at a step that is a version, that version's own recipe file;
 * at any other step, one made the same way (the box's header, the step's source, the line naming the asset and the
 * version the step leads to), kept among play's files by its hash. Admins only.
 */
export async function recipeAtStep(db: Db, store: BlobStore, me: Me | null, asset: string, seq: number) {
  admin(me);
  if (!Number.isInteger(seq) || seq < 1) throw new AssetDocError(`${seq} is not a step.`, 404);
  return asAssetError(async () => {
    const { id: docId } = await db.transaction((q) => ensureAssetDoc(q, store, asset));
    const { rows: a } = await db.query<{ grp: string; slug: string; label: string }>(`SELECT grp, slug, label FROM play.assets WHERE id = $1`, [asset]);
    const json = (await docs.stateAt(db, docId, { step: seq })) as AssetJson;
    const { n, exact } = await numberAt(db, docId, seq);
    const variant = json.defaultVariant ?? null;
    const v = variant ? json.variants?.find((x) => x.name === variant) : undefined;
    const record = (v?.card ?? json.card ?? {}) as any;
    const base = { asset, group: a[0].grp, slug: a[0].slug, v: n, variant, first: true, label: record?.card?.label ?? json.label, step: seq };
    // a version's point: its own recipe file, as the catalog has it, where the step holds that version's source
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

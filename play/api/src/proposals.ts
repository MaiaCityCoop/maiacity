// Proposing and deciding (play/SPEC.md §4.3, §4.12): to propose is to put an intent at Proposal with its work (./work.ts),
// one record, the intent; Proposal is only its stage. Here an asset's new version (or a new asset) is proposed, built for
// the version after its head, as a recipe file names its own version, and any intent's work is reviewed and decided: an
// admin accepts or archives it. Accepting an asset's checks the head is still the one it was made from, in one
// transaction, so of two intents' work on one head only the first goes in and the other is archived: rebuilt and
// proposed again on the new head. The rest is decided by its own kind (./stories.ts, ./sandboxes.ts, ./factories.ts,
// ./gameconfigs.ts), the intent settled in the same transaction.
import { decideFactory, factoryReview } from "./factories";
import { gameConfigReview, decideGameConfig } from "./gameconfigs";
import type { BlobStore } from "./blobs";
import { HASH, hashText } from "./hash";
import type { Db, Queryable } from "./pg";
import { COOP, Denied, must, type Me } from "./access";
import { labelOf, libraryOf, RECIPE_HEAD, recipeTail } from "./recipes";
import { boxEngine, LATEST_BOX } from "./engines";
import { readableRefs } from "../import/plan";
import { versionId } from "./versions";
import { NOTE_MOST } from "./notes";
import { newId, UUID } from "./uuid";
import { decideStory, named, storyReview } from "./stories";
import * as docs from "./docs";
import { decideSandbox, sandboxReview } from "./sandboxes";
import { acceptBranch, asAssetJson, AssetDocError, assetDocId, authorOf, draftOf, draftState, ensureAssetDoc, proposalBranch, type AssetJson } from "./assetdocs";
import { closeWork, putAtProposal, settle, WORK_OF, workOf, WorkError } from "./work";
import { decideIntent, getIntent, IntentError, type IntentVerdict } from "./intents";

export class ProposalError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const GROUP = /^(plants|things|machines|buildings|actors|biomes|worlds)$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
/** a label as a slug: its letters and digits, lowercase, joined by '-' */
const slugOf = (label: string) =>
  label.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
const VARIANT = /^[a-z0-9][a-z0-9-]{0,79}$/;
export const MOST_FILE = 16 * 1024 * 1024;
const MEDIA = "text/javascript";

type Upload = { source?: string; recipe?: string; record?: any; label?: string };
export type ProposalBody = {
  asset?: string; // an existing asset, by its UUID
  new?: { group: string; slug?: string; label: string }; // or a new one: its group and label (its slug made from the label if none)
  label?: string;
  note?: string;
  base?: string | null; // the head it was made from, as the proposer saw it
  record?: any; // the version's record (card, params, contract …)
  source?: string; // the version's readable source: the library its recipe file wraps (module.exports.recipe = …)
  recipe?: string; // or its recipe file, as text, whose library must be that readable source
  variants?: Record<string, Upload>;
  defaultVariant?: string;
  card?: Record<string, unknown>; // card fields set over the record it takes (its params when the recipe declares new ones), on the version and on each variant
  branch?: number; // a draft made step by step (asset_edit, ./assetdocs.ts), proposed as it stands
  sheet?: string | null; // its reference sheet: an image play keeps, by its hash (a plant's plate of every stage and organ); null takes the head's away
  datasheet?: string | null; // its data sheet: a Markdown document play keeps, by its hash; null takes the head's away
  brief?: string | null; // the brief its reference sheet was made from: a Markdown document play keeps, by its hash
  intent?: string; // the intent it is the work of, by its UUID, held to its gate before (./intents.ts intentReady); none, and it is a new intent of its own
};

/**
 * Why a source is not readable, or null: people decide on what they can read (Samuel 2026-11-02), so a proposal brings
 * the code as written, not bundled or minified. Minified code is told by its lines: long ones, or few for its size.
 */
export function unreadable(source: string): string | null {
  const lines = source.split("\n");
  const longest = Math.max(...lines.map((l) => l.length));
  if (longest > 1000) return `a line of it is ${longest} characters long: send the source as written, not bundled or minified (lines under 1000 characters)`;
  if (source.length > 4000 && source.length / lines.length > 120) return "its lines are too long on average for code people read: send the source as written, not bundled or minified";
  return null;
}

/** the libraries a source requires, by name, as the page holds a build to its record's manifest (site load.js libsOf) */
const libsOf = (code: string) => [...new Set([...code.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]))];

/**
 * A version's code as proposed, the readable source or a recipe file wrapping it: its source and the recipe file made
 * from it for this asset, this version and this variant (the same file the box builds, RECIPE_HEAD + source + its tail).
 */
function checkedCode(up: { source?: unknown; recipe?: unknown }, slug: string, n: number, variant: string | null) {
  let source: string;
  if (typeof up.source === "string" && up.source) {
    if (up.recipe) throw new ProposalError("Give the readable source or the recipe file, not both.");
    if (up.source.startsWith(RECIPE_HEAD)) throw new ProposalError("That is a recipe file: give it as the recipe, or give its source alone.");
    source = up.source;
  } else if (typeof up.recipe === "string" && up.recipe) {
    const label = labelOf(up.recipe);
    if (!label) throw new ProposalError("That is not a recipe file of the asset box.");
    if (label.id !== slug || label.v !== n || label.variant !== variant)
      throw new ProposalError(`The recipe file builds ${label.id}@${label.v}${label.variant ? `:${label.variant}` : ""}, not ${slug}@${n}${variant ? `:${variant}` : ""}.`);
    source = libraryOf(up.recipe)!;
  } else throw new ProposalError("The version's readable source is missing.");
  if (Buffer.byteLength(source) > MOST_FILE) throw new ProposalError("The source is larger than 16 MB.");
  if (!/module\.exports\.recipe\s*=|exports\.recipe\s*=/.test(source))
    throw new ProposalError("The source sets no module.exports.recipe = function (id, v, variant) { … }: the recipe its file calls.");
  const why = unreadable(source);
  if (why) throw new ProposalError(`The source is not readable: ${why}.`);
  const recipe = RECIPE_HEAD + source + recipeTail(slug, n, variant);
  return { source: { text: source, hash: hashText(source) }, recipe: { text: recipe, hash: hashText(recipe) }, libs: libsOf(source) };
}

/**
 * The engine a record names, held to the frozen ones (it chooses which engine the page runs the recipe on): one it
 * names must be frozen under its hash; none named, the latest. And the libraries it may require, the ones its source does.
 */
function heldRecord(record: any, libs: string[], source: string) {
  const named = record?.engine?.version ?? record?.card?.engine;
  const e = named === undefined ? LATEST_BOX : boxEngine(Number(named));
  if (!e) throw new ProposalError(`Box engine ${named} is not one of the frozen engines.`);
  if (record?.engine?.hash !== undefined && record.engine.hash !== e.blake3) throw new ProposalError(`Box engine ${e.v} is frozen under another hash.`);
  return {
    ...(record ?? {}),
    engine: { host: "box", version: e.v, hash: e.blake3 },
    manifest: { ...(record?.manifest ?? {}), libs },
    source,
    card: { ...(record?.card ?? {}), engine: e.v },
  };
}

const PARAM_KEY = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/;
/**
 * The card fields a proposal may set over the record it takes: its `params`, the parameters its recipe declares (its
 * meta.params), in the order its build takes them, checked for shape as the page will read them (site params.js).
 */
function cardFields(card: unknown): Record<string, unknown> {
  if (card === undefined || card === null) return {};
  if (typeof card !== "object" || Array.isArray(card)) throw new ProposalError("The card's fields come as an object.");
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(card)) {
    if (k !== "params") throw new ProposalError(`A proposal sets only the card's params, not ${k}.`);
    if (!Array.isArray(v) || v.length > 24) throw new ProposalError("params is a list of at most 24 parameters.");
    const ids = new Set<string>();
    for (const p of v as any[]) {
      if (!p || typeof p !== "object" || !PARAM_KEY.test(`${p.id}`) || ids.has(p.id)) throw new ProposalError("Each parameter has its own id (a letter, then letters, digits, _ . -).");
      if (!["number", "integer", "string"].includes(p.type)) throw new ProposalError(`${p.id}: its type is number, integer or string.`);
      if (p.value === undefined || (p.type === "string" ? typeof p.value !== "string" : typeof p.value !== "number")) throw new ProposalError(`${p.id}: its value is a ${p.type === "string" ? "string" : "number"}.`);
      ids.add(p.id);
    }
    out.params = v;
  }
  return out;
}

/** a record with its card naming what it is: the asset, the version, the variant and the file */
const recordOf = (record: any, grp: string, slug: string, n: number, variant: string | null, hash: string) => ({
  ...(record ?? {}),
  kind: "recipe",
  card: { ...(record?.card ?? {}), group: grp, id: slug, version: n, v: n, ...(variant ? { variant } : {}), recipe: hash },
});

/** a record with its documents set (each a hash), taken away (null) or left as they came (undefined): its reference
 *  sheet, its data sheet and its sheet's brief (play/SPEC.md §4.10) */
type Refs = { sheet?: string | null; datasheet?: string | null; brief?: string | null };
function withRefs(record: any, refs: Refs) {
  if (!record) return record;
  let out = record;
  for (const [k, v] of Object.entries(refs) as [keyof Refs, string | null | undefined][]) {
    if (v === undefined) continue;
    const { [k]: _, ...rest } = out;
    out = v === null ? rest : { ...rest, [k]: v };
  }
  return out;
}

/** what each document a version may name must be: its media type, and what to call it when it is not */
const REFS = {
  sheet: { is: (t: string) => t.startsWith("image/"), what: "A reference sheet is an image", add: "add_story_frame" },
  datasheet: { is: (t: string) => t === "text/markdown", what: "A data sheet is a Markdown document", add: "add_document" },
  brief: { is: (t: string) => t === "text/markdown", what: "A brief is a Markdown document", add: "add_document" },
} as const;

export async function propose(db: Db, store: BlobStore, me: Me | null, given: ProposalBody, via: "web" | "mcp" = "web") {
  const who = must(me, "propose", "asset_version");
  let body: ProposalBody = given ?? {};
  // the asset by its UUID; a new asset brings its group and slug (its label, shown) and gets a UUID of its own
  let asset: string;
  let grp: string;
  let slug: string;
  if (body?.asset !== undefined) {
    if (!UUID.test(`${body.asset}`)) throw new ProposalError("Name the asset by its id (a UUID).");
    const { rows } = await db.query<{ grp: string; slug: string }>(`SELECT grp, slug FROM play.assets WHERE id = $1`, [body.asset]);
    if (!rows[0]) throw new ProposalError("There is no such asset.", 404);
    ({ grp, slug } = rows[0]);
    asset = body.asset;
  } else {
    // a new asset is its new UUID; its group, label and slug are only shown (the slug, the name its recipe is called
    // with, made from the label where none is given), and another asset may share them
    grp = `${body?.new?.group ?? ""}`;
    slug = body?.new?.slug == null || body.new.slug === "" ? slugOf(`${body?.new?.label ?? ""}`) : `${body.new.slug}`;
    if (!GROUP.test(grp)) throw new ProposalError("A new asset needs its group (plants, things, machines, buildings, actors, biomes, worlds).");
    if (!SLUG.test(slug)) throw new ProposalError("A new asset's slug is lowercase words joined by '-' (or give a label to make it from).");
    asset = newId();
  }
  const { rows: a } = await db.query<{ head: string | null; number: number | null; label: string; card: any; variants: Record<string, any> | null }>(
    `SELECT a.head, v.number, a.label, v.card,
            (SELECT json_object_agg(x.name, x.card) FROM play.asset_variants x WHERE x.version_id = v.id) AS variants
       FROM play.assets a LEFT JOIN play.asset_versions v ON v.id = a.head WHERE a.id = $1`, [asset],
  );
  // a proposal that brings no record of its own takes its head's (the engine it runs on, its label, its parameters),
  // with its own recipe and version written in: an upload of the recipe file alone makes a version the site can build
  // but never what was measured on the head's recipe (its size, triangles, whether it is skinned): this is another one
  const inherited = (own: any, from: any) => {
    if (own) return own;
    if (!from) return undefined;
    const { size: _s, triangles: _t, skinned: _k, ...card } = from.card ?? {};
    return { ...from, card };
  };
  // the card fields a proposal sets over the record it takes: its params, a variant's label
  const over = (record: any, card: Record<string, unknown>) => (Object.keys(card).length ? { ...(record ?? {}), card: { ...(record?.card ?? {}), ...card } } : record);
  const set = cardFields(body.card);
  const head = a[0]?.head ?? null;
  if (body.base !== undefined && (body.base ?? null) !== head)
    throw new ProposalError("Someone changed this asset since you started: build it again on its newest version.", 409);
  const n = (a[0]?.number ?? 0) + 1;
  const label = `${body.new?.label ?? body.label ?? a[0]?.label ?? ""}`.trim().slice(0, 120);
  if (!label) throw new ProposalError("A new asset needs a label.");

  // a draft made step by step (asset_edit): proposed as it stands, made on the head; its source and card are the
  // version's where the proposal brings none of its own
  let draft: number | undefined;
  if (body.branch != null) {
    if (body.asset === undefined) throw new ProposalError("A draft is of an asset there already.");
    const d = await db
      .transaction(async (q) => {
        await ensureAssetDoc(q, store, asset);
        const dr = await draftOf(q, asset, body.branch);
        return { ...dr, json: await draftState(q, asset, dr.id) };
      })
      .catch((e) => {
        throw e instanceof AssetDocError ? new ProposalError(e.message, e.status) : e;
      });
    if ((d.base ?? null) !== (a[0]?.number ?? null)) throw new ProposalError(`This asset has a newer version than the one draft ${d.id} was made on: start the draft again on its head.`, 409);
    draft = d.id;
    if (!body.source && !body.recipe && !body.variants) {
      if (d.json.variants?.length)
        body = { ...body, variants: Object.fromEntries(d.json.variants.map((x) => [x.name, { source: x.source ?? d.json.source, record: x.card }])), defaultVariant: d.json.defaultVariant ?? d.json.variants[0].name };
      else body = { ...body, source: d.json.source, ...(body.record === undefined && d.json.card ? { record: d.json.card } : {}) };
    }
  }

  const variantNames = Object.keys(body.variants ?? {});
  if (!!(body.recipe || body.source) === !!variantNames.length) throw new ProposalError("Give either the version's source (or recipe file) or its variants, not both.");
  const files: { text: string; hash: string }[] = [];
  let recipe: string | null = null;
  let source: string | null = null;
  let own: { libs: string[]; source: string } | null = null;
  let defaultVariant: string | null = null;
  const variants: Record<string, { recipe: string; source: string; card: any }> = {};
  // the readable sources as text, for the version's step of the asset's document (./assetdocs.ts)
  let ownText = "";
  const variantTexts: Record<string, string> = {};
  if (body.recipe || body.source) {
    const c = checkedCode(body, slug, n, null);
    files.push(c.source, c.recipe);
    recipe = c.recipe.hash;
    source = c.source.hash;
    own = { libs: c.libs, source: c.source.hash };
    ownText = c.source.text;
  } else {
    for (const name of variantNames) {
      if (!VARIANT.test(name)) throw new ProposalError(`${name} is not a variant's name.`);
      const c = checkedCode(body.variants![name], slug, n, name);
      files.push(c.source, c.recipe);
      variantTexts[name] = c.source.text;
      const from = a[0]?.variants?.[name] ?? a[0]?.card;
      const label = body.variants![name].label === undefined ? {} : { label: `${body.variants![name].label}`.trim().slice(0, 120) };
      const record = heldRecord(over(inherited(body.variants![name].record, from), { ...set, ...label }), c.libs, c.source.hash);
      variants[name] = { recipe: c.recipe.hash, source: c.source.hash, card: recordOf(record, grp, slug, n, name, c.recipe.hash) };
    }
    defaultVariant = body.defaultVariant ?? variantNames[0];
    if (!variants[defaultVariant]) throw new ProposalError(`${defaultVariant} is not one of its variants.`);
  }
  // its documents (play/SPEC.md §4.10): its reference sheet (an image), its data sheet and its sheet's brief (Markdown),
  // each a file play keeps, named by its hash in the version's record, and carried on from the head like the rest of the
  // record unless the proposal names another (or null, none)
  const refs: Refs = {};
  for (const k of Object.keys(REFS) as (keyof typeof REFS)[]) {
    const given = (body as any)[k];
    if (given === undefined) continue;
    const h = given === null || given === "" ? null : `${given}`;
    if (h !== null) {
      if (!HASH.test(h)) throw new ProposalError(`A ${k} is named by its BLAKE3 hash (64 hex characters).`);
      const { rows: f } = await db.query<{ media_type: string }>(`SELECT media_type FROM play.files WHERE hash = $1`, [h]);
      if (!f[0]) throw new ProposalError(`play keeps no file by that hash: add the ${k} first (MCP ${REFS[k].add}).`);
      if (!REFS[k].is(f[0].media_type)) throw new ProposalError(`${REFS[k].what}.`);
    }
    refs[k] = h;
  }
  for (const v of Object.values(variants)) v.card = withRefs(v.card, refs);
  const card = withRefs(recipe ? recordOf(heldRecord(over(inherited(body.record, a[0]?.card), set), own!.libs, own!.source), grp, slug, n, null, recipe) : variants[defaultVariant!].card, refs);
  // every other asset a version names, it names by hash (play/SPEC.md §4)
  const readable = [card, ...Object.values(variants).map((x) => x.card)].flatMap((c) => readableRefs(c, `${grp}/${slug}`));
  if (readable.length) throw new ProposalError(`Name other assets by their hash, not ${readable.slice(0, 3).join(", ")}.`);
  const engine = Number(card?.engine?.version ?? card?.card?.engine) || null;
  const content = { asset, parents: head ? [head] : [], recipe, defaultVariant, variants, card, engine };
  const id = versionId(content);

  for (const f of files) await store.put(f.hash, new TextEncoder().encode(f.text), MEDIA);
  let intent = "", branchId = 0, steps = 0;
  await db.transaction(async (tx) => {
    for (const f of files)
      await tx.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [
        f.hash, Buffer.byteLength(f.text), MEDIA, `blobs/${f.hash.slice(0, 2)}/${f.hash}`,
      ]);
    await tx.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`, [asset, COOP, grp, slug, label]);
    await tx.query(
      `INSERT INTO play.asset_versions (id, asset_id, parents, recipe_hash, source_hash, default_variant, card, engine, author, note)
       VALUES ($1, $2, $3, $4, $5, $6, ($7::text)::jsonb, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
      [id, asset, content.parents, recipe, source, defaultVariant, JSON.stringify(card), engine, who.id, `${body.note ?? ""}`.slice(0, NOTE_MOST)],
    );
    for (const [name, x] of Object.entries(variants))
      await tx.query(`INSERT INTO play.asset_variants (version_id, name, recipe_hash, source_hash, card) VALUES ($1, $2, $3, $4, ($5::text)::jsonb) ON CONFLICT DO NOTHING`, [id, name, x.recipe, x.source, JSON.stringify(x.card)]);
    // its branch of the asset's Loro document (play/SPEC.md §4.4): the draft it was made on, or a new branch at its
    // head, the version as proposed its last step
    const note = `${body.note ?? ""}`.slice(0, NOTE_MOST);
    const json: AssetJson = asAssetJson(label, {
      note, engine, card, defaultVariant,
      source: recipe ? ownText : variantTexts[defaultVariant!],
      variants: Object.entries(variants).map(([name, x]) => ({ name, source: variantTexts[name], card: x.card })),
    });
    const branch = await proposalBranch(tx, store, { asset, base: a[0]?.number ?? null, json, note, author: authorOf(who, via === "mcp" ? "mcp" : "site"), draft }).catch((e) => {
      throw e instanceof AssetDocError ? new ProposalError(e.message, e.status) : e;
    });
    intent = await putAtProposal(tx, who, { intent: body.intent, work: { kind: "asset_version", asset_id: asset, base: head, version: id, doc_branch: branch }, note, via }).catch((e) => {
      throw e instanceof WorkError ? new ProposalError(e.message, e.status) : e;
    });
    steps = (await docs.history(tx, assetDocId(asset), { branch })).length;
    branchId = branch;
  });
  return { intent, stage: "proposal" as const, asset, version: id, number: n, base: head, branch: branchId, steps };
}

/**
 * An intent's work as people review it before they decide (`w`: the intent's work as ./intents.ts lists it, with its
 * label, group and number): for an asset's version, its readable source and its recipe files, the base's source to set
 * it beside, and the version as the catalog would list it once accepted (`builds`), so the page can build it in the
 * asset box, the sandboxed frame every recipe runs in, before anyone accepts it; for the rest, its kind's own review.
 */
export async function reviewOf(db: Queryable, id: string, shown: any) {
  const p = { ...(await workOf(db, id)), ...shown, id };
  if (!p.kind) return null;
  // a sandbox's change: what each edit changes, before and after, as accepting would apply it
  if (p.kind === "sandbox_change") return { ...p, ...(await sandboxReview(db, p)) };
  // a story's: its proposed timeline, the head's it was made from, and what changed, clip by clip
  if (p.kind === "story_version") return { ...p, ...(await storyReview(db, p)) };
  // a factory's: what changed, field by field, against the version it was made on, and its steps
  if (p.kind === "factory_version") return { ...p, ...(await factoryReview(db, p)) };
  // a game config's: the same, field by field
  if (p.kind === "game_config_version") return { ...p, ...(await gameConfigReview(db, p)) };
  const { rows: v } = await db.query<any>(
    `SELECT v.recipe_hash, v.source_hash, v.card, v.default_variant, f.size FROM play.asset_versions v
       LEFT JOIN play.files f ON f.hash = v.recipe_hash WHERE v.id = $1`, [p.version],
  );
  const { rows: x } = await db.query<any>(
    `SELECT x.name, x.recipe_hash, x.source_hash, x.card, f.size FROM play.asset_variants x
       JOIN play.files f ON f.hash = x.recipe_hash WHERE x.version_id = $1 ORDER BY x.name`, [p.version],
  );
  const { rows: b } = p.base
    ? await db.query<any>(
        `SELECT v.number, v.recipe_hash, v.source_hash, (SELECT x.source_hash FROM play.asset_variants x WHERE x.version_id = v.id AND x.name = v.default_variant) AS variant_source
           FROM play.asset_versions v WHERE v.id = $1`, [p.base],
      )
    : { rows: [] };
  const row = (hash: string, size: unknown, record: any, variant: string | null, first: boolean) => ({
    hash, size: Number(size), asset: p.asset_id, group: p.grp, slug: p.slug, v: p.number, variant, first,
    label: record?.card?.label ?? record?.title ?? p.label, record, proposed: true,
  });
  const builds = v[0]?.recipe_hash
    ? [row(v[0].recipe_hash, v[0].size, v[0].card, null, false)]
    : x.map((r) => row(r.recipe_hash, r.size, r.card, r.name, r.name === v[0]?.default_variant));
  // the steps it was made in: its branch of the asset's Loro document (play/SPEC.md §4.4)
  const steps = p.doc_branch != null ? await named(db, await docs.history(db, assetDocId(p.asset_id), { branch: Number(p.doc_branch) })) : [];
  return {
    ...p,
    source: v[0]?.source_hash ?? null,
    recipe: v[0]?.recipe_hash ?? null,
    variants: x.map((r) => ({ name: r.name, recipe: r.recipe_hash, source: r.source_hash })),
    baseVersion: b[0] ? { number: b[0].number, source: b[0].source_hash ?? b[0].variant_source ?? null, recipe: b[0].recipe_hash } : null,
    builds,
    steps,
  };
}

export type Verdict = "accept" | "archive";

/** An intent's work archived by whoever proposed it: the intent archived, its branch closed as a side line in the history. */
async function archiveAsAuthor(tx: Queryable, me: Me, p: any) {
  await settle(tx, p.id, "archived", me.id);
  await closeWork(tx, me, p);
  return { id: p.id as string, status: "archived" as const };
}

/**
 * An agent archives its own intent over MCP (Samuel 2026-11-04): one at Proposal whose work it no longer stands by, or
 * one newer work of its own replaces elsewhere. Only an intent its admin put at Proposal over MCP (its work proposed so,
 * or, with no work, added so), never anyone else's and never one proposed on the page; accepting stays a person's, on
 * the intents' board.
 */
export async function archiveOwn(db: Db, me: Me | null, id: string) {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (!UUID.test(id)) throw new ProposalError("Name the intent by its id (list_intents gives it).");
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<any>(`SELECT ${WORK_OF}, i.author AS intent_author, i.via AS intent_via FROM play.intents i WHERE i.id = $1 AND i.coop_id = $2 FOR UPDATE`, [id, COOP]);
    const p = rows[0];
    if (!p) throw new ProposalError("There is no such intent.", 404);
    const [by, via] = p.kind ? [p.author, p.via] : [p.intent_author, p.intent_via];
    if (by !== me.id || via !== "mcp")
      throw new ProposalError("Only an intent you put at Proposal over MCP is yours to archive; the rest are decided on the intents' board.", 403);
    if (p.stage !== "proposal") throw new ProposalError(`This intent is at the ${p.stage} stage: only one at Proposal is archived so.`, 409);
    return { ...(await archiveAsAuthor(tx, me, p)), intent: p.id as string, stage: "archived" as const };
  });
}

/**
 * Accept or archive an intent's work at Proposal (Samuel 2026-11-04: it ends accepted or archived, nothing else). An
 * admin decides any; whoever proposed it may archive their own. An asset's is accepted only on the head it was made on
 * (else it is archived, to be proposed again on the new head), so what is accepted is exactly the version the board
 * built and showed in the asset box; its branch of the asset's document is merged and named the version's number.
 * Archived, its branch is closed, its steps kept. The answer says the stage the intent settled at.
 */
export async function decide(db: Db, store: BlobStore, me: Me | null, id: string, verdict: Verdict) {
  if (!me) throw new Denied("Please sign in first.", 401);
  return db.transaction(async (tx) => {
    const p = await workOf(tx, id, true);
    if (!p) throw new ProposalError("There is no such intent.", 404);
    if (!p.kind) throw new ProposalError(`Intent ${p.id} holds no work of play's to decide.`, 409);
    if (p.stage !== "proposal") throw new ProposalError(`This intent is at the ${p.stage} stage: only one at Proposal is decided.`, 409);
    const r: any = await decideAt(tx, store, me, p, verdict);
    const { rows } = await tx.query<{ stage: string }>(`SELECT stage FROM play.intents WHERE id = $1`, [p.id]);
    return { ...r, intent: p.id as string, stage: rows[0]?.stage };
  });
}

async function decideAt(tx: Queryable, store: BlobStore, me: Me, p: any, verdict: Verdict) {
  const id = p.id as string;
  {
    // whoever proposed it archives their own, whoever may decide the rest
    if (verdict === "archive" && p.author === me.id && me.level !== "admin") return archiveAsAuthor(tx, me, p);
    if (p.kind === "story_version") return decideStory(tx, me, p, verdict);
    if (p.kind === "sandbox_change") return decideSandbox(tx, me, p, verdict);
    if (p.kind === "factory_version") return decideFactory(tx, me, p, verdict);
    if (p.kind === "game_config_version") return decideGameConfig(tx, me, p, verdict);
    must(me, "decide", "asset_version");
    if (verdict === "archive") {
      await settle(tx, id, "archived", me.id);
      await closeWork(tx, me, p);
      return { id, status: "archived" };
    }
    const { rows: a } = await tx.query<{ head: string | null; number: number | null }>(
      `SELECT a.head, v.number FROM play.assets a LEFT JOIN play.asset_versions v ON v.id = a.head WHERE a.id = $1 FOR UPDATE OF a`, [p.asset_id],
    );
    if ((a[0]?.head ?? null) !== (p.base ?? null)) {
      await settle(tx, id, "archived", null);
      await closeWork(tx, me, p);
      return { id, status: "archived", message: "This asset has a newer version than the one this was made on: build it again on its head." };
    }
    // the asset's document, made from its history first where it has none (and this proposal's branch, if it lacks one)
    await ensureAssetDoc(tx, store, p.asset_id).catch((e) => {
      throw e instanceof AssetDocError ? new ProposalError(e.message, e.status) : e;
    });
    const n = (a[0]?.number ?? 0) + 1;
    await tx.query(`UPDATE play.asset_versions SET number = $2, approved_by = $3 WHERE id = $1`, [p.version, n, me.id]);
    await tx.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [p.asset_id, p.version]);
    await settle(tx, id, "accepted", me.id);
    await acceptBranch(tx, store, p, me, n);
    // the other intents' work made on the same head can go in no more: archived, to be built again on the new one
    const { rows: stale } = await tx.query<any>(
      `SELECT ${WORK_OF} FROM play.intents i
        WHERE i.asset_id = $1 AND i.work = 'asset_version' AND i.stage = 'proposal' AND i.id <> $2 AND i.base IS NOT DISTINCT FROM $3 FOR UPDATE`,
      [p.asset_id, id, p.base],
    );
    for (const s of stale) {
      await settle(tx, s.id, "archived", null);
      await closeWork(tx, me, s);
    }
    return { id, status: "accepted", number: n, version: p.version };
  }
}

/**
 * An admin's decision on an intent, whatever its stage (the one place an intent is decided; play/SPEC.md §4.12): at
 * Proposal with work of play's, accepting applies it and archiving archives it (decide); anything else is the intent's
 * own decision (./intents.ts decideIntent: approve its spec, send it back to Specify, accept its code on main's checks,
 * archive it, reopen it). Gives back the intent, with the decision's message where it has one.
 */
export async function decideAny(db: Db, store: BlobStore, me: Me | null, id: string, verdict: IntentVerdict | "archive") {
  const w = await workOf(db, id);
  if (!w) throw new IntentError("There is no such intent.", 404);
  // the work's decision, where it had work at Proposal: what it came to (accepted, archived), the version it is, merged
  let decision: { status: string; number?: number; version?: string; merged?: boolean; message?: string } | undefined;
  if (w.kind && w.stage === "proposal" && (verdict === "accept" || verdict === "archive" || verdict === "reject")) {
    const { id: _id, intent: _i, stage: _s, why, ...r }: any = await decide(db, store, me, w.id, verdict === "accept" ? "accept" : "archive");
    decision = { ...r, ...(r.message ?? why ? { message: r.message ?? why } : {}) };
  } else await decideIntent(db, me, w.id, verdict === "archive" ? "reject" : verdict);
  const said = decision ? { decision, ...(decision.message ? { message: decision.message } : {}) } : {};
  // whoever decides it reads it back: an admin all of it, its proposer (archiving their own) what it came to
  if (me?.level !== "admin") return { id: w.id, stage: (await workOf(db, w.id))?.stage, ...said };
  return { ...(await getIntent(db, w.id)), ...said };
}

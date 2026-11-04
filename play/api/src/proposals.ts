// Asset update proposals (play/SPEC.md §4.3): a citizen proposes a new version of an asset (or a new asset), built for
// the version after its head, as a recipe file names its own version; an admin accepts or rejects it. Accepting checks
// the head is still the one it was made from, in one transaction, so of two proposals on one head only the first goes
// in and the other is archived: rebuilt and proposed again on the new head.
import { randomUUID } from "node:crypto";
import type { BlobStore } from "./blobs";
import { hashText } from "./hash";
import type { Db, Queryable } from "./pg";
import { COOP, Denied, must, type Me } from "./access";
import { labelOf, libraryOf, RECIPE_HEAD, recipeTail } from "./recipes";
import { boxEngine, LATEST_BOX } from "./engines";
import { readableRefs } from "../import/plan";
import { versionId } from "./versions";
import { NOTE_MOST } from "./notes";
import { newId, UUID } from "./uuid";
import { archiveOwnStory, decideStory, named, storyReview } from "./stories";
import * as docs from "./docs";
import { decideSandbox, sandboxReview } from "./sandboxes";
import { acceptBranch, asAssetJson, AssetDocError, assetDocId, authorOf, closeBranch, draftOf, draftState, ensureAssetDoc, proposalBranch, type AssetJson } from "./assetdocs";

export class ProposalError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const GROUP = /^(plants|things|machines|buildings|actors|biomes)$/;
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
    if (!GROUP.test(grp)) throw new ProposalError("A new asset needs its group (plants, things, machines, buildings, actors, biomes).");
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
  const inherited = (own: any, from: any) => own ?? (from ? { ...from, card: { ...(from.card ?? {}) } } : undefined);
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
  const card = recipe ? recordOf(heldRecord(over(inherited(body.record, a[0]?.card), set), own!.libs, own!.source), grp, slug, n, null, recipe) : variants[defaultVariant!].card;
  // every other asset a version names, it names by hash (play/SPEC.md §4)
  const readable = [card, ...Object.values(variants).map((x) => x.card)].flatMap((c) => readableRefs(c, `${grp}/${slug}`));
  if (readable.length) throw new ProposalError(`Name other assets by their hash, not ${readable.slice(0, 3).join(", ")}.`);
  const engine = Number(card?.engine?.version ?? card?.card?.engine) || null;
  const content = { asset, parents: head ? [head] : [], recipe, defaultVariant, variants, card, engine };
  const id = versionId(content);

  for (const f of files) await store.put(f.hash, new TextEncoder().encode(f.text), MEDIA);
  const proposal = randomUUID();
  let branchId = 0, steps = 0;
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
    await tx.query(
      `INSERT INTO play.proposals (id, coop_id, kind, asset_id, base, version, author, note, via, doc_branch) VALUES ($1, $2, 'asset_version', $3, $4, $5, $6, $7, $8, $9)`,
      [proposal, COOP, asset, head, id, who.id, note, via, branch],
    );
    steps = (await docs.history(tx, assetDocId(asset), { branch })).length;
    branchId = branch;
  });
  return { id: proposal, asset, version: id, number: n, base: head, branch: branchId, steps };
}

export async function listProposals(db: Queryable, me: Me | null, status?: string) {
  const m = must(me, "read", "assets");
  // a story's proposals are the admins' alone, as the Stories are (./stories.ts), and a sandbox's layout's (./sandboxes.ts)
  return listProposalsWhere(db, `($1::text IS NULL OR p.status = $1) AND (p.kind = 'asset_version' OR $2)`, [status ?? null, m.level === "admin"]);
}

// a proposal of an asset version or of a story version (./stories.ts): a story's is listed as its title (label), the
// group "stories" and its id (story_id, a UUID), with the version it would be; a sandbox's change (./sandboxes.ts) as
// its title, the group "sandboxes" and its id (sandbox_id), with how many changes it makes. Only an asset has a slug,
// and it is only shown
async function listProposalsWhere(db: Queryable, where: string, args: unknown[]) {
  const { rows } = await db.query<any>(
    `SELECT p.id, p.kind, p.asset_id, p.base, p.version, p.story_id, p.story_base, p.story_version, p.doc_branch, p.status, p.note, p.created, p.decided_at, p.via,
            p.sandbox_id, p.sandbox_base, p.sandbox_change, p.sandbox_diff, jsonb_array_length(COALESCE(p.sandbox_diff, '[]')) AS changes,
            au.name AS author, de.name AS decided_by,
            COALESCE(a.label, sv.title, sx.title) AS label,
            COALESCE(a.grp, CASE WHEN p.kind = 'story_version' THEN 'stories' WHEN p.kind = 'sandbox_change' THEN 'sandboxes' END) AS grp,
            a.slug, v.card->'card'->>'label' AS version_label,
            CASE WHEN p.kind = 'story_version' THEN COALESCE(sb.number, 0) + 1 WHEN p.kind = 'sandbox_change' THEN NULL ELSE COALESCE(b.number, 0) + 1 END AS number
       FROM play.proposals p
       LEFT JOIN play.assets a ON a.id = p.asset_id
       LEFT JOIN play.asset_versions v ON v.id = p.version
       LEFT JOIN play.asset_versions b ON b.id = p.base
       LEFT JOIN play.story_versions sv ON sv.id = p.story_version
       LEFT JOIN play.story_versions sb ON sb.id = p.story_base
       LEFT JOIN play.sandboxes sx ON sx.id = p.sandbox_id
       LEFT JOIN play.humans au ON au.id = p.author
       LEFT JOIN play.humans de ON de.id = p.decided_by
      WHERE ${where}
      ORDER BY p.created DESC LIMIT 200`,
    args,
  );
  return rows;
}

/**
 * One proposal as people review it before they decide: the proposed version's readable source and its recipe files,
 * the base's source to set it beside, and the version as the catalog would list it once accepted (`builds`), so the
 * page can build it in the asset box, the sandboxed frame every recipe runs in, before anyone accepts it.
 */
export async function proposalOf(db: Queryable, me: Me | null, id: string) {
  const m = must(me, "read", "assets");
  if (!UUID.test(id)) throw new ProposalError("A proposal is named by its id, a UUID.", 404);
  const [p] = (await listProposalsWhere(db, `p.id = $1 AND (p.kind = 'asset_version' OR $2)`, [id, m.level === "admin"]));
  if (!p) throw new ProposalError("There is no such proposal.", 404);
  // a sandbox's change: what each edit changes, before and after, as accepting would apply it
  if (p.kind === "sandbox_change") return { ...p, ...(await sandboxReview(db, p)) };
  // a story's: its proposed timeline, the head's it was made from, and what changed, clip by clip
  if (p.kind === "story_version") return { ...p, ...(await storyReview(db, p)) };
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

/**
 * Accept or archive a proposal: a proposal ends accepted or archived, nothing else (Samuel 2026-11-04). An admin decides
 * any; its author may archive their own. An asset's is accepted only on the head it was made on (else it is archived,
 * to be proposed again on the new head), so what is accepted is exactly the version the Proposals page built and showed
 * in the asset box; its branch of the asset's document is merged and named the version's number. Archived, its branch
 * is closed, its steps kept.
 */
/** A proposal archived by its own author: its status, and its branch closed as a side line in the history. */
async function archiveAsAuthor(tx: Queryable, me: Me, p: any) {
  await tx.query(`UPDATE play.proposals SET status = 'archived', decided_by = $2, decided_at = now() WHERE id = $1`, [p.id, me.id]);
  if (p.kind === "story_version") await archiveOwnStory(tx, me, p);
  else if (p.kind !== "sandbox_change") await closeBranch(tx, p.asset_id, p.doc_branch, me, "archived");
  return { id: p.id as string, status: "archived" as const };
}

/**
 * An agent archives its own open proposal over MCP (Samuel 2026-11-04): one a newer proposal of its own replaces, or one
 * it no longer stands by. Only a proposal its admin made over MCP, never anyone else's and never one made on the page;
 * accepting stays a person's, on the Proposals page.
 */
export async function archiveOwn(db: Db, me: Me | null, id: string) {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (!UUID.test(id)) throw new ProposalError("Name the proposal by its id (list_proposals gives it).");
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<any>(`SELECT * FROM play.proposals WHERE id = $1 FOR UPDATE`, [id]);
    const p = rows[0];
    if (!p) throw new ProposalError("There is no such proposal.", 404);
    if (p.author !== me.id || p.via !== "mcp")
      throw new ProposalError("Only a proposal you made over MCP is yours to archive; the rest are decided on the Proposals page.", 403);
    if (p.status !== "open") throw new ProposalError(`This proposal is ${p.status} already.`, 409);
    return archiveAsAuthor(tx, me, p);
  });
}

export async function decide(db: Db, store: BlobStore, me: Me | null, id: string, verdict: Verdict) {
  if (!me) throw new Denied("Please sign in first.", 401);
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<any>(`SELECT * FROM play.proposals WHERE id = $1 FOR UPDATE`, [id]);
    const p = rows[0];
    if (!p) throw new ProposalError("There is no such proposal.", 404);
    if (p.status !== "open") throw new ProposalError(`This proposal is ${p.status} already.`, 409);
    // its author archives their own, whoever may decide the rest
    if (verdict === "archive" && p.author === me.id && me.level !== "admin") return archiveAsAuthor(tx, me, p);
    if (p.kind === "story_version") return decideStory(tx, me, p, verdict);
    if (p.kind === "sandbox_change") return decideSandbox(tx, me, p, verdict);
    must(me, "decide", "asset_version");
    if (verdict === "archive") {
      await tx.query(`UPDATE play.proposals SET status = 'archived', decided_by = $2, decided_at = now() WHERE id = $1`, [id, me.id]);
      await closeBranch(tx, p.asset_id, p.doc_branch, me, "archived");
      return { id, status: "archived" };
    }
    const { rows: a } = await tx.query<{ head: string | null; number: number | null }>(
      `SELECT a.head, v.number FROM play.assets a LEFT JOIN play.asset_versions v ON v.id = a.head WHERE a.id = $1 FOR UPDATE OF a`, [p.asset_id],
    );
    if ((a[0]?.head ?? null) !== (p.base ?? null)) {
      await tx.query(`UPDATE play.proposals SET status = 'archived', decided_at = now() WHERE id = $1`, [id]);
      await closeBranch(tx, p.asset_id, p.doc_branch, me, "archived");
      return { id, status: "archived" };
    }
    // the asset's document, made from its history first where it has none (and this proposal's branch, if it lacks one)
    await ensureAssetDoc(tx, store, p.asset_id).catch((e) => {
      throw e instanceof AssetDocError ? new ProposalError(e.message, e.status) : e;
    });
    const n = (a[0]?.number ?? 0) + 1;
    await tx.query(`UPDATE play.asset_versions SET number = $2, approved_by = $3 WHERE id = $1`, [p.version, n, me.id]);
    await tx.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [p.asset_id, p.version]);
    await tx.query(`UPDATE play.proposals SET status = 'accepted', decided_by = $2, decided_at = now() WHERE id = $1`, [id, me.id]);
    await acceptBranch(tx, store, p, me, n);
    const { rows: stale } = await tx.query<{ doc_branch: string | null }>(
      `UPDATE play.proposals SET status = 'archived', decided_at = now()
        WHERE asset_id = $1 AND status = 'open' AND id <> $2 AND base IS NOT DISTINCT FROM $3 RETURNING doc_branch`,
      [p.asset_id, id, p.base],
    );
    for (const s of stale) await closeBranch(tx, p.asset_id, s.doc_branch, me, "archived");
    return { id, status: "accepted", number: n, version: p.version };
  });
}

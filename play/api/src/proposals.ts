// Asset update proposals (play/SPEC.md §4.3): a citizen proposes a new version of an asset (or a new asset), built for
// the version after its head, as a recipe file names its own version; an admin accepts or rejects it. Accepting checks
// the head is still the one it was made from, in one transaction, so of two proposals on one head only the first goes
// in and the other is stale: rebuilt and proposed again on the new head.
import { randomUUID } from "node:crypto";
import type { BlobStore } from "./blobs";
import { hashText } from "./hash";
import type { Db, Queryable } from "./pg";
import { COOP, Denied, must, type Me } from "./access";
import { labelOf, libraryOf, RECIPE_HEAD, recipeTail } from "./recipes";
import { boxEngine, LATEST_BOX } from "./engines";
import { readableRefs } from "../import/plan";
import { versionId } from "./versions";
import { newId, UUID } from "./uuid";

export class ProposalError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const GROUP = /^(plants|things|machines|buildings|actors|biomes)$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const VARIANT = /^[a-z0-9][a-z0-9-]{0,79}$/;
export const MOST_FILE = 16 * 1024 * 1024;
const MEDIA = "text/javascript";

type Upload = { source?: string; recipe?: string; record?: any };
export type ProposalBody = {
  asset?: string; // an existing asset, by its UUID
  new?: { group: string; slug: string; label: string }; // or a new one: its group, slug and label
  label?: string;
  note?: string;
  base?: string | null; // the head it was made from, as the proposer saw it
  record?: any; // the version's record (card, params, contract …)
  source?: string; // the version's readable source: the library its recipe file wraps (module.exports.recipe = …)
  recipe?: string; // or its recipe file, as text, whose library must be that readable source
  variants?: Record<string, Upload>;
  defaultVariant?: string;
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

/** a record with its card naming what it is: the asset, the version, the variant and the file */
const recordOf = (record: any, grp: string, slug: string, n: number, variant: string | null, hash: string) => ({
  ...(record ?? {}),
  kind: "recipe",
  card: { ...(record?.card ?? {}), group: grp, id: slug, version: n, v: n, ...(variant ? { variant } : {}), recipe: hash },
});

export async function propose(db: Db, store: BlobStore, me: Me | null, body: ProposalBody, via: "web" | "mcp" = "web") {
  const who = must(me, "propose", "asset_version");
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
    grp = `${body?.new?.group ?? ""}`;
    slug = `${body?.new?.slug ?? ""}`;
    if (!GROUP.test(grp) || !SLUG.test(slug)) throw new ProposalError("A new asset needs its group (plants, things, machines, buildings, actors, biomes) and a slug.");
    const { rows } = await db.query(`SELECT 1 FROM play.assets WHERE grp = $1 AND slug = $2`, [grp, slug]);
    if (rows[0]) throw new ProposalError(`There is an asset ${grp}/${slug} already: propose a version of it.`, 409);
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
  const head = a[0]?.head ?? null;
  if (body.base !== undefined && (body.base ?? null) !== head)
    throw new ProposalError("Someone changed this asset since you started: build it again on its newest version.", 409);
  const n = (a[0]?.number ?? 0) + 1;
  const label = `${body.new?.label ?? body.label ?? a[0]?.label ?? ""}`.trim().slice(0, 120);
  if (!label) throw new ProposalError("A new asset needs a label.");

  const variantNames = Object.keys(body.variants ?? {});
  if (!!(body.recipe || body.source) === !!variantNames.length) throw new ProposalError("Give either the version's source (or recipe file) or its variants, not both.");
  const files: { text: string; hash: string }[] = [];
  let recipe: string | null = null;
  let source: string | null = null;
  let own: { libs: string[]; source: string } | null = null;
  let defaultVariant: string | null = null;
  const variants: Record<string, { recipe: string; source: string; card: any }> = {};
  if (body.recipe || body.source) {
    const c = checkedCode(body, slug, n, null);
    files.push(c.source, c.recipe);
    recipe = c.recipe.hash;
    source = c.source.hash;
    own = { libs: c.libs, source: c.source.hash };
  } else {
    for (const name of variantNames) {
      if (!VARIANT.test(name)) throw new ProposalError(`${name} is not a variant's name.`);
      const c = checkedCode(body.variants![name], slug, n, name);
      files.push(c.source, c.recipe);
      const from = a[0]?.variants?.[name] ?? a[0]?.card;
      const record = heldRecord(inherited(body.variants![name].record, from), c.libs, c.source.hash);
      variants[name] = { recipe: c.recipe.hash, source: c.source.hash, card: recordOf(record, grp, slug, n, name, c.recipe.hash) };
    }
    defaultVariant = body.defaultVariant ?? variantNames[0];
    if (!variants[defaultVariant]) throw new ProposalError(`${defaultVariant} is not one of its variants.`);
  }
  const card = recipe ? recordOf(heldRecord(inherited(body.record, a[0]?.card), own!.libs, own!.source), grp, slug, n, null, recipe) : variants[defaultVariant!].card;
  // every other asset a version names, it names by hash (play/SPEC.md §4)
  const readable = [card, ...Object.values(variants).map((x) => x.card)].flatMap((c) => readableRefs(c, `${grp}/${slug}`));
  if (readable.length) throw new ProposalError(`Name other assets by their hash, not ${readable.slice(0, 3).join(", ")}.`);
  const engine = Number(card?.engine?.version ?? card?.card?.engine) || null;
  const content = { asset, parents: head ? [head] : [], recipe, defaultVariant, variants, card, engine };
  const id = versionId(content);

  for (const f of files) await store.put(f.hash, new TextEncoder().encode(f.text), MEDIA);
  const proposal = randomUUID();
  await db.transaction(async (tx) => {
    for (const f of files)
      await tx.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [
        f.hash, Buffer.byteLength(f.text), MEDIA, `blobs/${f.hash.slice(0, 2)}/${f.hash}`,
      ]);
    await tx.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`, [asset, COOP, grp, slug, label]);
    await tx.query(
      `INSERT INTO play.asset_versions (id, asset_id, parents, recipe_hash, source_hash, default_variant, card, engine, author, note)
       VALUES ($1, $2, $3, $4, $5, $6, ($7::text)::jsonb, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
      [id, asset, content.parents, recipe, source, defaultVariant, JSON.stringify(card), engine, who.id, `${body.note ?? ""}`.slice(0, 2000)],
    );
    for (const [name, x] of Object.entries(variants))
      await tx.query(`INSERT INTO play.asset_variants (version_id, name, recipe_hash, source_hash, card) VALUES ($1, $2, $3, $4, ($5::text)::jsonb) ON CONFLICT DO NOTHING`, [id, name, x.recipe, x.source, JSON.stringify(x.card)]);
    await tx.query(
      `INSERT INTO play.proposals (id, coop_id, kind, asset_id, base, version, author, note, via) VALUES ($1, $2, 'asset_version', $3, $4, $5, $6, $7, $8)`,
      [proposal, COOP, asset, head, id, who.id, `${body.note ?? ""}`.slice(0, 2000), via],
    );
  });
  return { id: proposal, asset, version: id, number: n, base: head };
}

export async function listProposals(db: Queryable, me: Me | null, status?: string) {
  must(me, "read", "assets");
  return listProposalsWhere(db, `($1::text IS NULL OR p.status = $1)`, [status ?? null]);
}

async function listProposalsWhere(db: Queryable, where: string, args: unknown[]) {
  const { rows } = await db.query<any>(
    `SELECT p.id, p.asset_id, p.base, p.version, p.status, p.note, p.created, p.decided_at, p.via,
            au.name AS author, de.name AS decided_by, a.label, a.grp, a.slug, v.card->'card'->>'label' AS version_label,
            COALESCE(b.number, 0) + 1 AS number
       FROM play.proposals p
       JOIN play.assets a ON a.id = p.asset_id
       JOIN play.asset_versions v ON v.id = p.version
       LEFT JOIN play.asset_versions b ON b.id = p.base
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
  must(me, "read", "assets");
  if (!UUID.test(id)) throw new ProposalError("A proposal is named by its id, a UUID.", 404);
  const [p] = (await listProposalsWhere(db, `p.id = $1`, [id]));
  if (!p) throw new ProposalError("There is no such proposal.", 404);
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
  return {
    ...p,
    source: v[0]?.source_hash ?? null,
    recipe: v[0]?.recipe_hash ?? null,
    variants: x.map((r) => ({ name: r.name, recipe: r.recipe_hash, source: r.source_hash })),
    baseVersion: b[0] ? { number: b[0].number, source: b[0].source_hash ?? b[0].variant_source ?? null, recipe: b[0].recipe_hash } : null,
    builds,
  };
}

export type Verdict = "accept" | "reject" | "withdraw";

export async function decide(db: Db, me: Me | null, id: string, verdict: Verdict) {
  if (!me) throw new Denied("Please sign in first.", 401);
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<any>(`SELECT * FROM play.proposals WHERE id = $1 FOR UPDATE`, [id]);
    const p = rows[0];
    if (!p) throw new ProposalError("There is no such proposal.", 404);
    if (p.status !== "open") throw new ProposalError(`This proposal is ${p.status} already.`, 409);
    if (verdict === "withdraw") {
      if (p.author !== me.id) throw new Denied("Only its author withdraws a proposal.");
      await tx.query(`UPDATE play.proposals SET status = 'withdrawn', decided_at = now() WHERE id = $1`, [id]);
      return { id, status: "withdrawn" };
    }
    must(me, "decide", "asset_version");
    if (verdict === "reject") {
      await tx.query(`UPDATE play.proposals SET status = 'rejected', decided_by = $2, decided_at = now() WHERE id = $1`, [id, me.id]);
      return { id, status: "rejected" };
    }
    const { rows: a } = await tx.query<{ head: string | null; number: number | null }>(
      `SELECT a.head, v.number FROM play.assets a LEFT JOIN play.asset_versions v ON v.id = a.head WHERE a.id = $1 FOR UPDATE OF a`, [p.asset_id],
    );
    if ((a[0]?.head ?? null) !== (p.base ?? null)) {
      await tx.query(`UPDATE play.proposals SET status = 'stale', decided_at = now() WHERE id = $1`, [id]);
      return { id, status: "stale" };
    }
    const n = (a[0]?.number ?? 0) + 1;
    await tx.query(`UPDATE play.asset_versions SET number = $2, approved_by = $3 WHERE id = $1`, [p.version, n, me.id]);
    await tx.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [p.asset_id, p.version]);
    await tx.query(`UPDATE play.proposals SET status = 'accepted', decided_by = $2, decided_at = now() WHERE id = $1`, [id, me.id]);
    await tx.query(
      `UPDATE play.proposals SET status = 'stale', decided_at = now()
        WHERE asset_id = $1 AND status = 'open' AND id <> $2 AND base IS NOT DISTINCT FROM $3`,
      [p.asset_id, id, p.base],
    );
    return { id, status: "accepted", number: n, version: p.version };
  });
}

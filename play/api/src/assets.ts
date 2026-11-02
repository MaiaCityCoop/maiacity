// The asset library, read (play/SPEC.md §4, §7): every asset Maia City owns, each with its versions as a chain, each
// version's variants, and a ref resolved to the recipe file a sandbox builds.
import type { Queryable } from "./pg";
import { parseRef, RefError } from "./recipes";

export class NotFound extends Error {
  status = 404;
}

const summary = (record: any) => {
  const c = record?.card ?? {};
  return { cardLabel: c.label ?? record?.title ?? null, size: c.size ?? null, triangles: c.triangles ?? null, skinned: c.skinned ?? null, params: record?.params ?? c.params ?? [] };
};

/** every asset with a version, by group and slug, with its newest version's summary */
export async function listAssets(db: Queryable, grp?: string) {
  const { rows } = await db.query<any>(
    `SELECT a.id, a.grp, a.slug, a.label, v.number AS head, v.card,
            (SELECT count(*) FROM play.asset_versions x WHERE x.asset_id = a.id AND x.number IS NOT NULL) AS versions
       FROM play.assets a JOIN play.asset_versions v ON v.id = a.head
      WHERE ($1::text IS NULL OR a.grp = $1)
      ORDER BY a.grp, a.slug`,
    [grp ?? null],
  );
  return rows.map((r) => ({ id: r.id, grp: r.grp, slug: r.slug, label: r.label, head: r.head, versions: Number(r.versions), ...summary(r.card) }));
}

/** one asset and its whole chain, newest first */
export async function assetOf(db: Queryable, id: string) {
  const { rows: a } = await db.query<any>(`SELECT id, grp, slug, label, head, coop_id, created FROM play.assets WHERE id = $1`, [id]);
  if (!a[0]) throw new NotFound(`There is no asset ${id}.`);
  const { rows: versions } = await db.query<any>(
    `SELECT v.id, v.number, v.parents, v.recipe_hash, v.default_variant, v.card, v.engine, v.note, v.created, v.imported,
            au.name AS author, ap.name AS approved_by,
            COALESCE((SELECT json_agg(json_build_object('name', x.name, 'recipe', x.recipe_hash, 'label', x.card->'card'->>'label') ORDER BY x.name)
                        FROM play.asset_variants x WHERE x.version_id = v.id), '[]') AS variants
       FROM play.asset_versions v
       LEFT JOIN play.humans au ON au.id = v.author
       LEFT JOIN play.humans ap ON ap.id = v.approved_by
      WHERE v.asset_id = $1 AND v.number IS NOT NULL
      ORDER BY v.number DESC`,
    [id],
  );
  return {
    ...a[0],
    versions: versions.map((v) => ({
      id: v.id, number: v.number, parents: v.parents, recipe: v.recipe_hash, defaultVariant: v.default_variant,
      engine: v.engine, note: v.note, created: v.created, author: v.author ?? (v.imported ? v.imported.authors?.join(", ") : null),
      approvedBy: v.approved_by, imported: !!v.imported, variants: v.variants, ...summary(v.card),
    })),
  };
}

/** one version of an asset with its whole record and its variants' records */
export async function versionOf(db: Queryable, id: string, number: number) {
  const { rows } = await db.query<any>(
    `SELECT v.*, COALESCE((SELECT json_agg(json_build_object('name', x.name, 'recipe', x.recipe_hash, 'card', x.card) ORDER BY x.name)
                            FROM play.asset_variants x WHERE x.version_id = v.id), '[]') AS variants
       FROM play.asset_versions v WHERE v.asset_id = $1 AND v.number = $2`,
    [id, number],
  );
  if (!rows[0]) throw new NotFound(`There is no ${id}@${number}.`);
  const v = rows[0];
  return { id: v.id, asset: id, number: v.number, parents: v.parents, recipe: v.recipe_hash, defaultVariant: v.default_variant, card: v.card, engine: v.engine, note: v.note, variants: v.variants, imported: v.imported };
}

export type Resolved = { ref: string; asset: string; number: number; variant: string | null; hash: string; card: any; params: Record<string, string> | null };

/**
 * A ref as a sandbox names it, resolved to the recipe file it builds: `group/id@v` its version's own recipe, or for a
 * kind of variants its default variant's; `group/id@v:variant` that variant's. No version, no variant: refused.
 */
export async function resolve(db: Queryable, ref: string): Promise<Resolved> {
  let r;
  try {
    r = parseRef(ref);
  } catch (e) {
    throw new NotFound((e as RefError).message);
  }
  const { rows } = await db.query<any>(
    `SELECT v.id, v.recipe_hash, v.default_variant, v.card FROM play.asset_versions v WHERE v.asset_id = $1 AND v.number = $2`,
    [r.asset, r.number],
  );
  const v = rows[0];
  if (!v) throw new NotFound(`There is no ${r.asset}@${r.number}.`);
  const variant = r.variant ?? v.default_variant;
  if (!variant) return { ref, asset: r.asset, number: r.number, variant: null, hash: v.recipe_hash, card: v.card, params: r.params };
  const { rows: x } = await db.query<any>(`SELECT recipe_hash, card FROM play.asset_variants WHERE version_id = $1 AND name = $2`, [v.id, variant]);
  if (!x[0]) throw new NotFound(`${r.asset}@${r.number} has no variant ${variant}.`);
  return { ref, asset: r.asset, number: r.number, variant, hash: x[0].recipe_hash, card: x[0].card, params: r.params };
}

/** what a sandbox draws: each slot's ref and the recipe file it builds */
export async function pinsOf(db: Queryable, sandbox: string) {
  const { rows: s } = await db.query(`SELECT 1 FROM play.sandboxes WHERE id = $1`, [sandbox]);
  if (!s[0]) throw new NotFound(`There is no ${sandbox}.`);
  const { rows } = await db.query<any>(
    `SELECT p.slot, p.variant, p.params, v.asset_id, v.number,
            COALESCE(x.recipe_hash, v.recipe_hash, d.recipe_hash) AS hash, COALESCE(p.variant, v.default_variant) AS used_variant
       FROM play.sandbox_pins p
       JOIN play.asset_versions v ON v.id = p.version_id
       LEFT JOIN play.asset_variants x ON x.version_id = v.id AND x.name = p.variant
       LEFT JOIN play.asset_variants d ON d.version_id = v.id AND d.name = v.default_variant AND p.variant IS NULL
      WHERE p.sandbox_id = $1 ORDER BY p.slot`,
    [sandbox],
  );
  return rows.map((p) => {
    const q = p.params ? `?${new URLSearchParams(p.params)}` : "";
    return { slot: p.slot, ref: `${p.asset_id}@${p.number}${p.variant ? `:${p.variant}` : ""}${q}`, asset: p.asset_id, number: p.number, variant: p.used_variant, hash: p.hash, params: p.params };
  });
}

/** whether `hash` is a file play keeps, and its type */
export async function fileOf(db: Queryable, hash: string) {
  const { rows } = await db.query<{ hash: string; size: string; media_type: string }>(`SELECT hash, size, media_type FROM play.files WHERE hash = $1`, [hash]);
  return rows[0] ?? null;
}

/**
 * Every accepted version and variant as one row, the shape the site's recipe index reads (play/site's
 * content/assets/sources/avendb.js `vaultRecipes`, cloned from legacy): its record (the card, its engine, manifest and
 * contract), its one file by hash, its asset as its `entry`, its version as `main`, the line it is on (null for the
 * version's own recipe or its default variant, the variant's name otherwise), and its version id as `at`.
 */
export async function catalogOf(db: Queryable) {
  const { rows } = await db.query<any>(
    `SELECT v.asset_id, v.id, v.number, v.recipe_hash, v.default_variant, v.card, f.size,
            COALESCE((SELECT json_agg(json_build_object('name', x.name, 'recipe', x.recipe_hash, 'card', x.card, 'size', xf.size) ORDER BY x.name)
                        FROM play.asset_variants x JOIN play.files xf ON xf.hash = x.recipe_hash WHERE x.version_id = v.id), '[]') AS variants
       FROM play.asset_versions v
       JOIN play.assets a ON a.id = v.asset_id
       LEFT JOIN play.files f ON f.hash = v.recipe_hash
      WHERE v.number IS NOT NULL
      ORDER BY v.asset_id, v.number`,
  );
  const out: any[] = [];
  const row = (v: any, record: any, hash: string, size: number, line: string | null) => ({
    vault: "play", entry: v.asset_id, type: "recipe", tags: [], heads: [v.id], at: [v.id], main: v.number, line,
    record, files: [{ root: hash, hash, len: Number(size), size: Number(size) }],
  });
  for (const v of rows) {
    if (v.recipe_hash) out.push(row(v, v.card, v.recipe_hash, v.size, null));
    for (const x of v.variants) out.push(row(v, x.card, x.recipe, x.size, x.name === v.default_variant ? null : x.name));
  }
  return out;
}

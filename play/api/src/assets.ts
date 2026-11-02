// The asset library, read (play/SPEC.md §4, §7): every asset Maia City owns, each with its versions as a chain, each
// version's variants, and a ref resolved to the recipe file a sandbox builds.
import type { Queryable } from "./pg";

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
  const { rows: a } = await db.query<any>(`SELECT id, grp, slug, label, head, coop_id, created, sound, sound_gain FROM play.assets WHERE id = $1`, [id]);
  if (!a[0]) throw new NotFound(`There is no asset ${id}.`);
  const { rows: versions } = await db.query<any>(
    `SELECT v.id, v.number, v.parents, v.recipe_hash, v.source_hash, v.default_variant, v.card, v.engine, v.note, v.created, v.imported,
            au.name AS author, ap.name AS approved_by,
            COALESCE((SELECT json_agg(json_build_object('name', x.name, 'recipe', x.recipe_hash, 'source', x.source_hash, 'label', x.card->'card'->>'label') ORDER BY x.name)
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
      id: v.id, number: v.number, parents: v.parents, recipe: v.recipe_hash, source: v.source_hash, defaultVariant: v.default_variant,
      engine: v.engine, note: v.note, created: v.created, author: v.author ?? (v.imported ? v.imported.authors?.join(", ") : null),
      approvedBy: v.approved_by, imported: !!v.imported, variants: v.variants, ...summary(v.card),
    })),
  };
}

/** one version of an asset with its whole record and its variants' records */
export async function versionOf(db: Queryable, id: string, number: number) {
  const { rows } = await db.query<any>(
    `SELECT v.*, COALESCE((SELECT json_agg(json_build_object('name', x.name, 'recipe', x.recipe_hash, 'source', x.source_hash, 'card', x.card) ORDER BY x.name)
                            FROM play.asset_variants x WHERE x.version_id = v.id), '[]') AS variants
       FROM play.asset_versions v WHERE v.asset_id = $1 AND v.number = $2`,
    [id, number],
  );
  if (!rows[0]) throw new NotFound(`There is no ${id}@${number}.`);
  const v = rows[0];
  return { id: v.id, asset: id, number: v.number, parents: v.parents, recipe: v.recipe_hash, source: v.source_hash, defaultVariant: v.default_variant, card: v.card, engine: v.engine, note: v.note, variants: v.variants, imported: v.imported };
}

/** what a sandbox draws: each slot, the build it pins (`<hash>?values`), and what that is, for showing */
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
    const values = p.params ? Object.entries(p.params as Record<string, string>).sort(([a], [b]) => (a < b ? -1 : 1)) : [];
    const build = values.length ? `${p.hash}?${new URLSearchParams(values)}` : p.hash;
    return { slot: p.slot, build, hash: p.hash, asset: p.asset_id, number: p.number, variant: p.used_variant };
  });
}

/** whether `hash` is a file play keeps, and its type */
export async function fileOf(db: Queryable, hash: string) {
  const { rows } = await db.query<{ hash: string; size: string; media_type: string }>(`SELECT hash, size, media_type FROM play.files WHERE hash = $1`, [hash]);
  return rows[0] ?? null;
}

/**
 * The catalog (play/SPEC.md §4): every accepted version and variant by the BLAKE3 hash of its recipe file — the one
 * name a sandbox or another asset knows it by — with what it is (its asset, version, variant and label, for showing)
 * and its record (its card, manifest, contract and engine), which the site builds it by.
 */
export async function catalogOf(db: Queryable) {
  const { rows } = await db.query<any>(
    `SELECT v.asset_id, a.grp, a.slug, v.number, NULL::text AS variant, v.recipe_hash AS hash, v.card AS record, f.size, false AS is_default
       FROM play.asset_versions v JOIN play.assets a ON a.id = v.asset_id JOIN play.files f ON f.hash = v.recipe_hash
      WHERE v.number IS NOT NULL
     UNION ALL
     SELECT v.asset_id, a.grp, a.slug, v.number, x.name, x.recipe_hash, x.card, f.size, x.name = v.default_variant
       FROM play.asset_variants x JOIN play.asset_versions v ON v.id = x.version_id JOIN play.assets a ON a.id = v.asset_id
       JOIN play.files f ON f.hash = x.recipe_hash
      WHERE v.number IS NOT NULL
      ORDER BY 1, 4, 5 NULLS FIRST`,
  );
  return rows.map((r) => ({
    hash: r.hash, size: Number(r.size), asset: r.asset_id, group: r.grp, slug: r.slug, v: r.number, variant: r.variant,
    first: !!r.is_default, label: r.record?.card?.label ?? r.record?.title ?? `${r.grp}/${r.slug}`, record: r.record,
  }));
}

/**
 * A sandbox's config: its pins as `assets`, each slot the build it pins (`<hash>?values`), and every other config it
 * keeps by name (Sandbox 1's `garden`), each planting's slot handed out as its build (`asset`).
 */
export async function configOf(db: Queryable, sandbox: string) {
  const pins = await pinsOf(db, sandbox);
  const assets = Object.fromEntries(pins.map((p) => [p.slot, p.build]));
  const { rows } = await db.query<{ name: string; data: any }>(`SELECT name, data FROM play.sandbox_configs WHERE sandbox_id = $1`, [sandbox]);
  const withBuilds = (o: any): any => {
    if (Array.isArray(o)) return o.map(withBuilds);
    if (o && typeof o === "object") {
      const out = Object.fromEntries(Object.entries(o).map(([k, v]) => [k, withBuilds(v)]));
      if (typeof o.slot === "string") {
        if (!assets[o.slot]) throw new NotFound(`${sandbox}'s config names slot ${o.slot}, which it doesn't pin`);
        out.asset = assets[o.slot];
      }
      return out;
    }
    return o;
  };
  return { sandbox, assets, ...Object.fromEntries(rows.map((r) => [r.name, withBuilds(r.data)])) };
}

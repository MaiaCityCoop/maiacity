// A test's proposal naming its levels of detail (play/SPEC.md §4.5, ../../src/lod.ts): every new asset version names them
// on its card, and a new asset, or a version whose source changed, carries its own (intent a7507347): its source exports
// `module.exports.levels`, its card says `lod.levels: 'declared'` with the triangles of its finest shape (`lod.tris`,
// within the ceiling) and declares the params its levels set. A fixture's assets are simple shapes of one param,
// `detail`, and two lighter levels of it, unless the proposal names its own.

/** what a fixture's source exports as its own levels (L1, L2), appended to its source */
export const LEVELS = "module.exports.levels = [\n  { values: { detail: 0.25 } }, // L1\n  { values: { detail: 0.1 } }, // L2\n];\n";
/** the param its levels set, as its card declares it */
export const DETAIL = [{ id: "detail", label: "Detail", type: "number", value: 1, min: 0.05, max: 1 }];
/** a fixture's card's `lod`: its own levels, its finest shape's triangles */
export const OWN = { levels: "declared", tris: 1200 } as const;
/** what `LEVELS` reads as on a card (`lod.values`) */
export const VALUES = [{ detail: 0.25 }, { detail: 0.1 }];
/** a fixture's `lod` as play writes it on the version's card: `OWN` with the values read from its source */
export const HELD = { ...OWN, values: VALUES };
/** MCP propose_asset's arguments for it (`lod` and `params` at top level), beside a source that ends with `LEVELS` */
export const OWNED = { lod: OWN, params: DETAIL };

const exportsLevels = (text: string) => /(?:module\.)?exports\.levels\s*=/.test(text);
const TAIL = "\nreturn module.exports.recipe(";
/** a source with `LEVELS` appended, unless it exports its own */
export const withLevels = (source: string) => (exportsLevels(source) ? source : source + LEVELS);
/** a recipe file (RECIPE_HEAD + source + tail) with `LEVELS` at the end of its source, before its tail's last line */
export function recipeWithLevels(recipe: string): string {
  if (exportsLevels(recipe)) return recipe;
  const at = recipe.lastIndexOf(TAIL);
  if (at < 0) return recipe;
  const source = recipe.slice(0, at);
  return source + (source.endsWith("\n") ? "" : "\n") + LEVELS.replace(/\n$/, "") + recipe.slice(at);
}

/**
 * A proposal's body (the web's, `POST /api/intents`, or `proposeAsset`'s own) made to carry its own levels where
 * neither its card nor its record names any `lod`: `card.lod` is `OWN`, `card.params` is `DETAIL` where it names none,
 * and `LEVELS` is appended to its `source`, to each variant's and into its `recipe` file. A body naming its own `lod`
 * is given back as it is.
 */
export function leveled<T extends Record<string, any>>(body: T): T {
  if (body?.card?.lod !== undefined || body?.record?.card?.lod !== undefined) return body;
  const out: Record<string, any> = { ...body, card: { ...(body.card ?? {}), lod: OWN, ...(body.card?.params === undefined ? { params: DETAIL } : {}) } };
  if (typeof body.source === "string") out.source = withLevels(body.source);
  if (typeof body.recipe === "string") out.recipe = recipeWithLevels(body.recipe);
  if (body.variants && typeof body.variants === "object" && !Array.isArray(body.variants))
    out.variants = Object.fromEntries(
      Object.entries<any>(body.variants).map(([name, v]) => [
        name,
        v && typeof v === "object" ? { ...v, ...(typeof v.source === "string" ? { source: withLevels(v.source) } : {}), ...(typeof v.recipe === "string" ? { recipe: recipeWithLevels(v.recipe) } : {}) } : v,
      ]),
    );
  return out as T;
}

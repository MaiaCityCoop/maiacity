// Recipes and refs (maia/content/assets/engines.js, refs.js): a recipe file names its asset, version and variant in its
// last line; a ref names an asset at a version, `group/id@v[:variant][?params]`.

/** the start every recipe file has (maia/content/assets/engines.js RECIPE_HEAD) */
export const RECIPE_HEAD = 'defineRecipe(function (require) {\n"use strict";\nvar module = { exports: {} }, exports = module.exports;\n';
/** …and the line that ends it, naming its asset, version and variant (engines.js recipeTail) */
const TAIL = /\nreturn module\.exports\.recipe\(("(?:[^"\\]|\\.)*"), ([1-9][0-9]{0,5}), (null|"(?:[^"\\]|\\.)*")\);\n\}\);\n$/;

export type Label = { id: string; v: number; variant: string | null };

/** the line that ends an asset's recipe file (engines.js recipeTail) */
export const recipeTail = (id: string, v: number, variant: string | null) =>
  `\nreturn module.exports.recipe(${JSON.stringify(id)}, ${v}, ${JSON.stringify(variant ?? null)});\n});\n`;

/** a recipe file's library: what it wraps between its head and its last line, or null if it isn't one */
export function libraryOf(text: string): string | null {
  if (!text.startsWith(RECIPE_HEAD)) return null;
  const m = TAIL.exec(text);
  return m ? text.slice(RECIPE_HEAD.length, m.index) : null;
}

/** what a recipe file names itself, or null if it isn't one */
export function labelOf(text: string): Label | null {
  if (!text.startsWith(RECIPE_HEAD)) return null;
  const m = TAIL.exec(text);
  if (!m) return null;
  return { id: JSON.parse(m[1]), v: Number(m[2]), variant: JSON.parse(m[3]) };
}

// ---- readable refs between assets: what legacy's cards named another asset by, `group/id[@v][:variant][?values]`.
// Play names every asset by hash (play/SPEC.md §4.7), so a proposal that brings one is refused.

/** an asset named by a readable ref, `group/id[@v][:variant][?values]`, as legacy's cards name other assets */
const READABLE = /^((?:plants|things|machines|buildings|actors|biomes)\/[a-z0-9][a-z0-9-]{0,79})(?:@([1-9][0-9]{0,5}))?(?::([a-z0-9][a-z0-9-]{0,79}))?(?:\?(.*))?$/;

/** every string in a JSON value, visited */
function eachString(v: unknown, f: (s: string) => void): void {
  if (typeof v === "string") f(v);
  else if (Array.isArray(v)) for (const x of v) eachString(x, f);
  else if (v && typeof v === "object") for (const x of Object.values(v)) eachString(x, f);
}

/** whether a JSON value names another asset than itself (`self`, its own `group/id`, one or several) by a readable
 * ref (what a proposal may not bring) */
export function readableRefs(v: unknown, self: string | readonly string[]): string[] {
  const own = typeof self === "string" ? [self] : self;
  const found: string[] = [];
  eachString(v, (s) => {
    const m = READABLE.exec(s);
    if (m && !own.includes(m[1])) found.push(s);
  });
  return found;
}


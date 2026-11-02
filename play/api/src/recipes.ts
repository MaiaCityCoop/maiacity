// Recipes and refs (maia/content/assets/engines.js, refs.js): a recipe file names its asset, version and variant in its
// last line; a ref names an asset at a version, `group/id@v[:variant][?params]`.

export class RefError extends Error {}

/** the start every recipe file has (maia/content/assets/engines.js RECIPE_HEAD) */
export const RECIPE_HEAD = 'defineRecipe(function (require) {\n"use strict";\nvar module = { exports: {} }, exports = module.exports;\n';
/** …and the line that ends it, naming its asset, version and variant (engines.js recipeTail) */
const TAIL = /\nreturn module\.exports\.recipe\(("(?:[^"\\]|\\.)*"), ([1-9][0-9]{0,5}), (null|"(?:[^"\\]|\\.)*")\);\n\}\);\n$/;

export type Label = { id: string; v: number; variant: string | null };

/** what a recipe file names itself, or null if it isn't one */
export function labelOf(text: string): Label | null {
  if (!text.startsWith(RECIPE_HEAD)) return null;
  const m = TAIL.exec(text);
  if (!m) return null;
  return { id: JSON.parse(m[1]), v: Number(m[2]), variant: JSON.parse(m[3]) };
}

/** `group/id@v[:variant][?params]` */
export function parseRef(ref: string): { asset: string; number: number; variant: string | null; params: Record<string, string> | null } {
  const m = /^([a-z]+\/[a-z0-9][a-z0-9-]{0,79})@([1-9][0-9]{0,5})(?::([a-z0-9][a-z0-9-]{0,79}))?(?:\?(.*))?$/.exec(ref);
  if (!m) throw new RefError(`not an asset ref: ${ref}`);
  const params = m[4] ? Object.fromEntries(new URLSearchParams(m[4])) : null;
  return { asset: m[1], number: Number(m[2]), variant: m[3] ?? null, params };
}


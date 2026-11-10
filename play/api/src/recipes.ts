// Recipes (play/site/src/lib/content/assets/box/engines.js): a recipe file names its asset, version and variant in
// its last line. And readable refs, `group/id@v[:variant][?params]`, which play refuses (below), in a card and in a source.

/** the start every recipe file has (play/site/src/lib/content/assets/box/engines.js RECIPE_HEAD) */
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


/** an asset named by group, slug and version anywhere in a text: `machines/powercube@3`, `plants/papaya@3:male`, or its
 * version worked out (`biomes/cover@${V}:${kind}`) */
const NAMED = /\b(?:plants|things|machines|buildings|actors|characters|biomes|worlds)\/[a-z0-9][a-z0-9-]*@(?:\d+|\$\{[^}]*\})(?::[a-z0-9-]+)?/g;

/** every asset a source names by group, slug and version, each once: in its code, its strings and its comments alike
 * (a comment showing such a name teaches it), its own name too. Play names an asset by its UUID or its recipe's hash
 * (play/SPEC.md §4.7), so a new source that holds one is refused (intent 5723e301) */
export const namedAssets = (source: string): string[] => [...new Set(source.match(NAMED) ?? [])];

/** why a source that names assets so is refused, or null */
export const namedWhy = (source: string): string | null => {
  const named = namedAssets(source);
  return named.length ? `it names ${named.slice(0, 3).join(", ")} by group, slug and version: name an asset by its recipe's hash or its UUID, in comments too` : null;
};

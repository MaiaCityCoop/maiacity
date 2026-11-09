// @ts-nocheck — plain JS
/*
 * WHAT A CARD SAYS OF ITS LEVELS — the one level-of-detail contract every asset is drawn by (play/SPEC.md §4.5, intent
 * a2935147): L0 its build; L1 and L2 its recipe's own where declared (`module.exports.levels = [{ values }, …]`, read off
 * its source onto its card as `lod.values`, since nothing runs a recipe outside the box), else simplified from its build
 * (./render/simplify.js); L3 its picture (./render/impostors.js). The renderer (./render/index.js) asks this module which
 * builds a kind's levels are, and knows no recipe's parameter by name.
 *
 * A version from before the contract names no `lod` and is read as derived (play/api src/lod.ts `lodOf`), drawn as it
 * was: one that takes a `detail` (every plant until now) is read as declaring the details Sandbox 4's forest drew it at
 * (`OLD_DETAILS`), so its look, cost and cache keys stay. No world chooses them (intent 6295a650): those are the forest's
 * two, never the whole plant at detail 1 (half a million triangles a tree; intent 6295a650's Metal run measured five
 * near the eye costing Sandbox 1's mid view 48 % more triangles): drawn at the selector's two coarsest thresholds, then
 * its picture (./render/lod.js `thresholdsOf`).
 */

/** the details a version from before the contract that takes a `detail` is built at for its levels, L0 first */
const OLD_DETAILS = [0.25, 0.1];
/** the parameter such a version took them by (only here: the renderer never names it) */
const OLD = 'detail';

/**
 * A card's levels: its own `lod`, or for a version before the contract derived (one taking a `detail`: OLD_DETAILS, `old`).
 * @param {any} card a record's card (`record.card`) @returns {{ levels: 'declared' | 'derived', values?: Record<string, string | number>[], budgets?: number[], old?: boolean }}
 */
export function lodOf(card) {
	const l = card?.lod;
	if (l?.levels === 'declared' && Array.isArray(l.values) && l.values.length) return { levels: 'declared', values: l.values, ...(l.budgets ? { budgets: l.budgets } : {}) };
	if (l?.levels === 'derived' || l?.levels === 'declared') return { levels: 'derived', ...(l.budgets ? { budgets: l.budgets } : {}) };
	if (card?.params?.some?.((p) => p?.id === OLD)) return { levels: 'declared', old: true, values: OLD_DETAILS.slice(1).map((d) => ({ [OLD]: d })) };
	return { levels: 'derived' };
}

/**
 * The values each built level of a kind is built with over those asked, L0 first: one (its build) where L1 and L2 are
 * derived, else one per declared level. @param {ReturnType<typeof lodOf> | undefined} lod @returns {Record<string, string>[]}
 */
export function levelValues(lod) {
	if (lod?.levels !== 'declared') return [{}];
	if (lod.old) return OLD_DETAILS.map((d) => ({ [OLD]: String(d) }));
	return [{}, ...lod.values.map((v) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)])))];
}

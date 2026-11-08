// @ts-nocheck — plain JS, runs in the box and in the page
/*
 * WHAT A MATERIAL IS, AS DATA (intent 6fd5e63f) — a recipe can't send a shader out of the box (./box/serialize.js), so a
 * material says what it *is* instead, and the page's own TSL draws it (../render/wind.js, ./render/foliage.js): its
 * `look`, one of KINDS, with three numbers in checked ranges:
 *
 *   translucency   0…1    how much sunlight comes through it from behind (a leaf's glow at golden hour; bark none)
 *   stiffness      0.1…10 how stiff it is (grass 0.6, a leaf 1, bark 6): it damps its own flutter; the main bend is
 *                         the whole copy's, the same for all its materials, so leaves stay on their branches
 *   flutter        0…1    how much its tips shake in the wind on their own (a leaf, a petal; a fruit none)
 *
 * A recipe sets it on a material's `userData.look` (`{ kind: 'leaf' }`, numbers left out take the kind's), and box
 * format 5 (engine 6) carries it out; the page checks it (`lookOf`: an unknown kind or a number out of its range is
 * refused) and draws it. A build of an older engine carries none: its materials take a look from their names, as
 * plant-skill names them (`lookByName`: `leaf`, `bark`, `twig` …), or none, and are drawn as before.
 */

/** the kinds of look, each with its numbers where a recipe gives none */
export const KINDS = Object.freeze({
	leaf: Object.freeze({ translucency: 0.6, stiffness: 1, flutter: 0.6 }),
	grass: Object.freeze({ translucency: 0.5, stiffness: 0.6, flutter: 0.3 }),
	petal: Object.freeze({ translucency: 0.7, stiffness: 1, flutter: 0.5 }),
	bark: Object.freeze({ translucency: 0, stiffness: 6, flutter: 0 }),
	stem: Object.freeze({ translucency: 0.2, stiffness: 2, flutter: 0.1 }),
	fruit: Object.freeze({ translucency: 0.1, stiffness: 3, flutter: 0 }),
	stone: Object.freeze({ translucency: 0, stiffness: 10, flutter: 0 })
});

/** each number's range, both ends kept */
export const RANGES = Object.freeze({ translucency: [0, 1], stiffness: [0.1, 10], flutter: [0, 1] });

/** the kinds whose faces let light through and are lit from both sides (drawn two-sided, cut out, not blended) */
export const THIN = Object.freeze(['leaf', 'grass', 'petal']);

/**
 * A look checked: `{ kind, translucency, stiffness, flutter }`, its numbers the kind's where not given; throws on an
 * unknown kind, a number out of its range or anything not a number. `null`/`undefined` is no look (null).
 * @param {unknown} x @param {string} [where] what it belongs to, for the error
 * @returns {{ kind: keyof typeof KINDS, translucency: number, stiffness: number, flutter: number } | null}
 */
export function lookOf(x, where = 'look') {
	if (x == null) return null;
	if (typeof x !== 'object' || Array.isArray(x)) throw new Error(`${where}: not a look`);
	const kind = /** @type {any} */ (x).kind;
	if (typeof kind !== 'string' || !Object.hasOwn(KINDS, kind)) throw new Error(`${where}: no look ${String(kind).slice(0, 40)}`);
	const out = { kind, ...KINDS[kind] };
	for (const [k, [lo, hi]] of Object.entries(RANGES)) {
		const v = /** @type {any} */ (x)[k];
		if (v === undefined) continue;
		if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) throw new Error(`${where}: ${k} ${String(v).slice(0, 20)} is not within ${lo}…${hi}`);
		out[k] = v;
	}
	return out;
}

/**
 * What leaves the box of a material's `userData.look`: only the plain fields, as given (the page checks them); none
 * where there is nothing that could be one.
 * @param {unknown} x
 */
export function plainLook(x) {
	if (!x || typeof x !== 'object' || typeof (/** @type {any} */ (x).kind) !== 'string') return undefined;
	const out = { kind: String(/** @type {any} */ (x).kind).slice(0, 40) };
	for (const k of Object.keys(RANGES)) if (typeof (/** @type {any} */ (x)[k]) === 'number') out[k] = /** @type {any} */ (x)[k];
	return out;
}

/**
 * The names plant-skill gives its materials, read as looks: for a build that carries none (every accepted version,
 * made before format 5). The first that matches wins; a name that matches none has no look and is drawn as before.
 */
const NAMES = /** @type {[RegExp, keyof typeof KINDS][]} */ ([
	[/petal|flower|blossom|bloom|sepal|corolla|bract|tepal/, 'petal'],
	[/grass|sedge|turf|reed|blade/, 'grass'],
	[/leaf|leaves|foliage|frond|needle|canopy|crown|cotyledon|seedleaf/, 'leaf'],
	[/bark|trunk|wood|limb|bole/, 'bark'],
	[/stem|stalk|petiole|twig|shoot|branch|vine|cane|tendril|pseudostem|rachis|peduncle|pedicel/, 'stem'],
	[/fruit|berry|pod|drupe|pome|peel|husk|nut|seed|cherry|apple|pear|fig|citrus|orange|lemon|lime|banana|mango|plum|apricot|peach|olive|grape|tomato/, 'fruit'],
	[/stone|rock|pebble|gravel|boulder/, 'stone']
]);

/** the biome cover kinds that lie still on the ground: litter, deadwood, stones, moss, mushrooms */
const STILL = /deadwood|leaves and twigs|litter|twig|moss|mushroom|stone|rock|pebble/i;

/**
 * The look a material of an accepted build is drawn with where its recipe said none (made before engine 6): its name's
 * (`lookByName`), else, on a plant or a biome's living cover (`group` plants or biomes), what the material itself
 * shows: a two-sided one is a leaf (grass on a grass), a one-sided one bark (it moves only with its copy's lean, its tips
 * still); nothing on anything else, nor on the cover that lies still (litter, deadwood, stones, moss, mushrooms).
 * @param {{ name?: string, side?: number, alphaTest?: number }} m @param {{ group?: string, label?: string }} kind
 */
export function lookOfBuilt(m, kind) {
	const named = lookByName(m?.name);
	if (named) return named;
	if (kind?.group !== 'plants' && kind?.group !== 'biomes') return null;
	if (STILL.test(kind.label ?? '')) return null;
	// three's DoubleSide is 2
	const thin = m?.side === 2 || (m?.alphaTest ?? 0) > 0;
	const k = thin ? (/grass|sedge|reed|rush/i.test(kind.label ?? '') ? 'grass' : 'leaf') : 'bark';
	return { kind: k, ...KINDS[k] };
}

/**
 * A material's look by its name, as plant-skill names materials (`leaf`, `leafBack`, `bark`, `twig`, `pod` …); null
 * for a name that says nothing.
 * @param {unknown} name
 */
export function lookByName(name) {
	if (typeof name !== 'string' || !name) return null;
	const n = name.toLowerCase();
	for (const [re, kind] of NAMES) if (re.test(n)) return { kind, ...KINDS[kind] };
	return null;
}

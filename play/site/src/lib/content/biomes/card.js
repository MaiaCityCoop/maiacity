/*
 * A BIOME AS ITS CARD SAYS IT — a biome is an asset of the `biomes` group like any other (./floors.js): built in the box
 * as a patch of its floor (./patch.js), its card made there and kept in the Maia City vault beside its recipe. Its parts
 * are what a floor is made of, each with its numbers as the card's specs:
 *
 *   the ground   each surface it is painted with (`ground-<surface>`) and its weight
 *   the cover    how many plants stand on a square metre inside their colonies (`density`), and each kind
 *                (`cover-<kind>`): the asset it is (its `ref`, the cover's kind at its seed), its share, how big its
 *                colonies are, how much of the ground they take, how full they are and the surface they grow on;
 *                a kind a machine sowed, its rows (how far apart, how far along them, how far off its line)
 *   the field    a field's tramlines (`tramlines`, of the assembly `field`): every how many metres, the gauge and the
 *                tyre's width; a biome may keep other parts there (its rows' depth, its colours), read by nobody here
 *
 * A world reads a biome from its card alone (`biomeOfCard`), as the vault hands it out, never from the repo's list: the
 * vault's biome at the version a world names is the floor it lays. Every number is checked on the way in.
 */
import { SURFACE, SURFACES } from './surfaces.js';

/** the specs' names, as the card shows them to people and a world reads them back */
const WEIGHT = 'Weight', DENSITY = 'Plants a square metre', SHARE = 'Share', COLONY = 'Colony across', SPREAD = 'Ground its colonies take', FILL = 'How full its colonies are', ON = 'Grows on';
const ROWS = 'Rows apart', ALONG = 'Along the row', JITTER = 'Off its line', EVERY = 'Every', GAUGE = 'Gauge', TYRE = 'Tyre';
/** a kind's masks (./masks.js `KindMasks`): each spec's name, its unit and the range it is checked against */
const KIND_MASKS = /** @type {const} */ ([
	['footprint', 'Footprint', ' m', 0.05, 20],
	['shade', 'Shade', '', -1, 1],
	['edge', 'At the edge', '', 0, 4],
	['clear', 'Keeps clear', ' m', 0, 10],
	['wet', 'Wet', '', -1, 1],
	['steep', 'Steepest', '°', 0, 90]
]);
const RING_FROM = 'Ring from', RING_TO = 'Ring to', RING_GAIN = 'Ring gain';
/** a biome's masks (./masks.js `Masks`), the same */
const MASK_SPECS = /** @type {const} */ ([
	['band', 'Edge band', ' m', 0.1, 20],
	['skew', 'Size skew', '', 0.25, 6],
	['tilt', 'Tilt', '°', 0, 5],
	['sink', 'Sunk', ' m', 0, 0.2],
	['drift', 'Colour drift', '', 0, 0.3],
	['across', 'Colour regions', ' m', 1, 500]
]);

/** a number as a spec writes it: as it is, so it reads back the same @param {number} n */
const num = (n) => String(Number(n));

/**
 * A biome's parts as a card's catalog: its surfaces and its cover, each with its numbers.
 * @param {import('./index.js').Recipe} recipe
 * @param {{ ref: (kind: string, i: number) => string, label: (kind: string) => string }} kinds the asset each kind of its
 *   cover is, and its name
 */
export function biomeCatalog(recipe, kinds) {
	const ground = SURFACES.filter((s) => (recipe.surface[s] ?? 0) > 0).map((s) => ({
		id: `ground-${s}`,
		label: SURFACE[s].label,
		assembly: 'ground',
		what: 'A surface of the ground, painted in patches that run into the others; its weight is how much of the floor it takes against them.',
		specs: [[WEIGHT, num(/** @type {number} */ (recipe.surface[s]))]]
	}));
	const cover = recipe.cover.map((c, i) => ({
		id: `cover-${c.kind}`,
		label: kinds.label(c.kind),
		assembly: 'cover',
		what: 'A kind of the cover, standing in colonies of its own on the surface it belongs on.',
		ref: kinds.ref(c.kind, i),
		specs: [
			[SHARE, num(c.share)],
			[COLONY, `${num(c.colony)} m`],
			[SPREAD, num(c.spread)],
			...(c.fill === undefined ? [] : [[FILL, num(c.fill)]]),
			...(c.on ? [[ON, c.on]] : []),
			...(c.rows ? [[ROWS, `${num(c.rows.spacing)} m`], [ALONG, `${num(c.rows.along)} m`], ...(c.rows.jitter === undefined ? [] : [[JITTER, `${num(c.rows.jitter)} m`]])] : []),
			...KIND_MASKS.filter(([key]) => c[key] !== undefined).map(([key, name, unit]) => [name, `${num(/** @type {number} */ (c[key]))}${unit}`]),
			...(c.ring ? [[RING_FROM, `${num(c.ring[0])} m`], [RING_TO, `${num(c.ring[1])} m`], [RING_GAIN, num(c.ring[2])]] : [])
		]
	}));
	const mk = recipe.masks;
	const masks = mk
		? [{ id: 'masks', label: 'Where it gathers', assembly: 'masks', what: 'How its cover is placed: the canopy’s edge band, how its sizes lean small, how far a plant tilts and is sunk, and how its colour drifts from place to place.', specs: MASK_SPECS.filter(([key]) => mk[key] !== undefined).map(([key, name, unit]) => [name, `${num(/** @type {number} */ (mk[key]))}${unit}`]) }]
		: [];
	const t = recipe.tramlines;
	const field = t
		? [{ id: 'tramlines', label: 'Tramlines', assembly: 'field', what: 'A pair of wheel tracks along the rows, one pair every working width of the sprayer.', specs: [[EVERY, `${num(t.every)} m`], [GAUGE, `${num(t.gauge)} m`], [TYRE, `${num(t.tyre)} m`]] }]
		: [];
	return {
		assemblies: [
			{ id: 'ground', label: 'The ground', note: 'The surfaces it is painted with, each in patches of its own size.' },
			{ id: 'cover', label: 'The cover', note: 'What grows and lies on it, kind by kind, each in its colonies.' },
			...(field.length ? [{ id: 'field', label: 'The field', note: 'Its tramlines, along its rows.' }] : []),
			...(masks.length ? [{ id: 'masks', label: 'Where it gathers', note: 'Its cover placed by masks: under crowns or in the sun, at the canopy’s edge, off the paths, in the hollows, round the trunks.' }] : [])
		],
		parts: [
			...ground,
			{ id: 'density', label: 'How dense the cover stands', assembly: 'cover', what: 'How many plants (or things) of the cover stand on a square metre inside their colonies.', specs: [[DENSITY, num(recipe.density)]] },
			...cover,
			...field,
			...masks
		]
	};
}

export class BiomeCardError extends Error {}

/**
 * The biome a card is: its surfaces, its density and its cover, each kind with the asset it is (`ref`). Throws
 * (BiomeCardError) on a card that isn't a biome's, or whose numbers aren't what a floor can be.
 * @param {any} card a card as the vault holds it (checked against the card's schema already)
 * @returns {import('./index.js').Recipe & { version: number }}
 */
export function biomeOfCard(card) {
	const where = `${card?.ref ?? 'a card'}`;
	const no = (/** @type {string} */ why) => {
		throw new BiomeCardError(`${where} is no biome: ${why}`);
	};
	if (card?.group !== 'biomes' || card.id === 'cover') no('not a biome of the biomes group');
	const parts = /** @type {any[]} */ (card.catalog?.parts ?? []);
	const spec = (/** @type {any} */ p, /** @type {string} */ name) => (p.specs ?? []).find((/** @type {string[]} */ s) => s[0] === name)?.[1];
	const number = (/** @type {any} */ p, /** @type {string} */ name, /** @type {number} */ lo, /** @type {number} */ hi, optional = false) => {
		const v = spec(p, name);
		if (v === undefined && optional) return undefined;
		const n = Number.parseFloat(String(v));
		if (!Number.isFinite(n) || n < lo || n > hi) no(`${p.id}'s ${name} is ${v === undefined ? 'missing' : JSON.stringify(v)}`);
		return n;
	};
	/** @type {Partial<Record<import('./surfaces.js').Surface, number>>} */
	const surface = {};
	for (const p of parts.filter((p) => p.assembly === 'ground')) {
		const s = String(p.id).replace(/^ground-/, '');
		if (!(/** @type {string[]} */ (SURFACES).includes(s))) no(`a surface ${s} no ground has`);
		surface[/** @type {import('./surfaces.js').Surface} */ (s)] = number(p, WEIGHT, 0, 1000);
	}
	if (!Object.values(surface).some((w) => (w ?? 0) > 0)) no('a ground of no surface');
	const dense = parts.find((p) => p.id === 'density');
	if (!dense) no('no density');
	const density = /** @type {number} */ (number(dense, DENSITY, 0.01, 200));
	const cover = parts
		.filter((p) => p.assembly === 'cover' && p.id !== 'density')
		.map((p) => {
			const kind = String(p.id).replace(/^cover-/, '');
			if (!kind || kind === p.id) no(`a cover part ${p.id}`);
			if (typeof p.ref !== 'string') no(`${p.id} names no asset`);
			const on = spec(p, ON);
			if (on !== undefined && !(/** @type {string[]} */ (SURFACES).includes(on))) no(`${p.id} grows on ${on}, which no ground has`);
			const fill = number(p, FILL, 0, 1, true);
			const spacing = number(p, ROWS, 0.02, 10, true);
			const rows = spacing === undefined ? undefined : { spacing, along: /** @type {number} */ (number(p, ALONG, 0.02, 10)), ...(spec(p, JITTER) === undefined ? {} : { jitter: number(p, JITTER, 0, 1) }) };
			/** @type {Record<string, number>} */
			const own = {};
			for (const [key, name, , lo, hi] of KIND_MASKS) {
				const v = number(p, name, lo, hi, true);
				if (v !== undefined) own[key] = v;
			}
			const from = number(p, RING_FROM, 0, 50, true);
			const ring = from === undefined ? undefined : [from, /** @type {number} */ (number(p, RING_TO, from, 50)), /** @type {number} */ (number(p, RING_GAIN, 0, 20))];
			return {
				...own,
				...(ring ? { ring } : {}),
				kind: /** @type {import('./index.js').Cover} */ (kind),
				ref: /** @type {string} */ (p.ref),
				share: /** @type {number} */ (number(p, SHARE, 0, 1000)),
				colony: /** @type {number} */ (number(p, COLONY, 0.01, 1000)),
				spread: /** @type {number} */ (number(p, SPREAD, 0, 1)),
				...(on === undefined ? {} : { on: /** @type {import('./surfaces.js').Surface} */ (on) }),
				...(fill === undefined ? {} : { fill }),
				...(rows ? { rows } : {})
			};
		});
	if (!cover.length) no('no cover');
	const tp = parts.find((p) => p.assembly === 'field' && p.id === 'tramlines');
	const tramlines = tp ? { every: /** @type {number} */ (number(tp, EVERY, 1, 1000)), gauge: /** @type {number} */ (number(tp, GAUGE, 0.5, 10)), tyre: /** @type {number} */ (number(tp, TYRE, 0.1, 2)) } : undefined;
	const mp = parts.find((p) => p.assembly === 'masks' && p.id === 'masks');
	/** @type {Record<string, number> | undefined} */
	let masks;
	if (mp) {
		masks = {};
		for (const [key, name, , lo, hi] of MASK_SPECS) {
			const v = number(mp, name, lo, hi, true);
			if (v !== undefined) masks[key] = v;
		}
	}
	return { id: card.id, version: card.version, label: card.label, note: card.note ?? '', from: '', surface, density, cover, ...(tramlines ? { tramlines } : {}), ...(masks ? { masks } : {}) };
}

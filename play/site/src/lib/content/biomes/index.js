/*
 * THE BIOMES — the floor a world stands on, as recipes: its surfaces and how much of each (./surfaces.js), and its cover
 * kind by kind (built by play as the Biome cover asset, drawn by ./stream.js), each in colonies of its own size on the
 * surface it belongs on. Any two biomes mix (`mix`): a forest edge half beech wood, half meadow.
 *
 * Why it looks so: a temperate forest floor is litter over humus over soil (the L, F and H horizons), moss on what rises
 * out of it, the herb layer in clonal colonies (a carpet of anemones, a stand of ramsons), grasses and flowers only where
 * light reaches; a forest garden keeps its soil covered on purpose (clover, wild strawberries, leaf litter).
 */
import * as THREE from 'three';
import { SURFACES, inTrack, surfacesAt } from './surfaces.js';
import { fbm2, rng } from './noise.js';
import { MASKS, canopyOf, maskAt, reliefAt, ringAt, tintAt, trunksNear } from './masks.js';
import { versioned } from '$lib/site/app/versions.js';

export { SURFACE, SURFACES, groundMaterial, inTrack, rowsOf, surfacesAt } from './surfaces.js';
export { MASKS } from './masks.js';

/**
 * The cover kinds that are grass, and how: 1 short, 2 tall; one list for every place that asks (the blade field and its
 * mask, ./grass.js; the cover stream and a biome's patch, which leave these kinds to the blades). A verge's `drygrass`
 * is its grass (the tired land's cover; roadside-verge v2: "the verge's sparse grass … blade by blade").
 * @type {Readonly<Record<string, 1 | 2>>}
 */
export const GRASSY = Object.freeze({ grass: 1, tallgrass: 2, drygrass: 1 });

/**
 * @typedef {'grass' | 'tallgrass' | 'sedge' | 'moss' | 'daisy' | 'buttercup' | 'clover' | 'forgetmenot' | 'anemone' | 'cranesbill' | 'woodruff' | 'woodsorrel' | 'ramsons' | 'strawberry' | 'blueberry' | 'fern' | 'litter' | 'deadwood' | 'stones' | 'mushrooms'} Cover
 *   a kind of cover, by its name: each is built by play (the Biome cover asset, its kind), named on the biome's card by its build
 */
/** @typedef {import('./surfaces.js').Surface} Surface */
/** @typedef {import('./masks.js').Trunk} Trunk */
/**
 * @typedef {object} Colony one kind of cover in a biome (with masks: also ./masks.js `KindMasks`)
 * @property {Cover} kind
 * @property {number} share how often it is met where its colonies are, against the others
 * @property {number} colony how big its colonies are across (m)
 * @property {number} spread how much of the ground its colonies take (0…1)
 * @property {Surface} [on] the surface it grows on (it is met there, and seldom elsewhere)
 * @property {number} [fill] how full its colonies are (0…1, 0.85 if not said)
 * @property {string} [ref] the asset it is, as a biome's card names it (./card.js): the cover's kind at its seed; where a
 *   biome says none, its kind at `coverSeed`
 * @property {{ spacing: number, along: number, jitter?: number }} [rows] a kind a machine sowed: on row lines `spacing`
 *   apart, one every `along` m, `jitter` m off at most (./stream.js `coverTile`'s `rows`), none in its tramlines, as
 *   dense as its rows make it
 * @property {number} [footprint] @property {number} [shade] @property {number} [edge] @property {number} [clear]
 * @property {number} [wet] @property {number} [steep] @property {[number, number, number]} [ring] its masks (./masks.js)
 */
/**
 * @typedef {object} Recipe a biome
 * @property {string} id
 * @property {string} label
 * @property {string} note
 * @property {string} from where it is used
 * @property {Partial<Record<Surface, number>>} surface how much of the floor each surface takes
 * @property {number} density how many plants (or things) of its cover stand on a square metre inside their colonies
 * @property {Colony[]} cover
 * @property {import('./grass.js').GrassParams} [grass] its grass as blades (./grass.js; its `GRASS` where it says none)
 * @property {import('./surfaces.js').Tramlines} [tramlines] a field's wheel tracks along its rows (none if not said)
 * @property {Partial<import('./masks.js').Masks>} [masks] placed by its masks (./masks.js `layTile`); without, as before masks
 */

/** @type {Recipe[]} */
const LIST = [
	{
		id: 'food-forest',
		label: 'Food forest floor',
		note: 'A forest garden’s floor, its soil covered on purpose: a living mulch of clover, wild strawberries and grasses in the light between the plants, leaf litter and moss under the trees, ferns and wood anemones in the shade, a fallen branch now and then.',
		from: 'Sandbox 4',
		surface: { green: 5, litter: 3, humus: 1, moss: 1 },
		density: 7,
		cover: [
			{ kind: 'grass', share: 6, colony: 5, spread: 0.7, on: 'green' },
			{ kind: 'tallgrass', share: 2, colony: 4, spread: 0.35, on: 'green', fill: 0.4 },
			{ kind: 'clover', share: 3, colony: 3, spread: 0.35, on: 'green' },
			{ kind: 'strawberry', share: 3, colony: 3, spread: 0.35, on: 'green' },
			{ kind: 'daisy', share: 2, colony: 2.5, spread: 0.25, on: 'green' },
			{ kind: 'buttercup', share: 2, colony: 3, spread: 0.25, on: 'green' },
			{ kind: 'cranesbill', share: 1, colony: 3, spread: 0.2, on: 'green' },
			{ kind: 'forgetmenot', share: 1, colony: 2, spread: 0.2 },
			{ kind: 'litter', share: 5, colony: 6, spread: 0.6, on: 'litter', fill: 0.12 },
			{ kind: 'moss', share: 3, colony: 3, spread: 0.4, on: 'moss', fill: 0.165 },
			{ kind: 'anemone', share: 3, colony: 3.5, spread: 0.25, on: 'litter' },
			{ kind: 'fern', share: 2, colony: 5, spread: 0.3, on: 'humus', fill: 0.08 },
			{ kind: 'mushrooms', share: 0.4, colony: 6, spread: 0.2, on: 'humus', fill: 0.006 },
			{ kind: 'deadwood', share: 0.4, colony: 8, spread: 0.3, on: 'litter', fill: 0.0018 },
			{ kind: 'stones', share: 0.3, colony: 8, spread: 0.2, fill: 0.004 }
		]
	},
	{
		id: 'warm-food-forest',
		label: 'Food forest under glass',
		note: 'The warm forest garden inside a dome: moist, shaded, never bare — big fallen leaves of banana, mango and fig over dark humus, moss where it stays damp, ferns in the shade of the palms, a living mat of clover, wild strawberries and soft grass where the light comes through the glass.',
		from: 'Sandbox 4, inside the domes',
		surface: { green: 4, litter: 3, humus: 2, moss: 1.5 },
		density: 7,
		cover: [
			{ kind: 'grass', share: 4, colony: 4, spread: 0.55, on: 'green' },
			{ kind: 'clover', share: 3, colony: 3, spread: 0.35, on: 'green' },
			{ kind: 'strawberry', share: 4, colony: 3, spread: 0.4, on: 'green' },
			{ kind: 'woodsorrel', share: 3, colony: 3, spread: 0.3, on: 'humus' },
			{ kind: 'fern', share: 4, colony: 4, spread: 0.4, on: 'humus', fill: 0.12 },
			{ kind: 'moss', share: 3, colony: 3, spread: 0.45, on: 'moss', fill: 0.18 },
			{ kind: 'litter', share: 5, colony: 5, spread: 0.6, on: 'litter', fill: 0.12 },
			{ kind: 'forgetmenot', share: 1, colony: 2, spread: 0.2 },
			{ kind: 'mushrooms', share: 0.6, colony: 5, spread: 0.25, on: 'humus', fill: 0.008 },
			{ kind: 'stones', share: 0.3, colony: 8, spread: 0.2, fill: 0.004 }
		]
	},
	{
		id: 'beech-forest',
		label: 'Beech forest',
		note: 'Under closed beech: deep brown leaf litter over dark humus, little grass; the herbs in carpets — wood anemone, woodruff, wood sorrel, ramsons where it is damp — ferns in groups, moss on deadwood and stones, mushrooms after rain.',
		from: 'The forests round the cell',
		surface: { litter: 7, humus: 2, moss: 1 },
		density: 6,
		cover: [
			{ kind: 'litter', share: 6, colony: 8, spread: 0.75, on: 'litter', fill: 0.12 },
			{ kind: 'anemone', share: 5, colony: 4, spread: 0.3 },
			{ kind: 'woodruff', share: 5, colony: 4, spread: 0.3 },
			{ kind: 'woodsorrel', share: 4, colony: 3, spread: 0.3 },
			{ kind: 'ramsons', share: 6, colony: 6, spread: 0.18, on: 'humus' },
			{ kind: 'fern', share: 3, colony: 6, spread: 0.3, fill: 0.08 },
			{ kind: 'sedge', share: 1.5, colony: 5, spread: 0.25, fill: 0.15 },
			{ kind: 'moss', share: 3, colony: 3, spread: 0.35, on: 'moss', fill: 0.165 },
			{ kind: 'deadwood', share: 1, colony: 9, spread: 0.35, fill: 0.0018 },
			{ kind: 'stones', share: 0.6, colony: 9, spread: 0.25, fill: 0.004 },
			{ kind: 'mushrooms', share: 0.8, colony: 7, spread: 0.25, on: 'humus', fill: 0.006 }
		]
	},
	{
		id: 'spruce-forest',
		label: 'Spruce forest',
		note: 'Under spruce: a floor of needles, thick moss carpets over it, blueberry in the gaps, ferns, fallen twigs and branches, stones mossed over, mushrooms.',
		from: 'The forests round the cell',
		surface: { needles: 6, moss: 4, humus: 1 },
		density: 6,
		cover: [
			{ kind: 'moss', share: 7, colony: 5, spread: 0.6, on: 'moss', fill: 0.193 },
			{ kind: 'blueberry', share: 5, colony: 5, spread: 0.4 },
			{ kind: 'fern', share: 2, colony: 6, spread: 0.3, fill: 0.08 },
			{ kind: 'woodsorrel', share: 2, colony: 3, spread: 0.25, on: 'moss' },
			{ kind: 'deadwood', share: 1.2, colony: 8, spread: 0.4, on: 'needles', fill: 0.0018 },
			{ kind: 'stones', share: 1, colony: 8, spread: 0.3, fill: 0.004 },
			{ kind: 'mushrooms', share: 1, colony: 6, spread: 0.3, fill: 0.006 }
		]
	},
	{
		id: 'meadow',
		label: 'Meadow',
		note: 'Open and sunny: grasses tall and short, buttercups, daisies, red clover and cranesbill in drifts, now and then a patch of bare soil.',
		from: 'The open ground round the forests',
		surface: { green: 9, soil: 0.6, moss: 0.4 },
		density: 10,
		cover: [
			{ kind: 'grass', share: 8, colony: 6, spread: 0.8 },
			{ kind: 'tallgrass', share: 6, colony: 5, spread: 0.6 },
			{ kind: 'buttercup', share: 3, colony: 4, spread: 0.35 },
			{ kind: 'daisy', share: 3, colony: 3, spread: 0.3 },
			{ kind: 'clover', share: 3, colony: 3, spread: 0.35 },
			{ kind: 'cranesbill', share: 2, colony: 4, spread: 0.3 },
			{ kind: 'forgetmenot', share: 0.6, colony: 2, spread: 0.15 }
		]
	},
	{
		id: 'clover-lawn',
		label: 'Clover lawn',
		note: 'A living mulch walked on: a short grass closed underfoot, white and red clover among it, wild strawberries spreading by their runners, a daisy here and there.',
		from: 'Paths’ edges and the squares',
		surface: { green: 10, soil: 0.3 },
		density: 9,
		cover: [
			{ kind: 'grass', share: 8, colony: 4, spread: 1.2, fill: 1 },
			{ kind: 'clover', share: 3, colony: 3, spread: 0.4 },
			{ kind: 'strawberry', share: 2, colony: 3, spread: 0.3 },
			{ kind: 'daisy', share: 1, colony: 2.5, spread: 0.25 }
		]
	}
];

export const BIOMES = versioned(LIST, 'cover', {});

/**
 * Two biomes run together, `t` of the way from a to b. @param {Recipe} a @param {Recipe} b @param {number} t
 * @returns {Recipe}
 */
export function mix(a, b, t) {
	if (t <= 0) return a;
	if (t >= 1) return b;
	const sa = SURFACES.reduce((n, s) => n + (a.surface[s] ?? 0), 0) || 1, sb = SURFACES.reduce((n, s) => n + (b.surface[s] ?? 0), 0) || 1;
	/** @type {Partial<Record<Surface, number>>} */
	const surface = {};
	for (const s of SURFACES) surface[s] = ((a.surface[s] ?? 0) / sa) * (1 - t) + ((b.surface[s] ?? 0) / sb) * t;
	const ca = a.cover.reduce((n, c) => n + c.share, 0) || 1, cb = b.cover.reduce((n, c) => n + c.share, 0) || 1;
	return {
		id: `${a.id}+${b.id}`,
		label: `${a.label} · ${b.label}`,
		note: '',
		from: '',
		surface,
		density: a.density * (1 - t) + b.density * t,
		...((t < 0.5 ? a.grass ?? b.grass : b.grass ?? a.grass) ? { grass: t < 0.5 ? a.grass ?? b.grass : b.grass ?? a.grass } : {}),
		cover: [...a.cover.map((c) => ({ ...c, share: (c.share / ca) * (1 - t) })), ...b.cover.map((c) => ({ ...c, share: (c.share / cb) * t }))]
	};
}

/**
 * Which kind of a biome's cover stands at x, z (its index in `recipe.cover`), or −1: each kind in its colonies (its own
 * noise at its colony's size, over its spread's threshold) on its surface, dense inside, none outside; overlapping
 * colonies share by their shares. `hidden`: the kinds left out (the explorer's toggles).
 * @param {Recipe} recipe @param {() => number} r @param {number} x @param {number} z @param {Set<number>} [hidden]
 */
function coverAt(recipe, r, x, z, hidden) {
	const here = surfacesAt(recipe.surface, x, z);
	let empty = 1, total = 0;
	const w = recipe.cover.map((c, i) => {
		// a kind in rows is laid on its rows (./stream.js), never scattered
		if (hidden?.has(i) || c.rows) return 0;
		const f = fbm2(x / c.colony + i * 9.7 + 3.1, z / c.colony - i * 5.3);
		const cut = 0.5 + (0.5 - c.spread) * 0.55;
		const inColony = Math.min(1, Math.max(0, (f - cut) / 0.04 + 0.5));
		const ground = c.on ? Math.min(1, here[c.on] * 2.2 + 0.05) : 1;
		const m = inColony * ground, fill = c.fill ?? 0.85;
		empty *= 1 - fill * m;
		// where colonies overlap they share the ground by how much of each would stand there
		const v = c.share * fill * m;
		total += v;
		return v;
	});
	if (total <= 0 || r() < empty) return -1;
	let t = r() * total;
	for (let i = 0; i < w.length; i++) if ((t -= /** @type {number} */ (w[i])) < 0) return i;
	return w.length - 1;
}

/**
 * How much of a kind's colonies stand at x, z (0…1), as `coverAt` sums it. @param {Recipe} recipe @param {number} i @param {number} x @param {number} z
 */
export function colonyAt(recipe, i, x, z) {
	const c = /** @type {Colony} */ (recipe.cover[i]);
	const f = fbm2(x / c.colony + i * 9.7 + 3.1, z / c.colony - i * 5.3);
	const cut = 0.5 + (0.5 - c.spread) * 0.55;
	const inColony = Math.min(1, Math.max(0, (f - cut) / 0.04 + 0.5));
	const ground = c.on ? Math.min(1, /** @type {number} */ (surfacesAt(recipe.surface, x, z)[c.on]) * 2.2 + 0.05) : 1;
	return inColony * ground;
}

/** A kind's build seed, by its place and name: each kind a little different, the same every time. @param {number} i @param {Cover} kind */
const coverSeed = (i, kind) => 7100 + i * 13 + kind.length * 31;

/**
 * @typedef {{ m: Float32Array, rank: Float32Array, tint?: Float32Array }[]} TileKinds each kind's plants in a tile, by
 *   rank, least first: their matrices, their ranks and (a biome with masks) their colours, three a plant
 */
/**
 * @typedef {object} TileOptions
 * @property {number} [tile] a tile's size (m)
 * @property {number} [seed]
 * @property {number} [density] the biome's, if it should be other (fewer on a slow device)
 * @property {(x: number, z: number, margin?: number) => boolean} [open] whether cover may stand at x, z (`margin`
 *   metres clear of the paths, buildings and water, where a kind keeps clear of them)
 * @property {[number, number]} [origin] where this ground's 0, 0 lies in the world (its colonies' noise)
 * @property {Set<number>} [hidden] the kinds left out
 * @property {number} [sown] the way a field's lines run, for the kinds sown in rows (radians from +x towards +z;
 *   ./surfaces.js `rowsOf`)
 * @property {Trunk[]} [trunks] the trees standing on it, for the canopy's masks (none: the canopy is not known)
 * @property {(x: number, z: number) => number} [heightAt] its relief, for the wet and slope masks
 */

/**
 * One tile of a biome's cover from its place alone (the same tile, the same plants): each kind's plants (by index), their
 * places and ranks, least first; with masks laid by `layMasked`, else as before masks.
 * @param {Recipe} recipe @param {number} ix @param {number} iz @param {TileOptions} [o]
 * @returns {TileKinds}
 */
export function layTile(recipe, ix, iz, o = {}) {
	return recipe.masks ? layMasked(recipe, ix, iz, o) : layScattered(recipe, ix, iz, o);
}

/** @param {{ rank: number, m: THREE.Matrix4, tint?: number[] }[][]} at */
function packed(at) {
	return at.map((list) => {
		list.sort((a, b) => a.rank - b.rank);
		const m = new Float32Array(list.length * 16), rank = new Float32Array(list.length);
		const tint = list.length && list[0]?.tint ? new Float32Array(list.length * 3) : undefined;
		list.forEach((e, i) => {
			e.m.toArray(m, i * 16);
			rank[i] = e.rank;
			if (tint && e.tint) tint.set(e.tint, i * 3);
		});
		return tint ? { m, rank, tint } : { m, rank };
	});
}

/** The cover as it was laid before masks were: scattered at the biome's density, then the kinds in rows on theirs.
 * @param {Recipe} recipe @param {number} ix @param {number} iz @param {TileOptions} o */
function layScattered(recipe, ix, iz, o) {
	const tile = o.tile ?? 12, seed = o.seed ?? 1, hidden = o.hidden ?? new Set();
	const [ox, oz] = o.origin ?? [0, 0];
	const r = rng((ix * 73856093) ^ (iz * 19349663) ^ (seed * 83492791));
	/** @type {{ rank: number, m: THREE.Matrix4 }[][]} */
	const at = recipe.cover.map(() => []);
	const s = 1 / Math.sqrt(o.density ?? recipe.density), x0 = ix * tile, z0 = iz * tile;
	const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3();
	for (let x = x0; x < x0 + tile; x += s)
		for (let z = z0; z < z0 + tile; z += s) {
			const px = x + r() * s, pz = z + r() * s;
			const k = coverAt(recipe, r, px + ox, pz + oz, hidden);
			const turn = r() * Math.PI * 2, size = 0.75 + r() * 0.6, rank = r();
			if (k < 0 || (o.open && !o.open(px, pz))) continue;
			at[k]?.push({ rank, m: new THREE.Matrix4().compose(p.set(px, 0, pz), q.setFromAxisAngle(up, turn), sc.setScalar(size)) });
		}
	recipe.cover.forEach((c, k) => {
		if (!c.rows || hidden.has(k)) return;
		const rr = rng((ix * 2654435761) ^ (iz * 40503) ^ (seed * 83492791) ^ ((k + 1) * 97531));
		const a = o.sown ?? 0, dx = Math.cos(a), dz = Math.sin(a);
		const { spacing, along } = c.rows, jitter = c.rows.jitter ?? 0;
		const xs = [x0 + ox, x0 + tile + ox], zs = [z0 + oz, z0 + tile + oz];
		let c0 = Infinity, c1 = -Infinity, s0 = Infinity, s1 = -Infinity;
		for (const wx of xs)
			for (const wz of zs) {
				const across = -dz * wx + dx * wz, on = dx * wx + dz * wz;
				c0 = Math.min(c0, across), c1 = Math.max(c1, across), s0 = Math.min(s0, on), s1 = Math.max(s1, on);
			}
		for (let j = Math.ceil(c0 / spacing); j * spacing <= c1; j++) {
			const across = j * spacing;
			if (inTrack(recipe.tramlines, across) > 0.2) continue;
			for (let n = Math.ceil(s0 / along); n * along <= s1; n++) {
				const on = n * along;
				const wx = dx * on - dz * across, wz = dz * on + dx * across;
				const lx = wx - ox, lz = wz - oz;
				const px = lx + (rr() - 0.5) * jitter, pz = lz + (rr() - 0.5) * jitter;
				const turn = rr() * Math.PI * 2, size = 0.85 + rr() * 0.3, rank = rr(), keep = rr();
				if (lx < x0 || lx >= x0 + tile || lz < z0 || lz >= z0 + tile) continue;
				if (keep >= (c.fill ?? 0.85) * colonyAt(recipe, k, px + ox, pz + oz) || (o.open && !o.open(px, pz))) continue;
				at[k]?.push({ rank, m: new THREE.Matrix4().compose(p.set(px, 0, pz), q.setFromAxisAngle(up, turn), sc.setScalar(size)) });
			}
		}
	});
	return packed(at);
}

/** a lattice cell's own chance, by its place alone @param {number} a @param {number} b @param {number} key @param {number} seed */
const cellRng = (a, b, key, seed) => rng(Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(seed, 83492791) ^ Math.imul(key + 1, 2654435761));

/**
 * A biome with masks laid in one pass (intent 24454c2d): kinds in layers by footprint (rows each their own), largest
 * first; each layer a blue-noise dither of its footprint (one jittered place a world-lattice cell, never closer than a
 * third), each place at most one kind by shares × colonies × masks (./masks.js), none too near a larger layer's plant
 * (nothing grows through a log or a fern). Every chance comes from a cell's world place, so tiles agree. Sizes lean
 * small (r^skew), turned freely, tilted a little, base sunk, colour drifting by region.
 * @param {Recipe} recipe @param {number} ix @param {number} iz @param {TileOptions} o
 */
function layMasked(recipe, ix, iz, o) {
	const tile = o.tile ?? 12, seed = o.seed ?? 1, hidden = o.hidden ?? new Set();
	const [ox, oz] = o.origin ?? [0, 0];
	const masks = { ...MASKS, ...recipe.masks };
	const s0 = 1 / Math.sqrt(o.density ?? recipe.density);
	const x0 = ix * tile, z0 = iz * tile, x1 = x0 + tile, z1 = z0 + tile;
	const a = o.sown ?? 0, rdx = Math.cos(a), rdz = Math.sin(a);
	/** @typedef {{ f: number, key: number, kinds: number[], rows?: { spacing: number, along: number, jitter: number } }} Layer */
	/** @type {Map<string, Layer>} */
	const byKey = new Map();
	recipe.cover.forEach((c, k) => {
		if (hidden.has(k)) return;
		if (c.rows) {
			byKey.set(`rows${k}`, { f: Math.sqrt(c.rows.spacing * c.rows.along), key: 50000 + k, kinds: [k], rows: { spacing: c.rows.spacing, along: c.rows.along, jitter: c.rows.jitter ?? 0 } });
			return;
		}
		const f = Math.min(20, Math.max(0.05, c.footprint ?? s0)), id = `f${Math.round(f * 1000)}`;
		const l = byKey.get(id);
		if (l) l.kinds.push(k);
		else byKey.set(id, { f, key: Math.round(f * 1000), kinds: [k] });
	});
	const layers = [...byKey.values()].sort((p, q) => q.f - p.f || p.key - q.key);
	// how far past the tile each layer is worked out, so the smaller ones near its edges are kept clear of it
	/** @type {number[]} */
	const pads = layers.map(() => 0);
	for (let i = layers.length - 2; i >= 0; i--) pads[i] = /** @type {number} */ (pads[i + 1]) + /** @type {Layer} */ (layers[i]).f;
	const ringOut = Math.max(...recipe.cover.map((c) => c.ring?.[1] ?? 0), 0), reach = (pads[0] ?? 0) + ringOut + masks.band * 2;
	const canopy = o.trunks ? canopyOf(trunksNear(o.trunks, x0 - reach, z0 - reach, x1 + reach, z1 + reach, masks.band * 2), masks.band, ringOut) : null;
	/** the places taken so far, by the layers before (larger), on a grid of 2 m for looking them up */
	/** @type {Map<number, number[]>} */
	const taken = new Map();
	const key2 = (/** @type {number} */ i, /** @type {number} */ j) => (i + 32768) * 65536 + j + 32768;
	const cellOf = (/** @type {number} */ x, /** @type {number} */ z) => key2(Math.floor(x / 2), Math.floor(z / 2));
	const clearOfTaken = (/** @type {number} */ x, /** @type {number} */ z, /** @type {number} */ f) => {
		if (!taken.size) return true;
		const gx = Math.floor(x / 2), gz = Math.floor(z / 2);
		for (let i = gx - 2; i <= gx + 2; i++)
			for (let j = gz - 2; j <= gz + 2; j++) {
				const list = taken.get(key2(i, j));
				if (!list) continue;
				for (let n = 0; n < list.length; n += 3) {
					const d = 0.3 * (f + /** @type {number} */ (list[n + 2]));
					if ((x - /** @type {number} */ (list[n])) ** 2 + (z - /** @type {number} */ (list[n + 1])) ** 2 < d * d) return false;
				}
			}
		return true;
	};
	/** @type {{ rank: number, m: THREE.Matrix4, tint: number[] }[][]} */
	const at = recipe.cover.map(() => []);
	const q = new THREE.Quaternion(), yaw = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), axis = new THREE.Vector3(), p = new THREE.Vector3(), sc = new THREE.Vector3();
	const tilt = (Math.min(5, Math.max(0, masks.tilt)) * Math.PI) / 180;
	/** a plant of kind k at x, z: kept where it is in the tile, and its place taken for the smaller layers */
	const place = (/** @type {number} */ k, /** @type {number} */ x, /** @type {number} */ z, /** @type {number} */ f, /** @type {() => number} */ r, /** @type {number} */ size) => {
		// taken for the smaller layers once this one is laid (a layer's own places never exclude each other)
		laying.push(x, z, f);
		const turn = r() * Math.PI * 2, lean = r() * tilt, toward = r() * Math.PI * 2, rank = r();
		if (x < x0 || x >= x1 || z < z0 || z >= z1) return;
		yaw.setFromAxisAngle(up, turn);
		q.setFromAxisAngle(axis.set(Math.cos(toward), 0, Math.sin(toward)), lean).multiply(yaw);
		const m = new THREE.Matrix4().compose(p.set(x, -masks.sink * size, z), q, sc.setScalar(size));
		/** @type {{ rank: number, m: THREE.Matrix4, tint: number[] }[]} */ (at[k]).push({ rank, m, tint: tintAt(masks, x + ox, z + oz) });
	};
	/** each kind's weight at a point (its colonies times its masks), from the canopy and relief there */
	const here = (/** @type {number} */ x, /** @type {number} */ z) => ({ canopy: canopy ? canopy(x, z) : null, relief: reliefAt(o.heightAt, x, z), surfaces: surfacesAt(recipe.surface, x + ox, z + oz) });
	const weight = (/** @type {number} */ k, /** @type {ReturnType<typeof here>} */ h, /** @type {number} */ x, /** @type {number} */ z) => {
		const c = /** @type {Colony} */ (recipe.cover[k]);
		const f = fbm2((x + ox) / c.colony + k * 9.7 + 3.1, (z + oz) / c.colony - k * 5.3);
		const cut = 0.5 + (0.5 - c.spread) * 0.55;
		// a kind with a ring (a guild, the litter at a trunk's foot) stands in it round every trunk, its colonies or not
		const inColony = Math.max(Math.min(1, Math.max(0, (f - cut) / 0.04 + 0.5)), ringAt(c, h.canopy));
		if (inColony <= 0) return 0;
		const ground = c.on ? Math.min(1, /** @type {number} */ (h.surfaces[c.on]) * 2.2 + 0.05) : 1;
		return inColony * ground * maskAt(c, h.canopy, h.relief, o.open, x, z);
	};
	const skew = Math.max(0.25, masks.skew);
	/** @type {number[]} the places the layer being laid takes */
	let laying = [];
	const took = () => {
		for (let n = 0; n < laying.length; n += 3) {
			const g = cellOf(/** @type {number} */ (laying[n]), /** @type {number} */ (laying[n + 1]));
			const list = taken.get(g);
			if (list) list.push(/** @type {number} */ (laying[n]), /** @type {number} */ (laying[n + 1]), /** @type {number} */ (laying[n + 2]));
			else taken.set(g, laying.slice(n, n + 3));
		}
		laying = [];
	};
	layers.forEach((layer, li) => {
		took();
		const pad = /** @type {number} */ (pads[li]), f = layer.f;
		if (layer.rows) {
			// a kind a machine sowed: its places are its rows' lattice, across the world, none in the tramlines
			const k = /** @type {number} */ (layer.kinds[0]), c = /** @type {Colony} */ (recipe.cover[k]), { spacing, along, jitter } = layer.rows;
			let c0 = Infinity, c1 = -Infinity, s0 = Infinity, s1 = -Infinity;
			for (const wx of [x0 - pad + ox, x1 + pad + ox])
				for (const wz of [z0 - pad + oz, z1 + pad + oz]) {
					const across = -rdz * wx + rdx * wz, on = rdx * wx + rdz * wz;
					(c0 = Math.min(c0, across)), (c1 = Math.max(c1, across)), (s0 = Math.min(s0, on)), (s1 = Math.max(s1, on));
				}
			for (let j = Math.ceil(c0 / spacing); j * spacing <= c1; j++) {
				const across = j * spacing;
				if (inTrack(recipe.tramlines, across) > 0.2) continue;
				for (let n = Math.ceil(s0 / along); n * along <= s1; n++) {
					const on = n * along, r = cellRng(j, n, layer.key, seed);
					const x = rdx * on - rdz * across - ox + (r() - 0.5) * jitter, z = rdz * on + rdx * across - oz + (r() - 0.5) * jitter;
					if (x < x0 - pad || x >= x1 + pad || z < z0 - pad || z >= z1 + pad) continue;
					if (r() >= Math.min(1, (c.fill ?? 0.85) * weight(k, here(x, z), x, z))) continue;
					if ((o.open && !o.open(x, z)) || !clearOfTaken(x, z, f)) continue;
					place(k, x, z, f, r, 0.85 + r() * 0.3);
				}
			}
			return;
		}
		// the layer's dither, cells fixed in the world: a cell's chance is the sum of its kinds' densities there (share ×
		// fill × colonies × masks) over their average, so the floor is thick where colonies overlap or a mask raises them
		// and open where none grows, about as full as before overall
		const full = layer.kinds.map((k) => {
			const c = /** @type {Colony} */ (recipe.cover[k]);
			return c.share * Math.min(1, (c.fill ?? 0.85) * (f / s0) ** 2);
		});
		const mean = layer.kinds.reduce((a, k, i) => a + /** @type {number} */ (full[i]) * Math.min(1, Math.max(0.05, /** @type {Colony} */ (recipe.cover[k]).spread ?? 0.5)), 0);
		for (let gx = Math.floor((x0 - pad + ox) / f); gx * f < x1 + pad + ox; gx++)
			for (let gz = Math.floor((z0 - pad + oz) / f); gz * f < z1 + pad + oz; gz++) {
				const r = cellRng(gx, gz, layer.key, seed);
				const x = (gx + 0.17 + r() * 0.66) * f - ox, z = (gz + 0.17 + r() * 0.66) * f - oz;
				const pick = r(), choose = r();
				if (x < x0 - pad || x >= x1 + pad || z < z0 - pad || z >= z1 + pad) continue;
				const h = here(x, z);
				let total = 0;
				const w = layer.kinds.map((k, i) => {
					const v = /** @type {number} */ (full[i]) * weight(k, h, x, z);
					total += v;
					return v;
				});
				if (total <= 0 || pick >= Math.min(1, total / mean)) continue;
				if ((o.open && !o.open(x, z)) || !clearOfTaken(x, z, f)) continue;
				let t = choose * total, i = 0;
				while (i < w.length - 1 && (t -= /** @type {number} */ (w[i])) >= 0) i++;
				place(/** @type {number} */ (layer.kinds[i]), x, z, f, r, 0.6 + 0.9 * r() ** skew);
			}
	});
	return packed(at);
}

/*
 * REAL GRASS — a biome's grass as single blades, each worked out on the graphics card from where it stands alone: no
 * blade is stored anywhere, only how many of them a tile draws (intent 090168c8; Ghost of Tsushima's grass, SimonDev's
 * Quick_Grass, False Earth, Grassworks).
 *
 *   cells     the ground is cut into cells of CELL metres; a cell holds `density × CELL²` blades, blade j of cell
 *             (cx, cz) the same blade every time (`bladeOf`: an integer hash of the three, the PCG hash the shader runs);
 *             its rank is (j + a jitter) / n, so the first so many of a cell are the ones kept furthest out
 *   tiles     the cells are drawn in tiles of 1, 2 or 4 cells across (a quadtree from tiles of 4: the nearer, the
 *             smaller), one instanced draw a tile; instance i of a tile of k cells across is blade ⌊i / k²⌋ of its
 *             cell i mod k², so taking the first m × k² instances takes the first m blades of every cell: a far tile
 *             draws a subset of what its cells drew near (nested subsets), and a tile split or joined draws the same
 *             blades (`tileBlade`)
 *   levels    a blade near is 15 vertices (7 pairs and its tip, 13 triangles), out to about 25 m 7 (5), out to about
 *             70 m 4 (2) — on a small device 5, 15 and 35 m (`DEVICES`); a tile is drawn at the level its nearest point
 *             is in, and each blade geomorphs to the next level's shape over the last 30 % of its level's band, so a
 *             tile changing level changes nothing on screen (never a crossfade)
 *   thinning  every blade stands near; past `near` fewer and fewer (`keep`), a blade sinking into the ground as its
 *             rank passes what is kept where it stands, and the field ends in a soft circle, each blade's end jittered
 *             (`endOf`); the blades kept far are wider, so the field covers as it did, never thinner than `minPx`
 *             pixels
 *   variation a colour field of about a metre (and the ground's 5, 20 and 80 m), clumps of 0.5–2 m (each blade
 *             blended between the two nearest clump centres: its height, its lean away from the centre, its shade),
 *             and each blade its own height (± `heightSpread`), lean, width, facing and shade (`bladeOf`)
 *   light     normals rounded across the blade and turned to the ground's with distance (fully by the last band's end),
 *             wrapped diffuse, light through the tips seen against the sun, low gloss fading with distance, roots
 *             darkened as the grass is dense; shadows received, never cast
 *   wind      a gust field rolling over the blades (`wind`; intent 6's one wind replaces it), the walker and animals
 *             pushing them aside (`push`: up to PUSHERS pushers a frame)
 *   where     where grass grows and how tall (a mask round the eye, `GrassMask`: the biome's grass kinds' colonies,
 *             what is open), a blade standing where the mask says, a tile with no grass in it never drawn
 *
 * `grassField({ params, mask, device })` → `{ object, update(camera, time) }`: add `object` to the scene, call `update`
 * every frame. The node material needs the renderer's nodes handler (`useNodes`) until WebGPU is the renderer
 * (intent 1).
 */
import * as THREE from 'three';
import { fbm2, vn } from './noise.js';
import { colonyAt } from './index.js';
import { grassMaterial, grassUniforms } from '../render/nodes/grass.js';
import { WebGLNodesHandler } from 'three/addons/tsl/WebGLNodesHandler.js';

/* ── the numbers ── */

/** a cell's size (m): the unit a blade is named in */
export const CELL = 4;
/** a tile's cells across, by level: the nearer, the smaller */
export const TILE_CELLS = [1, 2, 4];
/** the vertices of a blade, by level */
export const VERTS = [15, 7, 4];
/** how many pushers (the walker, animals) bend the grass at once */
export const PUSHERS = 8;

/**
 * Each device's grass: blades a square metre near, where each level ends (m), where every blade still stands, and the
 * narrowest a blade is drawn (px).
 * @type {Record<'desktop' | 'small', { density: number, bands: [number, number, number], near: number, minPx: number }>}
 */
export const DEVICES = {
	desktop: { density: 140, bands: [8, 25, 70], near: 6, minPx: 1.5 },
	small: { density: 70, bands: [5, 15, 35], near: 4, minPx: 1.5 }
};

/**
 * A biome's grass as its card says it (./card.js `grassOfCard`), or these where it says none.
 * @typedef {object} GrassParams
 * @property {number} height a blade's height, short grass (m)
 * @property {number} tall a blade's height where the tall grass grows (m)
 * @property {number} heightSpread how much a blade's height differs from it, ± (0…1)
 * @property {number} width a blade's width at its foot (m)
 * @property {number} clump how big its clumps are across (m)
 * @property {number} lean how far a blade leans over at most (radians)
 * @property {string} base the colour at its foot
 * @property {string} tip the colour at its tip
 * @property {string} dry the colour a dry blade turns
 * @property {number} dryShare how many of its blades are dry (0…1)
 */
/** @type {GrassParams} */
export const GRASS = { height: 0.24, tall: 0.5, heightSpread: 0.4, width: 0.006, clump: 1.2, lean: 0.5, base: '#3c5e22', tip: '#9ab85a', dry: '#b9a865', dryShare: 0.12 };

/* ── the hash: the same sums here and on the graphics card ── */

/** PCG's hash of a 32-bit integer (pcg-random.org; three's TSL `hash` is the same) @param {number} v */
export function pcg(v) {
	const state = (Math.imul(v >>> 0, 747796405) + 2891336453) >>> 0;
	const word = Math.imul(((state >>> (((state >>> 28) + 4) >>> 0)) ^ state) >>> 0, 277803737) >>> 0;
	return ((word >>> 22) ^ word) >>> 0;
}
/** a blade's seed from its cell and its number in it @param {number} cx @param {number} cz @param {number} j */
export const seedOf = (cx, cz, j) => pcg((pcg((pcg(cx | 0) + (cz | 0)) >>> 0) + (j | 0)) >>> 0);
/** the k-th number 0…1 drawn from a seed @param {number} seed @param {number} k */
export const draw = (seed, k) => pcg((seed + Math.imul(k, 0x9e3779b9)) >>> 0) / 4294967296;

/* ── the blades ── */

/** how many blades a cell holds @param {number} density blades a square metre */
export const perCell = (density) => Math.max(1, Math.round(density * CELL * CELL));

/**
 * Blade j of cell (cx, cz): where it stands, its rank, and its own numbers before the clumps and the mask.
 * @param {number} cx @param {number} cz @param {number} j @param {number} n the cell's blades
 */
export function bladeOf(cx, cz, j, n) {
	const s = seedOf(cx, cz, j);
	return {
		x: (cx + draw(s, 0)) * CELL,
		z: (cz + draw(s, 1)) * CELL,
		/** the order it thins out in: the first so many of a cell kept furthest out */
		rank: (j + draw(s, 2)) / n,
		/** its own height, −1…1 of the spread */
		height: draw(s, 3) * 2 - 1,
		/** how far it leans over, 0…1 of the most */
		lean: draw(s, 4),
		/** which way it faces (radians) */
		facing: draw(s, 5) * Math.PI * 2,
		width: 0.7 + draw(s, 6) * 0.6,
		shade: draw(s, 7),
		dry: draw(s, 8),
		/** where its field ends, 0.9…1 of the reach */
		end: 0.9 + draw(s, 9) * 0.1
	};
}

/**
 * Instance i of a tile k cells across whose first cell is (tx, tz): which cell's blade it is.
 * @param {number} tx @param {number} tz @param {number} k @param {number} i
 */
export function tileBlade(tx, tz, k, i) {
	const c = i % (k * k), j = Math.floor(i / (k * k));
	return { cx: tx + (c % k), cz: tz + Math.floor(c / k), j };
}

/**
 * How much of the grass stands at distance d: all of it out to `near`, then falling as the blades on screen do,
 * ending at the last band's end; a blade stands where its rank is under it.
 * @param {number} d @param {{ bands: number[], near: number }} dev
 */
export function keep(d, dev) {
	if (d <= dev.near) return 1;
	const end = /** @type {number} */ (dev.bands[2]);
	if (d >= end) return 0;
	return Math.pow(dev.near / d, 1.25);
}
/** how far it grows (0…1) where it stands, with its rank and its end @param {number} d @param {number} rank @param {number} end 0.9…1 @param {{ bands: number[], near: number }} dev */
export function growAt(d, rank, end, dev) {
	const reach = /** @type {number} */ (dev.bands[2]) * end;
	const edge = 1 - smooth(reach - 6, reach, d);
	return Math.min(1, Math.max(0, (keep(d, dev) - rank) / 0.08 + 1)) * edge;
}
/** the circle the field ends in, for a blade (its end, 0.9…1 of the reach) @param {number} end @param {{ bands: number[] }} dev */
export const endOf = (end, dev) => /** @type {number} */ (dev.bands[2]) * end;

/** smoothstep @param {number} a @param {number} b @param {number} v */
export function smooth(a, b, v) {
	const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
	return t * t * (3 - 2 * t);
}

/* ── the variation ── */

/** the colour field (0…1): a metre's patches over the ground's 5, 20 and 80 m @param {number} x @param {number} z */
export const fieldAt = (x, z) => vn(x * 1.1 + 17.3, z * 1.1 - 4.1) * 0.45 + fbm2(x / 5 + 3.1, z / 5 - 1.7) * 0.3 + vn(x / 20 + 3.1, z / 20) * 0.15 + vn(x / 80 + 7.7, z / 80) * 0.1;

/** a clump's centre in its cell of the clump grid (`size` across) @param {number} gx @param {number} gz @param {number} size */
export function clumpCentre(gx, gz, size) {
	const s = pcg((pcg(gx | 0) ^ Math.imul(gz | 0, 0x27d4eb2d)) >>> 0);
	return { x: (gx + 0.15 + draw(s, 0) * 0.7) * size, z: (gz + 0.15 + draw(s, 1) * 0.7) * size, height: draw(s, 2), shade: draw(s, 3) };
}
/**
 * The clumps at x, z: the two nearest centres, blended between them (1 at the nearer's middle, 0.5 halfway): its
 * height and shade, and which way and how far from the nearer's middle.
 * @param {number} x @param {number} z @param {number} size
 */
export function clumpAt(x, z, size) {
	// the four cells nearest (the one it is in, and its neighbours on the near sides), as the shader looks
	const fx = x / size, fz = z / size, gx = Math.floor(fx - 0.5), gz = Math.floor(fz - 0.5);
	let a = { d: Infinity, c: clumpCentre(0, 0, size) }, b = a;
	for (let dx = 0; dx <= 1; dx++)
		for (let dz = 0; dz <= 1; dz++) {
			const c = clumpCentre(gx + dx, gz + dz, size), d = Math.hypot(x - c.x, z - c.z);
			if (d < a.d) (b = a), (a = { d, c });
			else if (d < b.d) b = { d, c };
		}
	const w = 0.5 + 0.5 * smooth(0.5, 0.75, b.d / Math.max(1e-6, a.d + b.d));
	return {
		height: a.c.height * w + b.c.height * (1 - w),
		shade: a.c.shade * w + b.c.shade * (1 - w),
		/** from the nearer's middle out, 0…1 of the way to the edge */
		out: Math.min(1, a.d / (size * 0.6)),
		away: Math.atan2(z - a.c.z, x - a.c.x)
	};
}

/**
 * A blade as it stands: its height (m) with its clump and its own spread, and its colour's mix.
 * @param {ReturnType<typeof bladeOf>} b @param {GrassParams} p @param {number} tall 0…1, the mask's tall grass
 */
export function bladeHeight(b, p, tall) {
	const c = clumpAt(b.x, b.z, p.clump);
	// a clump taller in its middle; the blade's own ± spread
	const base = p.height + (p.tall - p.height) * tall;
	return base * (1 + p.heightSpread * b.height) * (0.8 + 0.4 * c.height) * (1 - 0.25 * c.out);
}

/* ── a blade's shape, by level ── */

/**
 * A blade's vertices at a level: each its place along the blade (t, 0 at its foot, 1 at its tip) and side (−1, 1, 0 at
 * the tip), and where it goes as the blade geomorphs to the next level (`a`, `b`: two vertices of the next level's
 * shape, and `f` of the way from a to b: on its edge), with its triangles.
 * @param {0 | 1 | 2} level
 */
export function bladeLevel(level) {
	/** @type {[number, number][]} */
	let own;
	/** @type {[number, number, number, number, number][]} a's t, side, b's t, side, f */
	let to;
	const P = (/** @type {number} */ k) => k / 7;
	if (level === 0) {
		own = [];
		for (let k = 0; k < 7; k++) own.push([P(k), -1], [P(k), 1]);
		own.push([1, 0]);
		// kept by level 1: the pairs at 0, 2/7, 4/7 and the tip; the rest go onto the edges between them
		to = own.map(([t, s]) => {
			const k = Math.round(t * 7);
			if (t === 1 || k % 2 === 0 && k <= 4) return [t, s, t, s, 0];
			if (k === 1 || k === 3) return [P(k - 1), s, P(k + 1), s, 0.5];
			return [P(4), s, 1, 0, (t - P(4)) / (1 - P(4))];
		});
	} else if (level === 1) {
		own = [[0, -1], [0, 1], [P(2), -1], [P(2), 1], [P(4), -1], [P(4), 1], [1, 0]];
		// level 2 keeps the foot, the right side at 4/7 and the tip; the left side goes straight from foot to tip
		to = own.map(([t, s]) => {
			if (t === 0 || t === 1 || (t === P(4) && s === 1)) return [t, s, t, s, 0];
			if (s === 1) return [0, 1, P(4), 1, t / P(4)];
			return [0, -1, 1, 0, t];
		});
	} else {
		own = [[0, -1], [0, 1], [P(4), 1], [1, 0]];
		to = own.map(([t, s]) => [t, s, t, s, 0]);
	}
	/** @type {number[]} */
	const index = [];
	if (level === 2) index.push(0, 1, 2, 0, 2, 3);
	else {
		const pairs = (own.length - 1) / 2;
		for (let k = 0; k < pairs - 1; k++) index.push(2 * k, 2 * k + 1, 2 * k + 3, 2 * k, 2 * k + 3, 2 * k + 2);
		index.push(2 * pairs - 2, 2 * pairs - 1, 2 * pairs);
	}
	return { own, to, index };
}

/**
 * Where a blade's vertex is, in the blade's own frame before it is turned to its facing (x across, y up, z the way
 * it leans): a quadratic Bézier from its foot to its tip, its control above the foot, its width narrowing to the tip.
 * @param {number} t @param {number} side @param {{ height: number, lean: number, width: number, bend?: [number, number] }} b
 *   lean in radians; bend, the wind's push on its tip (m, in its own x and z)
 */
export function shapeAt(t, side, b) {
	const [bx, bz] = b.bend ?? [0, 0];
	const tipY = b.height * Math.cos(b.lean), tipZ = b.height * Math.sin(b.lean) + bz, tipX = bx;
	const cy = b.height * 0.66;
	const u = 1 - t;
	const x = t * t * tipX, y = 2 * u * t * cy + t * t * tipY, z = t * t * tipZ;
	const w = b.width * Math.pow(1 - t, 0.75) * 0.5 * side;
	return [x + w, y, z];
}

/**
 * A vertex of a level as it is drawn at `m` of the way to the next level's shape (m 0…1, 1 at the band's end).
 * @param {0 | 1 | 2} level @param {number} i @param {number} m @param {Parameters<typeof shapeAt>[2]} b
 */
export function morphed(level, i, m, b) {
	const L = bladeLevel(level);
	const [t, s] = /** @type {[number, number]} */ (L.own[i]);
	const [ta, sa, tb, sb, f] = /** @type {number[]} */ (L.to[i]);
	const p = shapeAt(t, s, b), a = shapeAt(/** @type {number} */ (ta), /** @type {number} */ (sa), b), q = shapeAt(/** @type {number} */ (tb), /** @type {number} */ (sb), b);
	return p.map((v, k) => v + ((/** @type {number} */ (a[k]) * (1 - /** @type {number} */ (f)) + /** @type {number} */ (q[k]) * /** @type {number} */ (f)) - v) * m);
}
/** how far a level's blades have geomorphed to the next's at d (0…1) @param {0 | 1 | 2} level @param {number} d @param {{ bands: number[] }} dev */
export const morphAt = (level, d, dev) => (level === 2 ? 0 : smooth(/** @type {number} */ (dev.bands[level]) * 0.7, /** @type {number} */ (dev.bands[level]), d));

/** a level's geometry: its vertices' (t, side) and their goals, its triangles @param {0 | 1 | 2} level */
export function levelGeometry(level) {
	const L = bladeLevel(level);
	const g = new THREE.InstancedBufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(L.own.flatMap(([t, s]) => [s, t, 0]), 3));
	// a's t and side, b's t and side; and f
	g.setAttribute('gA', new THREE.Float32BufferAttribute(L.to.flatMap(([ta, sa, tb, sb]) => [/** @type {number} */ (ta), /** @type {number} */ (sa), /** @type {number} */ (tb), /** @type {number} */ (sb)]), 4));
	g.setAttribute('gF', new THREE.Float32BufferAttribute(L.to.map((r) => /** @type {number} */ (r[4])), 1));
	g.setIndex(L.index);
	return g;
}

/* ── where grass grows: the mask round the eye ── */

/**
 * Where grass grows round the eye, and how: a grid of `size` texels `texel` metres apart, wrapped (texel gx mod size
 * holds the ground's column gx), worked out a few thousand texels a frame as the eye goes. Each texel holds how much
 * of the ground grass covers there (0…1), how much of it is the tall grass, and the ground's height.
 * @param {{ at: (x: number, z: number) => { grass: number, tall: number, y?: number }, size?: number, texel?: number, perFrame?: number }} o
 */
export class GrassMask {
	constructor(o) {
		this.at = o.at;
		this.size = o.size ?? 256;
		this.texel = o.texel ?? 0.6;
		this.perFrame = o.perFrame ?? 6000;
		const n = this.size * this.size;
		this.data = new Uint16Array(n * 4);
		/** each texel's ground column and row as last worked out (NaN: never) */
		this.col = new Float64Array(n).fill(NaN);
		this.row = new Float64Array(n).fill(NaN);
		/** the grass each texel holds, as numbers (for the tiles' sums on the CPU) */
		this.grass = new Float32Array(n);
		this.texture = new THREE.DataTexture(this.data, this.size, this.size, THREE.RGBAFormat, THREE.HalfFloatType);
		this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping;
		this.texture.magFilter = this.texture.minFilter = THREE.LinearFilter;
		this.texture.generateMipmaps = false;
		this.texture.needsUpdate = true;
	}
	/** how far round the eye it holds (m, the half of its width) */
	get half() {
		return (this.size * this.texel) / 2;
	}
	/**
	 * The texels round x, z worked out where they hold another column or row, the nearest first, `budget` of them.
	 * @returns {boolean} whether it holds everything round x, z now
	 */
	update(/** @type {number} */ x, /** @type {number} */ z, budget = this.perFrame) {
		const N = this.size, s = this.texel;
		const g0 = Math.floor(x / s) - N / 2, h0 = Math.floor(z / s) - N / 2;
		let done = 0, all = true;
		// rings out from the eye, so the nearest is worked out first
		const c = N / 2;
		for (let r = 0; r <= c && done < budget; r++)
			for (let dz = -r; dz <= r && done < budget; dz++) {
				const step = Math.abs(dz) === r ? 1 : 2 * r;
				for (let dx = -r; dx <= r && done < budget; dx += step || 1) {
					const gx = g0 + c + dx, gz = h0 + c + dz;
					if (gx < g0 || gx >= g0 + N || gz < h0 || gz >= h0 + N) continue;
					const i = (((gz % N) + N) % N) * N + (((gx % N) + N) % N);
					if (this.col[i] === gx && this.row[i] === gz) continue;
					const m = this.at((gx + 0.5) * s, (gz + 0.5) * s);
					this.col[i] = gx;
					this.row[i] = gz;
					this.grass[i] = m.grass;
					this.data[i * 4] = THREE.DataUtils.toHalfFloat(m.grass);
					this.data[i * 4 + 1] = THREE.DataUtils.toHalfFloat(m.tall);
					this.data[i * 4 + 2] = THREE.DataUtils.toHalfFloat(m.y ?? 0);
					done++;
				}
			}
		if (done >= budget) all = false;
		if (done) this.texture.needsUpdate = true;
		return all;
	}
	/** whether every texel over a square is worked out, and the most grass over it (0 where none) */
	over(/** @type {number} */ x0, /** @type {number} */ z0, /** @type {number} */ w) {
		const N = this.size, s = this.texel;
		let most = 0;
		const a = Math.floor(x0 / s), b = Math.floor(z0 / s), n = Math.ceil(w / s);
		for (let gz = b; gz <= b + n; gz++)
			for (let gx = a; gx <= a + n; gx++) {
				const i = (((gz % N) + N) % N) * N + (((gx % N) + N) % N);
				if (this.col[i] !== gx || this.row[i] !== gz) return { ready: false, most: 0 };
				most = Math.max(most, /** @type {number} */ (this.grass[i]));
			}
		return { ready: true, most };
	}
}

/**
 * How much grass a biome's cover grows at x, z, and how much of it tall: what `coverAt` would choose there, as a share
 * (its grass kinds against every kind there, and the ground its plants leave bare).
 * @param {import('./index.js').Recipe} recipe @param {(x: number, z: number) => boolean} [open]
 * @returns {(x: number, z: number) => { grass: number, tall: number }}
 */
export function grassOfRecipe(recipe, open) {
	const kinds = recipe.cover.map((c) => (c.kind === 'grass' ? 1 : c.kind === 'tallgrass' ? 2 : 0));
	return (x, z) => {
		if (open && !open(x, z)) return { grass: 0, tall: 0 };
		let empty = 1, total = 0, grass = 0, tall = 0;
		recipe.cover.forEach((c, i) => {
			if (c.rows) return;
			const m = colonyAt(recipe, i, x, z), fill = c.fill ?? 0.85;
			empty *= 1 - fill * m;
			const v = c.share * fill * m;
			total += v;
			if (kinds[i] === 1) grass += v;
			if (kinds[i] === 2) (grass += v), (tall += v);
		});
		if (total <= 0) return { grass: 0, tall: 0 };
		return { grass: Math.min(1, (1 - empty) * (grass / total) * 1.6), tall: grass > 0 ? tall / grass : 0 };
	};
}
/** whether a biome grows grass @param {import('./index.js').Recipe} recipe */
export const growsGrass = (recipe) => recipe.cover.some((c) => c.kind === 'grass' || c.kind === 'tallgrass');

/* ── the field: tiles round the eye ── */

/**
 * The tiles to draw round an eye: a quadtree from tiles of 4 cells, split where it is nearer than its level's band
 * (a tile's level is the one its nearest point is in), none beyond the last band, none where the mask grows no grass.
 * Each with its first cell, its level, and how many of each of its cells' blades it draws (the most any of its blades
 * can keep, a little over: the rest sink into the ground on the card).
 * @param {number} x @param {number} z the eye @param {{ bands: number[], near: number }} dev @param {number} n blades a cell
 * @param {(x0: number, z0: number, w: number) => { ready: boolean, most: number }} [over] the mask over a square
 * @returns {{ tx: number, tz: number, level: 0 | 1 | 2, count: number }[]}
 */
export function tilesAround(x, z, dev, n, over) {
	const big = /** @type {number} */ (TILE_CELLS[2]), W = big * CELL, end = /** @type {number} */ (dev.bands[2]);
	/** @type {{ tx: number, tz: number, level: 0 | 1 | 2, count: number }[]} */
	const out = [];
	const nearest = (/** @type {number} */ tx, /** @type {number} */ tz, /** @type {number} */ w) => {
		const x0 = tx * CELL, z0 = tz * CELL;
		return Math.hypot(Math.max(x0 - x, 0, x - (x0 + w)), Math.max(z0 - z, 0, z - (z0 + w)));
	};
	const visit = (/** @type {number} */ tx, /** @type {number} */ tz, /** @type {0 | 1 | 2} */ level) => {
		const k = /** @type {number} */ (TILE_CELLS[level]), w = k * CELL, d = nearest(tx, tz, w);
		if (d >= end) return;
		if (level > 0 && d < /** @type {number} */ (dev.bands[level - 1])) {
			const h = k / 2;
			for (const [a, b] of [[0, 0], [h, 0], [0, h], [h, h]]) visit(tx + /** @type {number} */ (a), tz + /** @type {number} */ (b), /** @type {0 | 1} */ (level - 1));
			return;
		}
		const m = over ? over(tx * CELL, tz * CELL, w) : { ready: true, most: 1 };
		if (!m.ready || m.most <= 0) return;
		// every blade with a rank under what is kept at its nearest point, and the fade's width over it
		const count = Math.min(n, Math.ceil(n * Math.min(1, keep(d, dev) + 0.08)));
		if (count > 0) out.push({ tx, tz, level, count });
	};
	const r = Math.ceil(end / W);
	const ix = Math.floor(x / W), iz = Math.floor(z / W);
	for (let a = ix - r; a <= ix + r; a++) for (let b = iz - r; b <= iz + r; b++) visit(a * big, b * big, 2);
	return out;
}

/**
 * A biome's grass, drawn round the eye.
 * @param {{
 *   params?: Partial<GrassParams>, at: (x: number, z: number) => { grass: number, tall: number, y?: number },
 *   device?: 'desktop' | 'small', shadows?: boolean
 * }} o
 *   at: where grass grows and how tall, and the ground's height (`grassOfRecipe`); device: whose budget
 */
export function grassField(o) {
	const dev = DEVICES[o.device ?? 'desktop'], P = { ...GRASS, ...(o.params ?? {}) };
	const n = perCell(dev.density);
	const mask = new GrassMask({ at: o.at, size: 256, texel: Math.max(0.6, (dev.bands[2] * 2 + CELL * 8) / 256) });
	const U = grassUniforms(mask.texture);
	U.maskWidth.value = mask.size * mask.texel;
	U.perCell.value = n;
	const materials = /** @type {const} */ ([0, 1, 2]).map((level) => grassMaterial({ level, uniforms: U, params: P, device: dev }));
	// each level's blade, its attributes shared; every tile its own geometry (the nodes handler can't share one)
	const blades = /** @type {const} */ ([0, 1, 2]).map((level) => levelGeometry(level));
	const object = new THREE.Group();
	object.name = 'grass';
	/** @type {THREE.Mesh[][]} each level's meshes, those not drawn now kept for the next */
	const pool = [[], [], []];
	/** @type {THREE.Mesh[]} */
	let shown = [];
	const take = (/** @type {0 | 1 | 2} */ level) => {
		let mesh = /** @type {THREE.Mesh | undefined} */ (pool[level]?.pop());
		if (!mesh) {
			const src = /** @type {THREE.InstancedBufferGeometry} */ (blades[level]);
			const g = new THREE.InstancedBufferGeometry();
			for (const [name, a] of Object.entries(src.attributes)) g.setAttribute(name, a);
			g.setIndex(src.index);
			const w = /** @type {number} */ (TILE_CELLS[level]) * CELL;
			// the tile's blades stand within it, leaning out of it by their height at most
			g.boundingSphere = new THREE.Sphere(new THREE.Vector3(w / 2, 0.3, w / 2), w * 0.71 + 1);
			g.boundingBox = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(w + 1, 2, w + 1));
			mesh = new THREE.Mesh(g, materials[level]);
			mesh.castShadow = false;
			mesh.receiveShadow = o.shadows ?? true;
			mesh.matrixAutoUpdate = false;
			mesh.userData.level = level;
		}
		return mesh;
	};
	let at = { x: Infinity, z: Infinity }, ready = false;
	const sun = new THREE.Vector3();
	return {
		object,
		uniforms: U,
		mask,
		/** where the eye is, and the time: the mask worked out round it, the tiles chosen again once it has gone a metre */
		update(/** @type {THREE.PerspectiveCamera} */ camera, /** @type {number} */ time, /** @type {{ light?: THREE.DirectionalLight, pushers?: [number, number, number, number][], height?: number, budget?: number }} */ w = {}) {
			const x = camera.position.x, z = camera.position.z;
			U.time.value = time;
			U.pxAt1m.value = (w.height ?? 900) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
			if (w.light) {
				sun.copy(w.light.position).sub(w.light.target.position).normalize();
				U.sunDir.value.copy(sun);
				U.sunColor.value.copy(w.light.color).multiplyScalar(Math.min(2, w.light.intensity / 3));
			}
			for (let p = 0; p < PUSHERS; p++) U.pushers.array[p].set(...(w.pushers?.[p] ?? [0, 0, 0, 0]));
			const filled = mask.update(x, z, w.budget);
			if (!ready || Math.hypot(x - at.x, z - at.z) > 1 || !filled) {
				ready = filled;
				at = { x, z };
				this.lay(x, z);
			}
		},
		/** the tiles round x, z laid out */
		lay(/** @type {number} */ x, /** @type {number} */ z) {
			for (const m of shown) (m.removeFromParent(), pool[/** @type {0 | 1 | 2} */ (m.userData.level)]?.push(m));
			shown = tilesAround(x, z, dev, n, (x0, z0, w) => mask.over(x0, z0, w)).map((t) => {
				const mesh = take(t.level), k = /** @type {number} */ (TILE_CELLS[t.level]);
				mesh.position.set(t.tx * CELL, 0, t.tz * CELL);
				mesh.updateMatrix();
				/** @type {THREE.InstancedBufferGeometry} */ (mesh.geometry).instanceCount = t.count * k * k;
				object.add(mesh);
				return mesh;
			});
		},
		/** how many blades it draws now, by level */
		count: () => shown.reduce((a, m) => (a[m.userData.level] += /** @type {THREE.InstancedBufferGeometry} */ (m.geometry).instanceCount, a), [0, 0, 0]),
		dispose() {
			for (const m of [...shown, ...pool.flat()]) (m.removeFromParent(), m.geometry.dispose());
			for (const m of materials) m.dispose();
			mask.texture.dispose();
		}
	};
}

/**
 * The renderer's nodes handler, so a WebGLRenderer draws node materials (the grass's): once a renderer, until WebGPU
 * is the renderer (intent 1). @param {THREE.WebGLRenderer} renderer
 */
export function useNodes(renderer) {
	const r = /** @type {any} */ (renderer);
	if (!r.__nodes) r.setNodesHandler?.((r.__nodes = new WebGLNodesHandler()));
}

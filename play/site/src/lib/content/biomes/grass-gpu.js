/*
 * GRASS BY THE MILLION, ITS SUMS — what the graphics card does with the grass on WebGPU (intent e85a5860), written once
 * so the CPU can do it too: the compute shader (../render/nodes/grass-compute.js) and the tests run the same functions,
 * the shader with TSL's nodes, the tests with numbers rounded to 32 bits as the card rounds them.
 *
 *   choose     blade j of cell (cx, cz), hashed from the three (./grass.js `bladeOf`): drawn at level 0, 1 or 2, or not
 *              at all (−1): sunk by distance (nested thinning: its rank over what is kept where it stands, the mask's
 *              grass thinning it the same way, past its end of the field), outside the view (its sphere with a
 *              tolerance for the wind and the pushers), or edge on past the near band (|view · across| > 0.9); its
 *              level by distance, each blade's thresholds jittered so the bands never show as lines
 *   cells      the cells the compute runs over: those within the field's end that the view sees and the mask has
 *              grass in, each packed in 32 bits; every candidate of every cell is one thread
 *   indirect   three indexed indirect draws (one a level, nearest first), five numbers each: the level's index count,
 *              its blades (counted up by the compute with atomics, from 0 each frame), 0, 0, firstInstance 0
 *   trample    an influence map following the eye: how trodden the ground is, stamped by the walker, animals and
 *              vehicles (the pushers) and decaying, so a path springs back within about 10 s
 *
 * Every function taking a kit `K` runs on numbers (`F32`) or on TSL nodes (grass-compute.js `TK`): `K` holds the
 * arithmetic, the environment `E` what the blade reads (its hash, its clumps, the mask, the eye, the view's planes).
 */
import * as THREE from 'three';
import { CELL, FADE, DEVICES, clumpCentre, draw, seedOf } from './grass.js';
/** @typedef {import('./grass.js').GrassMask} GrassMask */

/** blades a square metre near on WebGPU, by device (intent 7's instanced tiles keep DEVICES' density) */
export const GPU_DENSITY = { desktop: 180, small: 70 };
/** how far outside the view a blade's sphere may be and still be drawn (m): the wind and the pushers bend it so far */
export const TOLERANCE = 0.4;
/** how edge on a blade may be seen before it is left out, past the near band (|view · across|) */
export const EDGE_ON = 0.9;
/** where a level's thresholds fall, jittered blade by blade: between JITTER and 1 of its band's end */
export const JITTER = 0.95;
/** the trample map: how wide (m) and how many texels across, and how long a trodden blade takes to spring back (s) */
export const TRAMPLE = { width: 48, size: 256, recover: 10 };
/** a texel's trodden share left after `recover` seconds (it decays as e^(−t / τ) to this) */
export const RECOVERED = 0.05;

/* ── the kit: 32-bit arithmetic on the CPU ── */

const f = Math.fround;
/** the arithmetic of a kit on numbers, rounded to 32 bits after every step as the graphics card rounds */
export const F32 = {
	f: (/** @type {number} */ v) => f(v),
	add: (/** @type {number} */ a, /** @type {number} */ b) => f(a + b),
	sub: (/** @type {number} */ a, /** @type {number} */ b) => f(a - b),
	mul: (/** @type {number} */ a, /** @type {number} */ b) => f(a * b),
	div: (/** @type {number} */ a, /** @type {number} */ b) => f(a / b),
	min: (/** @type {number} */ a, /** @type {number} */ b) => Math.min(a, b),
	max: (/** @type {number} */ a, /** @type {number} */ b) => Math.max(a, b),
	clamp: (/** @type {number} */ v, /** @type {number} */ a, /** @type {number} */ b) => Math.min(b, Math.max(a, v)),
	pow: (/** @type {number} */ a, /** @type {number} */ b) => f(Math.pow(a, b)),
	sqrt: (/** @type {number} */ a) => f(Math.sqrt(a)),
	abs: Math.abs,
	cos: (/** @type {number} */ a) => f(Math.cos(a)),
	sin: (/** @type {number} */ a) => f(Math.sin(a)),
	smooth: (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ v) => {
		const t = Math.min(1, Math.max(0, f(f(v - a) / f(b - a))));
		return f(f(t * t) * f(3 - f(2 * t)));
	},
	lt: (/** @type {number} */ a, /** @type {number} */ b) => a < b,
	le: (/** @type {number} */ a, /** @type {number} */ b) => a <= b,
	gt: (/** @type {number} */ a, /** @type {number} */ b) => a > b,
	ge: (/** @type {number} */ a, /** @type {number} */ b) => a >= b,
	and: (/** @type {boolean} */ a, /** @type {boolean} */ b) => a && b,
	sel: (/** @type {boolean} */ c, /** @type {any} */ a, /** @type {any} */ b) => (c ? a : b)
};

/* ── choosing a blade ── */

/**
 * @typedef {object} View what a blade is chosen against
 * @property {{ bands: number[], near: number, falloff?: number }} dev the device's bands
 * @property {number} n the cell's candidates
 * @property {number} hmax the tallest a blade stands (m)
 * @property {number} clump its clumps' size (m)
 */

/**
 * Blade j of cell (cx, cz): its level (0, 1, 2), or −1 where it is not drawn.
 * @param {typeof F32 | any} K the kit
 * @param {{
 *   seed: (cx: any, cz: any, j: any) => any, draw: (seed: any, k: number) => any, uint: (j: any) => any,
 *   clump: (x: any, z: any) => { ax: any, az: any, out: any }, mask: (x: any, z: any) => { grass: any, y: any },
 *   eye: [any, any, any], planes: [any, any, any, any][]
 * }} E the blade's environment
 * @param {any} cx @param {any} cz @param {any} j @param {View} v
 */
export function choose(K, E, cx, cz, j, v) {
	const [b0, b1, b2] = /** @type {[number, number, number]} */ (v.dev.bands);
	const s = E.seed(cx, cz, j);
	const fx = K.mul(K.add(cx, E.draw(s, 0)), CELL), fz = K.mul(K.add(cz, E.draw(s, 1)), CELL);
	const rank = K.div(K.add(E.uint(j), E.draw(s, 2)), v.n);
	const m = E.mask(fx, fz);
	const dx = K.sub(fx, E.eye[0]), dy = K.sub(m.y, E.eye[1]), dz = K.sub(fz, E.eye[2]);
	const d = K.sqrt(K.add(K.add(K.mul(dx, dx), K.mul(dy, dy)), K.mul(dz, dz)));

	/* nested thinning: grass.js `keep` and `growAt`, the mask thinning it by rank as distance does */
	const keepD = K.sel(K.le(d, v.dev.near), K.f(1), K.sel(K.ge(d, b2), K.f(0), K.pow(K.div(K.f(v.dev.near), K.max(d, 1e-6)), v.dev.falloff ?? 1.5)));
	const kept = K.mul(keepD, m.grass);
	const reach = K.mul(K.add(K.mul(E.draw(s, 9), 0.1), 0.9), b2);
	const grow = K.mul(
		K.clamp(K.div(K.sub(K.mul(kept, 1 + FADE), rank), K.add(K.mul(kept, FADE), 1e-4)), 0, 1),
		K.sub(K.f(1), K.smooth(K.sub(reach, 6), reach, d))
	);

	/* the view: its sphere (foot to its tallest, with the tolerance) inside every plane */
	const hr = v.hmax / 2, r = hr + TOLERANCE;
	const cy = K.add(m.y, hr);
	let inside = K.gt(grow, 0);
	for (const [nx, ny, nz, pd] of E.planes)
		inside = K.and(inside, K.ge(K.add(K.add(K.add(K.mul(nx, fx), K.mul(ny, cy)), K.mul(nz, fz)), pd), -r));

	/* edge on: the way it leans out of its clump (nodes/grass.js's `leanWay`), across it, against the view */
	const facing = K.mul(E.draw(s, 5), Math.PI * 2);
	const c = E.clump(fx, fz);
	const awx = K.add(K.sub(fx, c.ax), 1e-4), awz = K.add(K.sub(fz, c.az), 1e-4);
	const al = K.sqrt(K.add(K.mul(awx, awx), K.mul(awz, awz)));
	const ownK = K.sub(K.f(1), K.mul(c.out, 0.6)), awayK = K.div(K.mul(c.out, 0.9), al);
	const lx = K.add(K.mul(K.cos(facing), ownK), K.mul(awx, awayK)), lz = K.add(K.mul(K.sin(facing), ownK), K.mul(awz, awayK));
	const ll = K.sqrt(K.add(K.mul(lx, lx), K.mul(lz, lz)));
	// across is (lean.z, −lean.x): the view's share along it
	const along = K.div(K.sub(K.mul(dx, lz), K.mul(dz, lx)), K.max(K.mul(d, ll), 1e-6));
	const edgeOn = K.and(K.gt(d, b0), K.gt(K.abs(along), EDGE_ON));

	/* its level: the bands' ends jittered blade by blade, between JITTER and 1 of them */
	const jit = K.add(K.mul(E.draw(s, 12), 1 - JITTER), JITTER);
	const level = K.sel(K.lt(d, K.mul(jit, b0)), K.f(0), K.sel(K.lt(d, K.mul(jit, b1)), K.f(1), K.f(2)));
	return K.sel(K.and(inside, K.sel(edgeOn, false, true)), level, K.f(-1));
}

/* ── the same on the CPU: the environment on numbers ── */

/** a half float's value @param {number} h */
const half = (h) => THREE.DataUtils.fromHalfFloat(h);
/** texel (gx, gz) of a mask as the graphics card reads it (half floats) @param {GrassMask} mask @param {number} gx @param {number} gz */
export function texelOf(mask, gx, gz) {
	const N = mask.size, i = (((gz % N) + N) % N) * N + (((gx % N) + N) % N);
	return { grass: half(/** @type {number} */ (mask.data[i * 4])), tall: half(/** @type {number} */ (mask.data[i * 4 + 1])), y: half(/** @type {number} */ (mask.data[i * 4 + 2])) };
}
/**
 * The mask where a blade is chosen: the most grass of the four texels its foot's sample blends (so a blade the
 * material grows is never left out), the ground's height of the texel it stands in.
 * @param {GrassMask} mask @param {number} x @param {number} z
 */
export function maskAt(mask, x, z) {
	const t = mask.texel, gx = Math.floor(f(f(x / t) - 0.5)), gz = Math.floor(f(f(z / t) - 0.5));
	let grass = 0;
	for (let a = 0; a <= 1; a++) for (let b = 0; b <= 1; b++) grass = Math.max(grass, texelOf(mask, gx + a, gz + b).grass);
	return { grass, y: texelOf(mask, Math.floor(f(x / t)), Math.floor(f(z / t))).y };
}
/** the nearest clump's centre round x, z and how far out of it (grass.js `clumpAt`'s, its nearer centre) @param {number} x @param {number} z @param {number} size */
export function clumpNear(x, z, size) {
	const gx = Math.floor(f(f(x / size) - 0.5)), gz = Math.floor(f(f(z / size) - 0.5));
	let best = { d: Infinity, x: 0, z: 0 };
	for (let a = 0; a <= 1; a++)
		for (let b = 0; b <= 1; b++) {
			const c = clumpCentre(gx + a, gz + b, size), d = f(Math.hypot(x - c.x, z - c.z));
			if (d < best.d) best = { d, x: f(c.x), z: f(c.z) };
		}
	return { ax: best.x, az: best.z, out: Math.min(f(best.d / f(size * 0.6)), 1) };
}

/**
 * The CPU's twin of the compute: blade j of cell (cx, cz) as the graphics card would choose it.
 * @param {number} cx @param {number} cz @param {number} j
 * @param {{ mask: GrassMask, eye: [number, number, number], planes: [number, number, number, number][] } & View} v
 */
export function chooseOnCpu(cx, cz, j, v) {
	/** @type {Parameters<typeof choose>[1]} */
	const E = {
		seed: seedOf,
		draw: (s, k) => f(draw(s, k)),
		uint: (j) => j,
		clump: (x, z) => clumpNear(x, z, v.clump),
		mask: (x, z) => maskAt(v.mask, x, z),
		// as the graphics card holds them: 32-bit
		eye: /** @type {[number, number, number]} */ (v.eye.map(f)),
		planes: v.planes.map((p) => /** @type {[number, number, number, number]} */ (p.map(f)))
	};
	return choose(F32, E, cx, cz, j, v);
}

/** the six planes of a camera's view, each [nx, ny, nz, d] (inside where n · p + d ≥ 0) @param {THREE.Camera} camera */
export function planesOf(camera) {
	const m = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
	const fr = new THREE.Frustum().setFromProjectionMatrix(m, camera.coordinateSystem);
	return fr.planes.map((p) => /** @type {[number, number, number, number]} */ ([f(p.normal.x), f(p.normal.y), f(p.normal.z), f(p.constant)]));
}

/* ── the cells the compute runs over ── */

/** a cell packed in 32 bits: its column and row, each offset by 2¹⁵ (±131 km of cells of 4 m) @param {number} cx @param {number} cz */
export const packCell = (cx, cz) => (((cx + 32768) & 0xffff) | (((cz + 32768) & 0xffff) << 16)) >>> 0;
/** @param {number} p */
export const unpackCell = (p) => [(p & 0xffff) - 32768, (p >>> 16) - 32768];

/**
 * What the mask holds over a cell: whether all of it is worked out, the most grass in it, and the ground's lowest and
 * highest there. @param {GrassMask} mask @param {number} cx @param {number} cz
 */
export function cellOf(mask, cx, cz) {
	const o = mask.over(cx * CELL, cz * CELL, CELL);
	if (!o.ready || o.most <= 0) return { ready: o.ready, most: o.most, y0: 0, y1: 0 };
	const t = mask.texel, a = Math.floor((cx * CELL) / t), b = Math.floor((cz * CELL) / t), k = Math.ceil(CELL / t);
	let y0 = Infinity, y1 = -Infinity;
	for (let gz = b; gz <= b + k; gz++)
		for (let gx = a; gx <= a + k; gx++) {
			const y = texelOf(mask, gx, gz).y;
			(y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
		}
	return { ready: true, most: o.most, y0, y1 };
}

/**
 * The cells round the eye the compute runs over, nearest first: within the field's end, grown by the mask, and seen
 * (their box, from the ground's lowest to the tallest blade over its highest, with the tolerance, meeting the view).
 * @param {number} x @param {number} z the eye
 * @param {{ bands: number[] }} dev @param {THREE.Frustum} frustum
 * @param {(cx: number, cz: number) => { ready: boolean, most: number, y0: number, y1: number }} of what the mask holds over a cell
 * @param {number} hmax the tallest a blade stands
 * @returns {number[]} the cells, packed
 */
export function cellsAround(x, z, dev, frustum, of, hmax) {
	const end = /** @type {number} */ (dev.bands[2]), r = Math.ceil(end / CELL) + 1;
	const ix = Math.floor(x / CELL), iz = Math.floor(z / CELL);
	const box = new THREE.Box3();
	/** @type {[number, number, number][]} */
	const out = [];
	for (let a = ix - r; a <= ix + r; a++)
		for (let b = iz - r; b <= iz + r; b++) {
			const x0 = a * CELL, z0 = b * CELL;
			const d = Math.hypot(Math.max(x0 - x, 0, x - (x0 + CELL)), Math.max(z0 - z, 0, z - (z0 + CELL)));
			if (d >= end) continue;
			const c = of(a, b);
			if (!c.ready || c.most <= 0) continue;
			box.min.set(x0 - TOLERANCE - 1, c.y0 - TOLERANCE, z0 - TOLERANCE - 1);
			box.max.set(x0 + CELL + TOLERANCE + 1, c.y1 + hmax + TOLERANCE, z0 + CELL + TOLERANCE + 1);
			if (!frustum.intersectsBox(box)) continue;
			out.push([d, a, b]);
		}
	return out.sort((p, q) => p[0] - q[0]).map(([, a, b]) => packCell(a, b));
}
/** the most cells the field's end holds round the eye (the cells buffer's length) @param {{ bands: number[] }} dev */
export const maxCells = (dev) => {
	const r = Math.ceil(/** @type {number} */ (dev.bands[2]) / CELL) + 1;
	return (2 * r + 1) ** 2;
};

/* ── the three indirect draws ── */

/** five numbers a draw, in bytes 20 */
export const ARGS = 5;
/**
 * The indirect draws' arguments as each frame starts: per level its index count, no blades yet, firstIndex 0,
 * baseVertex 0, firstInstance 0 (WebGPU's `drawIndexedIndirect`).
 * @param {number[]} indexCounts each level's
 */
export function indirectArgs(indexCounts) {
	const a = new Uint32Array(ARGS * 3);
	indexCounts.forEach((c, l) => (a[l * ARGS] = c));
	return a;
}
/** where each level's draw starts in the arguments (bytes) */
export const OFFSETS = [0, ARGS * 4, ARGS * 8];

/**
 * How many blades each level can hold at most: the whole circle of each band, as many as stand there (∫ keep · 2πr dr
 * times the density), a fifth over; the compute stops counting a level at it.
 * @param {{ bands: number[], near: number, falloff?: number }} dev @param {number} density
 */
export function capacities(dev, density) {
	const [b0, b1, b2] = /** @type {[number, number, number]} */ (dev.bands);
	const p = dev.falloff ?? 1.5, near = dev.near;
	/** ∫ from a to b of keep(r) 2πr dr */
	const area = (/** @type {number} */ a, /** @type {number} */ b) => {
		const inner = Math.max(0, Math.min(b, near) ** 2 - Math.min(a, near) ** 2) * Math.PI;
		const lo = Math.max(a, near);
		if (b <= lo) return inner;
		const e = 2 - p;
		const outer = (2 * Math.PI * near ** p * (b ** e - lo ** e)) / e;
		return inner + outer;
	};
	return [area(0, b0), area(b0 * JITTER, b1), area(b1 * JITTER, b2)].map((a) => Math.ceil((a * density * 1.2) / 64) * 64);
}

/* ── the trample map ── */

/** a texel's trodden share kept after dt seconds @param {number} dt */
export const decayOf = (dt) => Math.exp((-dt * Math.log(1 / RECOVERED)) / TRAMPLE.recover);
/** how hard a pusher treads at distance d (its radius r, its strength s) @param {number} d @param {number} r @param {number} s */
export const tread = (d, r, s) => (1 - smoothF(r * 0.4, r, d)) * s;
/** @param {number} a @param {number} b @param {number} v */
function smoothF(a, b, v) {
	const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
	return t * t * (3 - 2 * t);
}
/** integer modulo, never negative @param {number} a @param {number} n */
export const wrap = (a, n) => ((a % n) + n) % n;

/**
 * The trample map on the CPU, the twin of the compute's (grass-compute.js `trampleNode`): `size`² texels following the
 * eye, texel i holding the ground's column gx with gx mod size = i (as the grass mask wraps); each frame every texel
 * that still holds the same ground decays, a texel the eye's moving has handed to new ground is cleared, and each
 * pusher treads round it.
 */
export class Trample {
	constructor(o = TRAMPLE) {
		this.size = o.size;
		this.texel = o.width / o.size;
		this.data = new Float32Array(o.size * o.size);
		/** the window's first texel, as last stepped (NaN before the first) */
		this.g0 = NaN;
		this.h0 = NaN;
	}
	/** where the window starts with the eye at x, z @param {number} x @param {number} z */
	originOf(x, z) {
		return [Math.floor(x / this.texel) - this.size / 2, Math.floor(z / this.texel) - this.size / 2];
	}
	/**
	 * One frame: the window moved to the eye, every texel decayed over dt, the pushers' treads.
	 * @param {number} x @param {number} z @param {number} dt @param {[number, number, number, number][]} pushers x, z, radius, strength
	 */
	step(x, z, dt, pushers) {
		const N = this.size, t = this.texel, [g0, h0] = this.originOf(x, z);
		const og0 = Number.isNaN(this.g0) ? g0 : this.g0, oh0 = Number.isNaN(this.h0) ? h0 : this.h0;
		const k = f(decayOf(dt));
		for (let iz = 0; iz < N; iz++)
			for (let ix = 0; ix < N; ix++) {
				const gx = g0 + wrap(ix - g0, N), gz = h0 + wrap(iz - h0, N);
				const stale = gx !== og0 + wrap(ix - og0, N) || gz !== oh0 + wrap(iz - oh0, N);
				let v = stale ? 0 : f(/** @type {number} */ (this.data[iz * N + ix]) * k);
				const px = (gx + 0.5) * t, pz = (gz + 0.5) * t;
				for (const [qx, qz, r, s] of pushers) if (s > 0 && r > 0) v = Math.max(v, f(tread(Math.hypot(px - qx, pz - qz), r, s)));
				this.data[iz * N + ix] = v;
			}
		this.g0 = g0;
		this.h0 = h0;
	}
	/** how trodden the ground is at x, z (0 outside the window) @param {number} x @param {number} z */
	at(x, z) {
		const N = this.size, gx = Math.floor(x / this.texel), gz = Math.floor(z / this.texel);
		if (gx < this.g0 || gx >= this.g0 + N || gz < this.h0 || gz >= this.h0 + N) return 0;
		return /** @type {number} */ (this.data[wrap(gz, N) * N + wrap(gx, N)]);
	}
}

/* ── the field's numbers ── */

/** the tallest a blade of these params stands (m): its tall height, its spread and its clump's 1.2 @param {{ height: number, tall: number, heightSpread: number }} p */
export const tallest = (p) => Math.max(p.height, p.tall) * (1 + p.heightSpread) * 1.2;

/** the device's bands and the WebGPU density @param {'desktop' | 'small'} device */
export const gpuDevice = (device) => ({ ...DEVICES[device], density: GPU_DENSITY[device] });


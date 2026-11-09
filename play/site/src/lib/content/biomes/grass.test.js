// Real grass (intent 090168c8): its blades shaped, thinned and placed the same way every time, without pops (c2), and
// never repeating (c3, the `variation` cases). The sums are grass.js's, the shader's twins.
import { describe, expect, test } from 'vitest';
import {
	CELL, DEVICES, VERTS, bladeLevel, bladeOf, clumpAt, clumpCentre, endOf, fieldAt, macroAt, growAt, keep, levelGeometry, morphAt, morphed,
	pcg, perCell, seedOf, shapeAt, tileBlade, tilesAround, bladeHeight, GRASS, TILE_CELLS, draw
} from './grass.js';
import { packCell } from './grass-gpu.js';

const B = { height: 0.3, lean: 0.4, width: 0.006, bend: /** @type {[number, number]} */ ([0.02, -0.01]) };
const close = (/** @type {number[]} */ a, /** @type {number[]} */ b) => a.every((v, i) => Math.abs(v - /** @type {number} */ (b[i])) < 1e-9);

describe('blade geometry', () => {
	test('15, 7 and 4 vertices by level: 13, 5 and 2 triangles', () => {
		expect(VERTS).toEqual([15, 7, 4]);
		for (const level of /** @type {const} */ ([0, 1, 2])) {
			const L = bladeLevel(level), g = levelGeometry(level);
			expect(L.own.length).toBe(VERTS[level]);
			expect(g.attributes.position?.count).toBe(VERTS[level]);
			expect(/** @type {any} */ (g.index).count / 3).toBe([13, 5, 2][level]);
			// every vertex used, none out of range
			const used = new Set(L.index);
			expect(used.size).toBe(VERTS[level]);
		}
	});
	test('a level fully geomorphed is the next level’s shape: its vertices on the next level’s edges, the kept ones where they were', () => {
		for (const level of /** @type {const} */ ([0, 1])) {
			const next = bladeLevel(/** @type {1 | 2} */ (level + 1));
			const nextPts = next.own.map(([t, s]) => shapeAt(t, s, B));
			const L = bladeLevel(level);
			L.own.forEach(([t, s], i) => {
				const p = morphed(level, i, 1, B);
				const kept = next.own.findIndex(([tt, ss]) => tt === t && ss === s);
				if (kept >= 0) expect(close(p, /** @type {number[]} */ (nextPts[kept]))).toBe(true);
				else {
					// on a straight edge between two of the next level's vertices
					const [ta, sa, tb, sb, f] = /** @type {number[]} */ (L.to[i]);
					const a = shapeAt(/** @type {number} */ (ta), /** @type {number} */ (sa), B), b = shapeAt(/** @type {number} */ (tb), /** @type {number} */ (sb), B);
					expect(close(p, a.map((v, k) => v + (/** @type {number} */ (b[k]) - v) * /** @type {number} */ (f)))).toBe(true);
					expect(next.own.some(([tt, ss]) => tt === ta && ss === sa)).toBe(true);
					expect(next.own.some(([tt, ss]) => tt === tb && ss === sb)).toBe(true);
				}
			});
		}
	});
	test('unmorphed, a blade is its own shape; it morphs only over the last 30 % of its band', () => {
		const dev = DEVICES.desktop;
		expect(close(morphed(0, 3, 0, B), shapeAt(...(/** @type {[number, number]} */ (bladeLevel(0).own[3])), B))).toBe(true);
		expect(morphAt(0, 5, dev)).toBe(0);
		expect(morphAt(0, 8, dev)).toBe(1);
		expect(morphAt(1, 25, dev)).toBe(1);
		expect(morphAt(2, 60, dev)).toBe(0);
	});
	test('a blade narrows to its tip and stands from its foot', () => {
		expect(shapeAt(0, 1, B)).toEqual([B.width / 2, 0, 0]);
		const tip = shapeAt(1, 0, B);
		expect(tip[1]).toBeCloseTo(B.height * Math.cos(B.lean), 9);
		expect(shapeAt(1, 1, B)).toEqual(tip);
	});
});

describe('blades placed from their place alone', () => {
	test('the PCG hash is the shader’s (pcg-random.org’s published values)', () => {
		// pcg_hash(0), as three's TSL `hash` takes it before scaling
		expect(pcg(0)).toBe(129708002);
		expect(pcg(1)).toBe(pcg(1));
		expect(pcg(0xffffffff)).toBeGreaterThanOrEqual(0);
	});
	test('a cell’s blades are the same every time, and differ from cell to cell', () => {
		const n = perCell(140);
		const a = Array.from({ length: 50 }, (_, j) => bladeOf(3, -7, j, n));
		const b = Array.from({ length: 50 }, (_, j) => bladeOf(3, -7, j, n));
		expect(a).toEqual(b);
		const c = bladeOf(4, -7, 0, n);
		expect(c.x).not.toBe(/** @type {any} */ (a[0]).x - CELL);
		for (const bl of a) {
			expect(bl.x).toBeGreaterThanOrEqual(3 * CELL);
			expect(bl.x).toBeLessThan(4 * CELL);
			expect(bl.z).toBeGreaterThanOrEqual(-7 * CELL);
			expect(bl.z).toBeLessThan(-6 * CELL);
		}
		expect(seedOf(-1, 0, 0)).not.toBe(seedOf(0, -1, 0));
	});
	test('a tile of 1, 2 or 4 cells (any size a tile is) draws the same blades: split or joined, nothing moves', () => {
		const n = 20, m = 7;
		/** @param {number} tx @param {number} tz @param {number} k */
		const drawn = (tx, tz, k) => {
			const s = new Set();
			for (let i = 0; i < m * k * k; i++) {
				const { cx, cz, j } = tileBlade(tx, tz, k, i);
				const b = bladeOf(cx, cz, j, n);
				s.add(`${b.x},${b.z}`);
			}
			return s;
		};
		const four = drawn(8, -4, 4);
		const twos = new Set([...drawn(8, -4, 2), ...drawn(10, -4, 2), ...drawn(8, -2, 2), ...drawn(10, -2, 2)]);
		const ones = new Set();
		for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (const p of drawn(8 + a, -4 + b, 1)) ones.add(p);
		expect(four.size).toBe(16 * m);
		expect([...twos].sort()).toEqual([...four].sort());
		expect([...ones].sort()).toEqual([...four].sort());
	});
	test('nested subsets: the blades kept further out are among those kept nearer, at the same places', () => {
		const n = perCell(DEVICES.desktop.density), dev = DEVICES.desktop;
		const kept = (/** @type {number} */ d) => {
			const s = new Set();
			for (let j = 0; j < n; j++) {
				const b = bladeOf(0, 0, j, n);
				if (growAt(d, b.rank, b.end, dev) > 0) s.add(`${b.x},${b.z}`);
			}
			return s;
		};
		let before = kept(2);
		expect(before.size).toBe(n);
		for (const d of [7, 10, 15, 25, 40, 55, 66]) {
			const now = kept(d);
			for (const p of now) expect(before.has(p)).toBe(true);
			expect(now.size).toBeLessThanOrEqual(before.size);
			before = now;
		}
		expect(kept(71).size).toBe(0);
	});
	test('a blade sinks in as its rank passes what is kept, never pops: its growth runs from 1 to 0 over distance', () => {
		const dev = DEVICES.desktop, n = perCell(dev.density), b = bladeOf(2, 5, Math.floor(n * 0.3), n);
		let last = 1;
		for (let d = 0; d < 75; d += 0.05) {
			const g = growAt(d, b.rank, b.end, dev);
			expect(g).toBeLessThanOrEqual(last + 1e-12);
			// sinking over half a metre or more: never more than a tenth of the way in 5 cm
			expect(last - g).toBeLessThan(0.1);
			last = g;
		}
		expect(last).toBe(0);
	});
	test('blades a square metre near by device: 120–200 on a desktop, 60–100 on a small device', () => {
		expect(DEVICES.desktop.density).toBeGreaterThanOrEqual(120);
		expect(DEVICES.desktop.density).toBeLessThanOrEqual(200);
		expect(DEVICES.small.density).toBeGreaterThanOrEqual(60);
		expect(DEVICES.small.density).toBeLessThanOrEqual(100);
		for (const dev of Object.values(DEVICES)) {
			const n = perCell(dev.density);
			// all of them stand near: as many as the density says, every one of them grown
			let grown = 0;
			for (let j = 0; j < n; j++) {
				const b = bladeOf(1, 1, j, n);
				grown += growAt(1, b.rank, b.end, dev) >= 1 ? 1 : 0;
			}
			expect(grown / (CELL * CELL)).toBeCloseTo(dev.density, 0);
		}
	});
	test('levels by device: about 0–8 / 8–25 / 25–70 m on a desktop, 0–5 / 5–15 / 15–35 m on a small device', () => {
		expect(DEVICES.desktop.bands).toEqual([8, 25, 70]);
		expect(DEVICES.small.bands).toEqual([5, 15, 35]);
	});
	test('the field ends in a soft circle, each blade’s end jittered', () => {
		const dev = DEVICES.desktop, n = perCell(dev.density);
		const ends = Array.from({ length: n }, (_, j) => endOf(bladeOf(0, 0, j, n).end, dev));
		expect(Math.min(...ends)).toBeGreaterThanOrEqual(63);
		expect(Math.max(...ends)).toBeLessThanOrEqual(70);
		expect(Math.max(...ends) - Math.min(...ends)).toBeGreaterThan(5);
		// the circle: the same at every bearing
		expect(keep(50, dev)).toBe(keep(Math.hypot(30, 40), dev));
	});
	test('the tiles: never coarser than their nearest point allows, split only where their parent was near, none beyond the end, each cell drawn once', () => {
		const dev = DEVICES.desktop, n = perCell(dev.density);
		const tiles = tilesAround(3.3, -2.1, dev, n);
		const cells = new Map();
		for (const t of tiles) {
			const k = /** @type {number} */ (TILE_CELLS[t.level]);
			const x0 = t.tx * CELL, z0 = t.tz * CELL, w = k * CELL;
			const d = Math.hypot(Math.max(x0 - 3.3, 0, 3.3 - (x0 + w)), Math.max(z0 + 2.1, 0, -2.1 - (z0 + w)));
			expect(d).toBeLessThan(70);
			if (t.level > 0) expect(d).toBeGreaterThanOrEqual(/** @type {number} */ (dev.bands[t.level - 1]));
			// as fine as it is because its parent was nearer than this level's band
			if (t.level < 2) {
				const K = /** @type {number} */ (TILE_CELLS[t.level + 1]), px = Math.floor(t.tx / K) * K * CELL, pz = Math.floor(t.tz / K) * K * CELL, W = K * CELL;
				const pd = Math.hypot(Math.max(px - 3.3, 0, 3.3 - (px + W)), Math.max(pz + 2.1, 0, -2.1 - (pz + W)));
				expect(pd).toBeLessThan(/** @type {number} */ (dev.bands[t.level]));
			}
			for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) {
				const key = `${t.tx + a},${t.tz + b}`;
				expect(cells.has(key)).toBe(false);
				cells.set(key, t);
			}
		}
		// the cell under the eye, fully drawn at the finest level
		const under = cells.get(`${Math.floor(3.3 / CELL)},${Math.floor(-2.1 / CELL)}`);
		expect(under.level).toBe(0);
		expect(under.count).toBe(n);
		// a tile with no grass is never drawn
		expect(tilesAround(0, 0, dev, n, () => ({ ready: true, most: 0 }))).toEqual([]);
	});
});

describe('variation', () => {
	test('the colour field differs between neighbouring tiles and over a metre', () => {
		const vals = [];
		for (let i = 0; i < 40; i++) vals.push(fieldAt(i * 0.7, i * 0.3));
		expect(Math.max(...vals) - Math.min(...vals)).toBeGreaterThan(0.2);
		expect(fieldAt(1, 1)).not.toBe(fieldAt(1 + CELL, 1));
		expect(fieldAt(1, 1)).toBe(fieldAt(1, 1));
	});
	test('the ground’s brightness over 5, 20 and 80 m: within ±13 %, the same as the ground’s sum', () => {
		const v = [];
		for (let i = 0; i < 400; i++) v.push(macroAt(i * 1.7 - 300, i * 0.9 + 40));
		expect(Math.min(...v)).toBeGreaterThanOrEqual(0.87);
		expect(Math.max(...v)).toBeLessThanOrEqual(1.13);
		expect(Math.max(...v) - Math.min(...v)).toBeGreaterThan(0.08);
	});
	test('clump centres differ from cell to cell, and a blade is blended between the two nearest', () => {
		const a = clumpCentre(0, 0, 1.2), b = clumpCentre(1, 0, 1.2), c = clumpCentre(0, 1, 1.2);
		expect(a.x - 0).not.toBeCloseTo(b.x - 1.2, 3);
		expect(a.height).not.toBe(c.height);
		// at a centre, its own clump; between, a blend
		const at = clumpAt(a.x + 1e-6, a.z, 1.2);
		expect(at.out).toBeLessThan(0.01);
		const sizes = Array.from({ length: 200 }, (_, i) => clumpAt(i * 0.13, i * 0.07, 1.2).height);
		expect(new Set(sizes.map((v) => v.toFixed(3))).size).toBeGreaterThan(50);
	});
	test('per-blade hashes differ between neighbouring tiles', () => {
		const n = perCell(140);
		const here = Array.from({ length: 20 }, (_, j) => bladeOf(0, 0, j, n));
		const there = Array.from({ length: 20 }, (_, j) => bladeOf(1, 0, j, n));
		for (const k of /** @type {const} */ (['height', 'lean', 'facing', 'width', 'shade'])) expect(here.map((b) => b[k])).not.toEqual(there.map((b) => b[k]));
	});
	test('heights spread ±30–50 %', () => {
		expect(GRASS.heightSpread).toBeGreaterThanOrEqual(0.3);
		expect(GRASS.heightSpread).toBeLessThanOrEqual(0.5);
		const n = perCell(140);
		const hs = Array.from({ length: n }, (_, j) => bladeOf(5, 5, j, n).height);
		expect(Math.min(...hs)).toBeLessThan(-0.95);
		expect(Math.max(...hs)).toBeGreaterThan(0.95);
		const heights = Array.from({ length: n }, (_, j) => bladeHeight(bladeOf(5, 5, j, n), GRASS, 0));
		const mean = heights.reduce((a, h) => a + h, 0) / n;
		expect(Math.max(...heights) / mean).toBeGreaterThan(1.3);
		expect(Math.min(...heights) / mean).toBeLessThan(0.7);
	});
});

describe('the grass is never warmed by a direct compile', () => {
	// three's WebGLNodesHandler never resolves a renderer.compileAsync of a node material: a warm-up of the grass goes
	// through render/core.js's precompile or is the first frame that draws it (the Orchestrator's rule, from cb16b7a5)
	test('no compile or compileAsync in the grass or where it is laid', async () => {
		const { readFileSync } = await import('node:fs');
		const { fileURLToPath } = await import('node:url');
		const at = (/** @type {string} */ p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');
		for (const p of ['./grass.js', './grass-gpu.js', '../render/nodes/grass.js', '../render/nodes/grass-compute.js', '../sandbox-2/interior/village.ts', '../assets/plantings.js', './stream.js'])
			expect(at(p), p).not.toMatch(/\.compile(Async)?\(/);
	});
});

// Grass by the million (intent e85a5860): on WebGPU the blades are chosen one by one on the graphics card into three
// indirect draws (c1, the `indirect` cases), by the same sums the CPU's twin runs (c2, the `compute` cases).
describe('on WebGPU: chosen on the graphics card', async () => {
	const THREE = await import('three');
	const G = await import('./grass-gpu.js');
	const { grassFieldOn, computes } = await import('../render/nodes/grass-compute.js');
	const { CountingWebGPURenderer } = await import('../../../../scripts/census/counting.js');
	const canvas = () => ({ width: 1440, height: 900, style: {}, addEventListener() {}, removeEventListener() {} });
	const at = (/** @type {number} */ x, /** @type {number} */ z) => ({ grass: 0.6 + 0.4 * Math.sin(x * 0.05) * Math.cos(z * 0.04), tall: 0.3, y: 0.2 * Math.sin(x * 0.1) });
	const cameraAt = (/** @type {number} */ x, /** @type {number} */ z, /** @type {number} */ yaw, y = 1.7) => {
		const c = new THREE.PerspectiveCamera(60, 1440 / 900, 0.1, 500);
		c.position.set(x, y, z);
		c.lookAt(x + Math.sin(yaw) * 10, y - 1, z + Math.cos(yaw) * 10);
		c.updateMatrixWorld();
		return c;
	};
	/** a frame of the field on a counting renderer: the grass's own draws, and the compute passes */
	const frame = (/** @type {any} */ renderer, /** @type {any} */ field, /** @type {THREE.Scene} */ scene, /** @type {THREE.PerspectiveCamera} */ camera, t = 0) => {
		renderer.tally.reset();
		field.update(camera, t, { budget: Infinity, pushers: [[camera.position.x, camera.position.z, 0.6, 1]] });
		renderer.render(scene, camera);
		const mine = renderer.tally.draws.filter(([o]) => o.parent === field.object);
		return { draws: mine.length, calls: renderer.tally.calls, indirect: renderer.tally.indirect, computes: renderer.tally.computes };
	};

	test('indirect: on WebGPU the whole field is at most 3 indirect draws (one a level), wherever the eye is and however many tiles the fallback lays', () => {
		const renderer = new CountingWebGPURenderer({ canvas: canvas() });
		expect(computes(renderer)).toBe(true);
		const field = grassFieldOn(renderer, { at, device: 'desktop' });
		expect(field.mode).toBe('indirect');
		const scene = new THREE.Scene();
		scene.add(field.object);
		// the fallback's tiles for the same views: tens to hundreds of draws
		const fallback = new CountingWebGPURenderer({ canvas: canvas(), forceWebGL: true });
		expect(computes(fallback)).toBe(false);
		const tiles = grassFieldOn(fallback, { at, device: 'desktop' });
		expect(tiles.mode).toBeUndefined();
		const s2 = new THREE.Scene();
		s2.add(tiles.object);
		for (const [x, z, yaw, y] of [[0, 0, 0, 1.7], [130, -40, 2, 1.7], [-500, 900, 4, 1.7], [10, 10, 1, 40]]) {
			const cam = cameraAt(x, z, yaw, y);
			const f = frame(renderer, field, scene, cam);
			expect(f.draws, `${x},${z}`).toBeLessThanOrEqual(3);
			expect(f.draws).toBe(f.indirect);
			// the counts cleared, the trample map stepped, the blades chosen: three passes a frame
			expect(f.computes).toBe(3);
			expect(field.cells().cells).toBeGreaterThan(20);
			const b = frame(fallback, tiles, s2, cam);
			expect(b.draws).toBeGreaterThan(3);
		}
		for (const m of field.object.children) expect(/** @type {any} */ (m).geometry.indirect).toBeTruthy();
		field.dispose();
		tiles.dispose();
	});

	test('indirect: the three draws’ arguments: each level’s index count, its blades from 0, firstIndex, baseVertex and firstInstance 0; 20 bytes apart', () => {
		const a = G.indirectArgs([39, 15, 6]);
		expect(Array.from(a)).toEqual([39, 0, 0, 0, 0, 15, 0, 0, 0, 0, 6, 0, 0, 0, 0]);
		expect(G.OFFSETS).toEqual([0, 20, 40]);
		const field = grassFieldOn(new CountingWebGPURenderer({ canvas: canvas() }), { at });
		expect(field.object.children.map((m) => /** @type {any} */ (m).geometry.indirectOffset)).toEqual([0, 20, 40]);
		// nearest first
		expect(field.object.children.map((m) => m.renderOrder)).toEqual([0, 1, 2]);
		field.dispose();
	});

	test('denser than intent 7’s: 160–200 blades a square metre near on a desktop', () => {
		expect(G.GPU_DENSITY.desktop).toBeGreaterThanOrEqual(160);
		expect(G.GPU_DENSITY.desktop).toBeLessThanOrEqual(200);
		expect(G.GPU_DENSITY.desktop).toBeGreaterThan(DEVICES.desktop.density);
	});

	/* the CPU's twin: a frame's field, its mask filled, its view as the compute read it */
	const renderer = new CountingWebGPURenderer({ canvas: canvas() });
	const field = grassFieldOn(renderer, { at, device: 'desktop' });
	const scene = new THREE.Scene();
	scene.add(field.object);
	const cam = cameraAt(3.3, -2.1, 0.7);
	frame(renderer, field, scene, cam);
	const view = field.view();
	/** a reference written apart from `choose`, on grass.js's own sums in 64 bits */
	const reference = (/** @type {number} */ cx, /** @type {number} */ cz, /** @type {number} */ j) => {
		const b = bladeOf(cx, cz, j, view.n), dev = view.dev, [b0, b1, b2] = dev.bands;
		const m = G.maskAt(view.mask, b.x, b.z);
		const d = Math.hypot(b.x - view.eye[0], m.y - view.eye[1], b.z - view.eye[2]);
		if (growAt(d, b.rank, b.end, dev, m.grass) <= 0) return { level: -1, d };
		const hr = view.hmax / 2;
		const sphere = new THREE.Sphere(new THREE.Vector3(b.x, m.y + hr, b.z), hr + G.TOLERANCE);
		if (view.planes.some(([x, y, z, w]) => x * sphere.center.x + y * sphere.center.y + z * sphere.center.z + w < -sphere.radius)) return { level: -1, d };
		const c = clumpAt(b.x, b.z, view.clump);
		// the nearer centre: grass.js's clumpAt gives its way out (`away`) and how far (`out`)
		const own = [Math.cos(b.facing) * (1 - 0.6 * c.out), Math.sin(b.facing) * (1 - 0.6 * c.out)];
		const near = G.clumpNear(b.x, b.z, view.clump);
		const aw = [b.x - near.ax + 1e-4, b.z - near.az + 1e-4], al = Math.hypot(aw[0], aw[1]);
		const lw = [own[0] + (aw[0] / al) * 0.9 * c.out, own[1] + (aw[1] / al) * 0.9 * c.out], ll = Math.hypot(lw[0], lw[1]);
		const along = ((b.x - view.eye[0]) * lw[1] - (b.z - view.eye[2]) * lw[0]) / (d * ll);
		if (d > b0 && Math.abs(along) > G.EDGE_ON) return { level: -1, d };
		const jit = G.JITTER + (1 - G.JITTER) * draw(seedOf(cx, cz, j), 12);
		return { level: d < jit * b0 ? 0 : d < jit * b1 ? 1 : 2, d };
	};
	/** sample tiles: every candidate of a cell near, one mid, one far, and every 7th of the rest */
	const samples = () => {
		/** @type {[number, number, number][]} */
		const out = [];
		view.cells.forEach((p, k) => {
			const [cx, cz] = G.unpackCell(p);
			const step = k < 3 || k === Math.floor(view.cells.length / 2) || k === view.cells.length - 1 ? 1 : 97;
			for (let j = k % step; j < view.n; j += step) out.push([cx, cz, j]);
		});
		return out;
	};

	test('compute: the CPU’s twin (the compute’s own sums, in 32 bits) chooses as a reference on grass.js’s sums does, on sample tiles', () => {
		const all = samples();
		expect(all.length).toBeGreaterThan(20000);
		let same = 0, near = 0;
		const levels = [0, 0, 0, 0];
		for (const [cx, cz, j] of all) {
			const got = G.chooseOnCpu(cx, cz, j, view), want = reference(cx, cz, j);
			levels[got + 1]++;
			if (got === want.level) same++;
			// 32 bits against 64: only a blade on a threshold may differ
			else near++;
		}
		expect(near / all.length).toBeLessThan(0.002);
		expect(same + near).toBe(all.length);
		// some of every level, and most candidates never reach the vertex stage
		expect(levels[1]).toBeGreaterThan(0);
		expect(levels[2]).toBeGreaterThan(0);
		expect(levels[3]).toBeGreaterThan(0);
		expect(levels[0] / all.length).toBeGreaterThan(0.6);
	});

	test('compute: nested thinning: a blade kept at a distance is kept nearer, at the same place', () => {
		const dev = view.dev;
		for (let j = 0; j < view.n; j += 13) {
			const b = bladeOf(2, 3, j, view.n);
			let was = true;
			for (let d = 2; d < 70; d += 1.5) {
				const on = growAt(d, b.rank, b.end, dev, 1) > 0;
				if (on) expect(was).toBe(true);
				was = on;
			}
		}
	});

	test('compute: every level fits its room at the views it is drawn from', () => {
		const counts = [0, 0, 0];
		for (const p of view.cells) {
			const [cx, cz] = G.unpackCell(p);
			for (let j = 0; j < view.n; j++) {
				const l = G.chooseOnCpu(cx, cz, j, view);
				if (l >= 0) counts[l]++;
			}
		}
		counts.forEach((c, l) => expect(c, `level ${l}`).toBeLessThanOrEqual(/** @type {number} */ (field.capacities[l])));
		// tens of thousands of blades near a desktop's eye
		expect(counts[0] + counts[1] + counts[2]).toBeGreaterThan(20000);
	});

	test('compute: the cells it runs over are those the view sees, none beyond the field’s end, nearest first', () => {
		const ds = view.cells.map((p) => {
			const [cx, cz] = G.unpackCell(p);
			return Math.hypot(Math.max(cx * CELL - cam.position.x, 0, cam.position.x - (cx + 1) * CELL), Math.max(cz * CELL - cam.position.z, 0, cam.position.z - (cz + 1) * CELL));
		});
		expect(Math.max(...ds)).toBeLessThan(70);
		expect(ds).toEqual([...ds].sort((a, b) => a - b));
		// behind the eye is left out: fewer cells than the whole circle
		expect(view.cells.length).toBeLessThan(G.maxCells(view.dev) / 2);
		for (const p of [packCell(0, 0), packCell(-1, 5), packCell(-32768, 32767)]) expect(packCell(...G.unpackCell(p))).toBe(p);
	});

	test('compute: a trodden path springs back within about 10 s; ground the eye leaves behind is cleared', () => {
		const T = { width: 48, size: 64, recover: 10 };
		const t = new G.Trample(T);
		t.step(0, 0, 0, [[1, 1, 0.6, 1]]);
		expect(t.at(1, 1)).toBeCloseTo(1, 5);
		expect(t.at(3, 3)).toBe(0);
		let s = 0;
		while (s < 10) (t.step(0, 0, 1 / 60, []), (s += 1 / 60));
		expect(t.at(1, 1)).toBeLessThanOrEqual(G.RECOVERED + 1e-3);
		expect(t.at(1, 1)).toBeGreaterThan(0.01);
		// half of it still after about 2.3 s
		const u = new G.Trample(T);
		u.step(0, 0, 0, [[1, 1, 0.6, 1]]);
		for (let k = 0; k < 140; k++) u.step(0, 0, 1 / 60, []);
		expect(u.at(1, 1)).toBeGreaterThan(0.4);
		expect(u.at(1, 1)).toBeLessThan(0.6);
		// the eye walks off 30 m: the texels that held the old ground now hold new ground, untrodden
		u.step(30, 0, 1 / 60, []);
		expect(u.at(1, 1)).toBe(0);
		expect(u.data.some((v) => v > 0)).toBe(false);
	});
});

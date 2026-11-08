// Real grass (intent 090168c8): its blades shaped, thinned and placed the same way every time, without pops (c2), and
// never repeating (c3, the `variation` cases). The sums are grass.js's, the shader's twins.
import { describe, expect, test } from 'vitest';
import {
	CELL, DEVICES, VERTS, bladeLevel, bladeOf, clumpAt, clumpCentre, endOf, fieldAt, macroAt, growAt, keep, levelGeometry, morphAt, morphed,
	pcg, perCell, seedOf, shapeAt, tileBlade, tilesAround, bladeHeight, GRASS, TILE_CELLS
} from './grass.js';

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
		for (const p of ['./grass.js', '../render/nodes/grass.js', '../sandbox-2/interior/village.ts', '../assets/plantings.js', '../sandbox-2/interior/cover.js'])
			expect(at(p), p).not.toMatch(/\.compile(Async)?\(/);
	});
});

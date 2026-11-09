// One wind for everything that grows (intent 6fd5e63f, its check c2): the field's direction and strength per world,
// gust fronts that travel along the wind, each plant's own phase from a hash of where it stands, a bend that keeps the
// length from the foot, flutter gone beyond 15 m, and the same worldTime always giving the same offsets. And the TSL
// version builds its nodes from the same numbers.
import { describe, expect, test } from 'vitest';
import * as tsl from 'three/tsl';
import { CALM, FLUTTER_FAR, along, bendAt, flutterAt, gustAt, keepLength, leanAt, phaseOf, strengthAt, windLook, windNodes, windOf, windOfCopy, worldSeconds } from './wind.js';

const len = (v) => Math.hypot(...v);

describe('a world has its own wind', () => {
	test('its direction and strength, held to their ranges', () => {
		const w = windOf({ direction: Math.PI / 2, strength: 0.8, gust: 0.3, scale: 50, speed: 10 });
		expect(w.strength).toBe(0.8);
		const [x, z] = along(w);
		expect(x).toBeCloseTo(0, 9);
		expect(z).toBeCloseTo(1, 9);
		expect(windOf({ strength: 9, gust: -1, scale: 1, speed: 1e6 })).toMatchObject({ strength: 1.5, gust: 0, scale: 4, speed: 40 });
		expect(windOf({ direction: -Math.PI / 2 }).direction).toBeCloseTo((3 * Math.PI) / 2, 9);
		expect(windOf(undefined)).toEqual({ ...CALM });
		expect(windOf({ strength: Number.NaN }).strength).toBe(CALM.strength);
	});

	test('two worlds blow apart: another direction, another lean', () => {
		const a = windOf({ direction: 0, strength: 0.6 });
		const b = windOf({ direction: Math.PI / 2, strength: 0.6 });
		const copy = { x: 3, z: 4, phase: 1, height: 5 };
		const ba = bendAt(a, copy, 5, 1, 2), bb = bendAt(b, copy, 5, 1, 2);
		expect(Math.abs(ba[2])).toBeLessThan(1e-9);
		expect(Math.abs(bb[0])).toBeLessThan(1e-9);
		expect(ba[0]).toBeGreaterThan(0);
		expect(bb[2]).toBeGreaterThan(0);
	});

	test('a still world bends nothing', () => {
		const w = windOf({ strength: 0 });
		expect(bendAt(w, { x: 0, z: 0, phase: 0, height: 4 }, 4, 1, 3)).toEqual([0, -0, 0]);
		expect(strengthAt(w, 10, 10, 10)).toBe(0);
	});
});

describe('gusts travel', () => {
	const w = windOf({ direction: 0.7, strength: 0.6, gust: 0.8, scale: 30, speed: 6 });
	const [dx, dz] = along(w);

	test('a front at a place at t is speed × dt further along the wind at t + dt', () => {
		for (const [x, z, t, dt] of [[0, 0, 0, 1], [12, -40, 3.3, 2.5], [-200, 90, 17, 0.4]]) {
			const here = gustAt(w, x, z, t);
			const there = gustAt(w, x + dx * w.speed * dt, z + dz * w.speed * dt, t + dt);
			expect(there).toBeCloseTo(here, 9);
		}
	});

	test('it does not just stand there: the gust at one place changes as fronts pass', () => {
		const seen = new Set();
		for (let t = 0; t < 10; t += 0.5) seen.add(Math.round(gustAt(w, 5, 5, t) * 10));
		expect(seen.size).toBeGreaterThan(4);
	});

	test('gusts lie between 0 and 1, and raise and lower the strength around the prevailing one', () => {
		let lo = Infinity, hi = -Infinity;
		for (let x = -100; x <= 100; x += 7) for (let t = 0; t < 20; t += 1.3) {
			const g = gustAt(w, x, x * 0.3, t);
			expect(g).toBeGreaterThanOrEqual(0);
			expect(g).toBeLessThanOrEqual(1);
			const s = strengthAt(w, x, x * 0.3, t);
			lo = Math.min(lo, s);
			hi = Math.max(hi, s);
		}
		expect(lo).toBeLessThan(w.strength);
		expect(hi).toBeGreaterThan(w.strength);
		expect(hi).toBeLessThanOrEqual(w.strength * (1 + w.gust) + 1e-9);
	});
});

describe('each plant its own phase', () => {
	test('a hash of where it stands: the same place the same phase, neighbours apart, within 0…2π', () => {
		expect(phaseOf(12.5, -3)).toBe(phaseOf(12.5, -3));
		const ps = [];
		for (let i = 0; i < 200; i++) ps.push(phaseOf(i * 1.7, i * 0.9));
		for (const p of ps) {
			expect(p).toBeGreaterThanOrEqual(0);
			expect(p).toBeLessThan(Math.PI * 2);
		}
		expect(new Set(ps.map((p) => Math.floor(p * 4))).size).toBeGreaterThan(20);
		// spread over the circle, not bunched
		const mean = ps.reduce((a, b) => a + b, 0) / ps.length;
		expect(Math.abs(mean - Math.PI)).toBeLessThan(0.5);
	});

	test('two plants side by side sway apart', () => {
		const w = windOf({ gust: 0 });
		const of = ([x, , z, height]) => ({ x, z, phase: phaseOf(x, z), height });
		const ca = of(windOfCopy(1, 0, 1, 3)), cb = of(windOfCopy(1.5, 0, 1, 3));
		expect(leanAt(w, ca, 1, 1)).not.toBeCloseTo(leanAt(w, cb, 1, 1), 4);
	});
});

describe('the bend', () => {
	const w = windOf({ direction: 0.2, strength: 1.2, gust: 0.5 });
	const copy = { x: 4, z: 9, phase: 2.1, height: 6 };

	test("keeps each point's distance from the foot", () => {
		for (const t of [0, 0.7, 3.1, 11]) for (const h of [0.5, 2, 4, 6]) for (const k of [0.6, 1, 6]) {
			const [dx, dy, dz] = bendAt(w, copy, h, k, t);
			expect(len([dx, h + dy, dz])).toBeCloseTo(h, 9);
		}
		expect(keepLength(2, 0)).toBe(0);
		expect(keepLength(5, 3)).toBeCloseTo(1, 9);
	});

	test('grows with the height on the plant: the foot stays, the top leans most', () => {
		const at = (h) => len(bendAt(w, copy, h, 1, 1.3));
		expect(at(0)).toBe(0);
		expect(at(1)).toBeLessThan(at(3));
		expect(at(3)).toBeLessThan(at(6));
	});

	test("a stiffer kind leans less; a material's stiffness damps only its own flutter", () => {
		expect(len(bendAt(w, copy, 6, 6, 2))).toBeLessThan(len(bendAt(w, copy, 6, 0.6, 2)) / 5);
		const leaf = windLook({ kind: 'leaf', stiffness: 1, flutter: 0.6 }), twig = windLook({ kind: 'stem', stiffness: 4, flutter: 0.6 });
		expect(leaf.flutter).toBeCloseTo(0.6, 9);
		expect(twig.flutter).toBeCloseTo(0.15, 9);
		expect(windLook({ kind: 'stone', stiffness: 10, flutter: 0 })).toBeNull();
	});

	test('leans along the wind, never more than 15 % of the height at strength 1', () => {
		const calm = windOf({ direction: 1.1, strength: 1, gust: 0 });
		const [ax, az] = along(calm);
		for (let t = 0; t < 10; t += 0.37) {
			const [dx, , dz] = bendAt(calm, copy, copy.height, 1, t);
			expect(dx * ax + dz * az).toBeGreaterThan(0);
			expect(Math.abs(dx * az - dz * ax)).toBeLessThan(1e-9);
			expect(Math.hypot(dx, dz)).toBeLessThanOrEqual(0.15 * copy.height + 1e-9);
		}
	});
});

describe('flutter', () => {
	const w = windOf({ strength: 0.8 });
	const copy = { x: 0, z: 0, phase: 0.4 };

	test('shakes the tips near the eye and is gone beyond 15 m', () => {
		let near = 0;
		for (let t = 0; t < 5; t += 0.1) near = Math.max(near, Math.abs(flutterAt(w, copy, 1, 0.6, 0.3, t, 4)));
		expect(near).toBeGreaterThan(0);
		for (let t = 0; t < 5; t += 0.1) expect(flutterAt(w, copy, 1, 0.6, 0.3, t, FLUTTER_FAR + 0.01)).toBe(0);
	});

	test('none on a fruit, none at the foot', () => {
		expect(flutterAt(w, copy, 1, 0, 0.3, 1, 2)).toBe(0);
		expect(flutterAt(w, copy, 0, 0.6, 0.3, 1, 2)).toBe(-0 || 0);
	});
});

describe('one clock', () => {
	test('the same worldTime gives the same offsets, whatever came before', () => {
		const w = windOf({ direction: 2, strength: 0.9, gust: 0.7 });
		const copy = { x: -31, z: 12, phase: phaseOf(-31, 12), height: 8 };
		const frame = (t) => [...bendAt(w, copy, 5, 1, t), flutterAt(w, copy, 0.8, 0.6, 1.2, t, 6)];
		const first = frame(7.25);
		for (let t = 0; t < 30; t += 0.9) frame(t);
		expect(frame(7.25)).toEqual(first);
	});

	test("the film's time wins over the page's clock", () => {
		const g = /** @type {any} */ (globalThis);
		const was = g.window;
		g.window = { __worldTime: 42.5 };
		try {
			expect(worldSeconds(999999)).toBe(42.5);
			g.window = {};
			expect(worldSeconds(1500)).toBe(1.5);
		} finally {
			g.window = was;
		}
	});
});

describe('in TSL', () => {
	test('one set of uniforms a world, set and ticked, and a position node for a material', () => {
		const n = windNodes(tsl, { direction: 1, strength: 0.7 });
		expect(n.uniforms.strength.value).toBe(0.7);
		n.set({ direction: 0.5, strength: 0.2, gust: 0.1 });
		expect(n.uniforms.direction.value).toBe(0.5);
		expect(n.uniforms.strength.value).toBe(0.2);
		n.tick(12);
		expect(n.uniforms.time.value).toBe(12);
		const node = n.positionOf({ stiffness: 1, flutter: 0.6 });
		expect(node?.isNode).toBe(true);
	});
});

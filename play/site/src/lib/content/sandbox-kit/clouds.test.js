// The clouds' noise reads small numbers at every hour (intent c929d52c, c2). On main the hour reached the shader as
// a drift of hour · 60 000 cells: at noon a GPU's float (24 bits) held a sixteenth of a cell in the first octave and
// half a cell in the fourth, and the clouds were flat blocks with straight edges.
import { describe, expect, test } from 'vitest';
import { CLOUDS, SLIDES, coordsOf, fadeOf, windOf } from './clouds.js';

/** unit directions over the sky: from the height the layer has faded in at up to the zenith, all round */
const directions = () => {
	const out = [];
	for (let e = Math.asin(CLOUDS.horizon); e <= Math.PI / 2; e += 0.02) for (let a = 0; a < 2 * Math.PI; a += 0.19) out.push([Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)]);
	return out;
};
/** a float's step at x: the smallest change a GPU can tell there */
const step = (/** @type {number} */ x) => 2 ** (Math.floor(Math.log2(Math.max(Math.abs(x), 1e-30))) - 23);
/** main's sums, as its shader made them: the four octaves' coordinates along d at an hour */
const mainCoords = (/** @type {number[]} */ d, /** @type {number} */ hour) => {
	const f = Math.fround, drift = f(hour * 60), flat = f(f(d[1]) * f(0.55));
	let q = [d[0], d[2]].map((v) => f(f(f(f(f(v) / flat) * f(0.0002)) + drift) * 1000));
	return [0, 1, 2, 3].map(() => {
		const at = q;
		q = q.map((v) => f(f(v * 2) + f(drift * 300)));
		return at;
	});
};

describe("the clouds' noise reads small numbers", () => {
	test('at every hour, in every octave, over the whole sky: under 4,096 cells, a float there finer than 1/64 of a cell', () => {
		let most = 0;
		for (let hour = 0; hour <= 24; hour += 0.07)
			for (const d of directions())
				for (const [x, z] of coordsOf(d, hour)) most = Math.max(most, Math.abs(x), Math.abs(z));
		expect(most).toBeLessThan(4096);
		expect(step(most)).toBeLessThan(1 / 64);
		expect(coordsOf([0, 1, 0], 12).length).toBe(SLIDES.length);
	});
	test('neighbouring pixels of a 1440-wide view read different places, each a small step on (no flat block)', () => {
		// one pixel of a 1440-wide view of 70° is 0.00085 rad; 200 of them side by side, 30° up
		for (const hour of [0.5, 6, 12, 12.5, 18, 23.9]) {
			const seen = new Set();
			let last = NaN, jump = 0;
			for (let i = 0; i < 200; i++) {
				const a = 1 + i * 0.00085, d = [Math.cos(Math.PI / 6) * Math.cos(a), 0.5, Math.cos(Math.PI / 6) * Math.sin(a)];
				const x = coordsOf(d, hour)[0][0];
				seen.add(x);
				if (i) jump = Math.max(jump, Math.abs(x - last));
				last = x;
			}
			expect(seen.size).toBeGreaterThan(190);
			expect(jump).toBeLessThan(1 / 64);
		}
	});
	test("main's sums fail the same: at noon 200 pixels read one place, a float there coarser than 1/64 of a cell", () => {
		const seen = new Set();
		for (let i = 0; i < 200; i++) {
			const a = 1 + i * 0.00085;
			seen.add(mainCoords([Math.cos(Math.PI / 6) * Math.cos(a), 0.5, Math.cos(Math.PI / 6) * Math.sin(a)], 12)[0][0]);
		}
		expect(seen.size).toBeLessThan(5);
		expect(step(mainCoords([0.5, 0.5, 0.7], 12)[3][0])).toBeGreaterThan(1 / 64);
	});
});

describe('the clouds drift with the hour', () => {
	test('the wind moves on with the hour, and midnight joins: a whole number of periods a day', () => {
		for (let hour = 0; hour < 23.9; hour += 0.1) expect(windOf(hour + 0.1)).toBeGreaterThan(windOf(hour));
		expect(windOf(24)).toBe(0);
		expect(windOf(-1)).toBeCloseTo(23 / 24, 12);
		for (const s of SLIDES) for (const n of s) expect(Number.isInteger(n)).toBe(true);
		// a minute on, the first octave has moved, by less than a hundredth of a cell
		const a = coordsOf([0.3, 0.8, 0.5], 12)[0][0], b = coordsOf([0.3, 0.8, 0.5], 12 + 1 / 60)[0][0];
		expect(b).toBeGreaterThan(a);
		expect(b - a).toBeLessThan(0.02);
	});
	test('the layer is 0 at and below the horizon, whole above its fade', () => {
		expect(fadeOf(0)).toBe(0);
		expect(fadeOf(-0.3)).toBe(0);
		expect(fadeOf(CLOUDS.horizon)).toBe(1);
		expect(fadeOf(CLOUDS.horizon / 2)).toBeGreaterThan(0);
	});
});

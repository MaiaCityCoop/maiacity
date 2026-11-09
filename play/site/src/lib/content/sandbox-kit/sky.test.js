// The one sky's light (intent 2214e661, c3): the sun's colour and strength follow its height like the real sun's
// (T = √sin(elevation)), it outshines the sky's own light about five to one at noon, the sky's light is drawn again
// only once the sun has moved half a degree, and the same pinned hour gives the same light every time.
import { describe, expect, test, vi } from 'vitest';
import * as THREE from 'three';

vi.stubGlobal('window', {});
const { SUN, exposureFor, lightAt, lightOf, rebake, sunFrom, sunLight } = await import('./sky.js');
const { horizonRing } = await import('./universe.js');

const deg = THREE.MathUtils.degToRad;
const lum = (/** @type {THREE.Color} */ c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
/** how warm a colour is: red over blue */
const warmth = (/** @type {THREE.Color} */ c) => c.r / c.b;

describe('the sun by its height', () => {
	test('warm and weak at 2°, white and strong at 60°', () => {
		const low = sunLight(deg(2)), high = sunLight(deg(60));
		expect(warmth(low.color)).toBeGreaterThan(2.5);
		expect(warmth(high.color)).toBeLessThan(1.6);
		expect(high.color.g / high.color.r).toBeGreaterThan(0.8);
		expect(high.intensity).toBeGreaterThan(4 * low.intensity);
	});
	test('its strength is SUN · √sin(elevation)', () => {
		for (const d of [1, 2, 8, 15, 30, 45, 60, 68, 90]) {
			const s = sunLight(deg(d));
			expect(s.T).toBeCloseTo(Math.sqrt(Math.sin(deg(d))), 10);
			expect(s.intensity).toBeCloseTo(SUN * s.T, 8);
		}
		expect(sunLight(deg(-3)).intensity).toBe(0);
	});
	test('near white by 25°: at 30° daylight that casts no colour (0b4c007b: no sepia noon), blue nearly as strong as red', () => {
		const c = sunLight(deg(30)).color.clone().convertLinearToSRGB();
		expect(c.b / c.r).toBeGreaterThan(0.85);
		expect(c.g / c.r).toBeGreaterThan(0.88);
		const at25 = sunLight(deg(25)).color.clone().convertLinearToSRGB();
		expect(at25.b / at25.r).toBeGreaterThan(0.75);
		// and still warm low down: golden at 8°
		const at8 = sunLight(deg(8)).color.clone().convertLinearToSRGB();
		expect(at8.b / at8.r).toBeLessThan(0.7);
	});
	test('its colour from 0xff7a2f at the horizon to a neutral, faintly cool white overhead (0xf4f7ff)', () => {
		expect(sunLight(0).color.getHex()).toBe(new THREE.Color(0xff7a2f).getHex());
		expect(sunLight(deg(90)).color.getHex()).toBe(new THREE.Color(0xf4f7ff).getHex());
	});
});

describe('the sun against the sky', () => {
	test('about five to one at noon', () => {
		const l = lightAt(12.5);
		expect(l.e).toBeGreaterThan(0.9);
		expect(l.sun.intensity / lum(l.sky)).toBeGreaterThan(4.5);
		expect(l.sun.intensity / lum(l.sky)).toBeLessThan(5.5);
	});
	test('the sky lights the shadows cool, the sun warm', () => {
		const l = lightAt(12.5);
		expect(warmth(l.sky)).toBeLessThan(warmth(l.sun.color));
		expect(l.sky.b).toBeGreaterThan(l.sky.r);
	});
	test('the lens follows the light: open at dusk, more at night, a grey card grey at noon', () => {
		const noon = lightAt(12.5), dusk = lightAt(19.7), night = lightAt(0);
		expect(dusk.exposure).toBeGreaterThan(noon.exposure * 3);
		expect(night.exposure).toBeGreaterThan(dusk.exposure);
		expect(exposureFor(1)).toBeGreaterThan(exposureFor(10));
		const card = (0.18 * (noon.sun.intensity * noon.from.y + lum(noon.sky))) / Math.PI;
		expect(card * noon.exposure).toBeCloseTo(0.18 * 1.2, 1);
	});
	test('at night the moon is the key, opposite the sun and high', () => {
		const l = lightAt(0);
		expect(l.night).toBe(1);
		expect(l.from.y).toBeGreaterThan(0.3);
		expect(l.sun.intensity).toBeGreaterThan(0);
		expect(l.sun.intensity).toBeLessThan(sunLight(deg(2)).intensity);
	});
});

describe('the sky drawn again', () => {
	test('only after a move of half a degree or more', () => {
		const a = sunFrom(30, 200);
		expect(rebake(null, a)).toBe(true);
		expect(rebake(a, sunFrom(30.4, 200))).toBe(false);
		expect(rebake(a, sunFrom(30, 200.3))).toBe(false);
		expect(rebake(a, sunFrom(30.51, 200))).toBe(true);
		expect(rebake(a, sunFrom(31, 200))).toBe(true);
	});
	test('on film at any move, and never for none', () => {
		const a = sunFrom(30, 200);
		expect(rebake(a, sunFrom(30.01, 200), true)).toBe(true);
		expect(rebake(a, a.clone(), true)).toBe(false);
	});
	test('the clock running: once each half degree the sun has moved, never every frame', () => {
		const start = lightAt(9).dir;
		let was = start, n = 0, now = start;
		for (let s = 1; s <= 600; s++) {
			now = lightAt(9 + s / 360).dir; // ten seconds of the clock at an hour every six minutes, a frame a step
			if (rebake(was, now)) (was = now), n++;
		}
		const moved = THREE.MathUtils.radToDeg(start.angleTo(now));
		expect(n).toBeGreaterThanOrEqual(Math.floor(moved / 0.5) - 1);
		expect(n).toBeLessThanOrEqual(Math.ceil(moved / 0.5));
		expect(n).toBeLessThan(600 / 10);
	});
});

describe('the same picture for the same pinned hour', () => {
	test('the light, the lens and the horizon', () => {
		for (const h of [5.2, 9, 12.5, 18.4, 19.9, 23]) {
			const a = lightAt(h), b = lightAt(h);
			expect(JSON.stringify(a)).toBe(JSON.stringify(b));
			expect(JSON.stringify(horizonRing(a.dir))).toBe(JSON.stringify(horizonRing(b.dir)));
		}
		expect(JSON.stringify(lightOf(sunFrom(14, 218)))).toBe(JSON.stringify(lightOf(sunFrom(14, 218))));
	});
	test('the haze warmer toward a low sun', () => {
		const sun = sunFrom(4, 90);
		const ring = horizonRing(sun);
		// bearing 90° is +x: ring index 0; away from it, index 8
		expect(warmth(ring[0])).toBeGreaterThan(warmth(ring[8]));
	});
});

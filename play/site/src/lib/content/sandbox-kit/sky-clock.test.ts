// A sky whose hour is held is the same sky at any wall time (intent 602a8849's c7: a live shot's sky read the in-game
// clock, which follows the wall clock, so the same t drawn minutes apart differed). On the fake context
// (../render/nodes/fakegl.js), as the render kit's tests draw.
import { afterEach, describe, expect, test, vi } from 'vitest';
import * as THREE from 'three';
import { fakeGL } from '../render/nodes/fakegl.js';
import { install } from '../render/nodes/index.js';

(globalThis as any).self ??= globalThis;
(globalThis as any).ImageBitmap ??= class {};
(globalThis as any).window ??= globalThis;
const { createSky } = await import('./sky.js');

function sky(o: Record<string, unknown>) {
	const { gl } = fakeGL();
	const r = new THREE.WebGLRenderer({ canvas: gl.canvas, context: gl } as any);
	install(r);
	return createSky(r, new THREE.Scene(), { sun: { elevation: 14, azimuth: 218 }, light: false, fog: null, clouds: 0.25, ...o });
}
/** the sky at a wall time: its hour, its light and its lens */
function at(when: string, o: Record<string, unknown>) {
	vi.setSystemTime(new Date(when));
	const s = sky(o);
	return JSON.stringify({ hour: s.hour(), light: s.light(), exposure: s.exposure() });
}

afterEach(() => vi.useRealTimers());

describe('a sky held to an hour', () => {
	test('is the same sky ten minutes later', () => {
		vi.useFakeTimers();
		const held = { clock: () => 15 };
		expect(at('2026-11-09T10:00:00Z', held)).toBe(at('2026-11-09T10:10:00Z', held));
	});
	test('one on the in-game clock is not (what the hold is for)', () => {
		vi.useFakeTimers();
		expect(at('2026-11-09T10:00:00Z', {})).not.toBe(at('2026-11-09T10:10:00Z', {}));
	});
});

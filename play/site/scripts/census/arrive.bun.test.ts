/*
 * A copy put down once the world has been drawn fades in, and one put down before stands whole (intent 405f7a85): the
 * universal renderer (play/site/src/lib/content/assets/render/index.js, its `arrive`) built in the census's headless
 * world, one of Sandbox 1's kinds, the clock the test's own.
 *
 *   cd play/site && bun test scripts/census/arrive.bun.test.ts
 */
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { join } from 'node:path';
import { setup, frame, lib } from './setup';
import { CountingRenderer } from './counting.js';

const HERE = import.meta.dir;
const g = globalThis as any;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ARRIVE = 900;

let THREE: any, assets: any, kind: any, camera: any;
/** the page's clock as the renderer reads it, moved by the test alone once the kind is built */
const real = performance.now.bind(performance);
let clock: number | null = null;

/** how much of the kind's first drawing's copy `slot` shows: 0 whole (the dither's own), else its share */
const fadeOf = (slot: number) => kind.levels[kind.base].meshes[0].mesh.geometry.attributes.aFade.array[slot];
const at = (x: number, z: number) => new THREE.Matrix4().makeTranslation(x, 0, z);

beforeAll(async () => {
	setup({ inputs: join(HERE, 'inputs') });
	THREE = await import('three');
	const { catalogReady } = await import(lib('content/assets/catalog.js'));
	const { SANDBOX } = await import(lib('kernel/sandboxes.js'));
	await catalogReady(SANDBOX.one);
	const { INDEX } = await import(lib('content/assets/catalog.js'));
	const { createAssets } = await import(lib('content/assets/render/index.js'));
	camera = new THREE.PerspectiveCamera(68, 1440 / 900, 0.1, 2000);
	camera.position.set(0, 2, 12);
	camera.lookAt(0, 1, 0);
	camera.updateMatrixWorld();
	assets = createAssets({ renderer: new CountingRenderer({ canvas: g.document.createElement('canvas') }), camera, arrive: ARRIVE });
	// a kind of Sandbox 1's that builds here, drawn as its one built shape (no picture, no lower levels in the way)
	for (const ref of Object.keys(INDEX.recipes)) {
		const k = assets.use(ref, { picture: false });
		let settled = false;
		k.ready.then(() => (settled = true), () => (settled = true));
		for (const end = real() + 60_000; !settled && real() < end; await sleep(16)) frame();
		if (k.ok) {
			kind = k;
			break;
		}
	}
	if (!kind) throw new Error('no kind of Sandbox 1 built headless');
	for (const end = real() + 120_000; assets.stats().building && real() < end; await sleep(16)) frame();
	performance.now = () => clock ?? real();
}, 300_000);

afterAll(() => {
	performance.now = real;
});

test('a copy put down before the first frame stands whole; one put down after it fades in over `arrive`, then stands whole', () => {
	clock = 1_000;
	const first = assets.take(kind, at(0, 0));
	assets.update();
	expect(kind.was[first.i]).toBe(kind.base);
	expect(fadeOf(0)).toBe(0);

	// the world drawn: a kind built behind it puts its plants down now
	clock = 5_000;
	const late = assets.take(kind, at(2, 0));
	assets.update();
	expect(fadeOf(0)).toBe(0);
	expect(fadeOf(1)).toBeGreaterThan(0);
	expect(fadeOf(1)).toBeLessThan(0.1);

	// a third of the way, two thirds: more of it each frame, with nothing else moved (the renderer draws again by itself)
	clock = 5_000 + ARRIVE / 3;
	expect(assets.update()).not.toBe(false);
	expect(fadeOf(1)).toBeCloseTo(1 / 3, 2);
	clock = 5_000 + (ARRIVE * 2) / 3;
	assets.update();
	expect(fadeOf(1)).toBeCloseTo(2 / 3, 2);

	// arrived: whole, and the renderer rests again
	clock = 5_000 + ARRIVE;
	assets.update();
	expect(fadeOf(1)).toBe(0);
	expect(kind.born[late.i]).toBe(0);
	expect(assets.update()).toBe(false);

	// a put-away copy taken again arrives anew
	assets.give(late);
	assets.update();
	clock = 9_000;
	expect(assets.take(kind, at(3, 0))).toBe(late);
	assets.update();
	expect(fadeOf(1)).toBeGreaterThan(0);
	clock = 9_000 + ARRIVE;
	assets.update();
	expect(fadeOf(1)).toBe(0);
	assets.give(first), assets.give(late);
});

/*
 * A copy put away is never drawn, and is drawn again once taken (intent 0229ed3e): the universal renderer
 * (play/site/src/lib/content/assets/render/index.js) built in the census's headless world, one of Sandbox 1's kinds
 * drawn by the counting renderer, its copy given and taken again.
 *
 *   cd play/site && bun test scripts/census/away.test.ts
 */
import { beforeAll, expect, test } from 'bun:test';
import { join } from 'node:path';
import { setup, frame, lib } from './setup';
import { CountingRenderer } from './counting.js';

const HERE = import.meta.dir;
const g = globalThis as any;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let THREE: any, assets: any, kind: any, scene: any, camera: any, r: any;

/** frames turned (the renderer's work between them) until `done`, at most `ms` */
async function turn(done: () => boolean, ms = 120_000) {
	const end = performance.now() + ms;
	while (!done() && performance.now() < end) {
		frame();
		await sleep(16);
	}
	return done();
}

/** one frame of the asset renderer: what it draws, counted */
function drawn() {
	assets.update();
	r.tally.reset();
	r.render(scene, camera);
	return { tris: r.tally.tris, copies: assets.stats().copies };
}

/** where a kind's copy at x, z stands, by a whole matrix (as the worlds give it) */
const at = (x: number, z: number) => new THREE.Matrix4().makeTranslation(x, 0, z);

beforeAll(async () => {
	setup({ inputs: join(HERE, 'inputs') });
	THREE = await import('three');
	const { catalogReady } = await import(lib('recipes'));
	const { SANDBOX } = await import(lib('content/assets/sandboxes.js'));
	await catalogReady(SANDBOX.one);
	const { INDEX } = await import(lib('content/assets/catalog.js'));
	const { createAssets } = await import(lib('content/assets/render/index.js'));
	const canvas = g.document.createElement('canvas');
	r = new CountingRenderer({ canvas });
	camera = new THREE.PerspectiveCamera(68, 1440 / 900, 0.1, 2000);
	camera.position.set(0, 2, 12);
	camera.lookAt(0, 1, 0);
	camera.updateMatrixWorld();
	scene = new THREE.Scene();
	assets = createAssets({ renderer: r, camera, boxes: 2 });
	scene.add(assets.group);
	// a kind of Sandbox 1's that builds here: the first of its catalog's recipes whose coarsest shape is made
	for (const ref of Object.keys(INDEX.recipes)) {
		const k = assets.use(ref, { picture: false });
		let settled = false;
		k.ready.then(() => (settled = true), () => (settled = true));
		await turn(() => settled, 60_000);
		if (k.ok) {
			kind = k;
			break;
		}
	}
	if (!kind) throw new Error('no kind of Sandbox 1 built headless');
}, 300_000);

test('a copy put away is never drawn, and the same copy is drawn again once taken', async () => {
	expect(drawn().tris).toBe(0);
	const copy = assets.take(kind, at(0, 0));
	await turn(() => assets.stats().building === 0);
	const shown = drawn();
	expect(shown.copies).toBe(1);
	expect(shown.tris).toBeGreaterThan(0);

	assets.give(copy);
	// nothing of it drawn, at the origin or anywhere, and not counted among the renderer's copies
	const away = drawn();
	expect(away.tris).toBe(0);
	expect(away.copies).toBe(0);
	expect(kind.alive[copy.i]).toBe(0);
	expect(kind.was[copy.i]).toBe(-1);
	// the camera looking at the origin, where a put-away copy once stood drawn at its full size
	camera.position.set(0, 2, 8);
	camera.lookAt(0, 0, 0);
	camera.updateMatrixWorld();
	expect(drawn().tris).toBe(0);

	// taken again, at a place in view: the same copy, not a new one, drawn there
	const again = assets.take(kind, at(1, -1));
	expect(again).toBe(copy);
	expect(kind.n).toBe(1);
	await turn(() => assets.stats().building === 0);
	const back = drawn();
	expect(back.copies).toBe(1);
	expect(back.tris).toBeGreaterThan(0);

	// put away where it stands (a hidden node's copy): not drawn, nor pooled; moved somewhere, drawn again
	assets.move(copy, null);
	expect(drawn().tris).toBe(0);
	expect(kind.free.length).toBe(0);
	assets.move(copy, at(0, 0));
	expect(drawn().tris).toBeGreaterThan(0);
	assets.give(copy);
}, 120_000);

test('a matrix of scale 0 makes a copy of size 0, never drawn (three\'s decompose would give it 1)', () => {
	expect(drawn().tris).toBe(0);
	const copy = assets.take(kind, new THREE.Matrix4().makeScale(0, 0, 0));
	expect(kind.S[copy.i]).toBe(0);
	expect(drawn().tris).toBe(0);
	assets.give(copy);
});

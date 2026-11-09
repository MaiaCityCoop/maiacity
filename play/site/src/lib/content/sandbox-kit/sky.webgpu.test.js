// The one sky on WebGPU (intent c1bee1f8): its environment is three/webgpu's cube, filtered by the node system itself
// (no PMREMGenerator), and nothing of it is drawn before the renderer is initialised: a sky made at once with its page
// (every world makes its sky beside its renderer) bakes once the renderer may draw. On WebGPURenderer's WebGL 2 backend
// over a context that only answers (../render/nodes/fakegl.js).
import { describe, expect, test } from 'vitest';

const g = /** @type {any} */ (globalThis);
g.self ??= g;
g.window ??= g;
g.requestAnimationFrame ??= () => 0;
g.cancelAnimationFrame ??= () => {};
g.ImageBitmap ??= class {};
const THREE = await import('three');
const { fakeGL } = await import('../render/nodes/fakegl.js');
const { createRenderer, ready } = await import('../render/core.js');
const { createSky } = await import('./sky.js');

const make = () => {
	const { gl } = fakeGL();
	const c = /** @type {any} */ (gl.canvas);
	c.getContext = (/** @type {string} */ kind) => (kind === 'webgl2' ? gl : null);
	const r = /** @type {any} */ (createRenderer({ backend: 'webgl2', pixelRatio: 1, canvas: c, toneMapping: 'agx', shadows: 'pcf' }));
	r.setSize(32, 32, false);
	return r;
};

describe('the one sky on WebGPU', () => {
	test('made before the renderer may draw, it bakes once it may: its environment the cube itself', async () => {
		const r = make();
		const scene = new THREE.Scene();
		expect(r.initialized).toBe(false);
		const sky = createSky(r, scene, { shadowReach: 300, fog: { far: 1400 } });
		expect(scene.environment).toBeNull();
		await ready(r);
		await Promise.resolve();
		expect(scene.environment?.isTexture).toBe(true);
		expect(/** @type {any} */ (scene.environment).isRenderTargetTexture).toBe(true);
		// a new hour bakes into the same cube, at once
		const env = scene.environment;
		sky.set(6);
		sky.set(17);
		expect(scene.environment).toBe(env);
		sky.dispose();
		expect(scene.environment).toBeNull();
	});

	test('made once it may draw, it bakes at once; left before it may, it never does', async () => {
		const r = make();
		await ready(r);
		const scene = new THREE.Scene();
		createSky(r, scene, {}).dispose();
		const r2 = make();
		const scene2 = new THREE.Scene();
		createSky(r2, scene2, {}).dispose();
		await ready(r2);
		await Promise.resolve();
		expect(scene2.environment).toBeNull();
		const scene3 = new THREE.Scene();
		createSky(r, scene3, {});
		expect(scene3.environment?.isTexture).toBe(true);
	});
});

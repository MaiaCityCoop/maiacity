// The cut on WebGPU (intent c1bee1f8): WebGPU takes no clipping planes on a material and draws shadows with a material
// of its own, so the kit's cut and fade reach the shadow pass as its mask, the core's `clipping` switches the kit's cut
// on as on WebGL, and the stage stands its asset in a ClippingGroup cut by the section planes. On WebGPURenderer's
// WebGL 2 backend over a context that only answers (./fakegl.js).
import { describe, expect, test } from 'vitest';

const g = /** @type {any} */ (globalThis);
g.self ??= g;
g.requestAnimationFrame ??= () => 0;
g.cancelAnimationFrame ??= () => {};
g.ImageBitmap ??= class {};
const THREE = await import('three');
const { ClippingGroup } = await import('three/webgpu');
const { fakeGL } = await import('./fakegl.js');
const { makeRenderer } = await import('../core.js');
const { aFade, cutBy, cutOf, nodeOf } = await import('./index.js');

async function renderer(o = {}) {
	const { gl, shaders } = fakeGL();
	const c = /** @type {any} */ (gl.canvas);
	c.getContext = (/** @type {string} */ kind) => (kind === 'webgl2' ? gl : null);
	const r = /** @type {any} */ (await makeRenderer({ backend: 'webgl2', pixelRatio: 1, canvas: c, shadows: 'pcf', ...o }));
	r.setSize(32, 32, false);
	return { r, shaders };
}

describe('the cut on WebGPU', () => {
	test('the core’s clipping switch is the one the kit’s cut reads', async () => {
		expect((await renderer({ clipping: true })).r.localClippingEnabled).toBe(true);
		expect((await renderer()).r.localClippingEnabled).toBe(false);
	});

	test('a kit material’s cut and fade are its shadow mask; without them it has none', () => {
		const plain = /** @type {any} */ (nodeOf(new THREE.MeshStandardMaterial()));
		expect(plain.maskShadowNode).toBeNull();
		const cut = /** @type {any} */ (cutBy(nodeOf(new THREE.MeshStandardMaterial()), cutOf()));
		const m1 = cut.maskShadowNode;
		expect(m1?.isNode).toBe(true);
		expect(cut.maskShadowNode).toBe(m1); // made once
		cut.fade = aFade;
		expect(cut.maskShadowNode).not.toBe(m1);
		cut.maskShadowNode = null; // what three's constructor sets is not kept
		expect(cut.maskShadowNode?.isNode).toBe(true);
	});

	test('the shadow pass of a cut caster discards what the cut takes away', async () => {
		const { r, shaders } = await renderer({ clipping: true });
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
		camera.position.set(0, 2, 5);
		camera.lookAt(0, 0, 0);
		const sun = new THREE.DirectionalLight('#fff', 2);
		sun.castShadow = true;
		sun.position.set(2, 5, 1);
		const caster = new THREE.Mesh(new THREE.BoxGeometry(), cutBy(nodeOf(new THREE.MeshStandardMaterial()), cutOf()));
		caster.castShadow = true;
		const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), nodeOf(new THREE.MeshStandardMaterial()));
		floor.position.y = -0.5;
		floor.receiveShadow = true;
		scene.add(sun, caster, floor);
		r.render(scene, camera);
		const frags = shaders.filter((s) => /void main/.test(s ?? '') && /fragColor|gl_FragColor|out\s+(highp\s+)?vec4/.test(s ?? ''));
		// the caster's own program and its shadow program both discard by the cut
		expect(frags.filter((s) => /discard/.test(s ?? '')).length).toBeGreaterThanOrEqual(2);
	});

	test('the stage stands its asset in a ClippingGroup on WebGPU, in its scene on WebGL', async () => {
		const { Stage } = await import('../../assets/stage.js');
		const { LAB_PLANES } = await import('../../assets/kit.js');
		const { r } = await renderer();
		const stage = new Stage(r, new THREE.PerspectiveCamera(), {});
		expect(stage.holder).toBeInstanceOf(ClippingGroup);
		expect(stage.holder.clippingPlanes).toBe(LAB_PLANES);
		expect(stage.holder.clipIntersection).toBe(true);
		expect(stage.holder.clipShadows).toBe(true);
		expect(stage.holder.parent).toBe(stage.scene);
	});
});

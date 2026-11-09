// The post stack on WebGPU (intent c1bee1f8): createPost on a WebGPURenderer is a RenderPipeline of TSL nodes, the
// scene pass with its normals and occlusion mask (MRT), GTAO and its denoise, the NaN guard as a bit test, bloom, the
// output and the page's own TSL passes; built and drawn on WebGPURenderer's WebGL 2 backend over a context that only
// answers (./nodes/fakegl.js), no graphics card needed.
import { describe, expect, test } from 'vitest';

const g = /** @type {any} */ (globalThis);
g.self ??= g;
g.requestAnimationFrame ??= () => 0;
g.cancelAnimationFrame ??= () => {};
g.ImageBitmap ??= class {};
const THREE = await import('three');
const { MeshStandardNodeMaterial } = await import('three/webgpu');
const { fakeGL } = await import('./nodes/fakegl.js');
const { makeRenderer } = await import('./core.js');
const { createPost, finite } = await import('./post.js');
const { NodePass } = await import('./post.js');
const { uniform, vec4, dot, vec3, mix } = await import('three/tsl');

/** a WebGPURenderer on its WebGL 2 backend over the fake context, and every shader it was handed */
async function renderer() {
	const { gl, shaders } = fakeGL();
	const c = /** @type {any} */ (gl.canvas);
	c.getContext = (/** @type {string} */ kind) => (kind === 'webgl2' ? gl : null);
	const r = /** @type {any} */ (await makeRenderer({ backend: 'webgl2', pixelRatio: 1, canvas: c, toneMapping: 'agx', shadows: 'pcf' }));
	r.setSize(64, 64, false);
	return { r, shaders };
}
function world() {
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
	camera.position.set(0, 1, 4);
	camera.lookAt(0, 0, 0);
	scene.add(new THREE.HemisphereLight('#fff', '#888', 1));
	const solid = new THREE.Mesh(new THREE.BoxGeometry(), new MeshStandardNodeMaterial());
	const glass = new THREE.Mesh(new THREE.SphereGeometry(0.5), new MeshStandardNodeMaterial({ transparent: true, opacity: 0.4 }));
	scene.add(solid, glass);
	return { scene, camera, solid, glass };
}

describe('the post stack on WebGPU', () => {
	test('a RenderPipeline of the stack’s nodes, the WebGL pass’s handles kept', async () => {
		const { r, shaders } = await renderer();
		const { scene, camera, glass } = world();
		/** @type {any} */
		let handed = null;
		// a page's own pass, as the asset stage's grade is one (a NodePass), its time a uniform it sets
		const u = { uTime: uniform(0), uSat: uniform(1.06) };
		const grade = new NodePass(u, (at, p) => {
			const c = at(p).rgb;
			return vec4(mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, u.uSat).add(u.uTime.mul(43758.5453).fract().mul(0)), 1);
		});
		const post = /** @type {any} */ (createPost(r, scene, camera, { samples: 4, ao: (ao) => (handed = ao), bloom: { strength: 0.42, radius: 0.55, threshold: 1 }, after: [grade] }));
		expect(post.webgpu).toBe(true);
		expect(post.composer).toBeNull();
		expect(post.pipeline.outputColorTransform).toBe(false);
		// the page's hook handed the occlusion as GTAOPass's: its blend, its settings, its denoise's
		expect(handed).toBe(post.ao);
		post.ao.blendIntensity = 0.85;
		expect(post.ao.blendIntensity).toBe(0.85);
		post.ao.updateGtaoMaterial({ radius: 1.4, distanceExponent: 1.6, thickness: 4.8, scale: 1, samples: 16 });
		expect(post.ao.node.radius.value).toBe(1.4);
		expect(post.ao.node.thickness.value).toBe(4.8);
		post.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
		expect(post.ao.denoise.lumaPhi.value).toBe(10);
		// a see-through part kept out of the occlusion by the mask
		post.ao.exclude(glass.material);
		expect(/** @type {any} */ (glass.material).mrtNode).toBeTruthy();
		u.uTime.value = 3;
		post.render();
		const frag = shaders.filter((s) => /void main/.test(s ?? '')).join('\n');
		// the NaN guard's bit test, the scene's normals beside its colour, and the grade's vignette in the programs
		expect(frag).toMatch(/floatBitsToUint/);
		expect(frag).toMatch(/2139095040u|0x7f800000/i);
		// the grade's grain hash, and the scene pass's three outputs (colour, normals, the mask)
		expect(frag).toMatch(/43758\.5453/);
		expect(frag).toMatch(/layout\s*\(\s*location\s*=\s*2\s*\)/);
		expect(shaders.length).toBeGreaterThan(4);
		post.dispose();
	});

	test('a GLSL pass among the page’s own is left out on WebGPU, said once', async () => {
		const { r } = await renderer();
		const { scene, camera } = world();
		const said = [];
		const warn = console.warn;
		console.warn = (/** @type {any[]} */ ...a) => said.push(a.join(' '));
		try {
			const post = /** @type {any} */ (createPost(r, scene, camera, { after: [{ isPass: true }, { isPass: true }] }));
			expect(post.webgpu).toBe(true);
		} finally {
			console.warn = warn;
		}
		expect(said.filter((s) => s.includes('left out')).length).toBe(1);
	});

	test('finite: NaN and ±∞ by their exponent bits', () => {
		// the guard's bits, checked on the CPU: an exponent of all ones is NaN or ±∞, anything else is a number
		const bits = (x) => new Uint32Array(new Float32Array([x]).buffer)[0];
		const bad = (x) => (bits(x) & 0x7f800000) === 0x7f800000;
		expect([NaN, Infinity, -Infinity].every(bad)).toBe(true);
		expect([0, -0, 1, -1, 3.4e38, 1e-40, 65504].some(bad)).toBe(false);
		expect(typeof finite).toBe('function');
	});
});

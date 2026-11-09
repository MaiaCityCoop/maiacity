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
const { gradeNode } = await import('../assets/stage.js');

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
		const grade = gradeNode({ vig: 0.32, grain: 0.02, sat: 1.06, res: new THREE.Vector2(64, 64) });
		const post = /** @type {any} */ (createPost(r, scene, camera, { samples: 4, ao: (ao) => (handed = ao), bloom: { strength: 0.42, radius: 0.55, threshold: 1 }, after: [grade.node] }));
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
		grade.uniforms.uTime.value = 3;
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

// The world's finishing (intent 1f0c6f79): the plan per device (./finish.js), its cost, the grade (./grade.js), the
// atmosphere (./atmosphere.js) and the one RenderPipeline built from a plan (`createFinish`), on the fake context.
const { finishing, costOf, deviceOf, LIMITS } = await import('./finish.js');
const { CEILING, WORLD, look, lutData, LUT_SIZE } = await import('./grade.js');
const atmo = await import('./atmosphere.js');
const { createFinish } = await import('./post.js');

describe('the finishing plan', () => {
	test('a desktop: AO on the ambient light, TRAA, bloom, the grade, the haze and contact shadows', () => {
		const p = finishing({ device: 'desktop' });
		expect(p.ao?.kind).toBe('ssao');
		expect(p.ao?.scale).toBe(0.5);
		expect(p.aa).toBe('traa');
		expect(p.jitter).toBe(true);
		expect(p.samples).toBe(0);
		expect(p.bloom?.threshold).toBeGreaterThanOrEqual(1);
		expect(p.bloom?.scale).toBe(0.5);
		expect(p.bloom?.strength).toBeLessThanOrEqual(0.2);
		expect(p.grade).toEqual(WORLD);
		expect(p.contact).not.toBeNull();
		expect(p.fog.reach).toBe(1);
		expect(p.scale).toBe(1);
		expect(p.upscale).toBeNull();
	});
	test('a small device: none of AO, bloom or contact shadows; 0.6–0.75 of the pixels, brought up by TAAU; the haze closer', () => {
		const p = finishing({ device: 'small' });
		expect(p.ao).toBeNull();
		expect(p.bloom).toBeNull();
		expect(p.contact).toBeNull();
		expect(p.scale).toBeGreaterThanOrEqual(LIMITS.smallScale[0]);
		expect(p.scale).toBeLessThanOrEqual(LIMITS.smallScale[1]);
		expect(p.upscale).toBe('taau');
		expect(p.aa).toBe('taau');
		expect(p.fog.reach).toBeLessThan(1);
	});
	test('a film: no temporal jitter on either device, MSAA, the full pixels', () => {
		for (const device of /** @type {const} */ (['desktop', 'small'])) {
			const p = finishing({ device, film: true });
			expect(p.jitter).toBe(false);
			expect(p.aa).toBe('msaa');
			expect(p.samples).toBe(4);
			expect(p.scale).toBe(1);
			expect(p.upscale).toBeNull();
		}
		// where TRAA ghosts, MSAA
		expect(finishing({ ghosts: true }).aa).toBe('msaa');
	});
	test('the budget: a desktop within 2.0 ms at 1440 × 900, a small device under it', () => {
		const d = costOf(finishing({ device: 'desktop' }));
		expect(d.ms).toBeLessThanOrEqual(LIMITS.ms);
		expect(Object.keys(d.passes)).toEqual(expect.arrayContaining(['prepass', 'ssao', 'denoise', 'contact', 'traa', 'bloom', 'grade']));
		const s = costOf(finishing({ device: 'small' }), [390 * 3, 844 * 3]);
		expect(s.ms).toBeLessThan(d.ms);
		expect(s.passes.ssao).toBeUndefined();
	});
	test('which device a screen is', () => {
		expect(deviceOf({ width: 1440, height: 900 })).toBe('desktop');
		expect(deviceOf({ width: 390, height: 844, coarse: true })).toBe('small');
		expect(deviceOf({ width: 1366, height: 1024, coarse: true })).toBe('desktop');
		expect(deviceOf({ width: 1440, height: 900, memory: 4 })).toBe('small');
	});
});

describe('the grade', () => {
	test('a world’s grade under the forest demo’s ceiling', () => {
		for (const k of /** @type {const} */ (['vig', 'grain', 'sat', 'lut'])) expect(WORLD[k]).toBeLessThanOrEqual(CEILING[k]);
	});
	test('the look is subtle: black and white stay, mid grey near itself, greys in order, nothing moves far', () => {
		expect(look([0, 0, 0]).every((v) => v < 0.005)).toBe(true);
		expect(look([1, 1, 1]).every((v) => v > 0.995)).toBe(true);
		const mid = look([0.5, 0.5, 0.5]);
		expect(Math.max(...mid.map((v) => Math.abs(v - 0.5)))).toBeLessThan(0.02);
		let last = -1, worst = 0;
		for (let i = 0; i <= 64; i++) {
			const g = i / 64, o = look([g, g, g]);
			const y = 0.2126 * o[0] + 0.7152 * o[1] + 0.0722 * o[2];
			expect(y).toBeGreaterThanOrEqual(last);
			last = y;
			worst = Math.max(worst, ...o.map((v) => Math.abs(v - g)));
		}
		// at full strength at most 0.06 anywhere on the greys; a world mixes it in at WORLD.lut
		expect(worst).toBeLessThan(0.06);
	});
	test('the LUT is the look, texel for texel', () => {
		const d = lutData();
		expect(d.length).toBe(LUT_SIZE ** 3 * 4);
		const at = (r, g, b) => Array.from(d.slice((r + g * LUT_SIZE + b * LUT_SIZE * LUT_SIZE) * 4, (r + g * LUT_SIZE + b * LUT_SIZE * LUT_SIZE) * 4 + 3));
		const n = LUT_SIZE - 1;
		expect(at(n, 3, 9)).toEqual(look([1, 3 / n, 9 / n]).map((v) => Math.round(v * 255)));
	});
});

describe('the atmosphere', () => {
	const a = atmo.groundDensity(1.6 / 1400);
	test('the haze deepens with distance, thins with height, pools low', () => {
		const near = atmo.transmittance(a, atmo.FALLOFF, 2, 50, 0);
		const far = atmo.transmittance(a, atmo.FALLOFF, 2, 1000, 0);
		expect(near).toBeGreaterThan(far);
		// from 400 m up, the same distance level with the eye is clearer
		expect(atmo.transmittance(a, atmo.FALLOFF, 400, 1000, 0)).toBeGreaterThan(far);
		// looking up through it is clearer than looking down into it
		expect(atmo.transmittance(a, atmo.FALLOFF, 100, 800, 300)).toBeGreaterThan(atmo.transmittance(a, atmo.FALLOFF, 100, 800, -90));
		// the sky's FogExp2 at its far: hidden as much level with the ground
		expect(atmo.transmittance(a, atmo.FALLOFF, 0, 1400, 0)).toBeCloseTo(Math.exp(-2.56), 5);
	});
	test('its colour is the horizon looked toward, warmer toward the sun', () => {
		const ring = Array.from({ length: 16 }, (_, k) => [0.5 + k / 100, 0.6, 0.8]);
		const sun = [1, 0.1, 0].map((v, _, s) => v / Math.hypot(...s));
		const tint = [1, 0.6, 0.3];
		const toward = atmo.hazeColor(ring, sun, sun, tint), away = atmo.hazeColor(ring, [-1, 0, 0], sun, tint);
		expect(toward[0] / toward[2]).toBeGreaterThan(away[0] / away[2]);
		// at a bearing, the ring's colour there (no sun behind)
		expect(atmo.hazeColor(ring, [0, 0, 1], [0, 1, 0], tint)[0]).toBeCloseTo(ring[4][0], 6);
	});
	test('aerial perspective: far things lose their colour into the haze', () => {
		const red = [0.8, 0.1, 0.1], haze = [0.5, 0.5, 0.5];
		expect(atmo.aerial(red, haze, 1)).toEqual(red);
		const mid = atmo.aerial(red, haze, 0.5);
		expect(mid[0] - mid[1]).toBeLessThan((red[0] - red[1]) * 0.5);
		expect(atmo.aerial(red, haze, 0)).toEqual(haze);
	});
	test('the far plane follows the haze', () => {
		const f = atmo.farFor(a, atmo.FALLOFF, 0);
		expect(atmo.transmittance(a, atmo.FALLOFF, 0, f, 0)).toBeCloseTo(atmo.HIDDEN, 6);
		expect(atmo.farFor(a * 2)).toBeLessThan(f);
		expect(atmo.farFor(0)).toBe(20_000);
	});
});

describe('the world’s finishing on WebGPU', () => {
	function sky() {
		return { horizon: { uniforms: { uSkyRing: { value: Array.from({ length: 16 }, () => new THREE.Vector3(0.6, 0.7, 0.9)) } } }, sunDir: new THREE.Vector3(0.3, 0.4, 0.8).normalize(), sun: { color: new THREE.Color(1, 0.8, 0.6) } };
	}
	test('a desktop’s pipeline: AO on the ambient light, contact shadows, TRAA, bloom, the grade; the haze on the scene', async () => {
		const { r, shaders } = await renderer();
		const { scene, camera } = world();
		const sun = new THREE.DirectionalLight('#fff', 3);
		sun.position.set(3, 5, 2);
		scene.add(sun);
		scene.fog = new THREE.FogExp2(0xffffff, 1.6 / 1400);
		const air = atmo.createAtmosphere(scene, sky());
		air.update();
		expect(/** @type {any} */ (scene).fogNode).toBe(air.node);
		expect(air.uniforms.a.value).toBeCloseTo(atmo.groundDensity(1.6 / 1400), 9);
		const f = createFinish(r, scene, camera, finishing({ device: 'desktop' }), { sun });
		expect(f.nodes.ao).toBeTruthy();
		expect(f.nodes.prepass).toBeTruthy();
		expect(f.nodes.scene.contextNode).toBeTruthy();
		expect(f.nodes.contact).toBeTruthy();
		expect(f.nodes.aa?.isTRAANode).toBe(true);
		expect(f.nodes.bloom).toBeTruthy();
		expect(f.pipeline.outputColorTransform).toBe(false);
		f.render(2);
		expect(f.nodes.grade.uniforms.uTime.value).toBe(2);
		const frag = shaders.filter((s) => /void main/.test(s ?? '')).join('\n');
		// the haze's sum (e^−τ) and the grain's hash are in the programs
		expect(frag).toMatch(/43758\.5453/);
		expect(frag).toMatch(/exp\s*\(/);
		f.dispose();
		air.dispose();
		expect(/** @type {any} */ (scene).fogNode ?? null).toBeNull();
	});
	test('a small device’s: no AO, bloom or contact shadows; TAAU from 0.7 of the pixels', async () => {
		const { r } = await renderer();
		const { scene, camera } = world();
		const f = createFinish(r, scene, camera, finishing({ device: 'small' }));
		expect(f.nodes.ao).toBeNull();
		expect(f.nodes.bloom).toBeNull();
		expect(f.nodes.contact).toBeNull();
		expect(f.nodes.aa?.isTAAUNode).toBe(true);
		expect(f.nodes.scene.getResolutionScale()).toBe(0.7);
		f.render(0);
		f.dispose();
	});
	test('a film’s: no temporal node, the scene multisampled', async () => {
		const { r } = await renderer();
		const { scene, camera } = world();
		const f = createFinish(r, scene, camera, finishing({ film: true }));
		expect(f.nodes.aa).toBeNull();
		expect(f.nodes.scene.options?.samples ?? f.plan.samples).toBe(4);
		f.render(1);
		f.dispose();
	});
});

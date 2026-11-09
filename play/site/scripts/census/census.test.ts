/*
 * The census's checks (intent bba45d6e): the counting renderer counts as three draws (c2), every world builds on the CPU
 * with no WebGL context and one renderer (c2), and the census's report holds together (c5).
 *
 *   cd play/site && bun test scripts/census
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as THREE from 'three';
import { BACKGROUND_SPHERE_TRIS, CountingRenderer, CountingWebGPURenderer, drawOf } from './counting.js';

const HERE = import.meta.dir;
const OUT = mkdtempSync(join(tmpdir(), 'census-test-'));

/** a scene with a camera at the origin looking down -z, 1440×900 as the census's */
function stage() {
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(68, 1440 / 900, 0.1, 1000);
	const r = new CountingRenderer({ canvas: { width: 1440, height: 900, style: {}, addEventListener() {} } });
	return { scene, camera, r };
}
const box = () => new THREE.BoxGeometry(1, 1, 1); // 12 triangles, indexed
const mat = () => new THREE.MeshBasicMaterial();
const drawn = (r: CountingRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
	r.tally.reset();
	r.render(scene, camera);
	return r.tally;
};

describe('the counting renderer counts as three draws', () => {
	test('a mesh in view is one draw of its triangles; one behind the camera is culled', () => {
		const { scene, camera, r } = stage();
		const front = new THREE.Mesh(box(), mat());
		front.position.set(0, 0, -5);
		const back = new THREE.Mesh(box(), mat());
		back.position.set(0, 0, 5);
		scene.add(front, back);
		const t = drawn(r, scene, camera);
		expect(t.calls).toBe(1);
		expect(t.tris).toBe(12);
		expect(t.culledObjects).toBe(1);
		expect(t.culledTris).toBe(12);
		expect(r.info.render.triangles).toBe(12);
	});

	test('frustumCulled = false keeps a mesh drawn wherever it is; a hidden one, or one off the layers, is not', () => {
		const { scene, camera, r } = stage();
		const back = new THREE.Mesh(box(), mat());
		back.position.set(0, 0, 5);
		back.frustumCulled = false;
		const hidden = new THREE.Mesh(box(), mat());
		hidden.position.set(0, 0, -5);
		hidden.visible = false;
		const layered = new THREE.Mesh(box(), mat());
		layered.position.set(0, 0, -5);
		layered.layers.set(3);
		scene.add(back, hidden, layered);
		const t = drawn(r, scene, camera);
		expect(t.calls).toBe(1);
		expect(t.tris).toBe(12);
	});

	test('an InstancedMesh draws its index / 3 × count, once', () => {
		const { scene, camera, r } = stage();
		const m = new THREE.InstancedMesh(box(), mat(), 50);
		m.count = 7;
		const at = new THREE.Matrix4();
		for (let i = 0; i < 50; i++) m.setMatrixAt(i, at.makeTranslation(i * 0.1, 0, -10));
		scene.add(m);
		const t = drawn(r, scene, camera);
		expect(t.calls).toBe(1);
		expect(t.tris).toBe(12 * 7);
		expect(t.instanced).toBe(1);
		expect(t.instances).toBe(7);
	});

	test('drawRange and groups are honoured, a material per group', () => {
		const { scene, camera, r } = stage();
		const g = box();
		g.setDrawRange(0, 18); // 6 triangles
		const one = new THREE.Mesh(g, mat());
		one.position.set(0, 0, -5);
		const grouped = box(); // six groups of 6 indices
		const hidden = mat();
		hidden.visible = false;
		const many = new THREE.Mesh(grouped, [mat(), mat(), hidden, mat(), mat(), mat()]);
		many.position.set(0, 0, -6);
		scene.add(one, many);
		const t = drawn(r, scene, camera);
		expect(drawOf(one, g, one.material, null).tris).toBe(6);
		expect(t.calls).toBe(1 + 5);
		expect(t.tris).toBe(6 + 5 * 2);
	});

	test('a see-through material drawn from both sides is drawn twice, as three does', () => {
		const { scene, camera, r } = stage();
		const glass = new THREE.Mesh(box(), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }));
		glass.position.set(0, 0, -5);
		scene.add(glass);
		const t = drawn(r, scene, camera);
		expect(t.calls).toBe(2);
		expect(t.tris).toBe(24);
	});

	test('a shadow-casting mesh is counted again in each shadow pass, inside the light’s shadow camera only', () => {
		const { scene, camera, r } = stage();
		r.shadowMap.enabled = true;
		const sun = new THREE.DirectionalLight();
		sun.position.set(0, 50, 0);
		sun.castShadow = true;
		Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 100 });
		sun.shadow.camera.updateProjectionMatrix();
		const caster = new THREE.Mesh(box(), mat());
		caster.position.set(0, 0, -5);
		caster.castShadow = true;
		const outside = new THREE.Mesh(box(), mat());
		outside.position.set(0, 0, -50);
		outside.castShadow = true;
		scene.add(sun, sun.target, caster, outside);
		const t = drawn(r, scene, camera);
		expect(t.shadowPasses).toBe(1);
		expect(t.shadowCalls).toBe(1);
		expect(t.shadowTris).toBe(12);
		expect(t.calls).toBe(2);
		// no pass where the shadows are not asked for again
		r.shadowMap.autoUpdate = false;
		expect(drawn(r, scene, camera).shadowCalls).toBe(0);
		r.shadowMap.needsUpdate = true;
		expect(drawn(r, scene, camera).shadowCalls).toBe(1);
	});
});

// WebGPURenderer as the census counts it (intent c1bee1f8, c4): its walk the WebGL one's, its background, output pass
// and shadow passes its own
describe('the counting WebGPU renderer counts as WebGPU draws', () => {
	const gpu = () => {
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(68, 1440 / 900, 0.1, 1000);
		const r = new CountingWebGPURenderer({ canvas: { width: 1440, height: 900, style: {}, addEventListener() {} } });
		return { scene, camera, r };
	};
	const lit = () => new THREE.MeshStandardMaterial();
	/** a sun casting shadows over a box that casts and a floor that receives */
	const sunlit = () => {
		const s = gpu();
		s.r.shadowMap.enabled = true;
		const sun = new THREE.DirectionalLight('#fff', 1);
		sun.castShadow = true;
		sun.position.set(0, 10, -5);
		sun.target.position.set(0, 0, -5);
		const caster = new THREE.Mesh(box(), lit());
		caster.position.set(0, 0, -5);
		caster.castShadow = true;
		const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2), lit());
		floor.position.set(0, -1, -5);
		floor.receiveShadow = true;
		s.scene.add(sun, sun.target, caster, floor);
		return { ...s, caster, floor };
	};

	test('it is a WebGPURenderer, initialised by init, its cameras in its coordinate system', async () => {
		const { scene, camera, r } = gpu();
		expect(r.isWebGPURenderer).toBe(true);
		expect(r.initialized).toBe(false);
		await r.init();
		expect(r.initialized).toBe(true);
		const m = new THREE.Mesh(box(), mat());
		m.position.set(0, 0, -5);
		scene.add(m);
		r.outputColorSpace = THREE.LinearSRGBColorSpace;
		const t = drawn(r, scene, camera);
		expect(camera.coordinateSystem).toBe(THREE.WebGPUCoordinateSystem);
		expect(t.calls).toBe(1);
		expect(t.tris).toBe(12);
		expect(CountingRenderer.made).toContain(r);
	});

	test('a texture background is drawn on a sphere; a colour only clears', () => {
		const { scene, camera, r } = gpu();
		// no output pass (linear out, no tone mapping): the background alone
		r.outputColorSpace = THREE.LinearSRGBColorSpace;
		scene.background = new THREE.Texture();
		scene.background.mapping = THREE.EquirectangularReflectionMapping;
		expect(drawn(r, scene, camera)).toMatchObject({ calls: 1, tris: BACKGROUND_SPHERE_TRIS });
		// WebGL draws the same background on a box
		const gl = stage();
		expect(drawn(gl.r, scene, gl.camera)).toMatchObject({ calls: 1, tris: 12 });
		scene.background = new THREE.Color('#fff');
		expect(drawn(r, scene, camera)).toMatchObject({ calls: 0, tris: 0 });
		expect(BACKGROUND_SPHERE_TRIS).toBe(new THREE.SphereGeometry(1, 32, 32).index!.count / 3);
	});

	test('tone mapping to the screen adds the output pass, one triangle; into a target it does not', () => {
		const { scene, camera, r } = gpu();
		r.outputColorSpace = THREE.LinearSRGBColorSpace;
		expect(drawn(r, scene, camera).calls).toBe(0);
		r.toneMapping = THREE.AgXToneMapping;
		expect(drawn(r, scene, camera)).toMatchObject({ calls: 1, tris: 1 });
		r.setRenderTarget(new THREE.RenderTarget(64, 64));
		expect(drawn(r, scene, camera)).toMatchObject({ calls: 0, targetCalls: 0 });
		r.setRenderTarget(null);
		// sRGB out of the linear working space is a colour transform too
		r.toneMapping = THREE.NoToneMapping;
		r.outputColorSpace = THREE.SRGBColorSpace;
		expect(drawn(r, scene, camera).calls).toBe(1);
	});

	test('a shadow map is drawn only where something lit by it receives shadows', () => {
		const { scene, camera, r, floor } = sunlit();
		r.outputColorSpace = THREE.LinearSRGBColorSpace;
		expect(drawn(r, scene, camera)).toMatchObject({ shadowPasses: 1, shadowCalls: 1, shadowTris: 12 });
		floor.receiveShadow = false;
		expect(drawn(r, scene, camera)).toMatchObject({ shadowPasses: 0, shadowCalls: 0 });
		// WebGL draws it whatever receives it
		const gl = stage();
		gl.r.shadowMap.enabled = true;
		expect(drawn(gl.r, scene, gl.camera).shadowCalls).toBe(1);
	});

	test('the renderer’s shadow switch holds, as the core keeps it on WebGPU', () => {
		const { scene, camera, r } = sunlit();
		r.shadowMap.autoUpdate = false;
		expect(drawn(r, scene, camera).shadowCalls).toBe(0);
		r.shadowMap.needsUpdate = true;
		expect(drawn(r, scene, camera).shadowCalls).toBe(1);
		expect(r.shadowMap.needsUpdate).toBe(false);
		expect(drawn(r, scene, camera).shadowCalls).toBe(0);
	});

	test('a cascaded sun (three\'s SunLight) is drawn once a cascade, as WebGL draws its viewports', async () => {
		const { SunLight } = await import('three/addons/lights/SunLight.js');
		const s = sunlit();
		const sun = new SunLight(0xffffff, 1);
		sun.castShadow = true;
		sun.position.set(0, 10, -5);
		s.scene.children.filter((o: any) => o.isDirectionalLight).forEach((o) => s.scene.remove(o));
		s.scene.add(sun, sun.target);
		const cascades = (sun as any).shadow.getViewportCount();
		expect(cascades).toBeGreaterThan(1);
		const t = drawn(s.r, s.scene, s.camera);
		expect(t.shadowPasses).toBe(cascades);
		const gl = stage();
		gl.r.shadowMap.enabled = true;
		const w = drawn(gl.r, s.scene, gl.camera);
		expect(w.shadowPasses).toBe(cascades);
		expect(t.shadowCalls).toBe(w.shadowCalls);
	});

	test('a see-through double-sided caster is drawn twice into the shadow map', () => {
		const { scene, camera, r, caster } = sunlit();
		caster.material = new THREE.MeshStandardMaterial({ transparent: true, side: THREE.DoubleSide });
		expect(drawn(r, scene, camera)).toMatchObject({ shadowCalls: 2, shadowTris: 24 });
		// and twice in the main pass, back then front, as on WebGL
		expect(drawn(r, scene, camera).calls).toBe(2 + 1 + 1);
		caster.material.side = THREE.FrontSide;
		expect(drawn(r, scene, camera).shadowCalls).toBe(1);
	});
});

describe('the census is the same every run (intent 373050d1)', () => {
	test('its page draws Math.random from the Mac\'s one seed (mulberry32, 0x2545f491), the same sequence every run', () => {
		// the Mac's SEEDED_RANDOM (intent-work/main-baseline/determinism.mjs), written out here as the reference
		let s = 0x2545f491;
		const mulberry32 = () => {
			s |= 0;
			s = (s + 0x6d2b79f5) | 0;
			let t = Math.imul(s ^ (s >>> 15), 1 | s);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		const want = Array.from({ length: 5 }, mulberry32);
		// in a process of its own: setup() makes the page round it
		const p = Bun.spawnSync(['bun', '-e', `const { setup } = await import(${JSON.stringify(join(HERE, 'setup.ts'))}); setup(); console.log(JSON.stringify(Array.from({ length: 5 }, Math.random)));`], { stdout: 'pipe', stderr: 'pipe' });
		expect(p.exitCode).toBe(0);
		expect(JSON.parse(p.stdout.toString().trim().split('\n').pop()!)).toEqual(want);
	});
});

/** a census in its own process (each sets up its own page), its JSON */
function census(args: string[]) {
	const json = join(OUT, `${args.join('-').replace(/[^a-z0-9-]/gi, '')}.json`);
	const p = Bun.spawnSync(['bun', join(HERE, '..', 'census.ts'), ...args, '--json', json], { stdout: 'pipe', stderr: 'pipe' });
	if (p.exitCode !== 0) throw new Error(`census ${args.join(' ')} failed:\n${p.stderr.toString().slice(-3000)}`);
	return JSON.parse(readFileSync(json, 'utf8'));
}

describe('sandbox-1 on the CPU', () => {
	let got: any;
	beforeAll(() => {
		got = census(['--world', 'sandbox-1', '--view', 'all']);
	}, 300_000);

	test('builds and is counted from near, mid and far: meshes, triangles, no graphics context', () => {
		expect(got.views.map((v: any) => v.view)).toEqual(['near', 'mid', 'far']);
		for (const v of got.views) {
			expect(v.totals.meshes + v.totals.instanced).toBeGreaterThan(0);
			expect(v.totals.tris).toBeGreaterThan(0);
		}
	});

	test('report: every copy with its distance, level and triangles; totals that add up', () => {
		for (const v of got.views) {
			for (const k of ['tris', 'calls', 'meshes', 'instanced', 'shadowCalls', 'shadowTris', 'culledObjects', 'culledTris']) expect(typeof v.totals[k]).toBe('number');
			expect(v.copies.length).toBeGreaterThan(0);
			for (const c of v.copies.slice(0, 500)) {
				for (const k of ['renderer', 'kind', 'd', 'size', 'level']) expect(c[k]).toBeDefined();
				expect(c.tris === null || typeof c.tris === 'number').toBe(true);
			}
			// the triangles in shapes are the copies' drawn at a level, per renderer
			const sum: Record<string, number> = {};
			for (const c of v.copies) if (typeof c.level === 'number') sum[c.renderer] = (sum[c.renderer] ?? 0) + (c.tris ?? 0);
			expect(sum).toEqual(v.shapeTris);
			// a frame's triangles are its main pass's, its shadows' and what it drew into targets
			expect(v.totals.tris).toBe(v.totals.mainTris + v.totals.shadowTris + v.totals.targetTris);
			expect(v.totals.calls).toBe(v.totals.mainCalls + v.totals.shadowCalls + v.totals.targetCalls);
			// the median frame is one of the frames measured
			expect(v.frames.some((f: any) => f.tris === v.totals.tris)).toBe(true);
		}
	});
});

// the switch (intent c1bee1f8, c4): the same world counted on WebGPURenderer when the page is asked for it
describe('sandbox-1 on WebGPURenderer', () => {
	test('is counted as WebGPU draws it, every view', () => {
		const got = census(['--world', 'sandbox-1', '--view', 'all', '--renderer', 'webgpu']);
		expect(got.renderer).toBe('WebGPURenderer');
		expect(got.views.map((v: any) => v.view)).toEqual(['near', 'mid', 'far']);
		for (const v of got.views) {
			expect(v.totals.meshes + v.totals.instanced).toBeGreaterThan(0);
			expect(v.totals.mainTris).toBeGreaterThan(0);
			expect(v.totals.tris).toBe(v.totals.mainTris + v.totals.shadowTris + v.totals.targetTris);
		}
	}, 300_000);
});

describe('the other worlds on the CPU', () => {
	test('Sandbox 3 builds and is counted as it opens', () => {
		const v = census(['--world', 'sandbox-3']).views[0];
		expect(v.view).toBe('open');
		expect(v.totals.meshes + v.totals.instanced).toBeGreaterThan(0);
		expect(v.totals.tris).toBeGreaterThan(0);
	}, 300_000);

	test('the worlds view builds a world and is counted as it opens', () => {
		const v = census(['--world', 'worlds']).views[0];
		expect(v.view).toBe('open');
		expect(v.totals.meshes + v.totals.instanced).toBeGreaterThan(0);
		expect(v.totals.tris).toBeGreaterThan(0);
	}, 300_000);
});

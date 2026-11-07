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
import { CountingRenderer, drawOf } from './counting.js';

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
		got = census(['--world', 'sandbox-1', '--view', 'all', '--inputs', join(HERE, 'run5')]);
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

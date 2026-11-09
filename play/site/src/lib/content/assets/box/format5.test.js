// Box data format 5 (intent a5faafad, c1): a material's own shader is never silently dropped any more. It leaves the
// box as a node graph checked against the one allowlist, or as the kit's section caps, or the build is refused saying
// which material; the page checks the graph again and keeps it for its renderer. Formats 2–4's flag still reads.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { serialize, FORMAT } from './serialize.js';
import { rebuild, MUSEUM_RED } from './rebuild.js';
import { GLOW } from './graph.examples.js';

const mesh = (m) => new THREE.Mesh(new THREE.BoxGeometry(), m);
const across = async (obj) => rebuild((await serialize(obj)).data);
const materialOf = (root) => {
	let m;
	root.traverse((o) => (m ??= o.material));
	return m;
};

describe('format 5: a look of its own as data', () => {
	it('writes format 5', async () => {
		expect(FORMAT).toBe(5);
		expect((await serialize(mesh(new THREE.MeshStandardMaterial()))).data.format).toBe(5);
	});
	it('a graph leaves the box checked and is kept by the page', async () => {
		const m = new THREE.MeshStandardMaterial({ color: 0x336633 });
		m.userData.graph = GLOW;
		const { data } = await serialize(mesh(m));
		expect(data.materials[0].graph.nodes).toHaveLength(GLOW.nodes.length);
		expect(data.materials[0]).not.toHaveProperty('custom');
		const got = materialOf(rebuild(data));
		expect(got.userData.graph.out).toEqual(GLOW.out);
	});
	it('a shader of its own without a graph is refused, naming the material', async () => {
		const own = new THREE.MeshStandardMaterial({ name: 'glowing cap' });
		own.onBeforeCompile = (sh) => (sh.fragmentShader += '\n');
		await expect(serialize(mesh(own))).rejects.toThrow(/material 0 \(glowing cap\): a shader of its own/);
		await expect(serialize(mesh(new THREE.ShaderMaterial()))).rejects.toThrow(/a shader of its own \(ShaderMaterial/);
	});
	it('a graph that is refused refuses the build, saying why', async () => {
		const m = new THREE.MeshStandardMaterial();
		m.userData.graph = { format: 1, nodes: [{ op: 'viewportTexture' }], out: { color: 0 } };
		await expect(serialize(mesh(m))).rejects.toThrow(/its graph is refused: .*may not read the screen/);
		const toon = new THREE.MeshToonMaterial();
		toon.userData.graph = GLOW;
		await expect(serialize(mesh(toon))).rejects.toThrow(/not a MeshToonMaterial/);
	});
	it('the kit’s section caps leave as their look', async () => {
		const m = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide });
		m.onBeforeCompile = () => {};
		m.userData.cap = { color: 0x123456, rough: 0.4, metal: 0.2 };
		const { data } = await serialize(mesh(m));
		expect(data.materials[0].cap).toEqual({ color: 0x123456, rough: 0.4, metal: 0.2 });
		expect(materialOf(rebuild(data)).userData.cap).toEqual({ color: 0x123456, rough: 0.4, metal: 0.2 });
	});
	it('the page refuses a graph the box did not check', async () => {
		const { data } = await serialize(mesh(new THREE.MeshStandardMaterial()));
		data.materials[0].graph = { format: 1, nodes: [{ op: 'storage' }], out: { color: 0 } };
		expect(() => rebuild(data)).toThrow(/refused: material 0: its graph: .*storage buffers/);
		data.materials[0].graph = { format: 1, textures: ['map'], nodes: [{ op: 'uv' }, { op: 'texture', in: [0], slot: 'map' }], out: { opacity: 1 } };
		expect(() => rebuild(data)).toThrow(/carries no map/);
		data.materials[0].graph = GLOW;
		data.materials[0].type = 'MeshToonMaterial';
		expect(() => rebuild(data)).toThrow(/a graph is given to/);
	});
	it('formats 2 to 4 still read: the flag gives the cut face it said, or the museum red on a two-sided physical one', async () => {
		const { data } = await serialize(mesh(new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide })));
		data.format = 4;
		data.materials[0].custom = true;
		expect(materialOf(rebuild(data)).userData.cap).toEqual(MUSEUM_RED);
		data.materials[0].cap = { color: 7, rough: 0.1, metal: 0.9 };
		expect(materialOf(rebuild(data)).userData.cap).toEqual({ color: 7, rough: 0.1, metal: 0.9 });
		// a graph in an old format is not read
		data.materials[0].graph = GLOW;
		expect(materialOf(rebuild(data)).userData.graph).toBeUndefined();
	});
	it('an old flag on a one-sided standard material gives no caps, as before', async () => {
		const { data } = await serialize(mesh(new THREE.MeshStandardMaterial()));
		data.format = 3;
		data.materials[0].custom = true;
		expect(materialOf(rebuild(data)).userData.cap).toBeUndefined();
	});
});

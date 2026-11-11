// A crowd's shape is drawn in one run of triangles per material (intent 0356b0ea; ./crowd.js oneRunPerMaterial)
import { describe, expect, test, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('../clips.js', () => ({ blend: () => ({}), playerOf: () => ({}), poser: () => () => {} }));
const { oneRunPerMaterial } = await import('./crowd.js');

/** a shape of `runs` runs of 2 triangles, their materials in turn */
function shape(materials, runs, indexed = true) {
	const g = new THREE.BufferGeometry();
	const n = runs * 6;
	g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from({ length: n * 3 }, (_, i) => i), 3));
	if (indexed) g.setIndex(Array.from({ length: n }, (_, i) => n - 1 - i));
	for (let r = 0; r < runs; r++) g.addGroup(r * 6, 6, r % materials);
	return g;
}
/** each material's triangles, each as its three vertices' numbers, in the order they are drawn */
function trianglesOf(g) {
	const by = new Map();
	for (const gr of g.groups)
		for (let i = gr.start; i < gr.start + gr.count; i += 3) {
			const v = [0, 1, 2].map((k) => (g.index ? g.index.array[i + k] : i + k));
			by.set(gr.materialIndex, [...(by.get(gr.materialIndex) ?? []), v.join()]);
		}
	return by;
}
const two = [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()];

describe("a crowd's shape", () => {
	test('has one run per material, of the same triangles in the same order, on the same vertices', () => {
		for (const indexed of [true, false]) {
			const g = shape(2, 9, indexed), out = oneRunPerMaterial(g, two);
			expect(g.groups.length).toBe(9);
			expect(out.groups.map((x) => x.materialIndex)).toEqual([0, 1]);
			expect(out.groups.reduce((a, x) => a + x.count, 0)).toBe(54);
			expect(trianglesOf(out)).toEqual(trianglesOf(g));
			expect(out.attributes.position).toBe(g.attributes.position);
			// made once a shape
			expect(oneRunPerMaterial(g, two)).toBe(out);
		}
	});
	test('is left as it is with one material, a run per material already, or a see-through material', () => {
		const one = shape(2, 9);
		expect(oneRunPerMaterial(one, two[0])).toBe(one);
		const already = shape(2, 2);
		expect(oneRunPerMaterial(already, two)).toBe(already);
		const glass = shape(2, 9);
		expect(oneRunPerMaterial(glass, [two[0], new THREE.MeshStandardMaterial({ transparent: true })])).toBe(glass);
	});
});

// Sandbox 6's village draws cheaply (intent 67f0404a, c10): built on the CPU from the village config, each dome size's
// glazed panels are one InstancedMesh (its frame a second), and all seven hexes stay under 400 draw objects.
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import village from '../../../../../api/import/sandboxes/sandbox-6/village.json';
import type { Village } from './geometry';
import { buildVillage, census, geodesicCap } from './scene';

const V = village as unknown as Village;

describe('the village in 3D', () => {
	const { root, dispose } = buildVillage(V);
	test('one InstancedMesh of glass and one of frame a dome size, an instance a dome', () => {
		const sizes = new Set(Object.values(V.kinds).filter((k) => k.freq).map((k) => k.D));
		const count = (D: number) => V.hexes.reduce((a, h) => a + V.plans[h.plan].sites.filter((s) => V.kinds[s.kind].D === D && s.kind !== 'tower180').length, 0);
		for (const D of sizes) {
			for (const part of ['glass', 'frame']) {
				const ims = root.children.filter((o) => o.name === `dome${D}:${part}`) as THREE.InstancedMesh[];
				expect(ims).toHaveLength(1);
				expect(ims[0].isInstancedMesh).toBe(true);
				expect(ims[0].count).toBe(count(D));
			}
		}
		// every home block's storeys are one InstancedMesh too
		expect(root.children.filter((o) => o.name === 'homes')).toHaveLength(1);
	});
	test('all seven hexes under 400 draw objects', () => {
		const { draws, tris } = census(root);
		expect(draws).toBeLessThan(400);
		expect(tris).toBeGreaterThan(0);
		console.log(`sandbox-6 census: ${draws} draws, ${tris} triangles`);
	});
	test('a cap is a third as high as it is wide, its floor at the ground', () => {
		const g = geodesicCap(80, 11);
		g.computeBoundingBox();
		expect(g.boundingBox!.min.y).toBeGreaterThanOrEqual(-0.01);
		expect(g.boundingBox!.max.y).toBeCloseTo(80 / 3, 0);
	});
	dispose();
});

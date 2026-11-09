// Sandbox 7's planet draws cheaply (intent 8d683ad6, c7): built on the CPU from its tiles and its configs, it is at most
// eight draw objects (the cards one mesh, the core, three tree meshes, the sites' pins one mesh) and its cards at most
// 60 % of the triangles the old planet drew for them (a fan and two side triangles a corner).
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { biomes, planet, tiles } from './fixture';
import { buildPlanet, census, oldCardTris, topOf } from './scene';

describe('the planet in 3D', () => {
	const T = tiles();
	const pins = [{ lat: 40.5, lon: -1.5 }, { lat: 37.6, lon: -2.6 }];
	const built = buildPlanet(T, planet, biomes, pins);
	test('at most eight draw objects', () => {
		const { draws, tris, cardTris } = census(built.root);
		console.log(`sandbox-7 census: ${draws} draws, ${tris} triangles (cards ${cardTris}, the old planet's cards ${oldCardTris(T)})`);
		expect(draws).toBeLessThanOrEqual(8);
		const names = built.root.children.map((o) => o.name).sort();
		expect(names).toEqual(['canopies', 'cards', 'core', 'fruit', 'sites', 'trunks']);
		for (const n of ['canopies', 'fruit', 'sites', 'trunks']) expect((built.root.getObjectByName(n) as THREE.InstancedMesh).isInstancedMesh).toBe(true);
	});
	test('the cards at most 60 % of the old planet’s triangles', () => {
		const { cardTris } = census(built.root);
		expect(cardTris).toBeLessThanOrEqual(oldCardTris(T) * 0.6);
	});
	test('the cards’ faces stand at their tops and face out', () => {
		const g = built.cards.geometry;
		const pos = g.attributes.position as THREE.BufferAttribute, idx = g.index!;
		// the first card's face: its first triangle's corners at its top, wound to face away from the centre
		const t = T[0]!, top = topOf(t, planet, biomes);
		const a = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(0)), b = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(1)), c = new THREE.Vector3().fromBufferAttribute(pos, idx.getX(2));
		for (const p of [a, b, c]) expect(p.length()).toBeCloseTo(top, 4);
		const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
		expect(n.dot(a)).toBeGreaterThan(0);
	});
	test('a pin a site, its foot on the top of the card it falls on', () => {
		expect(built.markers.count).toBe(pins.length);
		for (const p of built.pins) expect(p.at.length()).toBeGreaterThan(planet.radius - 1);
	});
});

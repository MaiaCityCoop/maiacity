// Light through leaves (intent 6fd5e63f): a look drawn by the page's own TSL on WebGLRenderer through three's
// WebGLNodesHandler, on a context that only answers (./fakegl.js): instanced, shadowed, as a world draws a plant's
// copies. Each shader it hands the graphics card is read: the wind's uniforms and aWind in the vertex stage, the
// backlight in the fragment stage, nothing of it in a look that has none.
import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import * as tsl from 'three/tsl';
import { WebGLNodesHandler } from 'three/addons/tsl/WebGLNodesHandler.js';
import { fakeGL } from './fakegl.js';
import { foliageOf } from './foliage.js';
import { windNodes } from './wind.js';

globalThis.self ??= globalThis;
globalThis.ImageBitmap ??= class {};

function draw(material, { instanced = true } = {}) {
	const { gl, shaders } = fakeGL();
	const r = new THREE.WebGLRenderer({ canvas: gl.canvas, context: gl });
	r.shadowMap.enabled = true;
	r.setNodesHandler(new WebGLNodesHandler());
	const scene = new THREE.Scene();
	const sun = new THREE.DirectionalLight('#fff', 2);
	sun.castShadow = true;
	sun.position.set(-3, 2, -4);
	scene.add(sun, new THREE.AmbientLight('#fff', 0.3));
	const g = new THREE.PlaneGeometry(1, 1, 2, 2).translate(0, 0.5, 0);
	const mesh = instanced ? new THREE.InstancedMesh(g, material, 3) : new THREE.Mesh(g, material);
	if (instanced) {
		g.setAttribute('aWind', new THREE.InstancedBufferAttribute(new Float32Array(12), 4));
		for (let i = 0; i < 3; i++) mesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(i, 0, 0));
	}
	mesh.castShadow = true;
	scene.add(mesh);
	const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
	camera.position.set(0, 1, 4);
	r.render(scene, camera);
	const vertex = shaders.filter((s) => /gl_Position/.test(s));
	const fragment = shaders.filter((s) => !/gl_Position/.test(s));
	return { vertex: vertex.join('\n'), fragment: fragment.join('\n') };
}

const leafMaterial = () => {
	const m = new THREE.MeshStandardMaterial({ color: 0x3f7a2a, transparent: true, opacity: 1 });
	m.name = 'leaf';
	return m;
};

describe('a leaf drawn by its look', () => {
	test('is two-sided and cut out, never blended, its colour kept', () => {
		const m = foliageOf(leafMaterial(), { kind: 'leaf' }, {});
		expect(m.side).toBe(THREE.DoubleSide);
		expect(m.transparent).toBe(false);
		expect(m.alphaTest).toBe(0.5);
		expect(m.color.getHex()).toBe(0x3f7a2a);
		expect(m.look).toMatchObject({ kind: 'leaf', translucency: 0.6 });
	});

	test('refuses a look that is not one', () => {
		expect(() => foliageOf(leafMaterial(), { kind: 'glass' })).toThrow(/no look glass/);
	});

	test('compiles: the wind bends it in the vertex stage, the backlight lights it in the fragment stage', () => {
		const wind = windNodes(tsl, { strength: 0.7 });
		const { vertex, fragment } = draw(foliageOf(leafMaterial(), { kind: 'leaf' }, { wind }));
		expect(vertex).toMatch(/aWind/);
		expect(vertex).toMatch(/vFoliageHeight/);
		expect(fragment).toMatch(/vFoliageHeight/);
		expect(fragment).toMatch(/pow\(/);
	});

	test('a look the wind does not move (stone) and a material with no look compile without it', () => {
		const wind = windNodes(tsl);
		const stone = new THREE.MeshStandardMaterial({ color: 0x888888 });
		const { vertex } = draw(foliageOf(stone, { kind: 'stone' }, { wind }));
		expect(vertex).not.toMatch(/aWind/);
		const plain = foliageOf(stone, null);
		expect(plain.look).toBeNull();
		const drawn = draw(plain, { instanced: false });
		expect(drawn.vertex).not.toMatch(/aWind|vFoliageHeight/);
	});

	test('two looks are two programs, the same look one', () => {
		const wind = windNodes(tsl);
		const a = foliageOf(leafMaterial(), { kind: 'leaf' }, { wind }), b = foliageOf(leafMaterial(), { kind: 'leaf' }, { wind }), c = foliageOf(leafMaterial(), { kind: 'grass' }, { wind });
		expect(a.customProgramCacheKey()).toBe(b.customProgramCacheKey());
		expect(a.customProgramCacheKey()).not.toBe(c.customProgramCacheKey());
	});
});

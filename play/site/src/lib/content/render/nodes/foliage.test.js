// Light through leaves (intent 6fd5e63f): a look drawn by the page's own TSL on WebGLRenderer through three's
// WebGLNodesHandler, on a context that only answers (./fakegl.js, intent cb16b7a5's): instanced, shadowed, as a world draws a plant's
// copies. Each shader it hands the graphics card is read: the wind's uniforms and aWind in the vertex stage, the
// backlight in the fragment stage, nothing of it in a look that has none.
import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import * as tsl from 'three/tsl';
import { WebGLNodesHandler } from 'three/addons/tsl/WebGLNodesHandler.js';
import { fakeGL } from './fakegl.js';
import { LEAK, foliageOf } from '../foliage.js';
import { windNodes } from '../wind.js';

globalThis.self ??= globalThis;
globalThis.ImageBitmap ??= class {};

function draw(material, { instanced = true, receive = false } = {}) {
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
	mesh.receiveShadow = receive;
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

	test("a backlit leaf in its own crown's shade still glows: the light through it is the sun before the shadow, let through by LEAK, tinted lighter", () => {
		const wind = windNodes(tsl, { strength: 0.7 });
		for (const receive of [false, true]) {
			const { fragment } = draw(foliageOf(leafMaterial(), { kind: 'leaf' }, { wind }), { receive });
			// the glow's tint, the leaf's colour lightened
			expect(fragment).toMatch(/sqrt\(/);
			expect(fragment).toMatch(/pow\(/);
		}
		expect(LEAK).toBeGreaterThan(0);
		expect(LEAK).toBeLessThan(1);
	});

	test('what is not read far off is left out: no flutter where a look has none or a level is coarse, no glow from level 2', () => {
		const wind = windNodes(tsl, { strength: 0.7 });
		const count = (src, re) => (src.match(re) ?? []).length;
		const at = (level, look = { kind: 'leaf' }) => {
			const m = foliageOf(leafMaterial(), look, { wind });
			m.level = level;
			return draw(m);
		};
		const near = at(0), mid = at(1), far = at(2);
		// the flutter's four smoothed triangle waves (fract) are in the finest level only, behind a per-copy branch
		expect(count(near.vertex, /fract\(/g)).toBeGreaterThan(count(mid.vertex, /fract\(/g));
		expect(count(mid.vertex, /fract\(/g)).toBe(count(far.vertex, /fract\(/g));
		// a look with no flutter (a stem's own is damped, a fruit's none) compiles none even at level 0
		const fruit = at(0, { kind: 'fruit' });
		expect(count(fruit.vertex, /fract\(/g)).toBe(count(mid.vertex, /fract\(/g));
		// the glow (the backlight's pow) is gone from level 2; the bend and the darker foot stay at every level
		expect(count(far.fragment, /pow\(/g)).toBeLessThan(count(mid.fragment, /pow\(/g));
		for (const d of [near, mid, far]) {
			expect(d.vertex).toMatch(/aWind/);
			expect(d.fragment).toMatch(/vFoliageHeight/);
		}
		// three programs, one a tier, however many levels
		const key = (level) => Object.assign(foliageOf(leafMaterial(), { kind: 'leaf' }, { wind }), { level }).customProgramCacheKey();
		expect(new Set([0, 1, 2, 3].map(key)).size).toBe(3);
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

describe("on the render kit's own materials (intent cb16b7a5)", () => {
	test("a level's leaf material: the kit's node material with its fade and cut, the look on top, compiled whole", async () => {
		const { nodeOf, cutBy, cutOf, aFade, install } = await import('./index.js');
		const { lookedOf } = await import('../foliage.js');
		const { fakeGL: kitGL } = await import('./fakegl.js');
		const wind = windNodes(tsl);
		const leaf = leafMaterial();
		leaf.userData.look = { kind: 'leaf' };
		const n = cutBy(lookedOf(nodeOf(leaf), leaf.userData.look, wind), cutOf());
		n.fade = aFade;
		expect(n.look?.kind).toBe('leaf');
		expect(n.cut).toBeTruthy();
		const { gl, shaders } = kitGL();
		const r = new THREE.WebGLRenderer({ canvas: gl.canvas, context: gl });
		install(r);
		const scene = new THREE.Scene();
		scene.add(new THREE.DirectionalLight('#fff', 2));
		const g = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
		g.setAttribute('aFade', new THREE.InstancedBufferAttribute(new Float32Array(2), 1));
		g.setAttribute('aWind', new THREE.InstancedBufferAttribute(new Float32Array(8), 4));
		scene.add(new THREE.InstancedMesh(g, n, 2));
		r.render(scene, new THREE.PerspectiveCamera());
		const vertex = shaders.filter((s) => /gl_Position/.test(s)).join('\n');
		expect(vertex).toMatch(/aWind/);
		expect(vertex).toMatch(/aFade/);
		expect(vertex).toMatch(/instanceMatrix/);
		// the wind after the kit's own instancing
		expect(vertex.indexOf('instanceMatrix')).toBeLessThan(vertex.lastIndexOf('aWind'));
	});

	test('a material with no look is the kit\'s own, untouched', async () => {
		const { nodeOf } = await import('./index.js');
		const { lookedOf } = await import('../foliage.js');
		const n = nodeOf(new THREE.MeshStandardMaterial());
		expect(lookedOf(n, null, windNodes(tsl))).toBe(n);
		expect(lookedOf(n, { kind: 'leaf' }, null)).toBe(n);
	});
});

describe('one copy bends as one', () => {
	test('every look of a copy takes the same main bend (stiffness 1): its leaves stay on its branches', () => {
		const wind = windNodes(tsl);
		const asked = [];
		const positionOf = wind.positionOf;
		wind.positionOf = (o) => (asked.push(o), positionOf(o));
		for (const kind of ['leaf', 'bark', 'stem', 'fruit']) {
			const m = new THREE.MeshStandardMaterial();
			draw(foliageOf(m, { kind }, { wind }));
		}
		expect(asked.length).toBe(4);
		for (const o of asked) expect(o.stiffness).toBe(1);
		// the tips' own flutter differs by the look
		expect(asked[0].flutter).toBeGreaterThan(asked[1].flutter);
	});
});

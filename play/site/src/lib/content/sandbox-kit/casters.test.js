// A thing casts a shadow only while it reads as one (intent 405f7a85): under 20 px of the view it casts none, and it
// casts again as the eye nears.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CASCADES, castBySize, ready, seeStandIns, shadowsMoved, SMALL, standIns } from './casters.js';
import { SunLight } from 'three/addons/lights/SunLight.js';

/** the worlds' camera (68° high) at x, z looking along -z */
const cameraAt = (x, z) => {
	const c = new THREE.PerspectiveCamera(68, 1.6, 0.1, 2000);
	c.position.set(x, 1.7, z);
	c.updateMatrixWorld();
	return c;
};
/** a box `size` m a side at x, z, cast as the worlds' own helpers make them */
const boxAt = (size, x, z, casts = true) => {
	const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial());
	m.position.set(x, size / 2, z);
	m.castShadow = casts;
	return m;
};

/** whether anything casts for `o`: itself, or its stand-ins (intent 7313fb26) */
const casts = (o) => o.castShadow || o.children.some((c) => c.userData.standIn && c.castShadow);

describe('who casts a shadow', () => {
	it('a small thing far off casts none, a big one does, and what was never made to cast stays so', () => {
		const scene = new THREE.Scene();
		const shade = boxAt(0.3, 0, -100), house = boxAt(8, 0, -100), pot = boxAt(0.3, 0, -3), glass = boxAt(8, 5, -20, false);
		scene.add(shade, house, pot, glass);
		scene.updateMatrixWorld();
		expect(castBySize(scene, cameraAt(0, 0))).toBe(true);
		expect([shade, house, pot, glass].map(casts)).toEqual([false, true, true, false]);
		// nothing moved: nothing changes, and the shadows need not be drawn again
		expect(castBySize(scene, cameraAt(0, 0))).toBe(false);
	});

	it('it casts again as the eye nears, at the size the skill names: 20 px of a 1080 px screen', () => {
		const scene = new THREE.Scene();
		const shade = boxAt(0.3, 0, 0);
		scene.add(shade);
		scene.updateMatrixWorld();
		const r = Math.hypot(0.15, 0.15, 0.15), tan = Math.tan(THREE.MathUtils.degToRad(34));
		// where its ball is exactly SMALL of the view's height
		const line = r / (SMALL * tan);
		expect(line).toBeGreaterThan(15);
		expect(line).toBeLessThan(25);
		castBySize(scene, cameraAt(0, line * 1.3));
		expect(casts(shade)).toBe(false);
		// on the line it is held as it was, not flickering
		castBySize(scene, cameraAt(0, line * 0.97));
		expect(casts(shade)).toBe(false);
		expect(castBySize(scene, cameraAt(0, line * 0.6))).toBe(true);
		expect(casts(shade)).toBe(true);
		castBySize(scene, cameraAt(0, line * 0.97));
		expect(casts(shade)).toBe(true);
	});

	it('an instanced mesh casts while its nearest copy may; what three does not cull casts at any size, and what is hidden is left alone', () => {
		const scene = new THREE.Scene();
		const pots = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial(), 2);
		pots.setMatrixAt(0, new THREE.Matrix4().makeTranslation(0, 0, -4));
		pots.setMatrixAt(1, new THREE.Matrix4().makeTranslation(0, 0, -300));
		pots.castShadow = true;
		pots.computeBoundingSphere();
		const far = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial(), 1);
		far.setMatrixAt(0, new THREE.Matrix4().makeTranslation(0, 0, -300));
		far.castShadow = true;
		far.computeBoundingSphere();
		const kept = boxAt(0.3, 0, -300);
		kept.frustumCulled = false;
		const hidden = boxAt(0.3, 0, -300);
		hidden.visible = false;
		scene.add(pots, far, kept, hidden);
		scene.updateMatrixWorld();
		castBySize(scene, cameraAt(0, 0));
		expect([pots, far, kept, hidden].map(casts)).toEqual([true, false, true, true]);
	});
});

// A shadow pass draws stand-ins (intent 7313fb26): each caster simplified for each of the sun's two cascades, on a
// layer only that cascade's camera sees, the picture's own meshes casting nothing.
describe('stand-ins', () => {
	const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
	const ball = (r, x = 0, mat = new THREE.MeshStandardMaterial()) => {
		const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), mat);
		m.position.set(x, r, -10);
		m.updateMatrixWorld();
		return m;
	};

	it('stand-in: a bake casts one stand-in a cascade, each on its own layer, simplified within its error and fewer triangles', async () => {
		await ready;
		const big = ball(1), [near, far] = standIns([big]);
		expect([near.layers.mask, far.layers.mask]).toEqual(CASCADES.map((c) => 1 << c.layer));
		expect(near.castShadow && far.castShadow).toBe(true);
		// a 3,000-triangle ball: far fewer, the far one fewer still, and still the ball's size within its error
		expect(tris(near.geometry)).toBeLessThan(tris(big.geometry) / 4);
		expect(tris(far.geometry)).toBeLessThan(tris(near.geometry));
		for (const [s, c] of [[near, CASCADES[0]], [far, CASCADES[1]]]) {
			s.geometry.computeBoundingBox();
			const size = s.geometry.boundingBox.getSize(new THREE.Vector3());
			expect(Math.abs(size.y - 2)).toBeLessThanOrEqual(2 * c.error);
		}
	});

	it('stand-in: what is narrower than a cascade can show is left out of it, and glass casts nothing', async () => {
		await ready;
		const pebble = ball((CASCADES[0].least + CASCADES[1].least) / 4);
		const s = standIns([pebble]);
		expect(s.map((m) => m.layers.mask)).toEqual([1 << CASCADES[0].layer]);
		expect(standIns([ball(1, 0, new THREE.MeshPhysicalMaterial({ transmission: 1 }))])).toEqual([]);
		expect(standIns([ball(1, 0, new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.3 }))])).toEqual([]);
	});

	it('stand-in: a hand-built caster met by the size rule is cast by twins hung under it, and casts no more itself', async () => {
		await ready;
		const scene = new THREE.Scene(), house = boxAt(8, 0, -30);
		scene.add(house);
		scene.updateMatrixWorld();
		expect(castBySize(scene, cameraAt(0, 0))).toBe(true);
		expect(house.castShadow).toBe(false);
		const twins = house.children.filter((c) => c.userData.standIn);
		expect(twins.map((t) => t.layers.mask)).toEqual(CASCADES.map((c) => 1 << c.layer));
		expect(twins.every((t) => t.castShadow)).toBe(true);
		// met again, nothing new is made
		castBySize(scene, cameraAt(0, 0));
		expect(house.children.length).toBe(2);
	});

	it('stand-in: an instanced caster’s twins draw its copies: the same buffer, the same count as it changes', async () => {
		await ready;
		const scene = new THREE.Scene();
		const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 24), new THREE.MeshStandardMaterial(), 10);
		for (let i = 0; i < 10; i++) posts.setMatrixAt(i, new THREE.Matrix4().makeTranslation(i * 2, 1.5, -12));
		posts.castShadow = true;
		scene.add(posts);
		scene.updateMatrixWorld();
		castBySize(scene, cameraAt(0, 0));
		const twins = posts.children.filter((c) => c.userData.standIn);
		expect(twins.length).toBe(2);
		for (const t of twins) expect(t.instanceMatrix).toBe(posts.instanceMatrix);
		posts.count = 4;
		expect(twins.map((t) => t.count)).toEqual([4, 4]);
	});

	it('stand-in: what draws its own shadow (the asset renderer’s copies) is left to it', async () => {
		await ready;
		const scene = new THREE.Scene(), own = boxAt(8, 0, -30);
		own.onBeforeShadow = () => {};
		scene.add(own);
		scene.updateMatrixWorld();
		castBySize(scene, cameraAt(0, 0));
		expect(own.castShadow).toBe(true);
		expect(own.children.length).toBe(0);
	});

	it('stand-in: each cascade’s camera sees its own stand-ins and every caster on layer 0', () => {
		const sun = new SunLight();
		seeStandIns(sun.shadow);
		CASCADES.forEach((c, i) => {
			const cam = sun.shadow.getCamera(i);
			expect(cam.layers.isEnabled(0) && cam.layers.isEnabled(c.layer)).toBe(true);
			expect(cam.layers.isEnabled(CASCADES[1 - i].layer)).toBe(false);
			expect(cam.userData.slice).toBe(sun.shadow._cascadeData[i]);
		});
	});

	it('stand-in: the shadows are drawn again once the eye has moved 2 m or turned 2°, not before', () => {
		const eye = new THREE.Vector3(), look = new THREE.Vector3(0, 0, -1);
		const turned = (deg) => look.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(deg));
		expect(shadowsMoved(eye, look, new THREE.Vector3(1.9, 0, 0), look, 2)).toBe(false);
		expect(shadowsMoved(eye, look, new THREE.Vector3(2.1, 0, 0), look, 2)).toBe(true);
		expect(shadowsMoved(eye, look, eye, turned(1.9), 2)).toBe(false);
		expect(shadowsMoved(eye, look, eye, turned(2.1), 2)).toBe(true);
	});
});

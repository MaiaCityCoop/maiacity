// A thing casts a shadow only while it reads as one (intent 405f7a85): under 20 px of the view it casts none, and it
// casts again as the eye nears.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { castBySize, SMALL } from './casters.js';

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

describe('who casts a shadow', () => {
	it('a small thing far off casts none, a big one does, and what was never made to cast stays so', () => {
		const scene = new THREE.Scene();
		const shade = boxAt(0.3, 0, -100), house = boxAt(8, 0, -100), pot = boxAt(0.3, 0, -3), glass = boxAt(8, 5, -20, false);
		scene.add(shade, house, pot, glass);
		scene.updateMatrixWorld();
		expect(castBySize(scene, cameraAt(0, 0))).toBe(true);
		expect([shade, house, pot, glass].map((o) => o.castShadow)).toEqual([false, true, true, false]);
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
		expect(shade.castShadow).toBe(false);
		// on the line it is held as it was, not flickering
		castBySize(scene, cameraAt(0, line * 0.97));
		expect(shade.castShadow).toBe(false);
		expect(castBySize(scene, cameraAt(0, line * 0.6))).toBe(true);
		expect(shade.castShadow).toBe(true);
		castBySize(scene, cameraAt(0, line * 0.97));
		expect(shade.castShadow).toBe(true);
	});

	it('an instanced mesh casts while its nearest copy may; what three does not cull, and what is hidden, is left alone', () => {
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
		expect([pots, far, kept, hidden].map((o) => o.castShadow)).toEqual([true, false, true, true]);
	});
});

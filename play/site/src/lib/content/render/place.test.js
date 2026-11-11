// Each frame only what is seen is placed, and only what moved is made again (intent 0356b0ea; ./core.js `place`)
import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import { place } from './core.js';

/** one sequence of numbers in [0, 1), the same every run */
function seeded(seed = 5) {
	let s = seed >>> 0;
	return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** a tree of `n` objects hung on one another at random, each placed, turned and sized */
function forest(n, rand) {
	const root = new THREE.Scene();
	const all = [root];
	for (let i = 0; i < n; i++) {
		const o = new THREE.Object3D();
		o.position.set(rand() * 10, rand() * 10, rand() * 10);
		o.rotation.set(rand(), rand(), rand());
		o.scale.setScalar(0.5 + rand());
		all[Math.floor(rand() * all.length)].add(o);
		all.push(o);
	}
	return { root, all };
}

/** the same tree, its objects in the same order */
function twin(all) {
	const copy = all[0].clone(true), out = [];
	copy.traverse((o) => out.push(o));
	const order = [];
	all[0].traverse((o) => order.push(o));
	return all.map((o) => out[order.indexOf(o)]);
}

describe('placing a frame', () => {
	test('gives every shown object the place three gives it, frame by frame, while some move, hide and show again', () => {
		const rand = seeded();
		const { all } = forest(300, rand);
		const ours = all, theirs = twin(all);
		for (let frame = 0; frame < 40; frame++) {
			for (let k = 0; k < 12; k++) {
				const i = 1 + Math.floor(rand() * (all.length - 1)), what = rand();
				for (const side of [ours, theirs]) {
					const o = side[i];
					if (what < 0.4) o.position.x += 0.25;
					else if (what < 0.6) o.rotation.y += 0.1;
					else if (what < 0.7) o.scale.y *= 1.1;
					else if (what < 0.85) o.visible = !o.visible;
					else o.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), frame);
				}
			}
			place(ours[0], false);
			theirs[0].updateMatrixWorld();
			// every object that is shown, with all it hangs on: where three puts it
			for (let i = 0; i < all.length; i++) {
				let seen = true;
				for (let o = ours[i]; o; o = o.parent) seen &&= o.visible;
				if (!seen) continue;
				const a = ours[i].matrixWorld.elements, b = theirs[i].matrixWorld.elements;
				for (let e = 0; e < 16; e++) expect(a[e], `object ${i}, frame ${frame}`).toBeCloseTo(b[e], 9);
			}
		}
	});

	test('makes nothing again where nothing moved', () => {
		const { root, all } = forest(200, seeded(9));
		place(root, false);
		let made = 0;
		for (const o of all) {
			const was = o.updateMatrix.bind(o);
			o.updateMatrix = () => (made++, was());
		}
		for (let f = 0; f < 5; f++) place(root, false);
		expect(made).toBe(0);
		// one moved: it alone is made again, and what hangs under it placed anew
		all[7].position.y += 1;
		const under = [];
		all[7].traverse((o) => under.push(o));
		const before = under.map((o) => o.matrixWorld.clone());
		place(root, false);
		expect(made).toBe(1);
		under.forEach((o, i) => expect(o.matrixWorld.equals(before[i])).toBe(false));
	});
});

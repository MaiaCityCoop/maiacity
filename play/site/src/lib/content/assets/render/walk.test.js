// A walking step looks at a cell before its copies, and draws what looking at every copy draws (intent 0356b0ea; ./walk.js)
import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import { createCells, seen } from './walk.js';
import { SMALLEST, choose, sizeOn } from './lod.js';
import { coverGrow } from '../../render/nodes/index.js';

/** one sequence of numbers in [0, 1), the same every run */
function seeded(seed = 7) {
	let s = seed >>> 0;
	return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** a kind as the renderer holds it: its ball at scale 1 (centre and radius) and its levels' thresholds */
const KIND = { center: new THREE.Vector3(0.4, 2.5, -0.3), radius: 3, thresholds: [0.3, 0.08, 0.02] };

/** a forest of `n` copies over `span` metres, a third of them cover that grows only so far from the eye */
function field(n, span, rand = seeded()) {
	const copies = [];
	for (let i = 0; i < n; i++) {
		const cover = rand() < 1 / 3;
		copies.push({ x: (rand() - 0.5) * span, y: rand() * 6, z: (rand() - 0.5) * span, scale: 0.5 + rand() * 1.5, cover: cover ? { rank: rand() * 0.9, near: 10, reach: 40 + rand() * 40, thin: 0.3 } : null, alive: true });
	}
	return copies;
}

/**
 * What the renderer decides for one copy (index.js `update`, copy by copy): -1 not drawn (its cover does not grow
 * here, out of view, or too small), else the level it is drawn at, held near a threshold to the level it `was` at.
 */
function decide(c, was, frustum, eye, tanHalf, ball) {
	let g = 1;
	if (c.cover) {
		g = coverGrow(Math.hypot(c.x - eye.x, c.z - eye.z), c.cover.rank, c.cover.near, c.cover.reach, c.cover.thin);
		if (!(g > 0)) return -1;
	}
	ball.center.set(c.x + KIND.center.x * c.scale, c.y + KIND.center.y * c.scale, c.z + KIND.center.z * c.scale);
	ball.radius = KIND.radius * c.scale * g;
	if (!frustum.intersectsSphere(ball)) return -1;
	const size = sizeOn(ball.radius, ball.center.distanceTo(eye), tanHalf);
	if (size < SMALLEST) return -1;
	return choose(size, KIND.thresholds, was).level;
}

/** the view of a walk's step `t`: forward and turning, as a visitor walks */
function viewAt(camera, t) {
	camera.position.set(Math.sin(t * 0.05) * 30, 1.7, 120 - t * 1.5);
	camera.rotation.set(-0.05, t * 0.06, 0, 'YXZ');
	camera.updateMatrixWorld();
	camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
	const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
	return { frustum, eye: camera.position.clone(), tanHalf: Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) };
}

/** a walk of `steps` over `copies`, by the cells and copy by copy: each step's levels of both, and the copies looked at */
function walk(copies, steps, change = (_t, _cells) => {}) {
	const camera = new THREE.PerspectiveCamera(68, 16 / 10, 0.1, 2000);
	const cells = createCells();
	const kind = { radius: KIND.radius, offset: KIND.center.length() };
	const stand = (i) => (copies[i].alive ? cells.put(i, copies[i].x, copies[i].y, copies[i].z, copies[i].scale, copies[i].cover ? copies[i].cover.reach : Infinity) : cells.drop(i));
	copies.forEach((_, i) => stand(i));
	const byCell = new Int8Array(copies.length).fill(-1), byCopy = new Int8Array(copies.length).fill(-1);
	const ball = new THREE.Sphere(), cellBall = new THREE.Sphere();
	const looked = [];
	for (let t = 0; t < steps; t++) {
		for (const i of change(t, cells) ?? []) {
			stand(i);
			// put away or moved, the renderer forgets its level
			byCell[i] = byCopy[i] = -1;
		}
		const { frustum, eye, tanHalf } = viewAt(camera, t);
		looked.push(
			cells.visit(
				(c) => seen(c, frustum, eye, tanHalf, kind, eye, SMALLEST, sizeOn, cellBall),
				(i) => (byCell[i] = decide(copies[i], byCell[i], frustum, eye, tanHalf, ball)) !== -1
			)
		);
		for (let i = 0; i < copies.length; i++) byCopy[i] = copies[i].alive ? decide(copies[i], byCopy[i], frustum, eye, tanHalf, ball) : -1;
		expect(Array.from(byCell), `step ${t}`).toEqual(Array.from(byCopy));
	}
	return { looked, drawn: byCopy.filter((l) => l !== -1).length };
}

describe('a walk through a forest', () => {
	test('draws at every step exactly the copies, each at the level, that looking at every copy draws', () => {
		const copies = field(6000, 600);
		const { looked, drawn } = walk(copies, 80);
		expect(drawn).toBeGreaterThan(50);
		// the first step looks at every copy just put down; from then on at far fewer than stand there
		expect(looked[0]).toBe(copies.length);
		const walked = looked.slice(1);
		expect(walked.reduce((a, b) => a + b, 0) / walked.length).toBeLessThan(copies.length / 2);
		expect(Math.max(...walked)).toBeLessThan(copies.length * 0.75);
	});

	test('a copy going out of view is looked at once more, then its cell is passed over', () => {
		const copies = [{ x: 0, y: 0, z: 0, scale: 1, cover: null, alive: true }];
		const cells = createCells();
		cells.put(0, 0, 0, 0, 1);
		const calls = [];
		const each = (shown) => (i) => (calls.push(i), shown);
		expect(cells.visit(() => true, each(true))).toBe(1);
		// out of view now, but drawn last time: looked at, so its level is forgotten
		expect(cells.visit(() => false, each(false))).toBe(1);
		expect(cells.visit(() => false, each(false))).toBe(0);
		expect(cells.visit(() => true, each(true))).toBe(1);
		expect(calls).toEqual([0, 0, 0]);
		expect(copies.length).toBe(cells.copies);
	});

	test('copies moved, put away and put back are still drawn as looking at every copy draws them', () => {
		const copies = field(1500, 300, seeded(11));
		const rand = seeded(3);
		walk(copies, 60, (t) => {
			const changed = [];
			for (let n = 0; n < 40; n++) {
				const i = Math.floor(rand() * copies.length), c = copies[i];
				if (t % 3 === 0) c.alive = !c.alive;
				else Object.assign(c, { x: (rand() - 0.5) * 300, z: (rand() - 0.5) * 300, scale: 0.5 + rand() * 3 });
				changed.push(i);
			}
			return changed;
		});
	});

	test('a cell holds its copies and goes when its last copy does', () => {
		const cells = createCells(10);
		cells.put(0, 1, 0, 1, 1);
		cells.put(1, 2, 0, 2, 1);
		cells.put(2, 25, 0, 1, 1);
		expect([cells.copies, cells.cells]).toEqual([3, 2]);
		cells.put(0, 26, 0, 2, 1);
		expect([cells.copies, cells.cells]).toEqual([3, 2]);
		cells.drop(1);
		expect([cells.copies, cells.cells]).toEqual([2, 1]);
		cells.drop(1);
		const seenCopies = [];
		cells.visit(() => true, (i) => (seenCopies.push(i), true));
		expect(seenCopies.sort()).toEqual([0, 2]);
	});
});

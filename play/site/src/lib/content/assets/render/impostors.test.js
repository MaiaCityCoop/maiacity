// Far pictures as hemi-octahedral impostors (intent 3a8b135a c2): a direction to its place on the grid and back, the
// three views nearest the eye and their weights, the views' frames as the bake aims its camera, and the switch.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { decode, encode, nearest, upOf, viewOf } from './impostors.js';
import { LEVELS, SCREEN, switchAt } from './lod.js';

const unit = (x, y, z) => {
	const l = Math.hypot(x, y, z);
	return [x / l, y / l, z / l];
};
/** directions all over the upper half, the poles and the horizon among them */
const dirs = [[0, 1, 0], [1, 0, 0], [0, 0, -1], [-1, 0.0001, 0], unit(1, 1, 1), unit(-0.3, 0.2, 0.9), unit(0.7, 0.05, -0.7), unit(-2, 5, -1)];
for (let k = 0; k < 40; k++) dirs.push(unit(Math.sin(k * 2.39) * (1 + (k % 3)), (k % 7) / 6, Math.cos(k * 2.39) * (1 + (k % 3))));

describe('the hemi-octahedral square', () => {
	it('takes every direction of the upper half to a place on the square and back', () => {
		for (const d of dirs) {
			const [u, v] = encode(...d);
			expect(Math.abs(u)).toBeLessThanOrEqual(1 + 1e-9);
			expect(Math.abs(v)).toBeLessThanOrEqual(1 + 1e-9);
			decode(u, v).forEach((c, i) => expect(c).toBeCloseTo(d[i], 7));
		}
	});

	it('lays a direction below the horizon on it, and its corners and middle are the horizon and straight up', () => {
		const [u, v] = encode(0.6, -0.8, 0);
		expect(decode(u, v).map((c) => +c.toFixed(9))).toEqual([1, 0, 0]);
		expect(decode(0, 0)).toEqual([0, 1, 0]);
		for (const [u, v] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) expect(decode(u, v)[1]).toBeCloseTo(0, 12);
	});

	it('aims each view as the card reads it: right, up and the view a right-handed frame, as three aims a camera', () => {
		const cam = new THREE.OrthographicCamera();
		for (const n of [6, 8]) {
			for (let j = 0; j < n; j++)
				for (let i = 0; i < n; i++) {
					const d = viewOf(i, j, n), up = upOf(d);
					const r = new THREE.Vector3(...up).cross(new THREE.Vector3(...d)).normalize(), u = new THREE.Vector3(...d).cross(r);
					cam.position.set(...d).multiplyScalar(10);
					cam.up.set(...up);
					cam.lookAt(0, 0, 0);
					cam.updateMatrixWorld();
					const e = cam.matrixWorld.elements;
					[0, 1, 2].forEach((k) => {
						expect(e[k]).toBeCloseTo(r.getComponent(k), 9);
						expect(e[4 + k]).toBeCloseTo(u.getComponent(k), 9);
						expect(e[8 + k]).toBeCloseTo(d[k], 9);
					});
				}
		}
	});
});

describe('the three nearest views', () => {
	it('weighs them to one, each between 0 and 1, and their weights put the eye back where it is on the grid', () => {
		for (const n of [6, 8, 16])
			for (const d of dirs) {
				const views = nearest(...d, n);
				expect(views).toHaveLength(3);
				expect(views.reduce((a, [, , w]) => a + w, 0)).toBeCloseTo(1, 12);
				for (const [i, j, w] of views) {
					expect(w).toBeGreaterThanOrEqual(-1e-12);
					expect(w).toBeLessThanOrEqual(1 + 1e-12);
					expect(i >= 0 && i < n && j >= 0 && j < n).toBe(true);
				}
				const [u, v] = encode(...d);
				const g = views.reduce((a, [i, j, w]) => [a[0] + i * w, a[1] + j * w], [0, 0]);
				expect(g[0]).toBeCloseTo((u * 0.5 + 0.5) * (n - 1), 9);
				expect(g[1]).toBeCloseTo((v * 0.5 + 0.5) * (n - 1), 9);
			}
	});

	it('shows a view alone when the eye looks from it, each of the three within a grid step of the eye', () => {
		const n = 8;
		for (let j = 0; j < n; j++)
			for (let i = 0; i < n; i++) {
				const top = nearest(...viewOf(i, j, n), n).sort((a, b) => b[2] - a[2])[0];
				expect([top[0], top[1], +top[2].toFixed(9)]).toEqual([i, j, 1]);
			}
		for (const d of dirs) {
			const [u, v] = encode(...d);
			const g = [(u * 0.5 + 0.5) * (n - 1), (v * 0.5 + 0.5) * (n - 1)];
			for (const [i, j] of nearest(...d, n)) expect(Math.max(Math.abs(i - g[0]), Math.abs(j - g[1]))).toBeLessThanOrEqual(1 + 1e-9);
		}
	});

	it('changes its blend smoothly as the eye goes round: no jump between neighbouring directions', () => {
		const n = 8, blend = (d) => {
			const out = new Map();
			for (const [i, j, w] of nearest(...d, n)) out.set(`${i},${j}`, (out.get(`${i},${j}`) ?? 0) + w);
			return out;
		};
		for (const y of [0.05, 0.3, 0.7])
			for (let a = 0; a < 720; a++) {
				const d0 = unit(Math.sin(a / 114.6), y, Math.cos(a / 114.6)), d1 = unit(Math.sin((a + 1) / 114.6), y, Math.cos((a + 1) / 114.6));
				const b0 = blend(d0), b1 = blend(d1);
				let moved = 0;
				for (const k of new Set([...b0.keys(), ...b1.keys()])) moved += Math.abs((b0.get(k) ?? 0) - (b1.get(k) ?? 0));
				expect(moved).toBeLessThan(0.15);
			}
	});
});

describe('the switch', () => {
	it('takes the picture at lod’s last threshold, or sooner where its views have the pixels for it', () => {
		expect(switchAt(64)).toBe(LEVELS[LEVELS.length - 1]);
		expect(switchAt(40)).toBe(LEVELS[LEVELS.length - 1]);
		expect(switchAt(512)).toBeCloseTo(512 / SCREEN, 12);
		expect(switchAt(Math.ceil(LEVELS[LEVELS.length - 1] * SCREEN))).toBeGreaterThanOrEqual(LEVELS[LEVELS.length - 1]);
	});
});

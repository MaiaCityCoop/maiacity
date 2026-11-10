// A per-copy buffer is sent only where it changed (intent 416c555c; ./send.js)
import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import { sender } from './send.js';

/** as three's renderer sends a buffer: its spans let go of, its version taken */
const upload = (/** @type {THREE.BufferAttribute} */ a) => (a.clearUpdateRanges(), a.version);

describe('a per-copy buffer', () => {
	test('goes whole the first time, then not at all while it holds what was sent', () => {
		const send = sender(), a = new THREE.InstancedBufferAttribute(new Float32Array(32), 16);
		a.array.set([1, 2, 3], 0);
		expect(send(a, 16)).toBe(true);
		expect(a.updateRanges).toEqual([{ start: 0, count: 32 }]);
		const v = upload(a);
		for (let i = 0; i < 5; i++) expect(send(a, 16)).toBe(false);
		expect(a.version).toBe(v);
		expect(a.updateRanges).toEqual([]);
	});
	test('is sent only over the span that differs', () => {
		const send = sender(), a = new THREE.InstancedBufferAttribute(new Float32Array(64), 16);
		send(a, 64);
		const v = upload(a);
		a.array[20] = 7;
		a.array[23] = 9;
		expect(send(a, 64)).toBe(true);
		expect(a.updateRanges).toEqual([{ start: 20, count: 4 }]);
		expect(a.version).toBe(v + 1);
		upload(a);
		expect(send(a, 64)).toBe(false);
	});
	test('more copies than before: only the new ones are sent; fewer: nothing', () => {
		const send = sender(), a = new THREE.InstancedBufferAttribute(new Float32Array(8), 1);
		a.array.set([1, 2, 3]);
		send(a, 3);
		upload(a);
		expect(send(a, 2)).toBe(false);
		a.array[3] = 4;
		expect(send(a, 4)).toBe(true);
		expect(a.updateRanges).toEqual([{ start: 3, count: 1 }]);
	});
	test('a span that still waits (the drawing was off screen) is kept: one span over both', () => {
		const send = sender(), a = new THREE.InstancedBufferAttribute(new Float32Array(32), 1);
		send(a, 32);
		upload(a);
		a.array[4] = 1;
		send(a, 32);
		// not drawn, so not sent; then another copy changes
		a.array[20] = 1;
		send(a, 32);
		expect(a.updateRanges).toEqual([{ start: 4, count: 17 }]);
		upload(a);
		// a value set back to what was sent is no change
		a.array[4] = 1;
		expect(send(a, 32)).toBe(false);
	});
	test('each sender knows only its own buffers', () => {
		const a = new THREE.InstancedBufferAttribute(new Float32Array(4), 1);
		expect(sender()(a, 4)).toBe(true);
		expect(sender()(a, 4)).toBe(true);
	});
});

// The core's precompile (./core.js; intents cb16b7a5 and 6fd5e63f): three's WebGLNodesHandler never settles
// compileAsync for a node material on a real GPU, so a warm-up of one is skipped (its shaders are made at its first
// draw), and no warm-up is waited on for longer than PRECOMPILE_MOST ms.
import { describe, expect, test, vi } from 'vitest';
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { PRECOMPILE_MOST, precompile } from './core.js';

const stub = (compileAsync) => ({ compileAsync: vi.fn(compileAsync) });
const cam = new THREE.PerspectiveCamera();

describe('precompile', () => {
	test('warms a classic material, started at once', async () => {
		const r = stub(() => Promise.resolve());
		const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
		const p = precompile(r, mesh, cam);
		expect(r.compileAsync).toHaveBeenCalledTimes(1);
		await p;
	});

	test('skips what a node material draws, and a scene that holds one', async () => {
		const r = stub(() => new Promise(() => {}));
		const node = new THREE.Mesh(new THREE.BoxGeometry(), new MeshStandardNodeMaterial());
		await precompile(r, node, cam);
		const scene = new THREE.Scene();
		scene.add(node);
		const classic = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
		await precompile(r, classic, cam, scene);
		expect(r.compileAsync).not.toHaveBeenCalled();
	});

	test('never waits longer than PRECOMPILE_MOST, and never throws', async () => {
		vi.useFakeTimers();
		try {
			const r = stub(() => new Promise(() => {}));
			const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
			let done = false;
			precompile(r, mesh, cam).then(() => (done = true));
			await vi.advanceTimersByTimeAsync(PRECOMPILE_MOST - 1);
			expect(done).toBe(false);
			await vi.advanceTimersByTimeAsync(2);
			expect(done).toBe(true);
		} finally {
			vi.useRealTimers();
		}
		await expect(precompile(stub(() => { throw new Error('no'); }), new THREE.Group(), cam)).resolves.toBeUndefined();
		await expect(precompile(stub(() => Promise.reject(new Error('no'))), new THREE.Group(), cam)).resolves.toBeUndefined();
	});
});

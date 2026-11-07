// The frame meter (intent bba9c796, c5): fed frames through a fake window and WebGL2 context, it reports per sample
// the draw calls, triangles, CPU ms, GPU ms (null without the timer extension) and what bounds the frame, and the
// line scripts/render.mjs prints names them. Runs under bun test and vitest alike.
import { describe, expect, test } from 'vitest';
import { boundOf, drawingsOf, installMeter, meterLine, trianglesOf } from './meter.js';

/** a window whose clock and frames the test drives, with a WebGL2 context class (timed or not) */
function fakeWindow({ timer = true, gpuNs = 6e6 } = {}) {
	let t = 0;
	let queued = [];
	class WebGL2RenderingContext {
		QUERY_RESULT_AVAILABLE = 1;
		QUERY_RESULT = 2;
		drawArrays() {}
		drawElements() {}
		drawArraysInstanced() {}
		drawElementsInstanced() {}
		drawRangeElements() {}
		getExtension(name) {
			return timer && name === 'EXT_disjoint_timer_query_webgl2' ? { TIME_ELAPSED_EXT: 10, GPU_DISJOINT_EXT: 11 } : null;
		}
		getParameter() {
			return false;
		}
		createQuery() {
			return {};
		}
		beginQuery() {}
		endQuery() {}
		deleteQuery() {}
		getQueryParameter(_q, p) {
			return p === 1 ? true : gpuNs;
		}
	}
	return {
		WebGL2RenderingContext,
		performance: { now: () => t },
		requestAnimationFrame: (cb) => queued.push(cb),
		/** time passing: `ms` of CPU work inside the callback running now */
		work(ms) {
			t += ms;
		},
		/** one display frame `ms` after the last: its callbacks run */
		frame(ms) {
			t = Math.ceil((t + 1e-9) / ms) * ms;
			const at = t;
			const cbs = queued;
			queued = [];
			for (const cb of cbs) cb(at);
		}
	};
}

/** a page that, every frame, draws 300 triangles, a strip of 10 vertices and 4 instances of 12 triangles, in `cpu` ms */
function page(win, gl, cpu = 2) {
	const loop = () => {
		gl.drawElements(4, 900, 5123, 0);
		gl.drawArrays(5, 0, 10);
		gl.drawElementsInstanced(4, 36, 5123, 0, 4);
		win.work(cpu);
		win.requestAnimationFrame(loop);
	};
	win.requestAnimationFrame(loop);
}

/** a one-second sample over frames of `ms` */
async function sampled(win, meter, ms = 1000 / 60) {
	const s = meter.sample(1);
	for (let i = 0; i < Math.ceil(1100 / ms) + 10; i++) {
		win.frame(ms);
		await Promise.resolve();
	}
	return s;
}

describe('the frame meter', () => {
	test('triangles by mode', () => {
		expect(trianglesOf(4, 900)).toBe(300);
		expect(trianglesOf(5, 10)).toBe(8);
		expect(trianglesOf(4, 36, 4)).toBe(48);
		expect(trianglesOf(1, 100)).toBe(0);
	});

	test('a sample gives calls, triangles, cpu_ms, gpu_ms and the bound', async () => {
		const win = fakeWindow({ gpuNs: 6e6 });
		const meter = installMeter(win);
		page(win, new win.WebGL2RenderingContext(), 2);
		const s = await sampled(win, meter);
		expect(s.frames).toBeGreaterThan(50);
		expect(s.calls).toBe(3);
		expect(s.triangles).toBe(300 + 8 + 48);
		expect(s.cpu_ms).toBe(2);
		expect(s.gpu_ms).toBe(6);
		expect(s.frame_ms).toBeCloseTo(16.7, 1);
		expect(s.bound).toBe('vsync');
		expect(meter.timed()).toBe(true);
	});

	test('a GPU slower than the display bounds the frame', async () => {
		const win = fakeWindow({ gpuNs: 31e6 });
		const meter = installMeter(win);
		page(win, new win.WebGL2RenderingContext(), 2);
		const s = await sampled(win, meter, 33.4);
		expect(s.gpu_ms).toBe(31);
		expect(s.bound).toBe('gpu');
	});

	test('a CPU slower than the GPU bounds the frame', async () => {
		const win = fakeWindow({ gpuNs: 5e6 });
		const meter = installMeter(win);
		page(win, new win.WebGL2RenderingContext(), 30);
		const s = await sampled(win, meter, 33.4);
		expect(s.cpu_ms).toBe(30);
		expect(s.bound).toBe('cpu');
	});

	test('without the timer extension, gpu_ms is null', async () => {
		const win = fakeWindow({ timer: false });
		const meter = installMeter(win);
		page(win, new win.WebGL2RenderingContext());
		const s = await sampled(win, meter);
		expect(s.gpu_ms).toBeNull();
		expect(s.calls).toBe(3);
		expect(meter.timed()).toBe(false);
	});

	test('installed twice, it is the one meter', () => {
		const win = fakeWindow();
		expect(installMeter(win)).toBe(installMeter(win));
	});

	test('the bound', () => {
		expect(boundOf({ display: 16.7, cpu_ms: 4, gpu_ms: 6 })).toBe('vsync');
		expect(boundOf({ display: 16.7, cpu_ms: 20, gpu_ms: 6 })).toBe('cpu');
		expect(boundOf({ display: 16.7, cpu_ms: 4, gpu_ms: 25 })).toBe('gpu');
		expect(boundOf({ display: 16.7, cpu_ms: 20, gpu_ms: null })).toBe('cpu');
		expect(boundOf({ display: 16.7, cpu_ms: 4, gpu_ms: null })).toBeNull();
	});

	test('the line render.mjs prints names calls and gpu_ms', () => {
		const line = meterLine({ frames: 60, frame_ms: 16.7, frame_p95: 17, cpu_ms: 3.2, gpu_ms: 9.8, calls: 412, triangles: 1234567, bound: 'vsync' });
		expect(line).toContain('412 calls');
		expect(line).toContain('gpu_ms 9.8');
		expect(line).toContain('cpu_ms 3.2');
		expect(line).toContain('bound vsync');
		expect(meterLine({ frames: 1, frame_ms: 0, frame_p95: 0, cpu_ms: 0, gpu_ms: null, calls: 0, triangles: 0, bound: null })).toContain('gpu_ms –');
	});

	test("where a scene's drawings go", () => {
		const node = (o) => ({ visible: true, parent: null, children: [], name: '', ...o });
		const scene = node({ name: 'scene' });
		const root = node({ parent: scene });
		const assets = node({ name: 'assets', parent: scene });
		const meshes = [
			node({ isMesh: true, parent: root, material: {} }),
			node({ isMesh: true, parent: assets, name: 'tree · L1', material: [{}, {}], geometry: { groups: [1, 2] } }),
			node({ isMesh: true, isInstancedMesh: true, count: 0, parent: assets, name: 'rock · L0', material: {} })
		];
		scene.traverse = (f) => [scene, root, assets, ...meshes].forEach(f);
		const d = drawingsOf(scene, root);
		expect(d).toEqual({ world: 1, guests: 2, lights: 0, other: 0, kinds: 1, top: [['tree', 2]] });
	});
});

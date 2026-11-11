/*
 * The page's making (./making.js, intent 095bc67c): every maker's steps on the page's thread share one budget a frame,
 * never more than 4 ms of making in a frame, every job finished, the most wanted first.
 *
 *   cd play/site && bun test src/lib/content/render/making.bun.test.ts
 */
import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { COMPILING, SLICE, createMaking, drawWhenReady, pipelinesPending, writeOnUnmap } from './making.js';

/** a page whose clock and frames the test drives: work moves the clock; each frame's making is kept */
function page() {
	let t = 0;
	let frames: (() => void)[] = [];
	const made: number[] = [0];
	const making = createMaking({ now: () => t, frame: (go) => void frames.push(go) });
	/** a step of work of `ms` on the page's thread, counted to this frame */
	const work = (ms: number) => ((t += ms), (made[made.length - 1] += ms));
	/** the next frame: the clock moves on a frame, its makers go on */
	const next = async () => {
		t += 16.7;
		made.push(0);
		const f = frames;
		frames = [];
		for (const go of f) go();
		for (let i = 0; i < 20; i++) await Promise.resolve();
	};
	const settle = async () => {
		for (let i = 0; i < 20; i++) await Promise.resolve();
	};
	return { making, work, next, settle, made, pending: () => frames.length };
}

/** a job of `steps` steps of `ms` each, through the making; records when it finished */
async function job(p: ReturnType<typeof page>, name: string, steps: number, ms: number, rank = () => 0, log?: string[]) {
	const m = p.making.maker(name, rank);
	for (let i = 0; i < steps; i++) {
		await m.slice();
		p.work(ms);
		log?.push(name);
	}
	m.done();
}

test('a dome built in 1.5 ms steps never makes more than 4 ms in a frame, and is finished', async () => {
	const p = page();
	let finished = false;
	job(p, 'dome', 200, 1.5).then(() => (finished = true));
	await p.settle();
	for (let i = 0; i < 400 && !finished; i++) await p.next();
	expect(finished).toBe(true);
	expect(Math.max(...p.made)).toBeLessThanOrEqual(SLICE);
	// and it used the frames it had: 2 steps (3 ms) a frame, 100 frames
	expect(p.made.filter((m) => m > 0).length).toBeLessThanOrEqual(101);
});

test('two makers share the one budget: together never over 4 ms a frame, the most wanted first', async () => {
	const p = page();
	const log: string[] = [];
	let done = 0;
	job(p, 'far', 30, 1, () => 1, log).then(() => done++);
	job(p, 'near', 30, 1, () => 5, log).then(() => done++);
	await p.settle();
	for (let i = 0; i < 200 && done < 2; i++) await p.next();
	expect(done).toBe(2);
	expect(Math.max(...p.made)).toBeLessThanOrEqual(SLICE);
	// the near one is finished before the far one has done half
	const nearDone = log.lastIndexOf('near');
	expect(log.slice(0, nearDone).filter((n) => n === 'far').length).toBeLessThan(15);
});

test('a step longer than the budget (one not cut finer) closes its frame: nothing more is made in it', async () => {
	const p = page();
	let finished = false;
	(async () => {
		const m = p.making.maker('join');
		for (const ms of [1, 6, 1, 1, 6]) {
			await m.slice();
			p.work(ms);
		}
		m.done();
		finished = true;
	})();
	await p.settle();
	for (let i = 0; i < 20 && !finished; i++) await p.next();
	expect(finished).toBe(true);
	// each 6 ms step overruns its own frame once (no maker knows a step before it is made), never two in one
	expect(p.made.filter((m) => m > SLICE).length).toBe(2);
	for (const m of p.made) expect(m).toBeLessThanOrEqual(SLICE + 6);
});

test('nothing waiting, no frame is asked for', async () => {
	const p = page();
	await job(p, 'small', 2, 1);
	await p.settle();
	expect(p.pending()).toBe(0);
	expect(p.making.waiting()).toBe(0);
});

/** a renderer's pipelines as three's are: getForRender makes a pipeline once, beside the page when handed a list */
function fakeRenderer() {
	const asked: (unknown[] | null)[] = [];
	const ready: (() => void)[] = [];
	const data = new Map<unknown, { pipeline?: unknown }>();
	const pipelines = {
		get: (ro: unknown) => (data.has(ro) || data.set(ro, {}), data.get(ro)!),
		getForRender(_ro: unknown, promises: unknown[] | null = null) {
			asked.push(promises);
			if (promises) promises.push(new Promise<void>((ok) => ready.push(ok)));
		},
		updateForRender(ro: unknown) {
			this.getForRender(ro);
		}
	};
	return { renderer: { _pipelines: pipelines, drawWhenReady: false }, asked, ready };
}

test('while the walker draws, a new pipeline is compiled beside the page and counted until it is ready; a film waits for it', async () => {
	const { renderer, asked, ready } = fakeRenderer();
	drawWhenReady(renderer);
	drawWhenReady(renderer); // once only
	renderer._pipelines.updateForRender({});
	expect(asked).toEqual([null]);
	renderer.drawWhenReady = true;
	renderer._pipelines.updateForRender({});
	expect(asked[1]).toBeArray();
	expect(pipelinesPending()).toBe(1);
	ready[0]();
	await Promise.resolve();
	await Promise.resolve();
	expect(pipelinesPending()).toBe(0);
});

test("three's render takes its pipelines as drawWhenReady replaces them, and skips an object until its pipeline is ready", () => {
	const three = dirname(createRequire(import.meta.url).resolve('three/package.json'));
	const pipelines = readFileSync(join(three, 'src/renderers/common/Pipelines.js'), 'utf8');
	const renderer = readFileSync(join(three, 'src/renderers/common/Renderer.js'), 'utf8');
	const utils = readFileSync(join(three, 'src/renderers/webgpu/utils/WebGPUPipelineUtils.js'), 'utf8');
	// updateForRender is getForRender alone, which takes the list of promises compileAsync hands it
	expect(pipelines).toMatch(/updateForRender\( renderObject \) \{\s*this\.getForRender\( renderObject \);\s*\}/);
	expect(pipelines).toMatch(/getForRender\( renderObject, promises = null \)/);
	// handed a list, WebGPU makes the pipeline beside the page
	expect(utils).toContain('device.createRenderPipelineAsync');
	// and render draws an object only once its pipeline is ready
	expect(renderer).toMatch(/if \( this\._pipelines\.isReady\( renderObject \) \) \{\s*this\.backend\.draw/);
});

test('a buffer made mapped is made unmapped and filled by writeBuffer at unmap: nothing waits on the graphics process', () => {
	const made: any[] = [], written: [unknown, number, ArrayBuffer][] = [];
	const device: any = {
		createBuffer: (d: any) => (made.push(d), { label: d.label }),
		queue: { writeBuffer: (b: unknown, at: number, data: ArrayBuffer) => written.push([b, at, data]) }
	};
	writeOnUnmap(device);
	writeOnUnmap(device); // once only
	// as three's createAttribute does it: mapped, the whole range filled, unmapped
	const b = device.createBuffer({ label: 'position', size: 12, usage: 0x20 | 0x4, mappedAtCreation: true });
	new Float32Array(b.getMappedRange()).set([1, 2, 3]);
	b.unmap();
	expect(made[0]).toEqual({ label: 'position', size: 12, usage: 0x20 | 0x4 | 0x8, mappedAtCreation: false });
	expect(written.length).toBe(1);
	expect([...new Float32Array(written[0][2])]).toEqual([1, 2, 3]);
	// its own getMappedRange and unmap gone again: the buffer's own
	expect('unmap' in b).toBe(false);
	// a part of it asked for is refused, not filled wrong
	expect(() => device.createBuffer({ size: 8, usage: 0x20, mappedAtCreation: true }).getMappedRange(4, 4)).toThrow('only the whole');
	// one written by mapping, or not mapped, is made as asked
	device.createBuffer({ size: 8, usage: 0x2 | 0x4, mappedAtCreation: true });
	device.createBuffer({ size: 8, usage: 0x20 });
	expect(made.slice(-2)).toEqual([{ size: 8, usage: 0x2 | 0x4, mappedAtCreation: true }, { size: 8, usage: 0x20 }]);
});

test("three makes a new vertex buffer mapped, fills all of it and unmaps it, with COPY_DST among its uses", () => {
	const three = dirname(createRequire(import.meta.url).resolve('three/package.json'));
	const utils = readFileSync(join(three, 'src/renderers/webgpu/utils/WebGPUAttributeUtils.js'), 'utf8');
	expect(utils).toMatch(/_bufferDescriptor\.mappedAtCreation = true;\s*buffer = device\.createBuffer\( _bufferDescriptor \);\s*_bufferDescriptor\.reset\(\);\s*new array\.constructor\( buffer\.getMappedRange\(\) \)\.set\( array \);\s*buffer\.unmap\(\);/);
});

test('while the eye moves, a few pipelines compile at once: a new object waits its turn, one being remade goes on', async () => {
	const { renderer, asked, ready } = fakeRenderer();
	drawWhenReady(renderer);
	renderer.drawWhenReady = true;
	(renderer as any).compileFew = true;
	const objects = Array.from({ length: COMPILING + 2 }, () => ({}));
	for (const o of objects) renderer._pipelines.updateForRender(o);
	expect(asked.length).toBe(COMPILING);
	expect(pipelinesPending()).toBe(COMPILING);
	// one that has a pipeline already (its material changed) is remade whatever compiles
	const made = {};
	renderer._pipelines.get(made).pipeline = 'old';
	renderer._pipelines.updateForRender(made);
	expect(asked.length).toBe(COMPILING + 1);
	// turns come free (the remade one counts too): the next waiting one compiles
	ready[0]();
	ready[1]();
	await Promise.resolve();
	await Promise.resolve();
	renderer._pipelines.updateForRender(objects[COMPILING]);
	expect(asked.length).toBe(COMPILING + 2);
	for (const r of ready) r();
	await Promise.resolve();
	await Promise.resolve();
	expect(pipelinesPending()).toBe(0);
});

test('standing still, every new pipeline compiles at once: a world just opened is drawn as soon as it can be', async () => {
	const { renderer, asked, ready } = fakeRenderer();
	drawWhenReady(renderer);
	renderer.drawWhenReady = true;
	for (let i = 0; i < COMPILING + 3; i++) renderer._pipelines.updateForRender({});
	expect(asked.length).toBe(COMPILING + 3);
	for (const r of ready) r();
	await Promise.resolve();
	await Promise.resolve();
	expect(pipelinesPending()).toBe(0);
});

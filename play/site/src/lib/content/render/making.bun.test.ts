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
import { SLICE, createMaking, drawWhenReady, pipelinesPending } from './making.js';

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

/** a renderer's insides as three's are: pipelines made once (beside the page when handed a list), corners sent per object */
function fakeRenderer() {
	const asked: (unknown[] | null)[] = [];
	const ready: (() => void)[] = [];
	const uploaded: unknown[] = [];
	const pipelines = {
		getForRender(_ro: unknown, promises: unknown[] | null = null) {
			asked.push(promises);
			if (promises) promises.push(new Promise<void>((ok) => ready.push(ok)));
		},
		updateForRender(ro: unknown) {
			this.getForRender(ro);
		},
		isReady: (_ro: unknown) => true
	};
	const geometries = { updateForRender: (ro: unknown) => void uploaded.push(ro), getIndex: (_ro: unknown) => null };
	const nodes = { needsRefresh: (_ro: unknown) => 0 };
	const renderer = { _pipelines: pipelines, _geometries: geometries, _nodes: nodes, backend: {}, drawWhenReady: false };
	return { renderer, asked, ready, uploaded };
}
/** an object to draw with corners of `mb` megabytes */
const shape = (mb: number) => {
	const a = { array: { byteLength: mb * 1024 * 1024 } };
	return { getAttributes: () => [a] };
};

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

test('while the walker draws, new corners go 2 MB a frame: an object over it waits, held back and made whole again, then drawn', () => {
	const { renderer, uploaded } = fakeRenderer();
	drawWhenReady(renderer);
	renderer.drawWhenReady = true;
	const [a, b, c] = [shape(1.5), shape(1.5), shape(3)];
	// one frame: the first object goes whatever its size; the next would pass 2 MB and waits
	renderer._geometries.updateForRender(a);
	renderer._geometries.updateForRender(b);
	expect(uploaded).toEqual([a]);
	expect(renderer._pipelines.isReady(b)).toBe(false);
	expect(renderer._nodes.needsRefresh(b)).toBe(2);
	expect(renderer._pipelines.isReady(a)).toBe(true);
	// what is sent is never counted again: a, drawn again in the same frame, costs nothing
	renderer._geometries.updateForRender(a);
	expect(uploaded).toEqual([a, a]);
	// a film's frame sends everything at once
	renderer.drawWhenReady = false;
	renderer._geometries.updateForRender(c);
	expect(uploaded).toEqual([a, a, c]);
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
	// an object's corners are sent only when it is made whole (refreshType FULL): a held one is made whole again
	expect(renderer).toMatch(/if \( refreshType === RenderObjectRefreshType\.FULL \) \{\s*this\._nodes\.updateBefore\( renderObject \);\s*this\._geometries\.updateForRender\( renderObject \);/);
	// and render draws an object only once its pipeline is ready
	expect(renderer).toMatch(/if \( this\._pipelines\.isReady\( renderObject \) \) \{\s*this\.backend\.draw/);
});

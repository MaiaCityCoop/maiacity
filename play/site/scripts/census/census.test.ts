/*
 * The census's worlds (intents bba45d6e, c1bee1f8, 009e04d3): every world builds on the CPU with no WebGL context and
 * one renderer, is counted from its views, and its report holds together. Each test builds a world (minutes where its
 * kinds are not kept yet, ./kept.ts), so they run by name, as an intent's checks; the instrument itself, without a
 * world, is ./counting.bun.test.ts's and ./kept.bun.test.ts's, which the site's suite runs.
 *
 *   cd play/site && bun test scripts/census -t 'census sees the world'
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HERE = import.meta.dir;
const OUT = mkdtempSync(join(tmpdir(), 'census-test-'));

/** a census in its own process (each sets up its own page), its JSON */
function census(args: string[]) {
	const json = join(OUT, `${args.join('-').replace(/[^a-z0-9-]/gi, '')}.json`);
	const p = Bun.spawnSync(['bun', join(HERE, '..', 'census.ts'), ...args, '--json', json], { stdout: 'pipe', stderr: 'pipe' });
	if (p.exitCode !== 0) throw new Error(`census ${args.join(' ')} failed:\n${p.stderr.toString().slice(-3000)}`);
	return JSON.parse(readFileSync(json, 'utf8'));
}

describe('sandbox-1 on the CPU', () => {
	let got: any;
	beforeAll(() => {
		got = census(['--world', 'sandbox-1', '--view', 'all']);
	}, 590_000);

	test('builds and is counted from near, mid and far: meshes, triangles, no graphics context', () => {
		expect(got.views.map((v: any) => v.view)).toEqual(['near', 'mid', 'far']);
		for (const v of got.views) {
			expect(v.totals.meshes + v.totals.instanced).toBeGreaterThan(0);
			expect(v.totals.tris).toBeGreaterThan(0);
		}
	});

	test('report: every copy with its distance, level and triangles; totals that add up', () => {
		for (const v of got.views) {
			for (const k of ['tris', 'calls', 'meshes', 'instanced', 'shadowCalls', 'shadowTris', 'culledObjects', 'culledTris']) expect(typeof v.totals[k]).toBe('number');
			expect(v.copies.length).toBeGreaterThan(0);
			for (const c of v.copies.slice(0, 500)) {
				for (const k of ['renderer', 'kind', 'd', 'size', 'level']) expect(c[k]).toBeDefined();
				expect(c.tris === null || typeof c.tris === 'number').toBe(true);
			}
			// the triangles in shapes are the copies' drawn at a level, per renderer
			const sum: Record<string, number> = {};
			for (const c of v.copies) if (typeof c.level === 'number') sum[c.renderer] = (sum[c.renderer] ?? 0) + (c.tris ?? 0);
			expect(sum).toEqual(v.shapeTris);
			// a frame's triangles are its main pass's, its shadows' and what it drew into targets
			expect(v.totals.tris).toBe(v.totals.mainTris + v.totals.shadowTris + v.totals.targetTris);
			expect(v.totals.calls).toBe(v.totals.mainCalls + v.totals.shadowCalls + v.totals.targetCalls);
			// the median frame is one of the frames measured
			expect(v.frames.some((f: any) => f.tris === v.totals.tris)).toBe(true);
		}
	});
});

// the switch (intent c1bee1f8, c4): the same world counted on WebGPURenderer when the page is asked for it
describe('sandbox-1 on WebGPURenderer', () => {
	test('is counted as WebGPU draws it, every view', () => {
		const got = census(['--world', 'sandbox-1', '--view', 'all', '--renderer', 'webgpu']);
		expect(got.renderer).toBe('WebGPURenderer');
		expect(got.views.map((v: any) => v.view)).toEqual(['near', 'mid', 'far']);
		for (const v of got.views) {
			expect(v.totals.meshes + v.totals.instanced).toBeGreaterThan(0);
			expect(v.totals.mainTris).toBeGreaterThan(0);
			expect(v.totals.tris).toBe(v.totals.mainTris + v.totals.shadowTris + v.totals.targetTris);
		}
	}, 590_000);
});

// the smoke (intent c1bee1f8): a world on three's own WebGPURenderer, its WebGL 2 backend over a context that only answers
describe('the smoke: the old city on WebGPURenderer’s own code', () => {
	test('builds, draws every frame and logs or throws nothing', () => {
		const json = join(OUT, 'smoke-s3.json');
		const p = Bun.spawnSync(['bun', join(HERE, '..', 'census.ts'), '--world', 'sandbox-3', '--smoke', '--json', json], { stdout: 'pipe', stderr: 'pipe' });
		const got = JSON.parse(readFileSync(json, 'utf8'));
		expect(got.errors).toEqual([]);
		expect(p.exitCode).toBe(0);
		expect(got.shaders).toBeGreaterThan(10);
		expect(got.views[0].draws).toBeGreaterThan(50);
	}, 590_000);
});

describe('the other worlds on the CPU', () => {
	test('Sandbox 3 builds and is counted as it opens', () => {
		const v = census(['--world', 'sandbox-3']).views[0];
		expect(v.view).toBe('open');
		expect(v.totals.meshes + v.totals.instanced).toBeGreaterThan(0);
		expect(v.totals.tris).toBeGreaterThan(0);
	}, 590_000);

	test('the worlds view builds a world and is counted as it opens', () => {
		const v = census(['--world', 'worlds']).views[0];
		expect(v.view).toBe('open');
		expect(v.totals.meshes + v.totals.instanced).toBeGreaterThan(0);
		expect(v.totals.tris).toBeGreaterThan(0);
	}, 590_000);
});

// intent 009e04d3: since the WebGPU switch the page draws through a RenderPipeline and the census counted its picture's
// one triangle. Floors far below the real values: they only tell a seen world from the screen quad. One build a world,
// its views counted as they stand (--settle, --frames: the box gives a check ten minutes), from the pinned inputs.
const seen = (world: string) => census(['--world', world, '--view', 'all', '--settle', '2', '--frames', '3']);

test('census sees the world', () => {
	const got = seen('sandbox-1');
	expect(got.renderer).toBe('WebGPURenderer');
	expect(got.views.map((v: any) => v.view)).toEqual(['near', 'mid', 'far']);
	for (const v of got.views) {
		expect(v.totals.calls).toBeGreaterThan(100);
		expect(v.totals.tris).toBeGreaterThan(100_000);
		// the scene's own draws, not what goes into targets beside it
		expect(v.totals.mainCalls).toBeGreaterThan(100);
		expect(v.totals.tris).toBe(v.totals.mainTris + v.totals.shadowTris + v.totals.targetTris);
	}
}, 590_000);

test('census counts Sandbox 5', () => {
	const got = seen('sandbox-5');
	expect(got.views.map((v: any) => v.view)).toEqual(['near', 'mid', 'far']);
	for (const v of got.views) expect(v.totals.calls).toBeGreaterThan(100);
}, 590_000);

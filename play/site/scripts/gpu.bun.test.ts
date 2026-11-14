/*
 * A world on a real GPU (./gpu.ts, intent ba948167), what of it needs no browser: `/api` answered from pinned inputs
 * alone, a software renderer told from a GPU by its name, and a measure judged against its bounds.
 *
 *   cd play/site && bun test scripts/gpu.bun.test.ts
 */
import { afterAll, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashOf } from '../src/lib/content/assets/box/headless.js';
import { pinFile, pinRoute, pinnedFile } from './census/pinned';
import { judge, lineOf, pinnedApi, software, type Measure } from './gpu';

const inputs = mkdtempSync(join(tmpdir(), 'gpu-inputs-'));
afterAll(() => rmSync(inputs, { recursive: true, force: true }));
const get = (api: (r: Request) => Promise<Response>, path: string, method = 'GET') => api(new Request(`http://play.test${path}`, { method }));

test('/api is answered from the pinned inputs alone: a file by its hash, a route by its URL, the rest a 404 it names', async () => {
	const bytes = new TextEncoder().encode('a ground texture');
	const hash = hashOf(bytes);
	pinFile(inputs, hash, bytes);
	pinRoute(inputs, '/api/catalog?sandbox=1', 200, 'application/json', '{"assets":[]}');
	const unpinned = new Set<string>();
	const api = pinnedApi(inputs, unpinned);
	expect(new Uint8Array(await (await get(api, `/api/files/${hash}`)).arrayBuffer())).toEqual(bytes);
	const route = await get(api, '/api/catalog?sandbox=1');
	expect([route.status, route.headers.get('content-type'), await route.text()]).toEqual([200, 'application/json', '{"assets":[]}']);
	expect((await (await get(api, '/api/me')).json()).level).toBe('admin');
	expect((await get(api, '/api/catalog?sandbox=2')).status).toBe(404);
	expect((await get(api, `/api/files/${'0'.repeat(64)}`)).status).toBe(404);
	expect([...unpinned]).toEqual(['/api/catalog?sandbox=2', `/api/files/${'0'.repeat(64)}`]);
	expect((await get(api, '/api/intents', 'POST')).status).toBe(405);
});

test('a file is pinned only as what its hash names, and --record pins a picture but never sound', async () => {
	expect(() => pinFile(inputs, 'f'.repeat(64), new Uint8Array([1]))).toThrow('not what its hash names');
	const picture = new TextEncoder().encode('a cover'), sound = new TextEncoder().encode('a bed of birdsong');
	const asked: string[] = [];
	const play = async (route: string) => {
		asked.push(route);
		return route.endsWith(hashOf(sound)) ? new Response(sound, { headers: { 'content-type': 'audio/mpeg' } }) : new Response(picture, { headers: { 'content-type': 'image/jpeg' } });
	};
	const api = pinnedApi(inputs, new Set(), play);
	expect((await get(api, `/api/files/${hashOf(picture)}`)).status).toBe(200);
	expect((await get(api, `/api/files/${hashOf(sound)}`)).status).toBe(404);
	expect(pinnedFile(inputs, hashOf(picture))).toEqual(picture);
	expect(pinnedFile(inputs, hashOf(sound))).toBeNull();
	// once pinned, play is not asked again
	await get(api, `/api/files/${hashOf(picture)}`);
	expect(asked.filter((r) => r.endsWith(hashOf(picture))).length).toBe(1);
});

test('a software renderer is told from a GPU by its name', () => {
	for (const name of ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', 'google swiftshader', 'llvmpipe (LLVM 15.0.7, 256 bits)', 'Microsoft Basic Render Driver', 'none', 'none (browserType.launch: Executable doesn\'t exist)']) expect(software(name)).toBe(true);
	for (const name of ['ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)', 'apple metal-3', 'Apple GPU']) expect(software(name)).toBe(false);
});

const M: Measure = { browser: 'chromium', version: '153', webgpu: 'apple metal-3', webgl: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)', backend: 'webgpu', shown: true, world_s: 12.3, steps: [], settled_s: 4, frames: 600, frame_ms: 16.7, frame_p95: 17.1, cpu_ms: 3.2, gpu_ms: 6.1, calls: 410, triangles: 1_200_000, walk_ms: null, walk_p95: null, walk_cpu: null, walk_gpu: null, painted: 0.93, errors: [] };

test('a measure passes when the world is shown, the device held and its bounds hold; each failure says why', () => {
	expect(judge(M)).toEqual([]);
	expect(judge(M, { worldWithin: 20, frameWithin: 20 })).toEqual([]);
	expect(judge(M, { worldWithin: 10 })).toEqual(['the world took 12.3 s, more than 10 s']);
	expect(judge(M, { frameWithin: 10 })).toEqual(['a frame took 16.7 ms, more than 10 ms']);
	expect(judge({ ...M, frame_ms: null }, { frameWithin: 10 })).toEqual(['a frame took — ms, more than 10 ms']);
	// a walk is bound only when asked, and a walk not measured is no walk within a bound
	expect(judge({ ...M, walk_ms: 30 }, { walkWithin: 33 })).toEqual([]);
	expect(judge({ ...M, walk_ms: 40 }, { walkWithin: 33 })).toEqual(['a frame walking took 40 ms, more than 33 ms']);
	expect(judge(M, { walkWithin: 33 })).toEqual(['a frame walking took — ms, more than 33 ms']);
	expect(lineOf({ ...M, walk_ms: 40, walk_p95: 55, walk_cpu: 30, walk_gpu: 9 }, [])).toContain('walking 40 ms (p95 55, CPU 30, GPU 9)');
	expect(judge({ ...M, shown: false, painted: 0.02 })).toEqual(['the picture is blank (0.02 painted)']);
	expect(judge({ ...M, errors: ['play: the graphics device was lost A valid external Instance reference no longer exists.'] })).toEqual(['the graphics device was lost']);
	expect(judge({ ...M, world_s: null, shown: false, errors: ['the world was not up within 300 s (at: Growing the forest)'] })).toEqual(['the world never came up: the world was not up within 300 s (at: Growing the forest)']);
	expect(lineOf(M, [])).toStartWith('✓ chromium 153 · WebGPU apple metal-3');
	expect(lineOf(M, ['the graphics device was lost'])).toEndWith('· the graphics device was lost');
});

// read mode (intent a35ccd33): with GPU_LOADS, each engine's measure is read from the one load of its world in it
const loads = mkdtempSync(join(tmpdir(), 'gpu-loads-'));
afterAll(() => rmSync(loads, { recursive: true, force: true }));
function writeLoad(name: string, world: string, args: string[], m: Measure) {
	mkdirSync(join(loads, name), { recursive: true });
	writeFileSync(join(loads, name, 'gpu.json'), JSON.stringify({ world, gpu: 'apple metal-3', platform: 'darwin arm64', args: ['--world', world, '--browser', m.browser, ...args], measures: [m] }));
	writeFileSync(join(loads, name, `${m.browser}.png`), 'a picture');
}
writeLoad('gpu-load-0', '/sandbox-1/', ['--walk', '--sky', '--timeout', '600'], { ...M, walk_ms: 30, sky: ['chromium-sky-noon-1440x900.png'] });
writeLoad('gpu-load-1', '/sandbox-1/', ['--walk', '--sky', '--timeout', '600'], { ...M, browser: 'webkit', version: '26', frame_ms: 45, walk_ms: 50, sky: ['webkit-sky-noon-1440x900.png'] });
writeLoad('gpu-load-2', '/sandbox-5/', [], { ...M, world_s: null, shown: false, painted: null, errors: ['the world was not up within 600 s (at: the ground)'] });
async function read(args: string[]) {
	const out = mkdtempSync(join(tmpdir(), 'gpu-read-'));
	const p = Bun.spawn([process.execPath, join(import.meta.dir, 'gpu.ts'), ...args, '--out', out], { env: { ...process.env, GPU_LOADS: loads }, stdout: 'pipe', stderr: 'pipe' });
	const text = await new Response(p.stdout).text();
	return { code: await p.exited, text, out };
}

test('read mode: no browser, the load named, its lines judged by the call\'s own bounds and exit, its pictures copied', async () => {
	const ok = await read(['--world', '/sandbox-1/', '--steps', '--walk']);
	expect(ok.code).toBe(0);
	expect(ok.text).toContain('gpu: /sandbox-1/ in chromium read from its one load (gpu-load-0: apple metal-3, darwin arm64; asked --world /sandbox-1/ --browser chromium --walk --sky --timeout 600)');
	expect(ok.text).toContain('gpu: /sandbox-1/ in webkit read from its one load (gpu-load-1');
	expect(ok.text).toContain(lineOf({ ...M, walk_ms: 30, sky: ['chromium-sky-noon-1440x900.png'] }, []));
	expect(readdirSync(ok.out).sort()).toEqual(['chromium.png', 'gpu.json', 'webkit.png']);
	const bound = await read(['--world', '/sandbox-1/', '--frame-within', '40']);
	expect(bound.code).toBe(1);
	expect(bound.text).toMatch(/^✓ chromium /m);
	expect(bound.text).toMatch(/^✗ webkit .*a frame took 45 ms, more than 40 ms$/m);
	const only = await read(['--world', '/sandbox-1/', '--browser', 'chromium', '--walk-within', '35', '--sky']);
	expect(only.code).toBe(0);
	expect(only.text).not.toContain('webkit');
});

test('read mode: a load not asked what the call asks, a missing load, a world that never came up or came up too late each fail, saying so', async () => {
	const views = await read(['--world', '/sandbox-1/', '--browser', 'chromium', '--views', 'far']);
	expect(views.code).toBe(1);
	expect(views.text).toContain('its load does not answer this call: the load was not asked --views');
	const none = await read(['--world', '/sandbox-3/']);
	expect(none.code).toBe(1);
	expect(none.text).toContain('no load of /sandbox-3/ in chromium: the gpu-load job gave none');
	expect(none.text).not.toContain('never came up');
	const down = await read(['--world', '/sandbox-5/', '--browser', 'chromium']);
	expect(down.code).toBe(1);
	expect(down.text).toContain('the world never came up: the world was not up within 600 s (at: the ground)');
	const late = await read(['--world', '/sandbox-1/', '--browser', 'chromium', '--timeout', '10']);
	expect(late.code).toBe(1);
	expect(late.text).toMatch(/^✗ chromium .*the world was not up within 10 s \(it took 12\.3 s\)$/m);
});

test('with the views, the walk and the sky in one load, the sky is photographed from where the world opened, taken before anything moves the eye', () => {
	const src = readFileSync(join(import.meta.dir, 'gpu.ts'), 'utf8');
	const shown = src.indexOf('m.shown = m.painted > 0.2;');
	const taken = src.indexOf('if (o.sky) await page.evaluate(skyFrom, SKY_RISE)');
	expect(shown).toBeGreaterThan(0);
	expect(taken).toBeGreaterThan(shown);
	for (const later of ['for (const view of o.views', 'if (o.walk) {', 'm.sky = await skyPictures']) if (src.includes(later)) expect(src.indexOf(later)).toBeGreaterThan(taken);
	expect(src).toContain('(window as any).__skyFrom ??=');
});

test('--fill-within: a view whose plants wait past the bound, or still wait 5 s after its picture, fails, saying so', () => {
	const f = (fill_s: number | null, pending_later = 0) => ({ view: 'mid', fill_s, pending: 0, triangles: 4_000_000, pending_later, triangles_later: 4_000_000 });
	expect(judge({ ...M, fills: [f(1.2)] }, { fillWithin: 5 })).toEqual([]);
	expect(judge({ ...M, fills: [f(7.5)] }, { fillWithin: 5 })).toEqual(['the mid view waited 7.5 s for what it draws, more than 5 s']);
	expect(judge({ ...M, fills: [f(null)] }, { fillWithin: 5 })).toEqual(['the mid view waited over 30 s for what it draws, more than 5 s']);
	expect(judge({ ...M, fills: [f(2, 3)] }, { fillWithin: 5 })).toEqual(['the mid view still had 3 waiting to be drawn 5 s after its picture']);
	expect(judge(M, { fillWithin: 5 })).toEqual(['no view filled in was measured (it asks for --views)']);
});

/*
 * A world on a real GPU (./gpu.ts, intent ba948167), what of it needs no browser: `/api` answered from pinned inputs
 * alone, a software renderer told from a GPU by its name, and a measure judged against its bounds.
 *
 *   cd play/site && bun test scripts/gpu.bun.test.ts
 */
import { afterAll, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
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

const M: Measure = { browser: 'chromium', version: '153', webgpu: 'apple metal-3', webgl: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)', backend: 'webgpu', shown: true, world_s: 12.3, steps: [], settled_s: 4, frames: 600, frame_ms: 16.7, frame_p95: 17.1, cpu_ms: 3.2, gpu_ms: 6.1, calls: 410, triangles: 1_200_000, painted: 0.93, errors: [] };

test('a measure passes when the world is shown, the device held and its bounds hold; each failure says why', () => {
	expect(judge(M)).toEqual([]);
	expect(judge(M, { worldWithin: 20, frameWithin: 20 })).toEqual([]);
	expect(judge(M, { worldWithin: 10 })).toEqual(['the world took 12.3 s, more than 10 s']);
	expect(judge(M, { frameWithin: 10 })).toEqual(['a frame took 16.7 ms, more than 10 ms']);
	expect(judge({ ...M, frame_ms: null }, { frameWithin: 10 })).toEqual(['a frame took — ms, more than 10 ms']);
	expect(judge({ ...M, shown: false, painted: 0.02 })).toEqual(['the picture is blank (0.02 painted)']);
	expect(judge({ ...M, errors: ['play: the graphics device was lost A valid external Instance reference no longer exists.'] })).toEqual(['the graphics device was lost']);
	expect(judge({ ...M, world_s: null, shown: false, errors: ['the world was not up within 300 s (at: Growing the forest)'] })).toEqual(['the world never came up: the world was not up within 300 s (at: Growing the forest)']);
	expect(lineOf(M, [])).toStartWith('✓ chromium 153 · WebGPU apple metal-3');
	expect(lineOf(M, ['the graphics device was lost'])).toEndWith('· the graphics device was lost');
});

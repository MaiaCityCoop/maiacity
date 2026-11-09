// What the Stories player reads from play before a film is composed (./inputs.ts), fetch mocked: compositions held to
// their hash, a live shot's asset version as compose reads it, the frame's files from the site or from play.
import { afterEach, describe, expect, test, vi } from 'vitest';
import { hashText } from '$lib/content/game/hash.js';
import { compositions, fileOf, liveAssets } from './inputs';
import { VENDOR } from './compose';
import type { StoryBody } from './timeline';

const ASSET = 'a1b2c3d4-0000-4000-8000-000000000001';
const comp = '<div>a motion shot</div>';
const C = hashText(comp);
const LIE = hashText('another text');
const R = 'f'.repeat(64), DR = 'e'.repeat(64), P = 'd'.repeat(64);

const body = (shots: Record<string, unknown>[]): StoryBody => ({ schema: 'story/1', format: '9:16', fps: 30, duration: 10, tracks: [{ id: 'shots', kind: 'shots', clips: shots.map((s, i) => ({ id: `s${i}`, at: i, duration: 1, ...s })) }] }) as unknown as StoryBody;
const answer = (status: number, data: unknown) => new Response(typeof data === 'string' ? data : JSON.stringify(data), { status });

let calls: string[] = [];
const serve = (routes: Record<string, () => Response>) => {
	calls = [];
	vi.stubGlobal('fetch', vi.fn(async (url: string) => (calls.push(url), routes[url]?.() ?? answer(404, { error: 'no such thing' }))));
};
afterEach(() => vi.unstubAllGlobals());

describe('the Stories player reads its inputs', () => {
	test('compositions: each named once, held to its hash; one that is not is left out', async () => {
		serve({ [`/api/files/${C}`]: () => answer(200, comp), [`/api/files/${LIE}`]: () => answer(200, 'not what it says') });
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const got = await compositions(body([{ composition: C }, { composition: C }, { composition: LIE }, { composition: 'not a hash' }]), {});
		expect(got).toEqual({ [C]: comp });
		expect(calls.sort()).toEqual([`/api/files/${C}`, `/api/files/${LIE}`].sort());
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('does not hash to its name'));
		warn.mockRestore();
	});

	test('live assets: a version builds its recipe, else its default variant\'s; its pieces by hash', async () => {
		serve({
			[`/api/assets/${ASSET}`]: () =>
				answer(200, {
					versions: [
						{ id: 'v2', recipe: null, defaultVariant: 'dwarf', engine: 3, pieces: [{ hash: P }], variants: [{ name: 'tall', recipe: R }, { name: 'dwarf', recipe: DR }] },
						{ id: 'v1', recipe: R, pieces: [P], variants: [] },
						{ id: 'v0', recipe: null, variants: [] }
					]
				})
		});
		const got = await liveAssets([body([{ live: { asset: ASSET, version: 'v2', camera: [] } }, { live: { asset: ASSET, version: 'v1', camera: [] } }])]);
		expect(calls).toEqual([`/api/assets/${ASSET}`]);
		expect(got.v2).toEqual({ asset: ASSET, version: 'v2', recipe: DR, pieces: [P], engine: 3, variants: { tall: { recipe: R, pieces: [P] }, dwarf: { recipe: DR, pieces: [P] } } });
		expect(got.v1).toEqual({ asset: ASSET, version: 'v1', recipe: R, pieces: [P], engine: 1, variants: {} });
		expect(got.v0).toBeUndefined();
	});

	test('live assets: an asset play cannot give is left out, its shot shows its still', async () => {
		serve({});
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(await liveAssets([body([{ live: { asset: ASSET, version: 'v1', camera: [] } }])])).toEqual({});
		expect(warn).toHaveBeenCalledWith(expect.stringContaining(ASSET.slice(0, 8)));
		warn.mockRestore();
	});

	test('the frame\'s files: play\'s by hash, the font from the site, a failure named', async () => {
		serve({ [`/api/files/${C}`]: () => answer(200, comp) });
		expect(await (await fileOf(C)).text()).toBe(comp);
		await expect(fileOf(R)).rejects.toThrow(`file ${R.slice(0, 10)}…: HTTP 404`);
		await expect(fileOf(VENDOR.font.hash)).rejects.toThrow(/HTTP 404/);
		expect(calls.at(-1)).toMatch(/inter-latin-wght-normal/);
	});
});

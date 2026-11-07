// A world shot (intent 65d04790, ./live.ts and ./live-runtime.ts): a whole world played in a story's shot by the live
// runtime, its frame, camera, sun, exposure and lights by the moment alone.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { codeOf, compose, CSP, laid, seal, VENDOR } from './compose';
import { cameraAt, curveAt, frameOf, framesOf, sunAt, worldAt, type World, type WorldAsset } from './live';
import { engineAt } from '../kernel/engines.js';
import { hashText } from '../content/game/hash.js';
import type { StoryBody } from './timeline';

const H = (c: string) => c.repeat(64);
const [STILL, STILL2, RECIPE, PIECE, GUEST, GUEST_PIECE, CAR] = ['1', '2', '3', '4', '5', '6', '7'].map(H);
const CITY = '43420c0b-675b-4e50-98b5-c461b9432fc0';
const V8 = H('a');
const world: World = {
	asset: CITY,
	version: V8,
	camera: [
		{ at: 0, eye: [0, 1.6, 40], target: [0, 1.2, 0], fov: 50 },
		{ at: 6, eye: [0, 1.6, 10], target: [0, 1.2, -20], fov: 42, ease: 'linear' }
	],
	hour: [[0, 18.5], [6, 19.25]],
	exposure: 0.5,
	lights: { sun: [[0, 1], [6, 0.5]], lamps: 2 }
};
const asset: WorldAsset = { asset: CITY, version: V8, recipe: RECIPE, pieces: [PIECE], engine: 5, guests: { [GUEST]: [GUEST_PIECE], [CAR]: [] } };
const story = (w: unknown, fps = 30) => ({ schema: 'story/1', format: '16:9', fps, duration: 8, tracks: [{ id: 'shots', kind: 'shots', clips: [{ id: 'still', at: 0, duration: 2, frame: STILL2, transition: 'cut' }, { id: 'city', at: 2, duration: 6, frame: STILL, transition: 'cut', world: w }] }] }) as StoryBody;
const out = compose(story(world), {}, {}, {}, { [V8]: asset });
const spec = JSON.parse(out.match(/playLive\.world\(tl, "pl-s1", (\{.*\})\);/)?.[1] ?? 'null');
const engine = engineAt('box', 5) as { blake3: string };

describe('a world shot: compose', () => {
	it('compose: the world drawn in the shot\'s place, its still the poster until it is ready', () => {
		const shot = out.match(/<div id="pl-s1" class="clip shot live world"[^>]*>(.*?)<\/div>/)?.[0] ?? '';
		expect(shot).toContain(`data-asset="${CITY}"`);
		expect(shot).toContain(`data-version="${V8}"`);
		expect(shot).toContain(`<img class="poster" src="/api/files/${STILL}" alt="">`);
		expect(shot).toContain('<canvas width="1920" height="1080"></canvas>');
		// the shot before it is still a still
		expect(out).toContain(`<img id="pl-s0" class="clip shot" data-start="0"`);
	});
	it('compose: the frozen engine, the world, its guests and every piece named by hash and laid in; its spec as given', () => {
		expect(new Set(codeOf(out))).toEqual(new Set([engine.blake3, PIECE, RECIPE, GUEST_PIECE, GUEST, CAR]));
		for (const h of codeOf(out)) expect(out).toContain(`<script type="text/x-play-code" data-play-code="${h}"></script>`);
		expect(spec).toMatchObject({ engine: { v: 5, hash: engine.blake3 }, recipe: RECIPE, pieces: [PIECE], guests: { [GUEST]: [GUEST_PIECE], [CAR]: [] }, camera: world.camera, hour: world.hour, exposure: 0.5, lights: world.lights, fps: 30, frames: 181, size: [1920, 1080], at: 2, duration: 6 });
		expect(spec.asset).toBeUndefined();
		// the runtime after GSAP and before the story's script, which hands the shot its spec
		expect(out).toContain(`<script src="/api/files/${VENDOR.live.hash}" data-vendor="${VENDOR.live.name}"></script>`);
		expect(out.indexOf(VENDOR.live.hash)).toBeGreaterThan(out.indexOf(VENDOR.gsap.hash));
		expect(out.indexOf(VENDOR.live.hash)).toBeLessThan(out.indexOf('playLive.world('));
		// its frames at the story's own rate
		expect(JSON.parse(compose(story(world, 24), {}, {}, {}, { [V8]: asset }).match(/playLive\.world\(tl, "pl-s1", (\{.*\})\);/)?.[1] ?? 'null').frames).toBe(145);
	});
	it('compose: the same bytes every time, reading no clock or chance', () => {
		const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('read Math.random'); });
		const now = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('read the clock'); });
		const again = compose(structuredClone(story(world)), {}, {}, {}, structuredClone({ [V8]: asset }));
		random.mockRestore(), now.mockRestore();
		expect(again).toBe(out);
		expect(hashText(again)).toBe(hashText(out));
		// the guests in any order, the same composition
		expect(compose(story(world), {}, {}, {}, { [V8]: { ...asset, guests: { [CAR]: [], [GUEST]: [GUEST_PIECE] } } })).toBe(out);
	});
	it('compose: makes no connection outside play\'s files, sealed or laid in', () => {
		expect(CSP).toContain("connect-src 'none'");
		expect(CSP).toContain('worker-src blob:');
		const sealed = seal(out);
		for (const o of [out, sealed, laid(out, { [GUEST]: 'self.x = "</script>";' })]) {
			for (const [, url] of o.matchAll(/\s(?:src|href|poster)="([^"]*)"/g)) expect(url).toMatch(/^\/api\/files\/[0-9a-f]{64}$/);
			expect([...o.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map((m) => m[0]).filter((u) => !u.startsWith('http://www.w3.org/'))).toEqual([]);
		}
		expect(sealed).toContain(`<script type="text/x-play-code" data-play-code="${GUEST}"></script>`);
	});
	it('compose: without its version from play, another world\'s, an engine not frozen, or beside a live asset, the shot shows its still', () => {
		for (const [w, worlds] of [
			[world, {}],
			[world, { [V8]: { ...asset, asset: '00000000-0000-4000-8000-000000000000' } }],
			[world, { [V8]: { ...asset, engine: 99 } }],
			[{ ...world, camera: [] }, { [V8]: asset }]
		] as [World, Record<string, WorldAsset>][]) {
			const o = compose(story(w), {}, {}, {}, worlds);
			expect(o).toContain(`<img id="pl-s1" class="clip shot" data-start="2"`);
			expect(codeOf(o)).toEqual([]);
			expect(o).not.toContain(VENDOR.live.hash);
		}
		const both = story(world);
		(both.tracks[0].clips[1] as Record<string, unknown>).live = { asset: CITY, version: V8, camera: world.camera };
		expect(compose(both, {}, {}, {}, { [V8]: asset })).not.toContain('playLive.world(');
	});
});

describe('a world shot: the clock', () => {
	it('clock: a moment shows its nearest frame, within the shot', () => {
		expect(framesOf(6, 30)).toBe(181);
		expect(framesOf(6, 24)).toBe(145);
		expect(framesOf(0.01, 30)).toBe(1);
		expect(frameOf(0, 30, 181)).toBe(0);
		expect(frameOf(1, 30, 181)).toBe(30);
		expect(frameOf(1.016, 30, 181)).toBe(30);
		expect(frameOf(1.017, 30, 181)).toBe(31);
		expect(frameOf(6, 30, 181)).toBe(180);
		expect(frameOf(99, 30, 181)).toBe(180);
		expect(frameOf(-1, 30, 181)).toBe(0);
		// every frame's own moment shows that frame
		for (let f = 0; f < 181; f++) expect(frameOf(f / 30, 30, 181)).toBe(f);
	});
	it('clock: hour, exposure and lights by t alone, linear between their keys, the ends held', () => {
		expect(curveAt(undefined, 3, 7)).toBe(7);
		expect(curveAt(0.5, 3, 0)).toBe(0.5);
		expect(curveAt([[0, 18.5], [6, 19.25]], 0, 12)).toBe(18.5);
		expect(curveAt([[0, 18.5], [6, 19.25]], 3, 12)).toBe(18.875);
		expect(curveAt([[0, 18.5], [6, 19.25]], 9, 12)).toBe(19.25);
		expect(curveAt([[2, 1], [4, 3]], 1, 0)).toBe(1);
		// the sun: up at 6 in the east, highest at noon in the south, down at 18 in the west, under the horizon at night
		expect(sunAt(6)).toEqual({ sun: 0, az: 90 });
		expect(sunAt(12)).toEqual({ sun: 50, az: 180 });
		expect(sunAt(18).sun).toBeCloseTo(0, 9);
		expect(sunAt(18).az).toBe(270);
		expect(sunAt(0).sun).toBe(-50);
		expect(sunAt(24)).toEqual(sunAt(0));
		expect(sunAt(19).sun).toBeLessThan(0);
	});
	it('clock: everything a world shot shows at t is the same for the same t', () => {
		const at3 = worldAt(world, 3, 30, 181);
		expect(at3).toEqual({ frame: 90, camera: cameraAt(world.camera, 3), sun: sunAt(18.875), exposure: 0.5, lights: { sun: 0.75, sky: 1, lamps: 2 } });
		expect(worldAt(structuredClone(world), 3, 30, 181)).toEqual(at3);
		expect(worldAt(world, 0, 30, 181)).toMatchObject({ frame: 0, sun: sunAt(18.5), lights: { sun: 1 } });
		expect(worldAt(world, 6, 30, 181)).toMatchObject({ frame: 180, sun: sunAt(19.25), lights: { sun: 0.5 } });
		// past its end: its last frame, its keys held
		expect(worldAt(world, 7, 30, 181)).toEqual(worldAt(world, 6, 30, 181));
		// no hour: the mood's own sun
		expect(worldAt({ camera: world.camera }, 3, 30, 181)).toMatchObject({ sun: null, exposure: 0, lights: { sun: 1, sky: 1, lamps: 1 } });
	});
	it('clock: the maths and the runtime read no clock, chance or environment', () => {
		for (const f of ['./live.ts', './live-runtime.ts', './world-build.ts']) expect(readFileSync(new URL(f, import.meta.url), 'utf8')).not.toMatch(/new Date|Date\.now|Math\.random|performance\.now|requestAnimationFrame|navigator\.|location\./);
		// a moving world is stepped through every one of the shot's frames before it is ready, at the story's rate
		const build = readFileSync(new URL('./world-build.ts', import.meta.url), 'utf8');
		expect(build).toContain('const frames = hero ? spec.frames : 1;');
		expect(build).toContain('hero!.tick(1 / spec.fps, {});');
		const runtime = readFileSync(new URL('./live-runtime.ts', import.meta.url), 'utf8');
		expect(runtime).toContain('const m = places[Math.min(at.frame, places.length - 1)];');
	});
});

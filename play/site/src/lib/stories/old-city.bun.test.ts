// The Old City film (story 55b69416 v2, intent 4f7a2178): four world shots of one world, cut together. Built on the CPU
// in Bun by the frozen box engine (scripts/box-worker.ts), from the files kept beside the code: the world's in
// fixtures/worlds/<version>/, the story's timeline in fixtures/stories/. No WebGL: what is checked is what the runtime
// is handed and the places it draws, not a picture (scripts/webkit-world.ts builds the world in WebKit's sealed frame).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { boxWorker } from '../../../scripts/box-worker';
import { hashText } from '../content/game/hash.js';
import { piecesOf } from '../content/assets/box/pieces.js';
import { plantingsOf } from '../content/assets/uses.js';
import { engineAt } from '../kernel/engines.js';
import { codeOf, compose, CSP } from './compose';
import { cameraAt, worldAt, type WorldAsset } from './live';
import { buildWorld, built, engineOf, type WorkerLike } from './world-build';
import type { StoryBody } from './timeline';

const STORY = '55b69416-8516-47dc-a235-781a8c08c640';
const V8 = '9bb90d4c3f21a900d01a6729ac61d6e103d9f0abeb45668cf711a497729c68a8';
const KEPT = new URL(`./fixtures/worlds/${V8}/`, import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', KEPT), 'utf8'));
const kept = new Set(readdirSync(new URL('files/', KEPT)));
const code = (h: string) => {
	const text = readFileSync(new URL(`files/${h}`, KEPT), 'utf8');
	if (hashText(text) !== h) throw new Error(`kept file ${h.slice(0, 12)}… does not hash to its name`);
	return text;
};
const deep = (c: string, seen = new Set<string>()): string[] => {
	for (const h of piecesOf(c) as string[]) if (!seen.has(h)) seen.add(h), deep(code(h), seen);
	return [...seen];
};
const story = JSON.parse(readFileSync(new URL(`./fixtures/stories/${STORY}.json`, import.meta.url), 'utf8')) as StoryBody;
const fps = story.fps;

/** the world as the Stories player hands it to compose (StoryPlayer.svelte worldAssets): its guests from its build */
async function oldCity(): Promise<WorldAsset> {
	const e = engineOf({ hash: manifest.recipe, code: code(manifest.recipe) }, manifest.engine, boxWorker(manifest.engine));
	try {
		const obj = built(await e.build(undefined), manifest.recipe).obj;
		const guests = [...new Set(plantingsOf(obj).map((u: { ref: string }) => u.ref.slice(0, 64)))].sort() as string[];
		return { asset: manifest.asset, version: V8, recipe: manifest.recipe, pieces: manifest.pieces, engine: manifest.engine, guests: Object.fromEntries(guests.map((g) => [g, deep(code(g))])) };
	} finally {
		e.end();
	}
}
/** the composition, and the one world spec in it */
async function composed() {
	const out = compose(story, {}, {}, {}, { [V8]: await oldCity() });
	const calls = [...out.matchAll(/playLive\.world\(tl, (\{.*\})\);/g)].map((m) => JSON.parse(m[1]));
	return { out, calls, spec: calls[0] };
}
/** the clip in the composition holding story moment T: its id, from its data-start and data-duration */
const clipAt = (out: string, T: number) =>
	[...out.matchAll(/<div id="([^"]+)" class="clip shot live world" data-start="([\d.]+)" data-duration="([\d.]+)"/g)].filter((m) => +m[2] <= T && T < +m[2] + +m[3]).map((m) => m[1]);
/** the world built as the runtime builds it, with each engine ask counted by its op and recipe */
async function build(spec: any) {
	const asked: string[] = [];
	const make = boxWorker(spec.engine.v);
	const worker = (): WorkerLike => {
		const w = make(), post = w.postMessage.bind(w);
		w.postMessage = (m: any) => (asked.push(`${m.op} ${m.recipe?.hash ?? ''}`), post(m));
		return w;
	};
	const got = await buildWorld(spec, { code, worker });
	return { got, asked };
}

describe('the Old City film', () => {
	it('built once: one world for its four shots, built once, its guests placed once', async () => {
		const { calls, spec } = await composed();
		expect(calls.length).toBe(1);
		expect(spec.shots.map((s: { at: number }) => s.at)).toEqual([0, 4, 7.5, 11]);
		const { got, asked } = await build(spec);
		expect(asked.filter((a) => a === `build ${manifest.recipe}`).length).toBe(1);
		expect(asked.filter((a) => a === `live ${manifest.recipe}`).length).toBe(1);
		expect(got.copies.length).toBe(1898);
		// the runtime makes one renderer for a world, whatever its shots (made ready, makeRenderer, since the switch: intent c1bee1f8)
		const runtime = readFileSync(new URL('./live-runtime.ts', import.meta.url), 'utf8');
		const world = runtime.slice(runtime.indexOf('function world('));
		expect(world.match(/\b(createRenderer|makeRenderer)\(/g)?.length).toBe(1);
		expect(world.search(/\b(createRenderer|makeRenderer)\(/)).toBeLessThan(world.indexOf('for (const s of spec.shots)'));
	}, 120_000);

	it('files: the frame asks nothing of the network; every code file is laid in, true to its hash', async () => {
		const { out, spec } = await composed();
		expect(CSP).toContain("connect-src 'none'");
		const engine = engineAt('box', spec.engine.v) as { blake3: string };
		const names = codeOf(out);
		expect(names).toContain(manifest.recipe);
		for (const h of names) {
			if (h === engine.blake3) continue;
			expect(kept.has(h)).toBe(true);
			expect(hashText(code(h))).toBe(h);
		}
		expect(names.length).toBe(1 + kept.size);
		for (const [, url] of out.matchAll(/\s(?:src|href|poster)="([^"]*)"/g)) expect(url).toMatch(/^\/api\/files\/[0-9a-f]{64}$/);
		expect(existsSync(new URL(`../../../static/engines/engine-v${spec.engine.v}.js`, import.meta.url))).toBe(true);
	}, 60_000);

	it('first key: each shot opens on its own first camera key, the moment before it on the shot before', async () => {
		const { out, spec } = await composed();
		spec.shots.forEach((s: any, k: number) => {
			const first = { eye: s.camera[0].eye, target: s.camera[0].target, fov: s.camera[0].fov };
			expect(worldAt(s, 0, fps, spec.frames, s.at - spec.at).camera).toEqual(first);
			expect(clipAt(out, s.at)).toEqual([s.id]);
			if (!k) return;
			const prev = spec.shots[k - 1], T = s.at - 1 / fps;
			expect(clipAt(out, T)).toEqual([prev.id]);
			const before = worldAt(prev, T - prev.at, fps, spec.frames, prev.at - spec.at).camera;
			expect(before).toEqual(cameraAt(prev.camera, T - prev.at));
			expect(before).not.toEqual(first);
		});
	}, 60_000);

	it('seek: any moment shows the shot that holds it, at its own t, on the world\'s frame of that moment', async () => {
		const { out, spec } = await composed();
		for (const T of [0, 2, 3.99, 4, 5.5, 7.5, 9, 11, 15.9]) {
			const holding = spec.shots.filter((s: any) => s.at <= T && T < s.at + s.duration);
			expect(holding.length).toBe(1);
			const s = holding[0];
			expect(clipAt(out, T)).toEqual([s.id]);
			const at = worldAt(s, T - s.at, fps, spec.frames, s.at - spec.at);
			expect(at.frame).toBe(Math.round(T * fps));
			expect(at.camera).toEqual(cameraAt(s.camera, T - s.at));
		}
	}, 60_000);

	it('world clock: the cars move on across every cut, on one run of the world, the same every time', async () => {
		const { spec } = await composed();
		expect(spec.frames).toBe(16 * fps + 1);
		const one = (await build(spec)).got, two = (await build(spec)).got;
		expect(one.places.length).toBe(spec.frames);
		const cars = one.groups.map((g, i) => (g === 'machines' ? i : -1)).filter((i) => i >= 0);
		const moved = (a: Float32Array, b: Float32Array) => cars.filter((i) => a.subarray(i * 16, i * 16 + 16).some((v, k) => Math.abs(v - b[i * 16 + k]) > 1e-3)).length;
		for (let k = 1; k < spec.shots.length; k++) {
			const s = spec.shots[k], prev = spec.shots[k - 1];
			const last = worldAt(prev, s.at - 1 / fps - prev.at, fps, spec.frames, prev.at - spec.at).frame;
			const next = worldAt(s, 0, fps, spec.frames, s.at - spec.at).frame;
			expect(next).toBe(last + 1);
			expect(next).toBe(Math.round(s.at * fps));
			for (const f of [last, next]) expect(Buffer.from(one.places[f].buffer).equals(Buffer.from(two.places[f].buffer))).toBe(true);
		}
		expect(moved(one.places[Math.round(4 * fps)], one.places[Math.round(11 * fps)])).toBeGreaterThanOrEqual(10);
	}, 240_000);
});

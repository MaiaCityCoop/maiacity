import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { codeOf, compose, CSP, FRAME, filesOf, laid, seal, VENDOR } from './compose';
import { buildsOf, cameraAt, stepAt, stepTimes, valuesAt, type Live, type LiveAsset } from './live';
import { engineAt } from '../kernel/engines.js';
import { DENIED, SANDBOX, frameCsp } from '../kernel/sandbox/policy.js';
import { hashText } from '../content/game/hash.js';
import type { Links, StoryBody } from './timeline';

const H = (c: string) => c.repeat(64);
const [F1, F2, V1, A1, M1, X1] = ['1', '2', '3', '4', '5', '6'].map(H);
const body = (duration: number, tracks: unknown[], format = '9:16') => ({ schema: 'story/1', format, fps: 30, duration, tracks }) as StoryBody;
const decode = (s: string) => s.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)));
/** an element's attributes, by its id */
const el = (html: string, id: string) => {
	const tag = html.match(new RegExp(`<[\\w-]+ id="${id}"[^>]*>`))?.[0];
	if (!tag) return null;
	return Object.fromEntries([...tag.matchAll(/\s([\w-]+)(?:="([^"]*)"|='([^']*)')?/g)].map((m) => [m[1], decode(m[2] ?? m[3] ?? '')]));
};
const json = (v: string | undefined) => JSON.parse(v ?? 'null');

// every kind and field of play/SPEC.md §12 at once
const film = body(6, [
	{ id: 'shots', kind: 'shots', clips: [
		{ id: 'a', at: 0, duration: 2, frame: F1, transition: 'dissolve 0.4' },
		{ id: 'b', at: 2, duration: 2, frame: F2, video: V1, video_in: 1.5, transition: 'to black 0.5' },
		{ id: 'c', at: 4, duration: 2, frame: F2, transition: 'from black 0.6, cut' }
	] },
	{ id: 'voice', kind: 'voice', clips: [
		{ id: 'v0', at: 0, duration: 3, who: 'MAIA', line: 'One seed. Then a hundred.', audio: A1, audio_in: 0.2, gain: -2, fade_in: 0.1, fade_out: 0.2 },
		{ id: 'v1', at: 3, duration: 3, who: 'MAIA', line: 'a hundred times', cues: [{ at: 0, text: 'A hundred' }, { at: 1.5, text: '100x', em: true }] }
	] },
	{ id: 'music', kind: 'music', gain: -6, duck: true, clips: [{ id: 'm0', at: 0, duration: 6, audio: M1, eq: [{ type: 'highpass', f: 80, gain: 0, q: 0.707 }, { type: 'peaking', f: 3000, gain: -3, q: 1.2 }], keys: [[0, -10], [2, 0]] }] },
	{ id: 'sfx', kind: 'sfx', mute: true, clips: [{ id: 'x0', at: 1, duration: 1, audio: X1 }] },
	{ id: 'notes', kind: 'notes', clips: [{ id: 'n', at: 0, duration: 6, section: 'DAY 1', camera: '', retention: '', mood: '↑' }] }
]);
const html = compose(film);
const steps = html.match(/shots\(tl, "pl-black", \[(.*)\]\);/)?.[1] ?? '';

describe('compose: one story, one composition', () => {
	it('is deterministic: the same version gives the same bytes, and reads no clock, chance or environment', () => {
		const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('read Math.random'); });
		const now = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('read the clock'); });
		const a = compose(film), b = compose(structuredClone(film)), c = compose(JSON.parse(JSON.stringify(film)));
		random.mockRestore(), now.mockRestore();
		expect(b).toBe(a);
		expect(c).toBe(a);
		expect(hashText(b)).toBe(hashText(a));
		const source = readFileSync(new URL('./compose.ts', import.meta.url), 'utf8');
		expect(source).not.toMatch(/new Date|Date\.now|Math\.random|performance\.now|process\.env|navigator\.|location\./);
	});
});

describe('compose maps every field of story/1', () => {
	const shot = (id: string) => el(html, id)!;
	const audio = (id: string) => el(html, id);
	const cue = (text: string) => [...html.matchAll(/<div id="[^"]+" class="clip cue" data-start="([^"]*)" data-duration="([^"]*)"[^>]*><span class="who">([^<]*)<\/span><span class="line( em)?">([^<]*)<\/span>/g)].find((m) => m[5] === text);
	const lane = (id: string) => json(audio(id)?.['data-automation'])?.lanes?.[0]?.points as { t: number; v: number }[];
	const FIELDS: [string, () => void][] = [
		['shots.frame', () => expect(shot('pl-s0')).toMatchObject({ src: `/api/files/${F1}`, 'data-start': '0', 'data-track-index': '0' })],
		['shots.video', () => expect(shot('pl-s1')).toMatchObject({ src: `/api/files/${V1}`, muted: '', 'data-start': '2' })],
		['shots.video_in', () => expect(shot('pl-s1')['data-media-start']).toBe('1.5')],
		['shots.transition (dissolve: the shot before held under it)', () => (expect(steps).toContain('["pl-s1", 2, 4, 0, 0.5, 0.4]'), expect(shot('pl-s0')['data-duration']).toBe('2.4'))],
		['shots.transition (to and from black)', () => (expect(steps).toContain('["pl-s1", 2, 4, 0, 0.5, 0.4]'), expect(steps).toContain('["pl-s2", 4, 6, 0.6, 0, 0]'))],
		['voice.line (cut evenly, timed by its words)', () => (expect(cue('One seed.')?.slice(1, 3)).toEqual(['0', '1.104']), expect(cue('Then a hundred.')?.slice(1, 3)).toEqual(['1.104', '1.896']))],
		['voice.cues', () => expect(cue('A hundred')?.slice(1, 4)).toEqual(['3', '1.5', 'MAIA'])],
		['voice.cues.em', () => (expect(cue('100x')?.slice(1, 3)).toEqual(['4.5', '1.5']), expect(cue('100x')?.[4]).toBe(' em'))],
		['sound.audio', () => expect(audio('pl-a-voice-v0')).toMatchObject({ src: `/api/files/${A1}`, 'data-start': '0', 'data-duration': '3' })],
		['sound.audio_in', () => expect(audio('pl-a-voice-v0')?.['data-media-start']).toBe('0.2')],
		['sound.gain', () => expect(audio('pl-a-voice-v0')?.['data-volume']).toBe('0.794328')],
		['sound.fade_in', () => expect(audio('pl-a-voice-v0')?.['data-fade-in']).toBe('0.1')],
		['sound.fade_out', () => expect(audio('pl-a-voice-v0')?.['data-fade-out']).toBe('0.2')],
		['sound.eq', () => expect(json(audio('pl-a-music-m0')?.['data-fx-chain'])).toEqual({ version: 1, nodes: [{ type: 'highpass', id: 'n1', params: { frequency: 80, q: 0.707, poles: '2' } }, { type: 'peaking', id: 'n2', params: { frequency: 3000, gain: -3, q: 1.2 } }] })],
		['sound.keys', () => expect(lane('pl-a-music-m0')).toContainEqual({ t: 0, v: 0.158114 })],
		['track.gain', () => (expect(el(html, 'pl-g-music')?.['data-volume']).toBe('0.501187'), expect(audio('pl-a-music-m0')?.['data-audio-group']).toBe('pl-g-music'))],
		['track.mute', () => (expect(audio('pl-a-sfx-x0')).toBeNull(), expect(html).not.toContain(X1))],
		['track.duck', () => (expect(lane('pl-a-music-m0')).toContainEqual({ t: 2, v: 0.5 }), expect(lane('pl-a-music-m0')).toContainEqual({ t: 3.9, v: 1 }), expect(audio('pl-a-voice-v0')?.['data-automation']).toBeUndefined())]
	];
	it.each(FIELDS)('maps %s', (_, check) => check());
	it('maps nothing of the notes: they are the editor\'s, not the film\'s', () => expect(html).not.toContain('DAY 1'));
});

describe('compose: links', () => {
	const T = '7a1e0000-0000-4000-8000-000000000001', Z = '7a1e0000-0000-4000-8000-000000000002', S = '7a1e0000-0000-4000-8000-000000000003';
	const TV1 = H('a'), TV2 = H('b'), ZV = H('c');
	const teaser = body(2, [{ id: 'voice', kind: 'voice', clips: [{ id: 'z', at: 0, duration: 2, who: 'SAMUEL', line: 'Soon.' }] }, { id: 'back', kind: 'story', clips: [{ id: 'loop', at: 0, duration: 6, story: S, version: H('d') }] }]);
	const trailer = (line: string) => body(5, [
		{ id: 'voice', kind: 'voice', clips: [{ id: 't1', at: 0, duration: 3, who: 'SAMUEL', line }] },
		{ id: 'music', kind: 'music', clips: [{ id: 'm', at: 0, duration: 5, audio: M1, gain: -3 }] },
		{ id: 'teaser', kind: 'story', clips: [{ id: 't', at: 1, duration: 2, story: Z, version: ZV }] }
	]);
	const links: Links = {
		[TV1]: { id: T, title: 'The trailer', number: 1, version: TV1, duration: 5, body: trailer('The first trailer.') },
		[TV2]: { id: T, title: 'The trailer', number: 2, version: TV2, duration: 5, body: trailer('The second trailer.') },
		[ZV]: { id: Z, title: 'The teaser', number: 1, version: ZV, duration: 2, body: teaser },
		[H('d')]: { id: S, title: 'The film', number: 1, version: H('d'), duration: 6, body: body(6, []) }
	};
	const filmOf = (version: string, gain = 0) => ({ ...body(12, [{ id: 'voice', kind: 'voice', clips: [{ id: 'v', at: 0, duration: 3, who: 'MAIA', line: 'Three seeds.' }] }, { id: 'trailer', kind: 'story', gain, clips: [{ id: 'trailer', at: 3, duration: 5, story: T, version }] }]), id: S });
	it('links each version as a nested sub-composition at its place, two levels deep, never around a loop', () => {
		const out = compose(filmOf(TV2, -2), links);
		expect(el(out, 'pl-l-trailer-trailer')).toMatchObject({ 'data-composition-id': 'pl-l-trailer-trailer', 'data-start': '3', 'data-duration': '5', 'data-story': T, 'data-version': TV2 });
		expect(out).toContain('window.__timelines["pl-l-trailer-trailer"] = tl;');
		// its own clips at their own times inside it, its link's gain carried onto its sound
		expect(out).toMatch(/<div id="pl-l-trailer-trailer-v0-c0" class="clip cue" data-start="0" data-duration="3"[^>]*><span class="who">SAMUEL<\/span><span class="line">The second trailer.<\/span>/);
		expect(el(out, 'pl-l-trailer-trailer-a-music-m')?.['data-volume']).toBe('0.562341');
		// the teaser it links, inside it at its own place
		expect(el(out, 'pl-l-trailer-trailer-l-teaser-t')).toMatchObject({ 'data-start': '1', 'data-version': ZV });
		expect(out).toContain('>Soon.<');
		// the teaser links the film back: not laid in again
		expect(out).not.toContain('-l-back-loop');
	});
	it('links play the version each names: two films on two versions of one trailer', () => {
		expect(compose(filmOf(TV1), links)).toContain('The first trailer.');
		expect(compose(filmOf(TV1), links)).not.toContain('The second trailer.');
		expect(compose(filmOf(TV2), links)).toContain('The second trailer.');
		// a version play can't read plays nothing
		expect(compose(filmOf(H('f')), links)).not.toContain('pl-l-trailer');
	});
});

describe('compose: a composition shot', () => {
	const fixture = JSON.parse(readFileSync(new URL('./fixtures/hex-village.json', import.meta.url), 'utf8'));
	const [hash, source] = Object.entries(fixture.compositions)[0] as [string, string];
	it('a composition shot plays its composition in the shot\'s place, from 0 at the shot\'s start, scoped to it', () => {
		expect(hashText(source)).toBe(hash);
		const late = { ...fixture.story, duration: 12.5, tracks: [{ id: 'shots', kind: 'shots', clips: [{ id: 'still', at: 0, duration: 2.5, frame: F1, transition: 'cut' }, { id: 'hex', at: 2.5, duration: 10, frame: F2, composition: hash, transition: 'cut' }] }] };
		const out = compose(late, {}, fixture.compositions);
		const root = out.match(/<div class="clip" data-composition-id="pl-s1"[^>]*>/)?.[0] ?? '';
		expect(root).toContain('data-start="2.5"');
		expect(root).toContain('data-duration="10"');
		expect(root).toContain('id="root"');
		// what is inside keeps its own times, from the composition's 0; its timeline is the shot's
		expect(out).toContain('class="sub clip" data-start="0.3" data-duration="1.8"');
		expect(out).toContain('window.__timelines["pl-s1"] = tl;');
		expect(out).not.toContain('window.__timelines["main"]');
		// its styles hold only inside it, its scripts in a scope of their own, its still not drawn
		expect(out).toContain('[data-composition-id="pl-s1"]:is(#cam), [data-composition-id="pl-s1"] #cam');
		expect(out).toMatch(/\(\(\) => \{ try \{\n\s*\/\/ ---------- the world/);
		expect(out).not.toContain(`/api/files/${F2}`);
		// without its source given, the shot falls back to its still
		expect(compose(late)).toContain(`src="/api/files/${F2}"`);
	});
});

describe('compose: sealed', () => {
	const fixture = JSON.parse(readFileSync(new URL('./fixtures/hex-village.json', import.meta.url), 'utf8'));
	const out = compose(fixture.story, fixture.links, fixture.compositions);
	it('sealed: the player\'s frame is play\'s, scripts only, never same-origin, every device feature off', () => {
		expect(FRAME.sandbox).toBe(SANDBOX);
		expect(FRAME.sandbox).toBe('allow-scripts');
		expect(FRAME.sandbox).not.toContain('allow-same-origin');
		for (const f of DENIED) expect(FRAME.allow).toContain(`${f} 'none'`);
	});
	it('sealed: the composition carries play\'s frame policy, no connection, and names nothing but play\'s files', () => {
		expect(CSP).toBe(frameCsp({ script: "'self' 'unsafe-inline' blob:", open: { 'img-src': "'self' blob: data:", 'media-src': "'self' blob:", 'style-src': "'unsafe-inline'", 'font-src': "'self' blob: data:" } }));
		expect(CSP).toContain("connect-src 'none'");
		expect(CSP).toContain("frame-src 'none'");
		expect(out).toContain(`<meta http-equiv="Content-Security-Policy" content="${CSP}">`);
		for (const o of [out, html]) {
			for (const [, url] of o.matchAll(/\s(?:src|href|poster)="([^"]*)"/g)) expect(url).toMatch(/^\/api\/files\/[0-9a-f]{64}$/);
			for (const [, url] of o.matchAll(/url\(\s*["']?([^"')]*)/g)) expect(url).toMatch(/^(\/api\/files\/[0-9a-f]{64}|#.*|\$\{.*)$/);
			expect([...o.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map((m) => m[0]).filter((u) => !u.startsWith('http://www.w3.org/'))).toEqual([]);
		}
		// GSAP, HyperFrames' runtime and the font, by their hash
		expect(filesOf(out)).toEqual(expect.arrayContaining([VENDOR.runtime.hash, VENDOR.gsap.hash, VENDOR.font.hash]));
		expect(out).toContain(`<script src="/api/files/${VENDOR.runtime.hash}" data-vendor="${VENDOR.runtime.name}"></script>`);
	});
	it('sealed: in the frame it loads nothing: every file and script waits to be handed in', () => {
		const sealed = seal(out);
		expect(sealed).not.toMatch(/\ssrc="/);
		expect(sealed).not.toMatch(/<script>(?!\(\(\) => \{\n\tconst urls)/);
		expect(sealed.match(/<script type="text\/x-play-held" data-play-file="([0-9a-f]{64})"/g)).toHaveLength(2);
		expect(sealed).toContain(`<style data-play-file="${VENDOR.font.hash}" media="not all">`);
		// the player sees the runtime is there, and injects none from a CDN
		expect(sealed).toMatch(/hyperframe\.runtime\.iife\.js/);
	});
});

// a live shot (intent f270269e, ./live.ts): the real asset drawn by the asset box's own frozen engine
describe('compose: a live shot', () => {
	const fixture = JSON.parse(readFileSync(new URL('./fixtures/king-coconut-live.json', import.meta.url), 'utf8'));
	const assets = fixture.assets as Record<string, LiveAsset>;
	const shotOf = (live: Live, frame: string | null = F1) => body(6, [{ id: 'shots', kind: 'shots', clips: [{ id: 'still', at: 0, duration: 2, frame: F2, transition: 'cut' }, { id: 'palm', at: 2, duration: 4, frame, transition: 'cut', live }] }]);
	const palm: Live = fixture.story.tracks[0].clips[0].live;
	const PIECE = H('9');
	const withPiece = { [palm.version]: { ...assets[palm.version], pieces: [PIECE] } };
	const out = compose(shotOf(palm), {}, {}, withPiece);
	const engine = engineAt('box', 5) as { blake3: string };
	const spec = JSON.parse(out.match(/playLive\.shot\(tl, "pl-s1", (\{.*\})\);/)?.[1] ?? 'null');

	it('live: compiles to the same bytes every time, reading no clock or chance', () => {
		const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('read Math.random'); });
		const now = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('read the clock'); });
		const a = compose(shotOf(palm), {}, {}, withPiece), b = compose(structuredClone(shotOf(palm)), {}, {}, structuredClone(withPiece));
		random.mockRestore(), now.mockRestore();
		expect(b).toBe(a);
		expect(hashText(b)).toBe(hashText(a));
		expect(compose(fixture.story, {}, {}, assets)).toBe(compose(JSON.parse(JSON.stringify(fixture.story)), {}, {}, assets));
		for (const f of ['./live.ts', './live-runtime.ts']) expect(readFileSync(new URL(f, import.meta.url), 'utf8')).not.toMatch(/new Date|Date\.now|Math\.random|process\.env|navigator\.|location\./);
		// and no sky of it on the in-game clock, which follows the wall clock (../content/sandbox-kit/sky-clock.test.ts)
		const rt = readFileSync(new URL('./live-runtime.ts', import.meta.url), 'utf8');
		expect(rt).toMatch(/new Stage\([^)]*hour: LIVE_HOUR/);
		expect([...rt.matchAll(/createSky\(([^;]*)\);/g)].map((m) => /clock:/.test(m[1]))).toEqual([true]);
	});
	it('live: the runtime a composition loads is a classic script that parses and defines playLive', () => {
		// a composition loads it with a plain <script src>, never as a module: import.meta there throws as it parses, and
		// playLive is never defined (c7 on the Mac, 2026-11-09: three's KTX2Loader brought import.meta.url in)
		const src = readFileSync(new URL('../../../static/live/live-runtime.js', import.meta.url), 'utf8');
		expect(hashText(src)).toBe(VENDOR.live.hash);
		expect(src).not.toMatch(/import\.meta/);
		const W: Record<string, unknown> = { URL, TextDecoder, TextEncoder, console, setTimeout, clearTimeout, queueMicrotask, performance };
		W.window = W.self = W.globalThis = W;
		new Script(src, { filename: 'live-runtime.js' }).runInNewContext(W);
		expect(Object.keys(W.playLive as object).sort()).toEqual(['shot', 'world']);
	});
	it('live: names by hash the frozen box engine, the recipe, its pieces and the live runtime, and keeps the still as its poster', () => {
		expect(codeOf(out)).toEqual([engine.blake3, PIECE, assets[palm.version].recipe]);
		for (const h of codeOf(out)) expect(out).toContain(`<script type="text/x-play-code" data-play-code="${h}"></script>`);
		expect(spec).toMatchObject({ engine: { v: 5, hash: engine.blake3 }, recipe: assets[palm.version].recipe, pieces: [PIECE], at: 2, duration: 4, size: [1080, 1920] });
		expect(out).toContain(`<script src="/api/files/${VENDOR.live.hash}" data-vendor="${VENDOR.live.name}"></script>`);
		expect(VENDOR.live.hash).toMatch(/^[0-9a-f]{64}$/);
		const shot = out.match(/<div id="pl-s1" class="clip shot live"[^>]*>(.*?)<\/div>/)?.[0] ?? '';
		expect(shot).toContain(`data-asset="${palm.asset}"`);
		expect(shot).toContain(`data-version="${palm.version}"`);
		expect(shot).toContain(`<img class="poster" src="/api/files/${F1}" alt="">`);
		expect(shot).toContain('<canvas width="1080" height="1920"></canvas>');
		// the runtime loads after GSAP and before the story's script, which hands each shot its spec
		expect(out.indexOf(VENDOR.live.hash)).toBeGreaterThan(out.indexOf(VENDOR.gsap.hash));
		expect(out.indexOf(VENDOR.live.hash)).toBeLessThan(out.indexOf('playLive.shot('));
		// no live shot, no runtime and no code
		expect(compose(shotOf(palm), {}, {}, {})).not.toContain(VENDOR.live.hash);
	});
	it('live: each step\'s build named by its values, the camera\'s keys as given', () => {
		expect(spec.times).toEqual([0, 0.857143, 1.714286, 2.571429, 3.428571, 4.285714, 5.142857, 6]);
		expect(spec.builds[0]).toEqual({ detail: '1', fruit: '0', seed: 'maia', stage: '10' });
		expect(spec.builds[7]).toEqual({ detail: '1', fruit: '0', seed: 'maia', stage: '11' });
		expect(spec.builds.map((b: Record<string, string>) => Number(b.stage))).toEqual([10, 10.142857, 10.285714, 10.428572, 10.571429, 10.714286, 10.857143, 11]);
		expect(spec.camera).toEqual(palm.camera);
	});
	it('live: makes no connection outside play\'s files, sealed or laid in', () => {
		expect(CSP).toContain("connect-src 'none'");
		expect(CSP).toContain('worker-src blob:');
		for (const o of [out, seal(out)]) {
			for (const [, url] of o.matchAll(/\s(?:src|href|poster)="([^"]*)"/g)) expect(url).toMatch(/^\/api\/files\/[0-9a-f]{64}$/);
			expect([...o.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map((m) => m[0]).filter((u) => !u.startsWith('http://www.w3.org/'))).toEqual([]);
		}
		// sealed: the engine, recipe and pieces are asked of the page as code (held to their hashes there) and laid in as text
		const sealed = seal(out);
		expect(sealed).toContain("document.querySelectorAll('script[data-play-code]')");
		expect(sealed).toContain('(window.__playCode ??= {})[el.dataset.playCode] = f;');
		expect(sealed).toContain(`<script type="text/x-play-code" data-play-code="${engine.blake3}"></script>`);
		// the renderer's: laid in as a JavaScript string, its bytes as they were
		const text = 'self.x = "</script><!--";   ok';
		const done = laid(out, { [PIECE]: text });
		const lit = done.match(new RegExp(`\\(window\\.__playCode \\?\\?= \\{\\}\\)\\["${PIECE}"\\] = (.*);</script>`))?.[1] ?? '';
		expect(lit).not.toContain('</script');
		expect(JSON.parse(lit)).toBe(text);
		expect(codeOf(done)).toEqual([engine.blake3, assets[palm.version].recipe]);
	});
	it('live: without its version from play, or with an engine not frozen, the shot shows its still', () => {
		for (const given of [{}, { [palm.version]: { ...assets[palm.version], engine: 99 } }, { [palm.version]: { ...assets[palm.version], asset: '00000000-0000-4000-8000-000000000000' } }]) {
			const o = compose(shotOf(palm), {}, {}, given);
			expect(o).toContain(`<img id="pl-s1" class="clip shot" data-start="2"`);
			expect(codeOf(o)).toEqual([]);
		}
		// a variant draws the variant's recipe
		const v = compose(shotOf({ ...palm, variant: 'dwarf' }), {}, {}, { [palm.version]: { ...assets[palm.version], variants: { dwarf: { recipe: H('7') } } } });
		expect(codeOf(v)).toContain(H('7'));
	});
	it('live: the moment is the picture: steps, values and camera by t alone', () => {
		const times = stepTimes(palm);
		expect(stepAt(times, 0)).toBe(0);
		expect(stepAt(times, 2)).toBe(2);
		expect(stepAt(times, 2)).toBe(stepAt(times, 2.0));
		expect(stepAt(times, 6)).toBe(7);
		expect(stepAt(times, 99)).toBe(7);
		expect(valuesAt(palm, 3)).toMatchObject({ stage: 10.5, seed: 'maia' });
		expect(valuesAt({ values: { stage: 1, look: 'a' }, keys: [{ at: 2, values: { stage: 3, look: 'b' } }, { at: 4, values: { stage: 5 } }] }, 1)).toEqual({ stage: 1, look: 'a' });
		expect(valuesAt({ keys: [{ at: 0, values: { look: 'a' } }, { at: 4, values: { look: 'b' } }] }, 3)).toEqual({ look: 'a' });
		expect(stepTimes({})).toEqual([0]);
		expect(buildsOf({ ...palm, keys: undefined })).toEqual([{ detail: '1', fruit: '0', seed: 'maia', stage: '10' }]);
		const c0 = cameraAt(palm.camera, 0), c6 = cameraAt(palm.camera, 6), c3 = cameraAt(palm.camera, 3);
		expect(c0).toEqual({ eye: palm.camera[0].eye, target: palm.camera[0].target, fov: palm.camera[0].fov });
		expect(c6.eye).toEqual(palm.camera[1].eye);
		expect(c3.eye[1]).toBeCloseTo((palm.camera[0].eye[1] + palm.camera[1].eye[1]) / 2, 9);
		expect(cameraAt(palm.camera, 2)).toEqual(cameraAt(palm.camera, 2));
		expect(cameraAt([{ ...palm.camera[0], at: 0 }, { ...palm.camera[1], ease: 'linear' }], 1.5).fov).toBeCloseTo(palm.camera[0].fov + (palm.camera[1].fov - palm.camera[0].fov) / 4, 9);
	});

});

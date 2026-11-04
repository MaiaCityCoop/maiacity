import { describe, expect, it } from 'vitest';
import { clipsOf, CUE_CHARS, cuesOf, flatten, lightOf, linkedOf, renderAt, transitionOf, sectionsOf, setCuesOf, soundsOf, type Links, type StoryBody } from './timeline';

const LEAVES = 'Every few days, a new leaf unfolds at its crown, each turned a little further round than the last, so that every leaf finds the light. The old ones, it lets fall. Each leaves a scar, and in time its trunk becomes a diary of every leaf it ever wore.';
const TRAILER = 'This is the story of how one million humans build a hundred times better way of living: their own solarpunk city, from the ground up. First in a game, then for real.';

describe('subtitle cues: one line at a time', () => {
	it('keeps every word, in order, once', () => {
		for (const line of [LEAVES, TRAILER, 'Both. This papaya can make its fruit all by itself.']) {
			const cues = cuesOf(line);
			expect(cues.map((c) => c.text).join(' ')).toBe(line);
			let from = 0;
			for (const c of cues) {
				expect(c.from).toBe(from);
				from += c.words;
			}
			expect(from).toBe(line.split(/\s+/).length);
		}
	});
	it('fits each cue on one line, a little over at most', () => {
		for (const c of [...cuesOf(LEAVES), ...cuesOf(TRAILER)]) expect(c.text.length).toBeLessThanOrEqual(Math.round(CUE_CHARS * 1.15));
	});
	it('cuts at sentences first, and never leaves a line hanging on a small word', () => {
		const texts = cuesOf(TRAILER).map((c) => c.text);
		expect(texts).toContain('First in a game,');
		expect(texts.at(-1)).toBe('then for real.');
		for (const t of texts) expect(t).not.toMatch(/\s(a|the|of|to|one|ten)$/i);
		expect(cuesOf('Both. This papaya can make its fruit all by itself.')[0].text).toBe('Both.');
	});
	it('shows the cue being spoken as the clip plays', () => {
		const story: StoryBody = { schema: 'story/1', format: '9:16', fps: 30, duration: 10, tracks: [{ id: 'voice', kind: 'voice', clips: [{ id: 'v', at: 0, duration: 10, who: 'MAIA', line: TRAILER }] }] } as StoryBody;
		const cues = cuesOf(TRAILER);
		expect(renderAt(story, 0).cue?.text).toBe(cues[0].text);
		expect(renderAt(story, 9.9).cue?.text).toBe(cues.at(-1)!.text);
		const mid = renderAt(story, 5);
		expect(cues.indexOf(mid.cue!)).toBeGreaterThan(0);
	});
});

describe('subtitles a clip sets itself', () => {
	const LINE = 'This is the story of how one million humans build a hundred times better way of living.';
	const story = (cues?: unknown): StoryBody =>
		({ schema: 'story/1', format: '1:1', fps: 30, duration: 8, tracks: [{ id: 'voice', kind: 'voice', clips: [{ id: 't1', at: 2, duration: 6, who: 'SAMUEL', line: LINE, ...(cues ? { cues } : {}) }] }] }) as any;
	const CUES = [
		{ at: 0, text: 'This is the story of how' },
		{ at: 4.25, text: '100x', em: true },
		{ at: 2.05, text: 'one million humans build' },
		{ at: 5.15, text: 'better way of living.' },
	];
	it('shows each from its own second into the clip, in time order, until the next', () => {
		const texts = [2, 4.1, 6.2, 6.3, 7.1, 7.9].map((t) => renderAt(story(CUES), t).cue?.text);
		expect(texts).toEqual(['This is the story of how', 'one million humans build', 'one million humans build', '100x', '100x', 'better way of living.']);
	});
	it('sets the emphasized one apart, alone', () => {
		expect(renderAt(story(CUES), 6.4).cue?.em).toBe(true);
		expect(renderAt(story(CUES), 4.5).cue?.em).toBe(false);
	});
	it('falls back to the line cut evenly when the clip sets none, or none that holds text', () => {
		expect(renderAt(story(), 2).cue?.text).toBe(cuesOf(LINE)[0].text);
		expect(setCuesOf({ id: 'v', at: 0, duration: 1, who: 'S', line: 'x', cues: [{ at: 1, text: '  ' }] } as any)).toEqual([]);
		expect(renderAt(story([{ at: 'soon', text: 'x' }]), 2).cue?.text).toBe(cuesOf(LINE)[0].text);
	});
});

describe('the sound under the voice', () => {
	const story = (duck?: boolean): StoryBody =>
		({
			schema: 'story/1', format: '1:1', fps: 30, duration: 10,
			tracks: [
				{ id: 'voice', kind: 'voice', clips: [{ id: 'v1', at: 0, duration: 3, who: 'MAIA', line: 'Here.', audio: 'a'.repeat(64) }] },
				{ id: 'music', kind: 'music', ...(duck === undefined ? {} : { duck }), clips: [{ id: 'm1', at: 0, duration: 10, audio: 'b'.repeat(64) }] },
			],
		}) as any;
	it('keeps the music steady under the voice by default: a clean, continuous flow', () => {
		expect(soundsOf(story()).find((s) => s.kind === 'music')?.duck).toBe(false);
	});
	it('dips a track under the voice only when it asks for it', () => {
		expect(soundsOf(story(true)).find((s) => s.kind === 'music')?.duck).toBe(true);
	});
});

describe('sections and their emotions', () => {
	it('spans consecutive notes of one section and carries the first emotion they name', () => {
		const story = {
			schema: 'story/1', format: '9:16', fps: 30, duration: 10,
			tracks: [{ id: 'notes', kind: 'notes', clips: [
				{ id: 'a', at: 0, duration: 2, section: 'HOOK', emotion: 'Astonishment', camera: '', retention: '', mood: '' },
				{ id: 'b', at: 2, duration: 3, section: 'HOOK', camera: '', retention: '', mood: '' },
				{ id: 'c', at: 5, duration: 5, section: 'THE CITY', camera: '', retention: '', mood: '' }
			] }]
		} as any;
		expect(sectionsOf(story)).toEqual([
			{ section: 'HOOK', at: 0, end: 5, emotion: 'Astonishment' },
			{ section: 'THE CITY', at: 5, end: 10, emotion: '' }
		]);
	});
});

describe('linked stories: one timeline composed of others', () => {
	const T = '7a1e0000-0000-4000-8000-000000000001', F = '7a1e0000-0000-4000-8000-000000000002', S = '7a1e0000-0000-4000-8000-000000000003';
	const A = 'a'.repeat(64), B = 'b'.repeat(64), V1 = '1'.repeat(64), V2 = '2'.repeat(64), FV = 'e'.repeat(64);
	const body = (duration: number, tracks: unknown[]) => ({ schema: 'story/1', format: '9:16', fps: 30, duration, tracks }) as StoryBody;
	const trailer = body(5, [
		{ id: 'voice', kind: 'voice', clips: [{ id: 't1', at: 0, duration: 4, who: 'SAMUEL', line: TRAILER, audio: A }] },
		{ id: 'notes', kind: 'notes', clips: [{ id: 'n', at: 0, duration: 5, section: 'TRAILER', emotion: 'Hope', camera: 'Wide', retention: '', mood: '↑↑' }] },
		{ id: 'music', kind: 'music', clips: [{ id: 'm', at: 0, duration: 5, audio: B, gain: -3 }] }
	]);
	const film = (link: Record<string, unknown> = {}) =>
		({
			...body(12, [
				{ id: 'voice', kind: 'voice', clips: [{ id: 'intro', at: 0, duration: 3, who: 'MAIA', line: 'Three seeds.' }, { id: 'body', at: 8, duration: 4, who: 'MAIA', line: 'One will never give fruit.' }] },
				{ id: 'notes', kind: 'notes', clips: [{ id: 'all', at: 0, duration: 12, section: 'DAY 1', camera: '', retention: '', mood: '↕' }] },
				{ id: 'trailer', kind: 'story', clips: [{ id: 'trailer', at: 3, duration: 5, story: T, version: V2, ...link }] }
			]),
			id: F
		}) as StoryBody & { id: string };
	const links: Links = {
		[V2]: { id: T, title: 'The trailer', number: 2, version: V2, duration: 5, newest: 3, body: trailer },
		[V1]: { id: T, title: 'The trailer', number: 1, version: V1, duration: 5, newest: 3, body: body(5, [{ id: 'voice', kind: 'voice', clips: [{ id: 'old', at: 0, duration: 5, who: 'SAMUEL', line: 'The first trailer.' }] }]) }
	};

	it('lays the linked version in at its link, its clips tagged and their ids made unique', () => {
		const flat = flatten(film(), links);
		expect(flat.tracks.slice(0, 3)).toEqual(film().tracks); // the story's own first, as they are
		const voice = flat.tracks.find((t) => t.id === 'trailer:trailer/voice')!;
		expect(voice).toMatchObject({ kind: 'voice', name: 'voice', link: { story: T, title: 'The trailer', number: 2, depth: 1 } });
		expect(voice.clips[0]).toMatchObject({ id: 'trailer:trailer/t1', at: 3, duration: 4, line: TRAILER, link: { story: T } });
		expect(clipsOf(flat, 'voice').map((c) => c.id)).toEqual(['intro', 'trailer:trailer/t1', 'body']);
		// the slot names the version it plays, and that a newer one is there (shown only)
		expect(flat.slots).toEqual([{ track: 'trailer', clip: 'trailer', at: 3, duration: 5, story: T, title: 'The trailer', number: 2, newest: 3, depth: 0 }]);
	});

	it("shows the linked version's subtitle and notes inside the link, the story's own around it", () => {
		const flat = flatten(film(), links);
		const inside = renderAt(flat, 3.2);
		expect(inside.voice?.id).toBe('trailer:trailer/t1');
		expect(inside.cue?.text).toBe(cuesOf(TRAILER)[0].text);
		// the later-starting notes: the trailer's, over the film's long one
		expect(inside.notes).toMatchObject({ section: 'TRAILER', camera: 'Wide', link: { title: 'The trailer' } });
		expect(renderAt(flat, 1).voice?.id).toBe('intro');
		expect(renderAt(flat, 9).voice?.id).toBe('body');
		expect(renderAt(flat, 9).notes?.section).toBe('DAY 1');
		expect(sectionsOf(flat)).toEqual([
			{ section: 'DAY 1', at: 0, end: 3, emotion: '' },
			{ section: 'TRAILER', at: 3, end: 8, emotion: 'Hope' },
			{ section: 'DAY 1', at: 8, end: 12, emotion: '' }
		]);
	});

	it("plays the linked version's recordings at their place, the link's gain and mute carried onto them", () => {
		const sounds = soundsOf(flatten(film(), links));
		expect(sounds.map((s) => [s.clip, s.hash, s.at, s.duration])).toEqual([
			['trailer:trailer/t1', A, 3, 4],
			['trailer:trailer/m', B, 3, 5]
		]);
		expect(sounds[1].vol).toBeCloseTo(Math.pow(10, -3 / 20));
		expect(soundsOf(flatten(film({ gain: -6 }), links))[1].vol).toBeCloseTo(Math.pow(10, -9 / 20));
		const muted = film();
		muted.tracks[2].mute = true;
		expect(soundsOf(flatten(muted, links))).toEqual([]);
	});

	it("picks one clip where a linked clip and the story's own overlap: the later-starting one, the story's own on a tie", () => {
		const lcut = film();
		lcut.tracks[0].clips[1] = { id: 'body', at: 6.5, duration: 4, who: 'MAIA', line: 'One will never give fruit.' }; // the film's next line over the trailer's last words
		const flat = flatten(lcut, links);
		expect(renderAt(flat, 5).voice?.id).toBe('trailer:trailer/t1');
		expect(renderAt(flat, 6.8).voice?.id).toBe('body');
		const tie = film();
		tie.tracks[0].clips.splice(1, 0, { id: 'over', at: 3, duration: 1, who: 'MAIA', line: 'Mine.' });
		const both = flatten(tie, links);
		expect(renderAt(both, 3.5).voice?.id).toBe('over');
		expect(renderAt(both, 4.5).voice?.id).toBe('trailer:trailer/t1'); // the linked line again once the story's own ends
	});

	it('plays the version each link names: two films on two versions of one trailer, each its own', () => {
		const day1 = flatten(film({ version: V1 }), links);
		const day2 = flatten(film(), links);
		expect(renderAt(day1, 4).voice?.line).toBe('The first trailer.');
		expect(renderAt(day2, 4).voice?.line).toBe(TRAILER);
		expect([day1.slots[0].number, day2.slots[0].number]).toEqual([1, 2]);
		expect(linkedOf({ story: T, version: V1 }, links)?.number).toBe(1);
		// a version named as another story's is not that story's: nothing is laid in
		expect(linkedOf({ story: F, version: V1 }, links)).toBeNull();
		expect(flatten(film({ story: F }), links).tracks.length).toBe(3);
	});

	it('lays links within links, offset by each, and never loops', () => {
		const season = { ...body(14, [{ id: 'films', kind: 'story', clips: [{ id: 'day-1', at: 2, duration: 12, story: F, version: FV }] }]), id: S } as StoryBody & { id: string };
		const all: Links = { ...links, [FV]: { id: F, title: 'Day 1', number: 1, version: FV, duration: 12, body: film() } };
		const flat = flatten(season, all);
		expect(clipsOf(flat, 'voice').find((c) => c.id === 'films:day-1/trailer:trailer/t1')).toMatchObject({ at: 5, duration: 4, link: { story: T, depth: 2 } });
		expect(renderAt(flat, 5.5).voice?.line).toBe(TRAILER);
		expect(renderAt(flat, 2.5).voice?.id).toBe('films:day-1/intro');
		expect(flat.slots.map((s) => [s.clip, s.at, s.depth])).toEqual([['day-1', 2, 0], ['films:day-1/trailer', 5, 1]]);
		// a loop in what it reads (the trailer linking the film again) is laid in once, never round and round
		const loop: Links = { ...all, [V2]: { ...links[V2], body: body(5, [...trailer.tracks, { id: 'back', kind: 'story', clips: [{ id: 'f', at: 0, duration: 5, story: F, version: FV }] }]) } };
		expect(flatten(season, loop).tracks.filter((t) => t.name === 'voice').length).toBe(2);
		// a link that can't be read plays nothing, and its slot says so
		const lost = flatten(film(), {});
		expect(lost.tracks.length).toBe(3);
		expect(lost.slots[0]).toMatchObject({ title: null, number: null });
	});
});

describe('transitions are code: cuts, dissolves and fades', () => {
	const F = 'f'.repeat(64);
	const story = (a: string, b: string, c = 'cut') =>
		({
			schema: 'story/1', format: '1:1', fps: 30, duration: 9,
			tracks: [{ id: 'shots', kind: 'shots', clips: [
				{ id: 'a', at: 0, duration: 3, frame: F, transition: a },
				{ id: 'b', at: 3, duration: 3, frame: F, transition: b },
				{ id: 'c', at: 6, duration: 3, frame: F, transition: c }
			] }]
		}) as unknown as StoryBody;
	it('reads the codes, each from its start, with their seconds', () => {
		expect(transitionOf('from black 0.7, cut')).toEqual({ cut: true, dissolve: null, fromBlack: 0.7, toBlack: 0, dip: 0 });
		expect(transitionOf('Dissolve 1.2 s')).toMatchObject({ dissolve: 1.2, cut: false });
		expect(transitionOf('fade to black').toBlack).toBe(0.5);
		expect(transitionOf('dip to black 0.4').dip).toBe(0.4);
		expect(transitionOf('Match cut on the dome').cut).toBe(true);
		expect(transitionOf('the light carries over')).toEqual({ cut: false, dissolve: null, fromBlack: 0, toBlack: 0, dip: 0 });
	});
	it('a cut cuts; a dissolve takes its seconds; prose dissolves briefly as before', () => {
		expect(renderAt(story('cut', 'cut'), 3.01).mix).toBe(1);
		const d = renderAt(story('dissolve 1', 'cut'), 3.5);
		expect(d.mix).toBeCloseTo(0.5, 5);
		expect(d.prev?.id).toBe('a');
		expect(renderAt(story('the light carries over', 'cut'), 3.2).mix).toBeLessThan(1);
	});
	it('from black and to black: the first shot comes up, the last goes down', () => {
		const s = story('from black 0.7, cut', 'cut', 'to black 1');
		expect(renderAt(s, 0).light).toBe(0);
		expect(renderAt(s, 0.35).light).toBeCloseTo(0.5, 5);
		expect(renderAt(s, 0.7).light).toBe(1);
		expect(renderAt(s, 4).light).toBe(1);
		expect(renderAt(s, 8.5).light).toBeCloseTo(0.5, 5);
		expect(renderAt(s, 9).light).toBe(0);
	});
	it('a dip to black goes down at the end of one shot and up at the start of the next, with no dissolve', () => {
		const s = story('dip to black 0.4', 'cut');
		expect(renderAt(s, 2.8).light).toBeCloseTo(0.5, 5);
		expect(renderAt(s, 3).mix).toBe(1);
		expect(renderAt(s, 3.2).light).toBeCloseTo(0.5, 5);
		expect(renderAt(s, 3.4).light).toBe(1);
		expect(lightOf({ id: 'x', at: 0, duration: 2, frame: F, transition: 'cut' } as never, 0)).toBe(1);
	});
});

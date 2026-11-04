import { describe, expect, it } from 'vitest';
import { CUE_CHARS, cuesOf, renderAt, sectionsOf, setCuesOf, soundsOf, type StoryBody } from './timeline';

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

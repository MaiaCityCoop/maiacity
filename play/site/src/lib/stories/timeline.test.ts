import { describe, expect, it } from 'vitest';
import { clipAt, CUE_CHARS, cuesOf, linkedOf, sectionsOf, setCuesOf, shotEdge, type Links, type StoryBody } from './timeline';

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
});

describe('subtitles a clip sets itself', () => {
	const voice = (cues?: unknown) => ({ id: 't1', at: 2, duration: 6, who: 'SAMUEL', line: 'This is the story of how one million humans build a hundred times better way of living.', ...(cues ? { cues } : {}) }) as any;
	it('sets each from its own second, in time order, the emphasized one apart', () => {
		const set = setCuesOf(voice([{ at: 0, text: 'This is the story of how' }, { at: 4.25, text: '100x', em: true }, { at: 2.05, text: ' one million humans build ' }]));
		expect(set.map((c) => [c.at, c.text, c.em])).toEqual([[0, 'This is the story of how', false], [2.05, 'one million humans build', false], [4.25, '100x', true]]);
	});
	it('sets none when the clip sets none, or none that holds text: its line is then cut evenly', () => {
		expect(setCuesOf(voice())).toEqual([]);
		expect(setCuesOf(voice([{ at: 1, text: '  ' }]))).toEqual([]);
	});
});

describe('the lanes', () => {
	const T = '7a1e0000-0000-4000-8000-000000000001', F = '7a1e0000-0000-4000-8000-000000000002', V1 = '1'.repeat(64);
	const story = {
		schema: 'story/1', format: '9:16', fps: 30, duration: 12,
		tracks: [
			{ id: 'shots', kind: 'shots', clips: [{ id: 'a', at: 0, duration: 4 }, { id: 'b', at: 4, duration: 4 }, { id: 'c', at: 8, duration: 4 }] },
			{ id: 'voice', kind: 'voice', clips: [{ id: 'long', at: 0, duration: 10 }] },
			{ id: 'aside', kind: 'voice', clips: [{ id: 'over', at: 3, duration: 1 }, { id: 'tie', at: 0, duration: 1 }] }
		]
	} as unknown as StoryBody;
	it('picks one clip where two overlap: the later-starting one, the first on a tie, the long one again after', () => {
		expect(clipAt(story, 'voice', 0.5)?.id).toBe('long');
		expect(clipAt(story, 'voice', 3.5)?.id).toBe('over');
		expect(clipAt(story, 'voice', 5)?.id).toBe('long');
	});
	it('seeks by shot: the next one\'s start, or the start of this one or the one before', () => {
		expect([shotEdge(story, 1, 1), shotEdge(story, 8.1, 1), shotEdge(story, 5, -1), shotEdge(story, 4.1, -1)]).toEqual([4, 12, 4, 0]);
	});
	it('reads a link by the version it names, and only as the story it names', () => {
		const links: Links = { [V1]: { id: T, title: 'The trailer', number: 1, version: V1, duration: 5, body: { ...story, duration: 5 } } };
		expect(linkedOf({ story: T, version: V1 }, links)?.number).toBe(1);
		expect(linkedOf({ story: F, version: V1 }, links)).toBeNull();
		expect(linkedOf({ story: T, version: '2'.repeat(64) }, links)).toBeNull();
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

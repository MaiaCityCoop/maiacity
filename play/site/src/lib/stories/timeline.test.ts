import { describe, expect, it } from 'vitest';
import { CUE_CHARS, cuesOf, renderAt, soundsOf, type StoryBody } from './timeline';

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

import { describe, expect, it } from 'vitest';
import { changesOnly, lineDiff, sentences } from './diff';

describe('sentences', () => {
	it('splits a text with no newline as before: one sentence a line', () => {
		expect(sentences('One thing. Two things! Three? `four` and "five". (Six)')).toBe('One thing.\nTwo things!\nThree?\n`four` and "five".\n(Six)');
		expect(sentences('e.g. lower case stays. Next')).toBe('e.g. lower case stays.\nNext');
	});

	it('splits by lines first, keeping empty lines, then each line into sentences', () => {
		expect(sentences('A one. A two.\n\nB one. B two.')).toBe('A one.\nA two.\n\nB one.\nB two.');
		expect(sentences(undefined)).toBe('');
	});

	it('a sentence changed in the second of three paragraphs diffs as that sentence alone', () => {
		const p1 = 'The first paragraph starts. It goes on a while. It ends here.';
		const p3 = 'The third paragraph is short. It is also unchanged.';
		const a = [p1, 'The second has three sentences. This one will change. The last stays.', p3].join('\n\n');
		const b = [p1, 'The second has three sentences. This one has changed now. The last stays.', p3].join('\n\n');
		const changed = changesOnly(lineDiff(sentences(a), sentences(b))).filter((l) => l.op !== 'same' && l.op !== 'skip');
		expect(changed).toEqual([
			{ op: 'del', text: 'This one will change.' },
			{ op: 'add', text: 'This one has changed now.' }
		]);
		const all = lineDiff(sentences(a), sentences(b));
		expect(all.filter((l) => l.op === 'same').map((l) => l.text)).toEqual(sentences(a).split('\n').filter((l) => l !== 'This one will change.'));
	});
});

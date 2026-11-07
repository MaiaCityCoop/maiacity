// The intents' board loads fast (intent 2cb70fb8-fbbf-4473-8ac1-b8d3bb078147, check c2): ./board.ts against play's
// API mocked, every path asked of it recorded.
import { describe, expect, test } from 'vitest';
import { CLOSED, loadOpen, loadPage, OPEN, PAGE, type Answer, type Get } from './board';

type C = { id: string; stage: string };
const card = (id: string, stage: string): C => ({ id, stage });
const COUNTS = { idea: 2, specify: 1, build: 1, proposal: 1, ship: 0, accepted: 120, archived: 3 };
const accepted = Array.from({ length: 120 }, (_, i) => card(`a${String(i).padStart(3, '0')}`, 'accepted'));

/** play's API, mocked: the open stages and counts, and the closed stages a page at a time by limit and before */
function mock() {
	const asked: string[] = [];
	const get: Get = async <A,>(path: string) => {
		asked.push(path);
		const u = new URL(`http://play.test/api${path}`);
		const stages = u.searchParams.get('stage')!.split(',');
		if (stages.some((s) => (CLOSED as readonly string[]).includes(s))) {
			const all = stages[0] === 'accepted' ? accepted : [card('r0', 'archived'), card('r1', 'archived'), card('r2', 'archived')];
			const limit = Number(u.searchParams.get('limit'));
			const before = u.searchParams.get('before');
			const from = before ? all.findIndex((c) => c.id === before) + 1 : 0;
			const page = all.slice(from, from + limit);
			return { intents: page, next: from + limit < all.length ? page[page.length - 1].id : null } as Answer<C> as A;
		}
		const open = [card('i1', 'idea'), card('i2', 'idea'), card('s1', 'specify'), card('b1', 'build'), card('p1', 'proposal')];
		return { intents: open.filter((c) => stages.includes(c.stage)), next: null, ...(u.searchParams.has('counts') ? { counts: COUNTS } : {}) } as Answer<C> as A;
	};
	return { get, asked };
}

describe('board loads', () => {
	test('opening the board asks only for the open columns, and gets every count', async () => {
		const { get, asked } = mock();
		const { cards, counts } = await loadOpen(get, [] as C[]);
		expect(asked).toHaveLength(1);
		const u = new URL(`http://play.test/api${asked[0]}`);
		expect(u.searchParams.get('stage')!.split(',')).toEqual([...OPEN]);
		expect(u.searchParams.has('counts')).toBe(true);
		expect(asked[0]).not.toMatch(/accepted|archived/);
		expect(cards.map((c) => c.id)).toEqual(['i1', 'i2', 's1', 'b1', 'p1']);
		expect(counts).toEqual(COUNTS);
	});

	test('unfolding Accepted asks once for its first page; "more" asks with the cursor', async () => {
		const { get, asked } = mock();
		let { cards } = await loadOpen(get, [] as C[]);
		const first = await loadPage(get, cards, 'accepted', null);
		expect(asked.slice(1)).toEqual([`/intents?stage=accepted&limit=${PAGE}`]);
		expect(first.cards.filter((c) => c.stage === 'accepted')).toHaveLength(PAGE);
		expect(first.paged).toEqual({ loaded: true, next: accepted[PAGE - 1].id });
		const more = await loadPage(get, first.cards, 'accepted', first.paged);
		expect(asked[2]).toBe(`/intents?stage=accepted&limit=${PAGE}&before=${accepted[PAGE - 1].id}`);
		const last = await loadPage(get, more.cards, 'accepted', more.paged);
		expect(last.paged.next).toBeNull();
		const ids = last.cards.filter((c) => c.stage === 'accepted').map((c) => c.id);
		expect(ids).toEqual(accepted.map((c) => c.id));
		// Archived, still folded, was never asked for
		expect(asked.some((p) => p.includes('archived'))).toBe(false);
	});

	test('the open columns read again keep the closed cards loaded, a just-decided one among them, without doubles', async () => {
		const { get } = mock();
		let { cards } = await loadOpen(get, [] as C[]);
		({ cards } = await loadPage(get, cards, 'archived', null));
		// p1 archived on the board: its card moves column (the API's answer replaces it), then the open columns are read again
		cards = cards.map((c) => (c.id === 'p1' ? card('p1', 'archived') : c));
		({ cards } = await loadOpen(get, cards));
		// (the mock still serves p1 at Proposal: play's answer wins)
		expect(cards.filter((c) => c.id === 'p1')).toHaveLength(1);
		expect(cards.filter((c) => c.stage === 'archived').map((c) => c.id)).toEqual(['r0', 'r1', 'r2']);
		// a first page read again adds only what is new, on top
		const again = await loadPage(get, [card('x', 'archived'), ...cards.filter((c) => c.stage !== 'archived')], 'archived', { loaded: true, next: null }, true);
		expect(again.cards.filter((c) => c.stage === 'archived').map((c) => c.id)).toEqual(['r0', 'r1', 'r2', 'x']);
	});
});

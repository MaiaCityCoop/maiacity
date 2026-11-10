// The page moving itself to a new build after a chunk it cannot load (./newbuild.ts; intent 8333276b): once, the board
// kept open on the same intent, never a loop, and nothing where no newer build is out.
import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/environment', () => ({ version: 'build-a' }));
vi.mock('$app/navigation', () => ({ beforeNavigate: () => {} }));
vi.mock('$app/state', () => ({ page: { url: new URL('http://play.test/') }, updated: { current: false, check: async () => false } }));

const { boardLeft, chunkFailed, mover } = await import('./newbuild');

const INTENT = '5723e301-0000-4000-8000-000000000000';
/** a tab: its sessionStorage, which a reload keeps */
const tab = () => {
	const kept = new Map<string, string>();
	return { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v), removeItem: (k: string) => void kept.delete(k) };
};
/** the page of build `version` in that tab, while the server's build is `live()` */
const pageOf = (store: ReturnType<typeof tab> | null, version: string, live: () => string, board: string | null = null) => {
	const reload = vi.fn();
	const check = vi.fn(async () => live() !== version);
	return { reload, check, move: mover({ version, check, reload, store, board: () => board }) };
};

describe('a chunk that would not load', () => {
	test('a newer build is out: one reload, the board open again on the same intent', async () => {
		const store = tab();
		const a = pageOf(store, 'build-a', () => 'build-b', INTENT);
		expect(await a.move()).toBe(true);
		expect(a.reload).toHaveBeenCalledTimes(1);
		// the page of the new build reads what the board was, once
		expect(boardLeft(store)).toBe(INTENT);
		expect(boardLeft(store)).toBe(null);
	});

	test('the board open on no intent comes back open; closed, it stays closed', async () => {
		const open = tab();
		await pageOf(open, 'build-a', () => 'build-b', '').move();
		expect(boardLeft(open)).toBe('');
		const closed = tab();
		await pageOf(closed, 'build-a', () => 'build-b', null).move();
		expect(boardLeft(closed)).toBe(null);
	});

	test('several chunks failing at once: one check, one reload', async () => {
		const a = pageOf(tab(), 'build-a', () => 'build-b');
		expect(await Promise.all([a.move(), a.move(), a.move()])).toEqual([true, true, true]);
		expect(a.check).toHaveBeenCalledTimes(1);
		expect(a.reload).toHaveBeenCalledTimes(1);
	});

	test('never a loop: a build that reloaded once and came back the same reloads nothing', async () => {
		const store = tab();
		// the reload gave the old page again (a cache in between), while the server still says a newer build is out
		await pageOf(store, 'build-a', () => 'build-b').move();
		for (let i = 0; i < 5; i++) {
			const again = pageOf(store, 'build-a', () => 'build-b');
			expect(await again.move()).toBe(false);
			expect(again.reload).not.toHaveBeenCalled();
			expect(again.check).not.toHaveBeenCalled();
		}
	});

	test('on the new build a chunk still fails: no reload, the real error is the caller’s', async () => {
		const store = tab();
		await pageOf(store, 'build-a', () => 'build-b').move();
		const b = pageOf(store, 'build-b', () => 'build-b');
		expect(await b.move()).toBe(false);
		expect(b.reload).not.toHaveBeenCalled();
	});

	test('a later deploy moves the tab again, once', async () => {
		const store = tab();
		await pageOf(store, 'build-a', () => 'build-b').move();
		const b = pageOf(store, 'build-b', () => 'build-c');
		expect(await b.move()).toBe(true);
		expect(await pageOf(store, 'build-b', () => 'build-c').move()).toBe(false);
	});

	test('no newer build: nothing reloads, nothing is kept', async () => {
		const store = tab();
		const a = pageOf(store, 'build-a', () => 'build-a', INTENT);
		expect(await a.move()).toBe(false);
		expect(a.reload).not.toHaveBeenCalled();
		expect(boardLeft(store)).toBe(null);
	});

	test('no store to remember the reload in, or one that throws: nothing reloads', async () => {
		const none = pageOf(null, 'build-a', () => 'build-b');
		expect(await none.move()).toBe(false);
		expect(none.reload).not.toHaveBeenCalled();
		const broken = { ...tab(), setItem: () => { throw new Error('QuotaExceededError'); } };
		const b = pageOf(broken, 'build-a', () => 'build-b');
		expect(await b.move()).toBe(false);
		expect(b.reload).not.toHaveBeenCalled();
	});

	test('told apart from any other error', () => {
		expect(chunkFailed(new TypeError("'text/html' is not a valid JavaScript MIME type."))).toBe(true);
		expect(chunkFailed(new TypeError('Failed to fetch dynamically imported module: /_app/immutable/chunks/a.js'))).toBe(true);
		expect(chunkFailed(new Error('requestDevice failed'))).toBe(false);
		expect(chunkFailed(new TypeError('Failed to fetch'))).toBe(false);
		expect(chunkFailed(null)).toBe(false);
	});
});

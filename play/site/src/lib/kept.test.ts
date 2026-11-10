import { afterEach, describe, expect, it } from 'vitest';
import { keep, kept, keptJson } from './kept';

const g = globalThis as { localStorage?: unknown };
afterEach(() => delete g.localStorage);

describe("what a viewer's browser keeps", () => {
	it('is nothing where there is no storage (the server, a private window)', () => {
		expect(kept('k')).toBeNull();
		expect(keptJson('k')).toBeNull();
		expect(keep('k', 'v')).toBe(false);
		g.localStorage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
		expect(kept('k')).toBeNull();
		expect(keep('k', 'v')).toBe(false);
	});
	it('reads back what it kept, and JSON that is not JSON as nothing', () => {
		const m = new Map<string, string>();
		g.localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
		expect(keep('k', JSON.stringify({ accepted: false }))).toBe(true);
		expect(keptJson('k')).toEqual({ accepted: false });
		keep('k', '{not json');
		expect(kept('k')).toBe('{not json');
		expect(keptJson('k')).toBeNull();
	});
});

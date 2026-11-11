/*
 * THE CEILING'S VERDICT (intent a7507347; ./ceiling.ts `outside`, ./sources.ts `judged`): what puts an asset outside
 * the rule, said in words with its count, and how a named exception is held: it fails nothing while it is outside the
 * rule, and fails once it is within it. The building and counting itself is the census's (./viewer.bun.test.ts).
 */
import { describe, expect, test } from 'bun:test';

import { CEILING, ceilingOf } from '../../../api/src/lod';
import { outside } from './ceiling';
import { judged } from './sources';

const OWN = { levels: 'declared', tris: 212_340 };
const at = (tris: number, where = 'stage 9') => ({ tris, at: where });

describe('the ceiling', () => {
	test('is one number, 300,000, for every group today', () => {
		expect(CEILING).toBe(300_000);
		for (const g of ['plants', 'things', 'machines', 'buildings', 'actors', 'characters', 'biomes', 'worlds', undefined]) expect(ceilingOf(g)).toBe(CEILING);
	});

	test('an asset within it, its levels its own and its count true, is within the rule', () => {
		expect(outside(OWN, at(212_340))).toEqual([]);
		// the ceiling itself is within it, and a card may claim more than it has (never less)
		expect(outside({ levels: 'declared', tris: CEILING }, at(CEILING))).toEqual([]);
		expect(outside({ levels: 'declared', tris: 250_000 }, at(212_340))).toEqual([]);
	});

	test('a shape over the ceiling fails, with its count, where, and by how much', () => {
		const found = outside({ levels: 'declared' }, at(1_989_351, 'white, stage 9'));
		expect(found).toHaveLength(1);
		expect(found[0]).toContain('over: 1,989,351 triangles at white, stage 9');
		expect(found[0]).toContain('1,689,351 over the ceiling of 300,000');
		expect(outside(OWN, at(CEILING + 1)).some((f) => f.startsWith('over: 300,001'))).toBe(true);
	});

	test('derived levels fail, and so does a card naming none', () => {
		for (const lod of [{ levels: 'derived' }, {}, null, undefined]) {
			const found = outside(lod, at(4_000));
			expect(found).toHaveLength(1);
			expect(found[0]).toStartWith('derived:');
		}
	});

	test('a card claiming fewer triangles than it has fails: the count is held true where it is built', () => {
		const found = outside({ levels: 'declared', tris: 1_200 }, at(4_000, 'stage 3'));
		expect(found).toEqual(['its card says 1,200 triangles (lod.tris), it has 4,000 at stage 3']);
		// and a claim over the ceiling is no better for the shape being under it
		expect(outside({ levels: 'declared', tris: 400_000 }, at(4_000))).toEqual(["its card's count, 400,000, is over the ceiling of 300,000"]);
	});

	test("an intent's variant carries its count; a version from before the rule need not", () => {
		expect(outside({ levels: 'declared' }, at(4_000))).toEqual([]);
		expect(outside({ levels: 'declared' }, at(4_000), { carried: true })).toEqual(['its card carries no count: set card.lod.tris to 4,000']);
		expect(outside(OWN, at(212_340), { carried: true })).toEqual([]);
	});

	test('everything wrong is said at once', () => {
		expect(outside({ levels: 'derived' }, at(1_989_351), { carried: true })).toHaveLength(3);
	});

	test('a named exception fails nothing while it is outside the rule, and fails once it is within it', () => {
		const over = outside({ levels: 'derived' }, at(1_989_351));
		expect(judged(true, over)).toBe('known');
		expect(judged(false, over)).toBe('fail');
		expect(judged(true, outside(OWN, at(212_340)))).toBe('stale');
		expect(judged(false, outside(OWN, at(212_340)))).toBe('ok');
	});
});

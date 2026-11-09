import { describe, expect, it } from 'vitest';
import { euros, ledger, pct, short, type Levelling, type Unlock } from './levels';

const config = (investor = [2, 8], unlocks: Unlock[][] = [[{ label: 'Tent', cost: 15000 }], []]): Levelling => ({
	schema: 'levels/1',
	label: 'Levelling',
	villager: { euros: 12500, hearts: 50000 },
	minds: { heartsPerMind: 10, step: 10, heartsPerEuro: 4 },
	levels: [
		{ id: 'l1', villagers: 1, phase: 'Camp', investor: investor[0], unlocks: unlocks[0] },
		{ id: 'l2', villagers: 3, phase: 'Camp', investor: investor[1], unlocks: unlocks[1] }
	]
});

// v1's sixteen levels (play/api/import/gameconfigs/levelling.ts): their Fibonacci villagers, any multiples
const FIB = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];
const V1 = [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 8];
const village = (multiples: number[], extra: Partial<Levelling> = {}, villagersMin?: number): Levelling => ({
	schema: 'levels/1',
	label: 'Levelling',
	villager: { euros: 12500, hearts: 50000 },
	minds: { heartsPerMind: 10, step: 10, heartsPerEuro: 4, ...(villagersMin ? { villagersMin } : {}) },
	levels: FIB.map((villagers, i) => ({ id: `l${i + 1}`, villagers, phase: 'Village', investor: multiples[i], unlocks: [] })),
	...extra
});

describe('the levelling worked out', () => {
	it('gives the first villager and the investor their minds at the first price, the villagers keeping 51 %', () => {
		const [one] = ledger(config());
		expect(one.price).toEqual({ hearts: 10, euros: 2.5 });
		// 50,000 hearts at 10 and €12,500 at €2.50 a mind
		expect(one.villager.minds).toBe(10000);
		// the investor's €25,000 would buy 10,000 minds; 49/51 of the villagers' 10,000 is all it may hold
		expect(one.investor.euros).toBe(25000);
		expect(one.investor.minds).toBeCloseTo((10000 * 49) / 51);
		expect(one.treasury).toMatchObject({ raised: 37500, euros: { villagers: 12500, investors: 25000 }, spent: 15000, left: 22500, hearts: 50000 });
		expect(one.treasury.villagers).toBeCloseTo(0.51);
	});

	it('charges a mind more at every level, so later villagers get fewer', () => {
		const [, two] = ledger(config());
		expect(two.joined).toBe(2);
		expect(two.price).toEqual({ hearts: 20, euros: 5 });
		expect(two.villager.minds).toBe(5000);
		// 8 × the €25,000 the two new villagers brought
		expect(two.investor.euros).toBe(200000);
		expect(two.treasury.raised).toBe(37500 + 25000 + 200000);
		expect(two.treasury.hearts).toBe(150000);
		expect(two.treasury.villagers).toBeCloseTo(0.51);
	});

	it('villagers hold at least villagersMin', () => {
		const rising = V1.map((m) => m * 1.125);
		const rows = ledger(village(rising));
		for (const r of rows) expect(r.treasury.villagers).toBeGreaterThanOrEqual(0.51 - 1e-12);
		// the investors' euros stay what they bring: 2.25× to 9× the villagers'
		expect(rows.at(-1)!.treasury.raised).toBe(174_523_437.5);
		expect(rows[0].investor.premium.toFixed(2)).toBe('1.17');
		expect(rows.at(-1)!.investor.premium.toFixed(2)).toBe('4.68');
		// a minimum the config sets is kept too
		for (const r of ledger(village(rising, {}, 0.6))) expect(r.treasury.villagers).toBeGreaterThanOrEqual(0.6 - 1e-12);
		// v1's own multiples: still €157.35M, the investor paying 1.04× rising to 4.16×
		const v1 = ledger(village(V1));
		expect(v1.at(-1)!.treasury.raised).toBe(157_350_000);
		expect(v1[0].investor.premium.toFixed(2)).toBe('1.04');
		expect(v1.at(-1)!.investor.premium.toFixed(2)).toBe('4.16');
	});

	it('investor capped per villager', () => {
		const twelve = Array(16).fill(12);
		const capped = ledger(village(twelve, { investor: { maxPerVillager: 112500 } }));
		const nine = ledger(village(Array(16).fill(9)));
		expect(capped.at(-1)!.treasury.raised).toBe(nine.at(-1)!.treasury.raised);
		expect(capped.at(-1)!.treasury.raised).toBe(199_625_000);
		for (const r of capped) {
			expect(r.investor.euros).toBeLessThanOrEqual(112500 * r.joined);
			expect(r.investor.capped).toBe(true);
			expect(r.investor.multiple).toBe(9);
		}
		// without the field, nothing is capped
		for (const r of ledger(village(twelve))) expect(r.investor).toMatchObject({ capped: false, multiple: 12 });
	});

	it('coops pay their own insides', () => {
		const rows = ledger(
			config([2, 2], [
				[{ label: 'Fab lab hall', cost: 650000 }, { label: 'Its machines', cost: 650000, owner: 'coop', coop: 'Fab lab coop' }],
				[{ label: 'Solar field', cost: 800000, owner: 'coop', coop: 'Solar coop' }, { label: 'Microgrid', cost: 200000, owner: 'village' }]
			])
		);
		expect(rows[0]).toMatchObject({ cost: 650000, coops: 650000 });
		expect(rows[0].treasury).toMatchObject({ spent: 650000, coops: 650000, left: 37500 - 650000 });
		expect(rows[1]).toMatchObject({ cost: 200000, coops: 800000 });
		expect(rows[1].treasury).toMatchObject({ spent: 850000, coops: 1450000 });
		expect(rows[1].treasury.left).toBe(rows[1].treasury.raised - 850000);
	});

	it('contractors priced beside', () => {
		const [one, two] = ledger(
			config([2, 2], [[{ label: 'Dome', cost: 1000, contractor: 3000 }, { label: 'Tent', cost: 50 }], [{ label: 'Lines', cost: 500, contractor: 900, owner: 'coop' }]])
		);
		// the treasury spends the self-built cost; the contractors' beside it, an unlock without one at its cost
		expect(one).toMatchObject({ cost: 1050, contractor: 3050 });
		expect(one.treasury.contractor).toEqual({ spent: 3050, left: one.treasury.raised - 3050 });
		// a coop's own is never the village's, whoever builds it
		expect(two).toMatchObject({ cost: 0, contractor: 0, coops: 500 });
	});

	it('beds house the villagers', () => {
		const levels = (beds: number[]) =>
			ledger(config([2, 2], beds.map((b) => [{ label: 'Home', cost: 0, beds: b }])));
		// 2 beds for 1 villager, but the next level brings 3
		const [a, b] = levels([2, 0]);
		expect(a).toMatchObject({ beds: 2, housed: true, ready: false });
		expect(b).toMatchObject({ beds: 2, housed: false, ready: false });
		const [c, d] = levels([3, 1]);
		expect(c).toMatchObject({ beds: 3, housed: true, ready: true });
		// the last level is ready when it is housed
		expect(d).toMatchObject({ beds: 4, housed: true, ready: true });
		// an unlock without beds houses no one
		expect(ledger(config())[0]).toMatchObject({ beds: 0, housed: false });
	});

	it('writes money and shares short', () => {
		expect(euros(12500)).toBe('€12.5k');
		expect(euros(157_350_000)).toBe('€157M');
		expect(euros(-2500)).toBe('−€2.5k');
		expect(short(1_525_000)).toBe('1.53M');
		expect(pct(0.5)).toBe('50 %');
		expect(pct(0.075)).toBe('7.5 %');
	});
});

import { describe, expect, it } from 'vitest';
import { euros, ledger, pct, short, type Levelling } from './levels';

const config = (investor = [2, 8]): Levelling => ({
	schema: 'levels/1',
	label: 'Levelling',
	villager: { euros: 12500, hearts: 50000 },
	minds: { heartsPerMind: 10, step: 10, heartsPerEuro: 4 },
	levels: [
		{ id: 'l1', villagers: 1, phase: 'Camp', investor: investor[0], unlocks: [{ label: 'Tent', cost: 15000 }] },
		{ id: 'l2', villagers: 3, phase: 'Camp', investor: investor[1], unlocks: [] }
	]
});

describe('the levelling worked out', () => {
	it('gives the first villager and the investor their minds at the first price', () => {
		const [one] = ledger(config());
		expect(one.price).toEqual({ hearts: 10, euros: 2.5 });
		// 50,000 hearts at 10 and €12,500 at €2.50 a mind
		expect(one.villager.minds).toBe(10000);
		expect(one.investor).toEqual({ euros: 25000, minds: 10000, share: 0.5 });
		expect(one.minted).toBe(20000);
		expect(one.treasury).toMatchObject({ raised: 37500, spent: 15000, left: 22500, hearts: 50000, minds: 20000, investors: 0.5 });
	});

	it('charges a mind more at every level, so later villagers get fewer and the investors more of the whole', () => {
		const [, two] = ledger(config());
		expect(two.joined).toBe(2);
		expect(two.price).toEqual({ hearts: 20, euros: 5 });
		expect(two.villager.minds).toBe(5000);
		// 8 × the €25,000 the two new villagers brought
		expect(two.investor.euros).toBe(200000);
		expect(two.investor.minds).toBe(40000);
		expect(two.investor.share).toBeCloseTo(0.8);
		expect(two.treasury.raised).toBe(37500 + 25000 + 200000);
		expect(two.treasury.hearts).toBe(150000);
		expect(two.treasury.minds).toBe(20000 + 50000);
		expect(two.treasury.investors).toBeCloseTo(50000 / 70000);
		expect(two.treasury.value).toBe(70000 * 5);
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

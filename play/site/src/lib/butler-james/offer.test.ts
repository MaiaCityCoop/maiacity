// The offer's facts and the calculator's sum (intent 42a96129, check c2).
import { describe, expect, it } from 'vitest';
import { DELIVERY_HOURS, GUARANTEE_PERCENT, MOST, PRICES, count, euro, total } from './offer';

describe("Butler James's offer", () => {
	it('is 500 an apartment, 1,000 a house, 800 a trailer, in 24 hours, 100 % back', () => {
		expect(PRICES).toEqual({ apartment: 500, house: 1000, trailer: 800 });
		expect(DELIVERY_HOURS).toBe(24);
		expect(GUARANTEE_PERCENT).toBe(100);
	});
	it('adds up any counts', () => {
		expect(total({ apartments: 0, houses: 0, trailers: 0 })).toBe(0);
		expect(total({ apartments: 2, houses: 1, trailers: 1 })).toBe(2800);
		for (let a = 0; a <= 12; a += 3) for (let h = 0; h <= 12; h += 4) for (let t = 0; t <= 12; t += 5)
			expect(total({ apartments: a, houses: h, trailers: t })).toBe(a * 500 + h * 1000 + t * 800);
	});
	it('holds a count to a whole number from 0 to the most', () => {
		expect(count(-3)).toBe(0);
		expect(count(2.9)).toBe(2);
		expect(count('7')).toBe(7);
		expect(count('abc')).toBe(0);
		expect(count(Infinity)).toBe(0);
		expect(count(1e9)).toBe(MOST);
		expect(MOST).toBe(99);
		expect(total({ apartments: -1, houses: 1.7, trailers: 1e6 })).toBe(1000 + MOST * 800);
	});
	it('writes an amount as a German reader sees it', () => {
		expect(euro(500)).toBe('500 €');
		expect(euro(1000)).toBe('1.000 €');
		expect(euro(2800)).toBe('2.800 €');
		expect(euro(1234567)).toBe('1.234.567 €');
	});
});

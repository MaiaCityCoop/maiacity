// The offer's facts and the calculator's sum (intent 42a96129, check c2).
import { describe, expect, it } from 'vitest';
import { DELIVERY_HOURS, GUARANTEE_PERCENT, MOST, PRICES, TEST, TRAILER_MINUTES, count, enoughPhotos, euro, total } from './offer';

describe("Butler James's offer", () => {
	it('is 685 an apartment, 1,249 a house, 479 a trailer of a minute, in 24 hours, 100 % back', () => {
		expect(PRICES).toEqual({ apartment: 685, house: 1249, trailer: 479 });
		expect(TRAILER_MINUTES).toBe(1);
		expect(DELIVERY_HOURS).toBe(24);
		expect(GUARANTEE_PERCENT).toBe(100);
	});
	it('offers a test: one room for 99, from at least 6 photos, within 1 hour', () => {
		expect(TEST).toEqual({ price: 99, photos: 6, withinHours: 1 });
		expect([0, 5, 6, 7, 40].map(enoughPhotos)).toEqual([false, false, true, true, true]);
	});
	it('adds up any counts', () => {
		expect(total({ apartments: 0, houses: 0, trailers: 0 })).toBe(0);
		expect(total({ apartments: 2, houses: 1, trailers: 1 })).toBe(3098);
		for (let a = 0; a <= 12; a += 3) for (let h = 0; h <= 12; h += 4) for (let t = 0; t <= 12; t += 5)
			expect(total({ apartments: a, houses: h, trailers: t })).toBe(a * 685 + h * 1249 + t * 479);
	});
	it('holds a count to a whole number from 0 to the most', () => {
		expect(count(-3)).toBe(0);
		expect(count(2.9)).toBe(2);
		expect(count('7')).toBe(7);
		expect(count('abc')).toBe(0);
		expect(count(Infinity)).toBe(0);
		expect(count(1e9)).toBe(MOST);
		expect(MOST).toBe(99);
		expect(total({ apartments: -1, houses: 1.7, trailers: 1e6 })).toBe(1249 + MOST * 479);
	});
	it('writes an amount as a German reader sees it', () => {
		expect(euro(99)).toBe('99 €');
		expect(euro(1249)).toBe('1.249 €');
		expect(euro(1000)).toBe('1.000 €');
		expect(euro(2800)).toBe('2.800 €');
		expect(euro(1234567)).toBe('1.234.567 €');
	});
});

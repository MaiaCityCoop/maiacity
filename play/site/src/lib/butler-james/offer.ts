// THE OFFER'S FACTS, ONCE (intent 42a96129): what Butler James sells and for how much: the 3D model of an apartment
// or a house, the trailer video (a product of its own), and the test offer. The page's texts (./copy.ts) and
// its calculator take every number from here; nothing else on the page states a price, a time or a guarantee.

/** flat, one-time, in euro, net */
export const PRICES = { apartment: 685, house: 1249, trailer: 479 } as const;
/** how long the trailer video runs */
export const TRAILER_MINUTES = 1;
/** the offer to try Butler James: a demo trailer of one room, from the photos uploaded on the page */
export const TEST = { price: 99, photos: 6, withinHours: 1 } as const;
/** whether enough photos are chosen for the test */
export const enoughPhotos = (n: number) => n >= TEST.photos;
/** from booking to delivery */
export const DELIVERY_HOURS = 24;
/** money back, no questions asked */
export const GUARANTEE_PERCENT = 100;
/** the most of one kind the calculator counts */
export const MOST = 99;

export type Counts = { apartments: number; houses: number; trailers: number };

/** a count as the calculator holds it: a whole number from 0 to MOST, whatever was typed */
export function count(n: unknown): number {
	const x = Math.floor(Number(n));
	return Number.isFinite(x) ? Math.min(MOST, Math.max(0, x)) : 0;
}

/** the flat price of these worlds and trailers, in euro */
export function total(c: Counts): number {
	return count(c.apartments) * PRICES.apartment + count(c.houses) * PRICES.house + count(c.trailers) * PRICES.trailer;
}

/** an amount as a German reader sees it: 1.000 € */
export function euro(n: number): string {
	return `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} €`;
}

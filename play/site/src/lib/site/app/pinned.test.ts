import { describe, expect, it } from 'vitest';
import { shiftFor } from './pinned.js';

// a 1024 px tall window, the dock's foot 14 px above its bottom (--nav-foot)
const at = (naturalBottom: number, visibleBottom: number, more: { scale?: number; typing?: boolean } = {}) => shiftFor({ naturalBottom, visibleBottom, gap: 14, ...more });

describe('the nav pill kept at the foot of what is seen', () => {
	it('leaves it alone where it already stands at the foot', () => {
		expect(at(1010, 1024)).toBe(0);
		expect(at(1010.4, 1024)).toBe(0);
	});
	it('moves it back down when the browser left it high up the page (a stale viewport after a keyboard or a split)', () => {
		// the layout viewport stuck 300 px short of the window: the dock's foot at 710, what is seen ends at 1024
		expect(at(710, 1024)).toBe(300);
	});
	it('lifts it above a keyboard that is not this page\'s (the app beside it in Split View), and brings it back after', () => {
		expect(at(1010, 700)).toBe(-324);
		expect(at(1010, 1024)).toBe(0);
	});
	it('never pulls it up over the keyboard of a field on this page', () => {
		expect(at(1010, 700, { typing: true })).toBe(0);
		// but still brings it down to the foot when it was left too high
		expect(at(710, 1024, { typing: true })).toBe(300);
	});
	it('leaves it alone while the page is pinch-zoomed', () => {
		expect(at(710, 1024, { scale: 1.6 })).toBe(0);
	});
	it('does nothing with numbers it cannot trust', () => {
		expect(shiftFor({ naturalBottom: NaN, visibleBottom: 1024, gap: 14 })).toBe(0);
	});
});

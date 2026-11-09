// The dry run's clock (intent cb52fbd9): `Date.now` and `new Date()` moved on by what `waitForTimeout` skipped, so a
// Mac job's own caps on the wall clock (`for (end = Date.now() + 4 min; …; await page.waitForTimeout(2000))`) end at
// once. `performance.now`, what a world's frames and the frame meter keep time by, is left as it is.
let skew = 0;
const RealDate = Date;
const realNow = RealDate.now.bind(RealDate);
class WarpedDate extends RealDate {
	constructor(...a: any[]) {
		if (a.length) super(...(a as [any]));
		else super(realNow() + skew);
	}
	static now() {
		return realNow() + skew;
	}
}
(globalThis as any).Date = WarpedDate;

export function warp(ms: number) {
	if (ms > 0) skew += ms;
}

function calliperGeometry({ r, t, angle, span = .42 }) {
	/** an annular sector in the (z, y) plane as a shape for `onX` @param {number} r0 @param {number} r1 @param {number} a0 @param {number} a1 */
	const sector = (r0, r1, a0, a1) => {
		/** @type {V2[]} */
		const pts = [];
		for (let j = 0; j <= 8; j++) {
			const a = a0 + (a1 - a0) * j / 8;
			pts.push([r1 * Math.cos(a), r1 * Math.sin(a)]);
		}
		for (let j = 8; j >= 0; j--) {
			const a = a0 + (a1 - a0) * j / 8;
			pts.push([r0 * Math.cos(a), r0 * Math.sin(a)]);
		}
		return roundPoly(zy(pts), .008);
	};
	const a0 = angle - span / 2, a1 = angle + span / 2;
	const inner = onX(ext(sector(r - .052, r + .024, a0, a1), .034, .003), -t / 2 - .02);
	const outer = onX(ext(sector(r - .036, r + .024, a0 + .05, a1 - .05), .013, .002), t / 2 + .009);
	const bridge = onX(ext(sector(r + .006, r + .026, a0 + .03, a1 - .03), t + .03, .002), 0);
	const am = angle, rb = r + .02;
	const nipple = cyl([
		-t / 2 - .03,
		rb * Math.sin(am + .12),
		rb * Math.cos(am + .12)
	], [
		-t / 2 - .03,
		(rb + .02) * Math.sin(am + .12),
		(rb + .02) * Math.cos(am + .12)
	], .004, 8);
	return GEO.merge([
		inner,
		outer,
		bridge,
		nipple
	]);
}
/**

/** a ring gear's teeth round a rim @param {number} n @param {number} mod @param {number} w */
function ringGear(n, mod, w) {
	const s = new three.Shape(), ra = n * mod / 2 + mod, rf = n * mod / 2 - 1.25 * mod, da = Math.PI * 2 / n;
	const pt = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
	s.moveTo(...pt(rf, 0));
	for (let k = 0; k < n; k++) {
		const a = k * da;
		s.lineTo(...pt(ra, a + .27 * da));
		s.lineTo(...pt(ra, a + .48 * da));
		s.lineTo(...pt(rf, a + .75 * da));
		s.lineTo(...pt(rf, a + da));
	}
	s.holes.push(ring(0, 0, rf - .006));

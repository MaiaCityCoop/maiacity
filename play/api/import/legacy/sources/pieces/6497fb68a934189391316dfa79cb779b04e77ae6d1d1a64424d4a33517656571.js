	const f = spec.flower, F = spec.fruit;
	const fr = chance(seed, "flowering", ...site.key);
	const phase = g - (f.opens + fr() * .5);
	if (phase < -.3) return;
	const up = site.dir.clone().lerp(v3(0, 1, 0), .6).normalize();
	if (phase < .55) {
		const open = clamp(phase / .2);
		if (f.panicle) {
			const len = .3 * lerp(.3, 1, clamp((phase + .3) / .4));
			const tip = site.at.clone().addScaledVector(up, len);
			bag.add("body", tube([site.at, tip], (u) => .005 * (1 - .8 * u), () => "#b0473a", 5));
			for (let k = 0; k < 12; k++) {
				const u = .1 + k / 12 * .85;
				const base = site.at.clone().lerp(tip, u);
				const a = k * 2.39996;
				const end = base.clone().addScaledVector(v3(Math.cos(a), .4, Math.sin(a)).normalize(), .09 * (1 - u) + .02);
				bag.add("body", tube([base, end], () => .0015, () => "#b0473a", 3));
				for (let m = 0; m < 4; m++) bag.add("body", bead(base.clone().lerp(end, .35 + m * .2), v3(.004, .004, .004), open > .3 ? m % 2 ? "#f0d7a0" : "#e7a29a" : "#c9b46a", 2));
			}
			return;

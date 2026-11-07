	for (let i = 0; i < o.count; i++) {
		const rr = chance(seed, "shrub-root", i);
		const a = i * 2.39996 + rr() * .4;
		const born = 2.4 + i * .22;
		root(bag, {
			seed,
			key: ["spread", i],
			from: at.clone().add(v3(0, -.015 - rr() * .03, 0)),
			dir: v3(Math.cos(a), -between(rr, .12, .4), Math.sin(a)),
			length: between(rr, .6, 1) * o.length * vigour,
			grown: (g - born) / 2.4,
			radius: .0016 + .004 * span(g, 3, 7),
			down: .012,
			wander: .22,
			laterals: 3,
			lateral: .3,
			depth: 1,
			age: (g - born - .5) / 2.5,
			young: "#f1e4cc",
			old: "#7a5a3e"

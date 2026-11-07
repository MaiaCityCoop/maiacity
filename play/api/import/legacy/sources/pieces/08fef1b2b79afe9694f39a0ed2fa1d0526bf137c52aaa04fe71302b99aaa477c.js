		for (let i = 0; i < spec.roots.count; i++) {
			const rr = chance(seed, "feeder", i);
			const born = 2.6 + i * (4 / spec.roots.count);
			const bear = i * 2.39996 + rr() * .4;
			root(bag, {
				seed,
				key: ["feeder", i],
				from: at.clone().add(v3(0, -.04 - rr() * .12, 0)),
				dir: v3(Math.cos(bear), -.15, Math.sin(bear)),
				length: between(rr, .6, 1) * spec.roots.spread * vigour,
				grown: (g - born) / 2.8,
				radius: .003 + spec.roots.radius * .4 * span(g, 3, 8),
				down: .01,
				wander: .14,

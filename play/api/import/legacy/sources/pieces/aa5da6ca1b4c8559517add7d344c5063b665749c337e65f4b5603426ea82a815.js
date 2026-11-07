		const bear = i * 2.39996 + rr() * .4;
		root(bag, {
			seed,
			key: ["feeder", i],
			from: at.clone().add(v3(0, -.04 - rr() * .12, 0)),
			dir: v3(Math.cos(bear), -.15, Math.sin(bear)),

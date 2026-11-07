function shrubRoots(bag, seed, g, at, o, vigour) {
	root(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(.03, -1, 0),
		length: o.length * .7,
		grown: table(g, [
			[0, 0],
			[.35, .005],
			[1, .04],
			[2, .1],
			[3, .35],
			[4, .7],
			[5, 1]
		]),
		radius: .0015 + .006 * span(g, 2.5, 6),
		down: .04,
		wander: .18,
		laterals: 5,
		lateral: .3,
		depth: 1,
		age: span(g, 2, 5),
		young: "#f1e4cc",
		old: "#7a5a3e"
	});

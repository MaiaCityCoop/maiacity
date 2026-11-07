function nodules(bag, seed, g, at) {
	const grown = span(g, 2.4, 6);
	if (grown <= .01) return;
	const nr = chance(seed, "nodules");
	const count = 9;
	for (let i = 0; i < count; i++) {
		const bear = i * 2.39996 + nr() * .8;
		const reach = between(nr, .12, .7) * lerp(.3, 1, grown);
		const deep = between(nr, .06, .25);
		const o = v3(Math.cos(bear), 0, Math.sin(bear));
		const end = at.clone().addScaledVector(o, reach).add(v3(0, -deep, 0));
		root(bag, {
			seed,
			key: ["nodule-root", i],
			from: at.clone().add(v3(0, -.03, 0)),
			dir: o.clone().add(v3(0, -deep / Math.max(.1, reach), 0)),
			length: end.distanceTo(at) * 1.1,
			grown: grown * 1.2,
			radius: .004 + .008 * grown,
			down: 0,
			wander: .04,
			laterals: 0,
			depth: 0,
			age: grown,
			young: "#e8d4b0",
			old: "#6a4e36"
		});
		const size = (.008 + .022 * nr()) * grown;
		const lumps = 5 + Math.floor(nr() * 5);
		for (let k = 0; k < lumps; k++) {
			const d = v3(nr() - .5, nr() - .5, nr() - .5).normalize();
			bag.add("body", bead(end.clone().addScaledVector(d, size * .6), v3(1, .8, 1).multiplyScalar(size * between(nr, .35, .6)), mix("#d0884a", "#8a5a34", nr()), 3));
		}
	}

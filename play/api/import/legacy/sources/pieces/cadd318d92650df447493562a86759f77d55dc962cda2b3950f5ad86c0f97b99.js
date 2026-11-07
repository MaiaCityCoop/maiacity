	for (let k = 0; k < o.laterals; k++) {
		const u = .15 + .75 * (k / o.laterals);
		if (u > grown) break;
		const i = Math.min(11, Math.floor(u * steps));
		const a = k * 2.39996 + r();
		root(bag, {
			seed: o.seed,
			key: [
				...o.key,
				"lat",
				k
			],
			from: pts[i].clone(),
			dir: v3(Math.cos(a), -.4, Math.sin(a)),
			length: o.length * between(r, .3, .55),
			grown: (grown - u) * 2.2,
			radius: o.radius * .4,
			down: .04,
			wander: .3,
			laterals: 3,
			lateral: .3,
			depth: 1,
			young: "#f6efdc",
			old: "#c8ae84"
		});
	}
	const n = Math.round(o.nodules * clamp(o.age * 1.3));
	for (let k = 0; k < n; k++) {
		const f = between(r, .05, .6) * grown * steps, i = Math.min(11, Math.floor(f));
		const p = pts[i].clone().lerp(pts[i + 1], f - i);
		const a = r() * Math.PI * 2;
		const s = o.radius * between(r, .7, 1.3);

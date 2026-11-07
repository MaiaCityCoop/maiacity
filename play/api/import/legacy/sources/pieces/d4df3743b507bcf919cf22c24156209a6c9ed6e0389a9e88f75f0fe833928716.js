*/
function hang(ctx, from, dir, L, W, reach) {
	const balls = (a, d) => [.3, .7].map((t) => ({
		c: a.clone().addScaledVector(d, L * t),
		r: W * .95
	}));
	const d0 = dir.clone().normalize();
	let best = {
		at: from.clone(),
		dir: d0,
		cost: Infinity
	};
	const side = new three.Vector3();
	search: for (const ext of [
		0,
		.5,
		1
	]) for (const swing of [
		0,
		.45,
		.9,
		1.4,
		2
	]) {
		for (let k = 0; k < (swing ? 8 : 1); k++) {
			const a = k / 8 * TAU;
			side.set(Math.cos(a), 0, Math.sin(a));
			const d = d0.clone().addScaledVector(side, swing).normalize();
			if (d.y > .35) continue;
			const p = from.clone().addScaledVector(d, ext * reach);
			let cost = swing * .004 + ext * .003;
			for (const b of balls(p, d)) cost += (ctx.bag.space.depth(b.c, b.r) + ctx.clear.depth(b.c, b.r)) * 10 + Math.max(0, b.r - b.c.y) * 10;
			if (cost < best.cost) best = {
				at: p,
				dir: d,
				cost
			};
		}
		if (best.cost < .004 * (swing + .5)) break search;
	}

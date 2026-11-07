function hangFruit(s, k, F) {
	const kr = chance(s.seed, "fruit", ...s.key, k);
	const size = s.vigour * about(kr, 1, .1);
	const L = F.L * size * lerp(.15, 1, F.set);
	const W = F.W * size * lerp(.15, 1, F.set);
	const swing = v3(Math.cos(k * 2.4 + kr() * 3), 0, Math.sin(k * 2.4 + kr() * 3));
	const start = s.at.clone().addScaledVector(s.dir, F.stalk * .3);
	const hangFrom = start.clone().addScaledVector(swing, F.stalk * (F.out ?? .25)).add(v3(0, -F.stalk * lerp(.3, .8, F.set), 0));
	const place = s.grid.settle(hangFrom, DOWN.clone().addScaledVector(swing, .15), (a, d) => [.3, .72].map((t) => ({
		c: a.clone().addScaledVector(d, L * t),
		r: W * .95
	})), F.stalk * .5 + W);
	s.bag.fruit([...s.key, k], s.at, place.dir);
	s.bag.add("body", tube([
		s.at,
		start,
		place.at
	], (u) => (.0015 + .0035 * F.set * (F.W / .03)) * (1 - .4 * u), () => col(F.stalkColour ?? "#6f6a3a"), 4));
	return {
		m: fruitBody(s.bag, {
			at: place.at,
			dir: place.dir,
			L,
			W,
			shape: F.shape,
			paint: F.paint,
			sides: F.sides ?? 12,
			rings: F.rings ?? 10,
			gloss: F.gloss,
			turn: kr() * Math.PI * 2,
			bend: F.bend
		}),
		L,
		W
	};
}

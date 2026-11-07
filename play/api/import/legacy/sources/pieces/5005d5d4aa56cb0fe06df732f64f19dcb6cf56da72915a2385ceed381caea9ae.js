function hanging(ctx, at, out, key, o) {
	const { bag, seed, g, vigour } = ctx;
	const fr = chance(seed, "hanging", ...key);
	const opens = o.season.opens + fr() * .35;
	const size = vigour * about(fr, 1, .1);
	const ripeAt = o.season.ripeFrom + fr() * .35;
	if (g < opens - .5) return;
	const set = span(g, opens + .45, opens + .45 + o.season.setFor);
	const L = o.L * size, W = o.W * size;
	const start = at.clone().addScaledVector(out, .004);
	const place = bag.space.settle(start.clone().add(v3(0, -o.stalk * .5, 0)).addScaledVector(out, o.stalk * .3), v3(0, -1, 0).addScaledVector(out, .3), (a, d) => [.3, .72].map((t) => ({
		c: a.clone().addScaledVector(d, L * t),
		r: W * 1.05
	})), o.stalk * .6);
	if (set >= .02) bag.fruit(key, at, place.dir);
	bag.add("body", tube([
		at,
		start,
		place.at
	], () => 6e-4, () => o.stalkColour, 3));
	if (set < .02) {
		o.bud(bag, place.at, place.dir, clamp((g - opens) / .2), span(g, opens + .3, opens + .45));
		return;
	}
	o.draw(bag, place.at, place.dir, L * lerp(.25, 1, set), W * lerp(.22, 1, set), span(g, ripeAt, ripeAt + o.season.ripeFor));
	bag.fruitDone();

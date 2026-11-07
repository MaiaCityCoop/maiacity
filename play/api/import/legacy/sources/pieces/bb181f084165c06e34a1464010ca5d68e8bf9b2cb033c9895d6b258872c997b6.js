function wire(bag, blades, pts, r, paint, sides = 4, side) {
	if (DETAIL.level >= 1 && r >= DETAIL.finest) bag.add("body", tube(pts, (u) => r * (1 - .35 * u), paint, sides));
	else if (r * 2 >= DETAIL.finest * .6) blades.strip(pts, r * 2.4, paint, side);
}

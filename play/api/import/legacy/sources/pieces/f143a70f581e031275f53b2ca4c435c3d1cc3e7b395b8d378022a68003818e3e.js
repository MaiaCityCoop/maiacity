/** A tuft of herbs or lettuce for the beds and the aquaponics troughs. */
function herb(seed, size = .3) {
	const r = seeded(seed);
	const g = new three.Group();
	canopy(g, r, 0, size * .5, 0, size, size * .6, 7, fineLeafMat(), size * .9);
	return mark(g, { herb: size });

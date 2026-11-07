/** An understorey shrub — coffee, cacao, berries — about a metre high. */
function shrub(seed, size = 1) {
	const r = seeded(seed);
	const g = new three.Group();
	canopy(g, r, 0, .55 * size, 0, .6 * size, .5 * size, 18, r() < .5 ? leafMat() : fineLeafMat(), .6 * size);

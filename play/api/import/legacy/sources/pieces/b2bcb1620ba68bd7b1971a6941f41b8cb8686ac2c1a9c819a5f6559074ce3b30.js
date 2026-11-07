	const s = new three.Shape();
	s.moveTo(0, 0);
	s.bezierCurveTo(.45, .15, .45, .85, 0, 1);
	s.bezierCurveTo(-.45, .85, -.45, .15, 0, 0);
	return new three.ShapeGeometry(s, 6);
}))();
/** A houseplant in a round clay pot or a woven basket: monstera, fiddle-leaf fig, snake plant, or a trailing pothos. */
function houseplant(kind, seed, size = 1) {
	const r = seeded(seed);
	const g = new three.Group();
	const pr = .22 * size, ph = .3 * size;
	const pot = new three.Mesh(new three.CylinderGeometry(pr, pr * .8, ph, 16), r() < .5 ? house.clay() : house.basket());
	pot.position.y = ph / 2;
	g.add(pot);
	if (kind === "monstera") for (let i = 0; i < 8; i++) {
		const a = i / 8 * Math.PI * 2 + r();
		const len = (.5 + r() * .4) * size;
		const stem = new three.Mesh(sphere(), house.stem());
		stem.scale.set(.012, len / 2, .012);
		stem.position.set(Math.sin(a) * .1, ph + len / 2, Math.cos(a) * .1);
		stem.rotation.set(Math.cos(a) * .5, 0, -Math.sin(a) * .5);
		g.add(stem);
		const leaf = new three.Mesh(leafGeo(), house.monstera());
		leaf.scale.setScalar((.45 + r() * .2) * size);
		leaf.position.set(Math.sin(a) * len * .5, ph + len * .9, Math.cos(a) * len * .5);
		leaf.rotation.set(-.9 - r() * .4, a, 0, "YXZ");
		g.add(leaf);

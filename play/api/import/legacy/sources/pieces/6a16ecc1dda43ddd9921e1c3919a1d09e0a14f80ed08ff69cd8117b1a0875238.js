//#piece 8950512b11c2f0d8d7dfa8e162ac2e8ad799d2f673e7b813191a3b75173d7e69
/** A terracotta pot with a plant in it. */
function potted(kind, seed, size = 1) {
	const r = seeded(seed);
	const g = new three.Group();
	const big = kind === "olive" || kind === "lemon";
	const pr = (big ? .38 : .24) * size;
	const ph = (big ? .55 : .32) * size;
	const pot = new three.Mesh(new three.CylinderGeometry(pr, pr * .75, ph, 14), garden.terracotta());
	pot.position.y = ph / 2;
	g.add(pot);
	const rim = new three.Mesh(new three.TorusGeometry(pr, .03 * size, 5, 16), garden.terracotta());
	rim.rotation.x = Math.PI / 2;
	rim.position.y = ph;
	g.add(rim);
	if (kind === "olive") {
		const t = new three.Group();
		trunk(t, 1.1 * size, .07 * size, .15);
		t.position.y = ph;
		g.add(t);
		canopy(g, r, 0, ph + 1.4 * size, 0, .75 * size, .55 * size, 34, garden.olive(), .55 * size);
		hang(g, r, ph + 1.35 * size, .6 * size, .3, 14, garden.oliveFruit(), [
			.018,
			.024,
			.018
		]);
	} else if (kind === "lemon") {
		const t = new three.Group();
		trunk(t, .8 * size, .05 * size);
		t.position.y = ph;
		g.add(t);
		canopy(g, r, 0, ph + 1.1 * size, 0, .55 * size, .5 * size, 28, fineLeafMat(), .5 * size);
		hang(g, r, ph + 1.05 * size, .5 * size, .3, 10, fruit.lemon(), [
			.045,
			.055,
			.045
		]);
	} else if (kind === "lavender") for (let i = 0; i < 22; i++) {
		const a = r() * 6.28, d = r() * pr * .8;
		const s = stick(garden.sage(), Math.cos(a) * d, Math.sin(a) * d, .35 * size, .008);
		s.position.y = ph;
		s.rotation.set((r() - .5) * .6, 0, (r() - .5) * .6);
		g.add(s);
		const f = new three.Mesh(small(), garden.lavender());
		f.scale.set(.02, .06, .02);
		f.position.set(Math.cos(a) * d * 1.3, ph + .37 * size, Math.sin(a) * d * 1.3);
		g.add(f);

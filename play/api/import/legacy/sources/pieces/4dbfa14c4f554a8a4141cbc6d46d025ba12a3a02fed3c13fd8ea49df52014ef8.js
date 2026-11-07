function bistro(k, x, z, seed) {
	const g = new three.Group();
	const r = seeded(seed);
	const topM = new three.Mesh(new three.CylinderGeometry(.42, .42, .04, 20), k.lime);
	topM.position.set(x, .74, z);
	topM.castShadow = true;
	g.add(topM);
	g.add(k.box(.06, .74, .06, k.dark, x, 0, z));
	const n = 2 + Math.floor(r() * 2);
	for (let i = 0; i < n; i++) {
		const a = i / n * Math.PI * 2 + r();
		const cx = x + Math.sin(a) * .72, cz = z + Math.cos(a) * .72;
		g.add(k.box(.42, .45, .42, k.timber, cx, 0, cz, a));
		g.add(k.box(.42, .45, .05, k.timber, cx + Math.sin(a) * .2, .45, cz + Math.cos(a) * .2, a));
		const cup = new three.Mesh(i % 2 ? new three.CylinderGeometry(.045, .035, .09, 10) : new three.CylinderGeometry(.12, .1, .02, 14), white);
		cup.position.set(x + Math.sin(a) * .24, .8, z + Math.cos(a) * .24);
		g.add(cup);

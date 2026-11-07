function table(m, len, chairs) {
	const g = new three.Group();
	g.add(box(len, .06, .95, m.oak(1), 0, .72));
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(.07, .72, .07, m.dark, sx * (len / 2 - .15), 0, sz * .38));
	for (let i = 0; i < chairs; i++) {
		const x = i % Math.ceil(chairs / 2) * (len / Math.ceil(chairs / 2)) - len / 2 + len / chairs;
		const z = i < chairs / 2 ? -.75 : .75;
		g.add(box(.45, .45, .45, m.oak(1), x, 0, z));
		g.add(box(.45, .5, .05, m.oak(1), x, .45, z + (z < 0 ? -.2 : .2)));

function sofa(m, len = 2.4) {
	const g = new three.Group();
	g.add(box(len, .42, .95, m.sofa));
	g.add(box(len, .45, .25, m.sofa, 0, .42, -.36));
	for (let i = 0; i < 3; i++) g.add(box(.45, .4, .14, m.cushion, (i - 1) * len * .3, .5, -.22));

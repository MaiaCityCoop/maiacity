function pergola(k, w, d) {
	const g = new three.Group();
	for (const sx of [-1, 1]) for (const sz of [
		-1,
		0,
		1
	]) g.add(k.box(.16, 2.9, .16, k.timber, sx * w / 2, 0, sz * d / 2));
	for (const sx of [-1, 1]) g.add(k.box(.14, .2, d + .4, k.timber, sx * w / 2, 2.9, 0));
	for (let i = 0; i <= 6; i++) g.add(k.box(w + .4, .12, .1, k.timber, 0, 3.1, -d / 2 + i * d / 6));
	for (let i = 0; i <= 3; i++) {
		const z = -d / 2 + i * d / 3;
		for (let j = 0; j <= 12; j++) {
			const t = j / 12;
			const b = new three.Mesh(new three.SphereGeometry(.05, 6, 4), bulb);
			b.position.set(-w / 2 + t * w, 2.95 - Math.sin(t * Math.PI) * .35, z);
			g.add(b);
		}
	}

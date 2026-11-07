function parasol(k, x, z, mat) {
	const g = new three.Group();
	g.add(k.box(.05, 2.4, .05, k.dark, x, 0, z));
	const top = new three.Mesh(new three.ConeGeometry(1.35, .45, 8, 1, true), mat);
	top.position.set(x, 2.45, z);
	top.castShadow = true;
	g.add(top);

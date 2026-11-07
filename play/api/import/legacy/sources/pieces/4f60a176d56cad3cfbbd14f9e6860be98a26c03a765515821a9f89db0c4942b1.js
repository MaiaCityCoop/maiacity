function stool(k, x, z, h = .62) {
	const g = new three.Group();
	g.add(k.box(.05, h, .05, k.dark, x, 0, z));
	const seat = new three.Mesh(new three.CylinderGeometry(.2, .2, .05, 14), k.oak);
	seat.position.set(x, h, z);
	g.add(seat);

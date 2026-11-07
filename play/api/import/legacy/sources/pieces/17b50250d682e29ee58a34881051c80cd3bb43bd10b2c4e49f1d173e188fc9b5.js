function balconyDoor() {
	const g = new three.Group();
	const w = .95, h = 2.1;
	for (const sx of [-1, 1]) g.add(new three.Mesh(round(.12, h, .14, .04), M.wood()).translateX(sx * .5349999999999999).translateY(h / 2));
	const arch = new three.Mesh(new three.TorusGeometry(.5349999999999999, .06, 8, 20, Math.PI), M.wood());
	arch.position.y = h;
	g.add(arch);
	g.add(new three.Mesh(round(1.25, .05, .5, .02), M.stone()).translateY(.025));
	const leaf = new three.Group();
	leaf.add(new three.Mesh(new three.BoxGeometry(w, 2.0500000000000003, .03), new three.MeshStandardMaterial({
		color: "#dfeef0",
		roughness: .05,
		transparent: true,
		opacity: .25
	})).translateX(w / 2).translateY(h / 2));
	for (const x of [0, w]) leaf.add(new three.Mesh(new three.BoxGeometry(.05, h, .05), M.wood()).translateX(x).translateY(h / 2));
	leaf.position.x = -.95 / 2;
	leaf.rotation.y = 1.9;
	g.add(leaf);

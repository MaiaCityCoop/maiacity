	const g = new three.Group();
	g.name = "truck";
	const paint = (color) => new three.MeshStandardMaterial({
		color,
		roughness: .55,
		metalness: .1
	});
	const tyre = tyreMat();
	part(g, 2.55, 3.1, 12, paint(box), 0, 2.45, -1.2, false);
	part(g, 2.5, 2.6, 2.4, paint(cab), 0, 2.1, 6.2, false);
	part(g, 2.3, 1, .05, truckGlass(), 0, 2.7, 7.42, false);
	part(g, 2.3, .5, 15, tyre, 0, .7, 0, false);
	for (const z of [
		-5.8,
		-4.6,
		3.4,
		6.4
	]) for (const x of [-1.15, 1.15]) {
		const wheel = new three.Mesh(new three.CylinderGeometry(.5, .5, .4, 12), tyre);
		wheel.rotation.z = Math.PI / 2;
		wheel.position.set(x, .5, z);
		wheel.castShadow = true;
		g.add(wheel);
	}

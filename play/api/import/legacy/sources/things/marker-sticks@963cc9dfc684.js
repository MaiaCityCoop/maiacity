//#piece 81e1848bc0f153d6150bee182488598f1e9394184f254db9d3ac92e8e41b6aec
//#piece 05ca5de5bcb57d42aaa13613efc6bdc38032741e51202af17f2e598ec6fd9b36
}

//#endregion
//#piece 46f0330f373d34a59259f40e2d1fef112cf50eab2789beb90a15d5ff83a7de2d
/** A wooden marker stick: 35 cm of square pine, 12 mm across, pointed to go into the ground, its top painted orange
*  to be seen in the grass. Its origin is its point (push it in to the depth you want). */
function markerStick(len = .35) {
	const g = new three.Group();
	g.name = "marker-stick";
	const s = .012, tip = .04;
	const point = new three.Mesh(new three.ConeGeometry(s * .7071, tip, 4).rotateY(Math.PI / 4).rotateX(Math.PI), m.wood());
	point.position.y = tip / 2;
	g.add(point);
	part(g, s, len - tip - .03, s, m.wood(), 0, tip + (len - tip - .03) / 2, 0);
	part(g, .0126, .03, .0126, m.paint(), 0, len - .015, 0);
	part(g, s * .9, 8e-4, s * .9, m.endGrain(), 0, len + 3e-4, 0);
	g.traverse((o) => o.isMesh && (o.castShadow = true));
	return g;
}
/** Two marker sticks pushed 5 cm into the ground `apart` m apart, either side of the spot (on x), leaning a little
*  as sticks pushed in by hand do. Its origin is the spot, on the ground. */
function markerSticks({ apart = .5 } = {}) {
	const g = new three.Group();
	g.name = "marker-sticks";
	for (const sx of [-1, 1]) {
		const s = markerStick();
		s.position.set(sx * apart / 2, -.05, 0);
		s.rotation.set(.04 * sx, 0, -.06 * sx);
		g.add(s);
	}
//#piece 6cdc5762c73bb286f714fbc6acd254fa986c6b14ef152c0e519354fa53a2303f
	id: "marker-sticks",
	label: "Marker sticks",
	note: "two sticks of square pine, 35 cm long and 12 mm across, pointed, their tops painted orange, pushed into the ground half a metre apart",
	usedIn: "MaiaCity V1",
	make: () => markerSticks()
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e

	const s = new three.Mesh(new three.SphereGeometry(r, 20, 12), m.paper);
	s.scale.y = .72;
	s.position.y = y;
	g.add(s);
	const cable = new three.Mesh(new three.CylinderGeometry(.008, .008, 3, 4), m.dark);
	cable.position.y = y + 1.5;
	g.add(cable);
	return g;
}

//#endregion
//#region src/lib/models/domerooms.js

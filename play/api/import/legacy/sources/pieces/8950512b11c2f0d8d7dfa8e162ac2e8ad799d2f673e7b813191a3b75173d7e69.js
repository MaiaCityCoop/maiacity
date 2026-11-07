const stick = (mat, x, z, h, r = .02) => {
	const m = new three.Mesh(stickGeo(), mat);
	m.scale.set(r, h, r);
	m.position.set(x, 0, z);
	return m;
};

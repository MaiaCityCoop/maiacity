function box(w, h, d, mat, x = 0, y = 0, z = 0, rotY = 0) {
	const m = new three.Mesh(new three.BoxGeometry(w, h, d), mat);
	m.position.set(x, y + h / 2, z);
	m.rotation.y = rotY;
	m.castShadow = m.receiveShadow = true;
	return m;

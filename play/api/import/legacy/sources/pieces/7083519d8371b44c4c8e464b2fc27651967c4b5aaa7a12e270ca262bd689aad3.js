/** a box resting on y */
function box(g, w, h, d, mat, x = 0, y = 0, z = 0, rot = 0) {
	const m = new three.Mesh(new three.BoxGeometry(w, h, d), mat);
	m.position.set(x, y + h / 2, z);
	m.rotation.y = rot;
	m.castShadow = m.receiveShadow = true;
	g.add(m);
	return m;
}
/** a disc of something on the ground */
function floor(g, r, mat, x = 0, z = 0) {
	const m = new three.Mesh(new three.CircleGeometry(r, 40), mat);
	m.rotation.x = -Math.PI / 2;
	m.position.set(x, .03, z);
	m.receiveShadow = true;
	g.add(m);

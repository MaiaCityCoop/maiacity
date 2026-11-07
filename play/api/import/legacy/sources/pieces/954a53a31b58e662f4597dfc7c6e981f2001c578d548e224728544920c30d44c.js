/** a set built round the dome's middle, brought to the viewer's: its foot at the middle, standing on y 0 */
function centred(o) {
	const g = new three.Group();
	g.add(o);
	o.updateMatrixWorld(true);
	const b = new three.Box3().setFromObject(o);
	const c = b.getCenter(new three.Vector3());
	o.position.x -= c.x;
	o.position.z -= c.z;
	o.position.y -= b.min.y;
	return g;
}

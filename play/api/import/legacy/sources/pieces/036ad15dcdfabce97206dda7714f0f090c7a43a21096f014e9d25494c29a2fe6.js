/** a wheel turning about x: radius r, width w, at */
/** @param {number} r @param {number} w @param {V3} at @param {number} [seg] */
function wheel(r, w, at, seg = 18) {
	const g = new three.CylinderGeometry(r, r, w, seg);
	g.rotateZ(Math.PI / 2);
	g.translate(...at);
	return g;
}

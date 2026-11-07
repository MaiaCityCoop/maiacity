/** a box at a place */
/** @param {number} w @param {number} h @param {number} d @param {V3} at @param {number} [r] */
function block(w, h, d, at, r = .02) {
	const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
	g.translate(...at);
	return g;
}

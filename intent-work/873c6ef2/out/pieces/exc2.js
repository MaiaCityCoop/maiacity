// The piece "Excavator rig helpers (excavator-rig.js)", version 2: below its requires, the text of the copy in BatteryPack v11 (src/lib/actors/excavator-rig.js), as it was.
const three_addons_geometries_RoundedBoxGeometry_js = require("three/addons/geometries/RoundedBoxGeometry.js");
/** a box at a place */
/** @param {number} w @param {number} h @param {number} d @param {V3} at @param {number} [r] */
function block(w, h, d, at, r = .02) {
	const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
	g.translate(...at);
	return g;
}
/** smoothly from 0 to 1 @param {number} x */
const ease$1 = (x) => x * x * (3 - 2 * x);

module.exports = { block, ease$1 };

const m = /* @__PURE__ */ (() => ({
//#piece b781159bbd3ab4bac1bea0fba3f28410b123e14c34ec900ab71f60723435eab5
/** Sandbox 1's paint, one material for every container of a colour */
const paints = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
/** @param {string} color @returns {THREE.MeshStandardMaterial} */
function paint(color) {
	let p = paints.get(color);
	if (!p) paints.set(color, p = new three.MeshStandardMaterial({
		color,
		roughness: .55,
		metalness: .3
	}));
	return p;
}

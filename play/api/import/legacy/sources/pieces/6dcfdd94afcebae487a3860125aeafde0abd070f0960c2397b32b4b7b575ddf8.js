/** A solar panel, 1.72 × 1.13 m, its aluminium frame, lying flat at its origin. */
const pvMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	map: pvCells(),
	roughness: .25,
	metalness: .3
})))();
/** @param {THREE.Object3D} g @param {number} x @param {number} y @param {number} z @param {number} tilt about x (the low edge towards +z for a positive tilt) */
function pvPanel(g, x, y, z, tilt) {
	const p = new three.Group();
	p.position.set(x, y, z);
	p.rotation.x = tilt;
	g.add(p);

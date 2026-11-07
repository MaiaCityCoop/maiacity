/** a mesh that neither casts nor catches a shadow (glass, a light, a screen) */
/** @param {THREE.Mesh} p */
const unlit = (p) => (p.castShadow = p.receiveShadow = false, p);
/** A round thing standing up (a tin, a bottle, a drum), its foot at y. */
/** @param {THREE.Object3D} g @param {number} r @param {number} h @param {THREE.Material} mat @param {number} x @param {number} y @param {number} z */
function drum(g, r, h, mat, x, y, z, seg = 16) {
	const p = new three.Mesh(new three.CylinderGeometry(r, r, h, seg), mat);
	p.position.set(x, y + h / 2, z);
	p.castShadow = p.receiveShadow = true;
	g.add(p);
	return p;
}
/** Stencilled letters on the steel, as a container's owner paints its name. */
/** @param {string} text */
function stencil(text) {
	return canvasTexture(`stencil:${text}`, 1024, 256, (x) => {
		x.clearRect(0, 0, 1024, 256);
		x.fillStyle = "#f4f1ea";
		x.font = "bold 150px \"Arial Narrow\", Arial, sans-serif";
		x.textBaseline = "middle";
		x.fillText(text, 24, 110);
		x.font = "bold 44px Arial, sans-serif";
		x.fillText("MAIA 400 1" + text.length + "4  ·  45G1", 28, 222);
	});
}

	});
}
/** A floor of its own colour, or a texture repeated at its real size over the inside. */
/** @param {string} color @param {THREE.Texture} [map] @param {number} [size] */
function floorMaterial(color, map, size = 1) {
	if (!map) return new three.MeshStandardMaterial({
		color,
		roughness: .75
	});
	const t = map.clone();
	t.repeat.set((X1 - X0) / size, (Z1 - Z0) / size);
	t.needsUpdate = true;
	return new three.MeshStandardMaterial({
		color,
		map: t,
		roughness: .5
	});
}
/** A flat picture on a panel (a screen, a label), facing +z. */
/** @param {THREE.Object3D} g @param {number} w @param {number} h @param {THREE.Material} mat @param {number} x @param {number} y @param {number} z @param {number} [ry] */
function sheet(g, w, h, mat, x, y, z, ry = 0) {
	const p = new three.Mesh(new three.PlaneGeometry(w, h), mat);
	p.position.set(x, y, z);
	p.rotation.y = ry;
	g.add(p);
	return p;

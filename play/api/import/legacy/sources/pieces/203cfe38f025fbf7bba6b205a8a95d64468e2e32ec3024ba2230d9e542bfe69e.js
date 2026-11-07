	const g = new three.BoxGeometry(.02, .30000000000000004, .035);
	g.rotateX(a);
	g.translate(x, y, z);
	return g;
}
/** @param {number} th @param {number} y @param {number} z @returns {[number, number]} */

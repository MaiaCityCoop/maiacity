	const g = new three.CylinderGeometry(r, r, w, 18);
	g.rotateZ(Math.PI / 2);
	g.translate(...at);
	return g;
}
/** The bucket: a curled back plate between two side plates, four teeth along its lip, its pins at the top. */
/** @returns {Piece[]} */

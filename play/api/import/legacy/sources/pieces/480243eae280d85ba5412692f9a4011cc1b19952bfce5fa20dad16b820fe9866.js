	const s = new three.Shape(), x = w / 2, y = h / 2;
	s.moveTo(-x + r, -y);
	s.lineTo(x - r, -y);
	s.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
	s.lineTo(x, y - r);
	s.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
	s.lineTo(-x + r, y);
	s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
	s.lineTo(-x, -y + r);
	s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
	return s;
}
/** a hole in a shape: a circle @param {number} x @param {number} y @param {number} r */
const ring = (x, y, r) => {
	const p = new three.Path();
	p.absarc(x, y, r, 0, Math.PI * 2, true);
	return p;
};
/** a solid extruded along z by `d`, centred, with a small bevel @param {THREE.Shape} s @param {number} d @param {number} [b] */

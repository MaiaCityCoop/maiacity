	const [, py, pz] = pivot;
	const cy = py - R, cz = pz + R * .17;
	/** @type {Piece[]} */
	const out = [];
	/** a point on the curl, φ from up (0) through out (π/2) to down (π) and on round under it @param {number} phi @returns {V3} */
	const at = (phi) => [
		0,
		cy + Math.cos(phi) * R,
		cz + Math.sin(phi) * R
	];
	const n = 10, from = -.15, to = Math.PI + .55;
	for (let i = 0; i < n; i++) out.push({

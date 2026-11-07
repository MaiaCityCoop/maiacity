	pts.push([
		R,
		tw,
		1
	], [
		R - .008,
		hw - .033,
		1
	], [
		R - .028,
		hw - .02,
		1
	], [rim + .78 * s, hw - .007], [rim + .45 * s, hw], [rim + .02, hb + .007], [rim, hb]);
	pts.push([rim, hb - .024], [rim + .5 * s, hw - .013], [R - .03, hw - .045], [R - .03, -hw + .045], [rim + .5 * s, -hw + .013], [rim, -hb + .024]);
	const P = Math.PI * 2 / pitches, gf = hwy ? .24 : .34, eps = P * .05;
	/** @type {number[]} */
	const angles = [];
	/** @type {number[]} */
	const inLug = [];
	for (let k = 0; k < pitches; k++) {
		const a = k * P;
		angles.push(a, a + eps, a + gf * P - eps, a + gf * P);
		inLug.push(0, 1, 1, 0);
	}
	const ribOf = (x) => grooves.filter((g) => x > g * tw).length;
	return revolveX(pts, angles, (r, x, i, tag) => {
		if (tag !== 1 || !inLug[i]) return r;
		const f = clamp((r - (R - .03)) / .03);
		const rib = ribOf(x), k = Math.floor(i / 4);
		return rib === 0 || rib === grooves.length || (k + rib) % 2 === 0 ? r - d * f : r;
	});
}
/**
* A rim's barrel: the two flanges and bead seats, the safety humps and the drop-centre well the beads go into to fit
* the tyre, as one pressed (or cast) wall of thickness t round the axle.
* @param {{ rim: number, rimW: number, t?: number, seg?: number }} o
*/

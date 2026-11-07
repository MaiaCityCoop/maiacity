	const tilt = (r() - .5) * .6;
	for (let i = 0; i < f.petals; i++) {
		const a = i / f.petals * Math.PI * 2 + r() * .2;
		const len = f.r, wid = Math.PI * 2 * f.r / f.petals * (f.petals > 8 ? .7 : 1.1);
		const g = new three.PlaneGeometry(wid, len).translate(0, len / 2 + f.r * .25, 0).rotateX(-Math.PI / 2 + .25 + (kind === "buttercup" ? .5 : 0)).rotateY(-a + Math.PI / 2);
		g.rotateZ(tilt).translate(at.x, at.y, at.z);
		geos.push(paint(g, col(f.colour)));
	}

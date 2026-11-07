function oblong(bag, at, dir, L, W, shape, paint, tip, sides = 8) {
	const pts = [];
	for (let k = 0; k <= 6; k++) pts.push(at.clone().addScaledVector(dir, k / 6 * L));
	bag.add("gloss", tube(pts, (u) => W * shape(u), paint, sides));
	bag.add("body", bead(at.clone().addScaledVector(dir, L * .98), v3(1, 1, 1).multiplyScalar(Math.max(8e-4, W * .2)), tip, 2));

	const sun = chance(o.seed, "fruit-shape", ...o.key)() * Math.PI * 2;
	const m = new three.Matrix4().compose(o.at, new three.Quaternion().setFromUnitVectors(v3(0, -1, 0), o.dir.clone().normalize()).multiply(new three.Quaternion().setFromAxisAngle(v3(0, 1, 0), sun)), v3(1, 1, 1));
	const axis = [];
	const rings = 18;
	for (let k = 0; k <= rings; k++) axis.push(v3(0, -.002 - k / rings * o.L, 0));
	bag.add(F.gloss ? "gloss" : "body", tube(axis, (u, v) => o.W * F.shape(u, v), (u, v) => F.colour(o.ripe, u, v), 20), m);
	if (F.calyx) bag.add("body", bead(v3(0, -.002, 0), v3(1, .5, 1).multiplyScalar(Math.max(.003, o.W * .18)), F.calyx, 4), m);
	if (F.skin && o.set > .05) {
		const skin = F.skin;
		const n = Math.round(skin.count * clamp(o.set * 1.5));
		const c = skin.colour(o.ripe);
		for (let k = 0; k < n; k++) {

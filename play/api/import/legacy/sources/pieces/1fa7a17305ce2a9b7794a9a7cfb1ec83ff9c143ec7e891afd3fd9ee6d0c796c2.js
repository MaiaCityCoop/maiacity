	geos.push(paint(new three.CircleGeometry(f.r * .32, 6).rotateX(-Math.PI / 2).rotateZ(tilt).translate(at.x, at.y + .002, at.z), col(f.eye)));
	return geos;
}
/** A clump of a low flower: a rosette of leaves on the ground, stems up out of it, a head on each. */
function flowerClump(kind, seed) {
	const r = rng(seed), f = FLOWERS[kind], geos = [];
	const leaf = col(f.leaf);
	const leaves = 6 + Math.floor(r() * 6);
	for (let i = 0; i < leaves; i++) {
		const a = r() * Math.PI * 2, len = .03 + r() * .035;
		const dir = new three.Vector3(Math.cos(a), .35 + r() * .4, Math.sin(a));
		geos.push(blade(new three.Vector3(0, .003, 0), dir, len, kind === "clover" || kind === "cranesbill" ? .026 : .016, .3, leaf.clone().multiplyScalar(.7), leaf.clone().offsetHSL(0, 0, .06)));
	}
	const heads = f.heads[0] + Math.floor(r() * (f.heads[1] - f.heads[0] + 1));
	for (let i = 0; i < heads; i++) {
		const a = r() * Math.PI * 2, d = .02 + r() * .05;
		const h = f.h[0] + r() * (f.h[1] - f.h[0]);
		const top = new three.Vector3(Math.cos(a) * d * 1.6, h, Math.sin(a) * d * 1.6);
		geos.push(blade(new three.Vector3(Math.cos(a) * d * .4, 0, Math.sin(a) * d * .4), top.clone().normalize(), h, .0025, .04, leaf.clone().multiplyScalar(.75), leaf));
		if (f.cluster) for (let k = 0; k < 4; k++) geos.push(...head(top.clone().add(new three.Vector3((r() - .5) * .02, (r() - .5) * .015, (r() - .5) * .02)), kind, r));
		else geos.push(...head(top, kind, r));
	}
	return one(geos);
}
/** Wild strawberries: their leaves in threes on stalks, toothed and veined, a few red berries hanging under them. */
function strawberries(seed) {
	const r = rng(seed), geos = [];
	const n = 5 + Math.floor(r() * 5);
	for (let i = 0; i < n; i++) {
		const a = r() * Math.PI * 2, d = r() * .08, h = .05 + r() * .07;
		const top = new three.Vector3(Math.cos(a) * (d + .03), h, Math.sin(a) * (d + .03));
		geos.push(blade(new three.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d), top.clone().normalize(), h, .002, .05, col("#4a6a2a"), col("#5a7a32")));
		for (let k = 0; k < 3; k++) {
			const b = a + (k - 1) * .9;
			geos.push(blade(top, new three.Vector3(Math.cos(b), .15, Math.sin(b)), .03, .022, .25, col("#3a6a28"), col("#5a8a38")));
		}
	}
	for (let i = 0; i < 4; i++) geos.push(paint(new three.IcosahedronGeometry(.007, 0).scale(1, 1.3, 1).translate((r() - .5) * .14, .012, (r() - .5) * .14), col(r() < .75 ? "#c8252c" : "#e8d8a8")));
	return one(geos);
}
/** A fern: its fronds arching out of one crown, each a stalk with its pinnae either side, narrowing to the tip. */
function fern(seed) {
	const r = rng(seed), geos = [];
	const n = 6 + Math.floor(r() * 5), size = .3 + r() * .3;
	for (let i = 0; i < n; i++) {
		const a = i / n * Math.PI * 2 + r() * .4;
		const out = new three.Vector3(Math.cos(a), 0, Math.sin(a));
		const pts = [];
		for (let k = 0; k <= 8; k++) {
			const t = k / 8;
			pts.push(new three.Vector3(out.x * size * t, size * .75 * Math.sin(t * Math.PI * .75), out.z * size * t));
		}
		for (let k = 0; k < 8; k++) {
			const t = k / 8, p = pts[k], q = pts[k + 1];
			geos.push(blade(p, q.clone().sub(p).normalize(), p.distanceTo(q), .004, 0, col("#4a6a2a"), col("#4a6a2a")));
			const side = q.clone().sub(p).cross(new three.Vector3(0, 1, 0)).normalize();
			const len = size * .22 * (1 - t * .85);
			for (const s of [1, -1]) geos.push(blade(p, side.clone().multiplyScalar(s).add(new three.Vector3(0, .2, 0)), len, len * .35, .25, col("#3f6e2a"), col("#6a9a40")));
		}
	}
	return one(geos);
}
/** Fallen leaves on the humus, curled and in many browns, and a few twigs among them. */
function litter(seed) {
	const r = rng(seed), geos = [];
	const browns = [
		"#7a4e2e",
		"#6b4a32",
		"#8a6a4a",
		"#5a3e2a",
		"#9a7350",
		"#86603e",
		"#6e5a44"
	];
	for (let i = 0; i < 34; i++) {
		const len = .03 + r() * .035;
		const g = new three.PlaneGeometry(len * .6, len, 2, 2);
		const p = g.attributes.position;
		for (let k = 0; k < p.count; k++) p.setZ(k, Math.abs(p.getX(k)) * .5 + .004 * Math.sin(p.getY(k) * 60));
		g.rotateX(-Math.PI / 2).rotateY(r() * Math.PI * 2).translate((r() - .5) * .5, .004 + r() * .006, (r() - .5) * .5);
		geos.push(paint(g, col(browns[Math.floor(r() * browns.length)]).multiplyScalar(.85 + r() * .3)));
	}

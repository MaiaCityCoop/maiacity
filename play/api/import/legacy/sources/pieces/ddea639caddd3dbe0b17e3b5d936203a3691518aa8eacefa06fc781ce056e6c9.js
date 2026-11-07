	for (let i = 0; i < 3; i++) {
		const len = .15 + r() * .3;
		const g = new three.CylinderGeometry(.004 + r() * .004, .006, len, 5).rotateZ(Math.PI / 2).rotateY(r() * Math.PI).translate((r() - .5) * .4, .006, (r() - .5) * .4);
		geos.push(paint(g, col(r() < .5 ? "#4a3626" : "#6a5038")));
	}
	return one(geos);
}
/** Woodruff: upright stems with whorls of narrow leaves, a cluster of small white stars on top; a carpet of it. */
function woodruff(seed) {
	const r = rng(seed), geos = [];
	for (let i = 0; i < 9; i++) {
		const x = (r() - .5) * .22, z = (r() - .5) * .22, h = .12 + r() * .1;
		geos.push(blade(new three.Vector3(x, 0, z), new three.Vector3((r() - .5) * .2, 1, (r() - .5) * .2), h, .0025, .02, col("#3f6a2a"), col("#4f7a30")));
		for (let w = 1; w <= 3; w++) {
			const y = h * w / 3.3;
			for (let k = 0; k < 7; k++) {
				const a = k / 7 * Math.PI * 2 + w;
				geos.push(blade(new three.Vector3(x, y, z), new three.Vector3(Math.cos(a), .15, Math.sin(a)), .025, .007, .15, col("#3a6626"), col("#5a8a36")));
			}
		}
		if (r() < .7) for (let k = 0; k < 4; k++) geos.push(paint(new three.CircleGeometry(.0035, 5).rotateX(-Math.PI / 2).translate(x + (r() - .5) * .015, h + .003, z + (r() - .5) * .015), col("#f7f6f0")));
	}
	return one(geos);
}
/** Wood sorrel: pale trefoils on thin stalks, each leaflet a heart folded along its middle; a few white flowers veined lilac. */
function woodSorrel(seed) {
	const r = rng(seed), geos = [];
	for (let i = 0; i < 12; i++) {
		const x = (r() - .5) * .2, z = (r() - .5) * .2, h = .05 + r() * .05;
		const top = new three.Vector3(x, h, z);
		geos.push(blade(new three.Vector3(x, 0, z), new three.Vector3(0, 1, 0), h, .0015, 0, col("#7a8a4a"), col("#8a9a52")));
		for (let k = 0; k < 3; k++) {
			const a = k / 3 * Math.PI * 2 + r();
			const g = new three.CircleGeometry(.011, 7, 0, Math.PI).rotateX(-Math.PI / 2 + .35).rotateY(-a).translate(top.x, top.y, top.z);
			geos.push(paint(g, col("#7aa848")));
		}
	}
	for (let i = 0; i < 3; i++) geos.push(paint(new three.CircleGeometry(.008, 5).rotateX(-Math.PI / 2).translate((r() - .5) * .15, .06, (r() - .5) * .15), col("#f4eef2")));
	return one(geos);
}
/** Ramsons (wild garlic): broad bright leaves rising from the ground in a dense stand, white star-umbels over them. */
function ramsons(seed) {
	const r = rng(seed), geos = [];
	for (let i = 0; i < 14; i++) {
		const a = r() * Math.PI * 2, d = r() * .12;
		geos.push(blade(new three.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d), new three.Vector3(Math.cos(a) * .35, 1, Math.sin(a) * .35), .18 + r() * .1, .045, .35, col("#2f6a26"), col("#4a8a34")));
	}

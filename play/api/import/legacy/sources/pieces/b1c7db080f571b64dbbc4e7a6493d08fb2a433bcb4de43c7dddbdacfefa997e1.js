* Fill a shelf from −w/2 to w/2 at y with goods of a kind: glass jars, tins, cardboard boxes, sacks, crates of
* vegetables, bottles, folded towels, detergent.
* @param {THREE.Group} g @param {number} w @param {number} d @param {number} y
* @param {'jars' | 'tins' | 'boxes' | 'sacks' | 'crates' | 'bottles' | 'towels' | 'pots'} kind @param {() => number} r
*/
function stock(g, w, d, y, kind, r) {
	let x = -w / 2 + .03;
	const jarTops = [
		m.red(),
		m.white(),
		m.green()
	];
	const fills = [
		"#d9a441",
		"#9b3b2a",
		"#e7dcc0",
		"#6b8f3a",
		"#c86d2a",
		"#f2e6c8",
		"#5a3a22"
	].map((c) => std(c, .4)());
	const veg = [
		"#b07a3c",
		"#d9c06a",
		"#9c2a2a",
		"#e08a2e",
		"#6c8f2a"
	].map((c) => std(c, .7)());
	while (x < w / 2 - .08) if (kind === "jars") {
		const rr = .045 + r() * .02, h = .12 + r() * .08;
		for (const z of [-d / 4, d / 4]) {
			drum(g, rr, h * .85, fills[Math.floor(r() * fills.length)], x + rr, y, z);
			unlit(drum(g, rr + .004, h, m.glass(), x + rr, y, z));
			drum(g, rr + .003, .02, jarTops[Math.floor(r() * 3)], x + rr, y + h, z);
		}
		x += rr * 2 + .02;
	} else if (kind === "tins") {
		for (const z of [
			-d / 3,
			0,
			d / 3
		]) for (let k = 0; k < 2; k++) {
			drum(g, .04, .11, m.steel(), x + .04, y + k * .11, z);
			drum(g, .041, .07, fills[Math.floor(r() * fills.length)], x + .04, y + k * .11 + .02, z);
		}
		x += .09;
	} else if (kind === "boxes") {
		const bw = .2 + r() * .2, bh = .15 + r() * .15;
		part(g, bw, bh, d * .85, m.cardboard(), x + bw / 2, y + bh / 2, 0);
		x += bw + .02;
	} else if (kind === "sacks") {
		soft(g, .32, .18, d * .85, .06, m.sack(), x + .16, y + .09, 0);
		soft(g, .3, .16, d * .8, .06, m.sack(), x + .16, y + .25, 0);
		x += .36;
	} else if (kind === "crates") {
		const cw = .4, ch = .24;
		part(g, cw, .02, d * .9, m.pine(), x + cw / 2, y + .01, 0);
		for (const sz of [-1, 1]) part(g, cw, ch, .015, m.pine(), x + cw / 2, y + ch / 2, sz * d * .9 / 2);
		for (const sx of [-1, 1]) part(g, .015, ch, d * .9, m.pine(), x + cw / 2 + sx * cw / 2, y + ch / 2, 0);
		const v = veg[Math.floor(r() * veg.length)];
		const ball = new three.SphereGeometry(.045, 8, 6);
		const n = 14;
		const heap = new three.InstancedMesh(ball, v, n);
		const mx = new three.Matrix4();
		for (let i = 0; i < n; i++) {
			mx.makeTranslation(x + .06 + i % 5 * .07, y + .07 + Math.floor(i / 10) * .06 + r() * .03, -d * .3 + Math.floor(i / 5) % 2 * d * .4 + r() * .06);
			heap.setMatrixAt(i, mx);
		}
		heap.castShadow = true;
		g.add(heap);
		x += .43000000000000005;
	} else if (kind === "bottles") {
		for (const z of [-d / 4, d / 4]) {
			drum(g, .04, .24, fills[Math.floor(r() * fills.length)], x + .04, y, z, 10);
			drum(g, .015, .06, m.black(), x + .04, y + .24, z, 8);
		}
		x += .095;
	} else if (kind === "towels") {
		const c = [
			m.white(),
			m.cream(),
			std("#8fb3c4", .95)()
		][Math.floor(r() * 3)];
		for (let k = 0; k < 4; k++) soft(g, .3, .05, d * .8, .02, c, x + .15, y + .025 + k * .052, 0);
		x += .34;
	} else {
		const rr = .1 + r() * .06;
		drum(g, rr, rr * 1.3, m.steel(), x + rr, y, 0, 20);
		x += rr * 2 + .03;
	}
}
//#piece 68a9130d5b5ded427f272f564b2cb112fed5d1ac7db2df1493b90caa3af0d98e
/** A wall shelf of steel, w long, d deep, its top at y; its back at z 0. What stands on it goes in `userData.on`, at its middle. */
/** @param {number} w @param {number} d @param {number} y @param {THREE.Material} [mat] */
function wallShelf(w, d, y, mat = m.steel()) {
	const g = new three.Group();
	part(g, w, .025, d, mat, 0, y, d / 2);
	for (const x of [-w / 2 + .1, w / 2 - .1]) part(g, .02, .2, d * .9, m.frame(), x, y - .11, d * .45);
	const on = new three.Group();
	on.position.z = d / 2;
	g.add(on);
	g.userData.on = on;
	return g;
}

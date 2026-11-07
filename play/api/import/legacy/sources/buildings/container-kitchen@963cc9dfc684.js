//#piece 6c4bb9ac7fd9a7080956f629353b460a4edbed132ed5bfd2922c93d02491bdcd
//#piece 32599c99b93fd576369015e6d6650141015bd6c677c857792d27c0b3d3e6b837
//#piece 20da77d9ba699ab0ee7fde11ed2955529f0f4eba7a24af56e632076202bf6e25
//#piece faf72741caaa5507f72265f531c4aaed768729c0e8f1302ef16b82c3ccb01c23
//#piece 40408ac9a5f690ba190203f9d13d4aee2f83b544badce4ae03d4e2d246b90229
	return g;
}
/**
//#piece b1c7db080f571b64dbbc4e7a6493d08fb2a433bcb4de43c7dddbdacfefa997e1
//#piece ca20793e1c3d005c5b401e8b2d59ea8edfc6423c859f20b3b2a7369a1a6255a3
/** A six-burner gas range, 1.2 × 0.75 m, two ovens under it, a splashback. Its front towards +z. */
function range6() {
	const g = new three.Group();
	const w = 1.2, d = .75;
	part(g, w, .82, d, m.steel(), 0, .49, 0);
	part(g, 1.16, .08, .65, m.black(), 0, .04, 0, false);
	part(g, w, .03, d, m.black(), 0, .915, 0);
	for (let i = 0; i < 3; i++) for (const sz of [-1, 1]) {
		const x = -.38 + i * .38, z = sz * .18;
		const ring = new three.Mesh(new three.TorusGeometry(.08, .012, 6, 18), m.graphite());
		ring.rotation.x = Math.PI / 2;
		ring.position.set(x, .945, z);
		g.add(ring);
		part(g, .3, .02, .025, m.graphite(), x, .945, z);
		part(g, .025, .02, .3, m.graphite(), x, .945, z);
	}
	part(g, w, .5, .03, m.steel(), 0, 1.18, -.36);
	for (const sx of [-1, 1]) {
		part(g, .56, .5, .012, m.steelDark(), sx * .29, .42, .381);
		unlit(part(g, .36, .18, .004, m.black(), sx * .29, .46, .388));
		bar(g, v3(sx * .29 - .22, .7, .425), v3(sx * .29 + .22, .7, .425), .012, m.chrome());
	}
	for (let i = 0; i < 6; i++) {
		const k = new three.Mesh(new three.CylinderGeometry(.022, .022, .03, 12), m.black());
		k.rotation.x = Math.PI / 2;
		k.position.set(-.5 + i * .2, .82, .39);
		g.add(k);
	}
	drum(g, .16, .3, m.steel(), -.38, .95, -.18, 24);
	const pan = drum(g, .15, .05, m.graphite(), .38, .95, .18, 24);
	bar(g, v3(.53, .99, .18), v3(.8, 1.02, .18), .012, m.graphite());
	pan.castShadow = true;
	return g;
}
/** A combi steamer on its stand: 0.9 × 0.8 m, the oven from 0.6 to 1.4 m, its glass door and control strip. */
function combiSteamer() {
	const g = new three.Group();
	g.add(steelTable(.9, .78, {
		h: .6,
		upstand: false
	}));
	part(g, .88, .8, .78, m.steel(), 0, 1, 0);
	part(g, .62, .62, .02, m.steelDark(), -.1, 1, .4);
	unlit(part(g, .48, .44, .006, m.black(), -.1, 1, .413));
	bar(g, v3(.18, .78, .44), v3(.18, 1.2, .44), .012, m.chrome());
	part(g, .16, .66, .012, m.black(), .34, 1, .396);
	unlit(part(g, .1, .07, .004, m.ledBlue(), .34, 1.22, .404));
	for (let i = 0; i < 6; i++) part(g, .7, .012, .6, m.chrome(), -.04, .12 + i * .075, .02);
	return g;
}
/** A sink table, w long: two deep bowls, a pre-rinse spray on its spring. */
/** @param {number} w */
function sinkTable(w) {
	const g = steelTable(w, .7);
	for (const x of [-w / 4 + .05, w / 4 - .05]) {
		part(g, .5, .012, .45, m.steelDark(), x, .905, .02);
		part(g, .04, .012, .04, m.black(), x, .912, .02);
	}
	bar(g, v3(0, .9, -.3), v3(0, 1.5, -.3), .015, m.chrome());
	bar(g, v3(0, 1.5, -.3), v3(0, 1.5, -.05), .012, m.chrome());
	for (let i = 0; i < 10; i++) {
		const coil = new three.Mesh(new three.TorusGeometry(.03, .006, 6, 14), m.chrome());
		coil.rotation.x = Math.PI / 2;
		coil.position.set(0, 1.2 + i * .025, -.05);
		g.add(coil);
	}
	drum(g, .03, .12, m.chrome(), 0, 1.05, -.05, 10);
	return g;
}
/** A hood-type dishwasher, 0.65 × 0.75 m, its hood down, a basket of plates beside it on the table. */
function hoodDishwasher() {
	const g = new three.Group();
	part(g, .65, .85, .72, m.steel(), 0, .425, 0);
	part(g, .66, .6, .74, m.steel(), 0, 1.15, 0);
	bar(g, v3(-.25, 1.48, .38), v3(.25, 1.48, .38), .012, m.chrome());
	part(g, .4, .06, .02, m.black(), 0, .78, .37);
	unlit(part(g, .04, .02, .004, m.ledGreen(), .15, .78, .382));
	return g;
}
/** An upright fridge (or freezer): `doors` steel doors 0.7 m each, 0.7 deep, 2.0 m high, a little display. */
/** @param {number} doors @param {boolean} [freezer] */
function uprightFridge(doors, freezer = false) {
	const g = new three.Group();
	const w = doors * .7;
	part(g, w, 1.95, .7, m.steel(), 0, 1.025, 0);
	part(g, w - .04, .05, .6499999999999999, m.black(), 0, .025, 0, false);
	for (let i = 0; i < doors; i++) {
		const x = -w / 2 + .35 + i * .7;
		part(g, .68, 1.6, .012, m.steel(), x, .92, .356);
		const hx = x + (i % 2 ? -.28 : .28);
		bar(g, v3(hx, .75, .39999999999999997), v3(hx, 1.35, .39999999999999997), .012, m.chrome());
	}
	part(g, w - .02, .3, .012, m.black(), 0, 1.84, .356);
	unlit(part(g, .12, .05, .004, freezer ? m.ledBlue() : m.ledGreen(), 0, 1.84, .364));
	return g;
}
/** A chest freezer, 1.3 × 0.7 × 0.85 m, white. */
function chestFreezer() {
	const g = new three.Group();
	soft(g, 1.3, .82, .7, .03, m.white(), 0, .41, 0);
	soft(g, 1.32, .06, .72, .02, m.white(), 0, .85, 0);
	part(g, .3, .03, .03, m.graphite(), 0, .82, .36);
	return g;
}
/** The extraction hood, w long, 1.0 deep: a steel canopy at 2.0–2.4 m, its filters, the duct up through the roof. Its back at z 0. */
/** @param {number} w */
function extractionHood(w) {
	const g = new three.Group();
	part(g, w, .35, 1, m.steel(), 0, 2.33, .5);
	part(g, w - .1, .02, .9, m.steelDark(), 0, 2.15, .5);
	for (let i = 0; i < Math.floor(w / .5); i++) part(g, .46, .012, .4, m.graphite(), -w / 2 + .28 + i * .5, 2.15, .5);
	drum(g, .16, .050000000000000266, m.galv(), 0, 2.5, .4, 20);
//#piece beb6bca887886923a6b060ad8a954bcc592059e8846a1754dc04c8003b095b8f
* The kitchen container: a central kitchen for the crew, and behind a partition its pantry.
* From the open end: the pass and the serving hatch on the front, the cooking line under its hood on the back — the
* six-burner range, the combi steamer — then the prep tables, the sinks, the dishwasher, the fridges and the freezer;
* then through the partition door the pantry: shelves of jars, tins, boxes and crates, sacks of grain on a pallet, its
* own door out for deliveries.
*/
function kitchenContainer() {
	const b = box({
		name: "kitchen container",
		color: "#c4614a",
		floor: floorMaterial("#3c3f42"),
		label: "KITCHEN",
		labelX: -1,
		front: [{
			u0: 1.6,
			u1: 3.6,
			y0: 1.05,
			y1: 2.05
		}, {
			u0: -4.3,
			u1: -3.4,
			y0: FLOOR,
			y1: 2.2,
			door: true
		}]
	});
	const { g, roof, solids } = b;
	const f = fitter(g, solids);
	const r = rng(21);
	const flap = new three.Group();
	flap.position.set(2.6, 2.07, W / 2);
	flap.rotation.x = -.35;
	g.add(flap);
	part(flap, 2, .03, .9, b.skin, 0, 0, .45);
	for (const x of [1.75, 3.45]) bar(g, v3(x, 1.5, W / 2 + .02), v3(x, 2.07 + Math.sin(.35) * .85, W / 2 + Math.cos(.35) * .85), .012, m.galv());
	part(g, 2, .04, .35, m.steel(), 2.6, 1.05, W / 2 + .175);
	for (const x of [1.8, 3.4]) part(g, .03, .25, .3, m.frame(), x, .92, W / 2 + .15);
	f.block(1.6, 3.6, W / 2, W / 2 + .35);
	f.put(steelTable(2, .5, { upstand: false }), 2.6, atFront(.5), {
		ry: Math.PI,
		w: 2,
		d: .5
	});
	for (const x of [
		2,
		2.6,
		3.2
	]) unlit(part(g, .25, .08, .2, m.heat(), x, 1.98, Z1 - .25));
	for (const x of [
		1.9,
		2.45,
		3
	]) drum(g, .13, .12, m.white(), x, 1.05, Z1 - .25, 24);
	f.put(range6(), 1.35, atBack(.75), {
		w: 1.2,
		d: .75
	});
	f.put(combiSteamer(), 2.45, atBack(.8), {
		w: .9,
		d: .8
	});
	f.put(extractionHood(2.2), 1.8, Z0, { y: FLOOR });
	unlit(drum(roof, .2, .25, m.galv(), 1.8, H, Z0 + .4, 20));
	drum(roof, .3, .04, m.galv(), 1.8, H + .27, Z0 + .4, 20);
	const prep = f.put(steelTable(1.3, .7), .1, atBack(.7), {
		w: 1.3,
		d: .7
	});
	part(prep, .45, .03, .3, m.beech(), -.2, .915, .05);
	part(prep, .22, .004, .03, m.chrome(), -.15, .935, .05);
	drum(prep, .13, .08, m.steel(), .35, .9, .05, 20);
	f.put(sinkTable(1.4), -1.25, atBack(.7), {
		w: 1.4,
		d: .7
	});
	f.put(hoodDishwasher(), -2.3, atBack(.74), {
		w: .66,
		d: .74
	});
	stock(f.put(wallShelf(2.6, .35, 1.7), -.6, Z0, { y: FLOOR }).userData.on, 2.4, .3, 1.72, "pots", r);
	const plates = f.put(rack(1.2, .45, 1.8, 5), 4.4, atBack(.45), {
		w: 1.2,
		d: .45
	});
	stock(plates, 1.15, .45, .17, "boxes", r);
	for (const y of plates.userData.shelves.slice(1)) for (let i = 0; i < 4; i++) drum(plates, .12, .09, m.white(), -.42 + i * .28, y, 0, 24);
	f.put(extinguisher(), 5.6, Z0, { y: 1.05 });
	f.put(uprightFridge(2), -1.7, atFront(.7), {
		ry: Math.PI,
		w: 1.4,
		d: .7
	});
	f.put(uprightFridge(1, true), -.6, atFront(.7), {
		ry: Math.PI,
		w: .7,
		d: .7
	});
	f.put(steelTable(1, .6), .55, atFront(.6), {
		ry: Math.PI,
		w: 1,
		d: .6
	});
	f.put(chestFreezer(), 4.55, atFront(.7), {
		ry: Math.PI,
		w: 1.3,
		d: .7
	});
	const px = -2.75;
	part(g, .08, 2.5500000000000003, .95, m.lining(), px, 1.425, Z0 + .475);
	part(g, .08, .4500000000000002, Z1 - Z0 - .95, m.lining(), px, 2.475, Z1 - (Z1 - Z0 - .95) / 2);
	f.block(-2.79, -2.71, Z0, Z0 + .95);
	unlit(sheet(g, .5, .12, plateMat("PANTRY", "#f4f1ea", "#7c3324"), -2.705, 2.3, Z0 + .5, Math.PI / 2));
	for (const [x, kind] of [[-3.45, "jars"], [-4.6, "tins"]]) {
		const s = f.put(rack(1.1, .5, 2.1, 5), x, atBack(.5), {
			w: 1.1,
			d: .5
		});
		s.userData.shelves.forEach((y, i) => stock(s, 1.05, .5, y, i === 0 ? "crates" : i === 4 ? "boxes" : i % 2 ? kind : "bottles", r));
	}
	const front = f.put(rack(1.5, .45, 2.1, 5), -5.15, atFront(.45), {
		ry: Math.PI,
		w: 1.5,
		d: .45
	});
	front.userData.shelves.forEach((y, i) => stock(front, 1.45, .45, y, i < 2 ? "crates" : i === 4 ? "boxes" : "jars", r));
	const pallet = f.put(new three.Group(), -5.58, -.35, {
		w: .8,
		d: 1.2
	});
	part(pallet, .8, .14, 1.2, m.pine(), 0, .07, 0);
	for (let k = 0; k < 3; k++) for (const sz of [-1, 1]) soft(pallet, .7, .16, .5, .07, m.sack(), 0, .22 + k * .17, sz * .27);
	unlit(sheet(g, .5, .12, plateMat("COLD · 4 °C", "#2a64a8", "#ffffff"), -1.7, 2.32, Z1 - .36, Math.PI));
//#piece 9fe4d7a5c3a57f0228d10a8b40c58e70009e318ff4e0c558cbf3c42584741b56
	id: "container-kitchen",
	label: "Kitchen container",
	note: "a 40' high cube (12.19 × 2.44 × 2.90 m) fitted as the crew's central kitchen: six-burner range under its hood, combi steamer, sinks, dishwasher, fridges and freezer, the serving hatch — and the pantry behind a partition. Walk in",
	usedIn: "Sandbox 1",
	make: () => kitchenContainer()
//#piece a805881158d711f214494d7a3f7d58187dc9573d69dbb10f5306b43780e85b80

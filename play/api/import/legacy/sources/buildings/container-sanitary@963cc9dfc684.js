//#piece 6c4bb9ac7fd9a7080956f629353b460a4edbed132ed5bfd2922c93d02491bdcd
//#region src/lib/models/bathroom.ts
const m$1 = /* @__PURE__ */ (() => ({
	porcelain: std("#f7f7f4", .22),
	chrome: std("#dadada", .15, { metalness: 1 }),
	white: std("#f4f4f1", .35)
}))();
/** A wall-hung WC: the bowl 36 × 54 cm, its seat at 42 cm, the white flush plate on the wall above it. */
function wallToilet() {
	const g = new three.Group();
	g.name = "wall-hung WC";
	const bowl = new three.Mesh(new three.SphereGeometry(1, 32, 16), m$1.porcelain());
	bowl.scale.set(.18, .16, .27);
	bowl.position.set(0, .3, .27);
	bowl.castShadow = true;
	g.add(bowl);
	const tank = new three.Mesh(new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(.36, .2, .12, 3, .04), m$1.porcelain());
	tank.position.set(0, .32, .06);
	g.add(tank);
	const seat = new three.Mesh(new three.TorusGeometry(1, .12, 8, 32), m$1.porcelain());
	seat.scale.set(.17, .25, .18);
	seat.rotation.x = Math.PI / 2;
	seat.position.set(0, .42, .29);
	g.add(seat);
	part(g, .25, .16, .012, m$1.white(), 0, 1.02, .006, false);
	return g;
}
/** A wall-hung basin, `w` wide and 42 cm deep, its rim at 85 cm, a chrome spout from the wall above it. */
function washbasin({ w = .6 } = {}) {
	const g = new three.Group();
	g.name = "washbasin";
	const basin = new three.Mesh(new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, .14, .42, 3, .02), m$1.porcelain());
	basin.position.set(0, .78, .21);
	basin.castShadow = true;
	g.add(basin);
	part(g, w - .08, .004, .32, std("#e8e8e4", .2)(), 0, .852, .22, false);
	bar(g, v3(0, 1, 0), v3(0, 1, .16), .012, m$1.chrome());
	const lever = new three.Mesh(new three.CylinderGeometry(.025, .025, .01, 16), m$1.chrome());
	lever.rotation.x = Math.PI / 2;
	lever.position.set(0, 1.1, .005);
	g.add(lever);
	return g;
}

//#endregion
//#piece 32599c99b93fd576369015e6d6650141015bd6c677c857792d27c0b3d3e6b837
//#piece 20da77d9ba699ab0ee7fde11ed2955529f0f4eba7a24af56e632076202bf6e25
	});
}
/** Floor tiles 30 cm square, grey grout: the sanitary container's floor. */
function tiles() {
	return canvasTexture("container-tiles", 256, 256, (x, r) => {
		x.fillStyle = "#8f9192";
		x.fillRect(0, 0, 256, 256);
		for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
			const v = 196 + Math.floor(r() * 14);
			x.fillStyle = `rgb(${v},${v},${v - 4})`;
			x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
		}
//#piece faf72741caaa5507f72265f531c4aaed768729c0e8f1302ef16b82c3ccb01c23
//#piece 31ee9d232982a4a3c3aaa7915346e823b2cdf91ae6949bbb45323ca07cbad122
/**
//#piece b1c7db080f571b64dbbc4e7a6493d08fb2a433bcb4de43c7dddbdacfefa997e1
/** A front-loading washing machine (or a tumble dryer), 60 × 60 × 85 cm, its round door. */
/** @param {boolean} dryer */
function frontLoader(dryer) {
	const g = new three.Group();
	part(g, .6, .85, .6, m.white(), 0, .425, 0);
	part(g, .6, .1, .012, m.grey(), 0, .78, .306);
	const ring = new three.Mesh(new three.TorusGeometry(.17, .03, 10, 32), m.grey());
	ring.position.set(0, .42, .31);
	g.add(ring);
	const door = new three.Mesh(new three.CircleGeometry(.15, 32), dryer ? m.white() : m.black());
	door.position.set(0, .42, .315);
	g.add(door);
	const knob = new three.Mesh(new three.CylinderGeometry(.025, .025, .02, 16), m.chrome());
	knob.rotation.x = Math.PI / 2;
	knob.position.set(.18, .78, .32);
	g.add(knob);
	unlit(part(g, .08, .03, .004, m.ledBlue(), 0, .78, .314));
	return g;
}
/** A dryer stacked on a washer in its frame: 60 × 62 × 175 cm. */
function laundryTower() {
	const g = new three.Group();
	g.add(frontLoader(false));
	const top = frontLoader(true);
	top.position.y = .88;
	g.add(top);
	part(g, .62, .03, .62, m.grey(), 0, .865, 0);
	return g;
}
/** A utility sink: a deep steel tub on legs, a tap. */
function utilitySink() {
	const g = steelTable(.6, .55, {
		h: .9,
		shelf: true,
		upstand: true
	});
	part(g, .5, .3, .45, m.steelDark(), 0, .75, .02);
	bar(g, v3(0, .95, -.24), v3(0, 1.25, -.24), .015, m.chrome());
	bar(g, v3(0, 1.25, -.24), v3(0, 1.22, -.05), .012, m.chrome());
	return g;
}
/** A heat-pump water heater: 300 litres, 0.65 m across, 1.9 m high, its fan unit on top. */
function heatPumpBoiler() {
	const g = new three.Group();
	drum(g, .32, 1.55, m.white(), 0, 0, 0, 32);
	drum(g, .3, .35, m.grey(), 0, 1.55, 0, 32);
	unlit(part(g, .12, .06, .004, m.ledBlue(), 0, 1.3, .322));
	bar(g, v3(-.1, .4, -.3), v3(-.1, 2.5000000000000004, -.3), .015, m.red());
	bar(g, v3(.1, .2, -.3), v3(.1, 2.5000000000000004, -.3), .015, m.blue());
	return g;
}
/** A shower: a white tray 0.9 m square, a rain head from the wall, a hand shower on its rail, the mixer. Its back at z 0. */
function showerSet() {
	const g = new three.Group();
	part(g, .9, .04, .9, m.white(), 0, .02, .45);
	part(g, .6, .006, .05, m.graphite(), 0, .043, .8);
	bar(g, v3(0, 2.05, .02), v3(0, 2.05, .35), .012, m.chrome());
	drum(g, .13, .012, m.chrome(), 0, 2.03, .35, 32);
	bar(g, v3(.3, .9, .03), v3(.3, 1.9, .03), .01, m.chrome());
	part(g, .04, .2, .04, m.chrome(), .3, 1.5, .06);
	part(g, .2, .06, .06, m.chrome(), 0, 1.05, .03);
	return g;
}
/** A dryer for hands on the wall, its back at z 0. */
function handDryer() {
	const g = new three.Group();
	soft(g, .3, .6, .2, .05, m.steel(), 0, 0, .1);
	part(g, .22, .03, .08, m.graphite(), 0, -.18, .18);
	return g;
}
/** An IBC tank: 1000 litres of rainwater in a white bottle inside a galvanised cage, on its pallet. */
function ibcTank() {
	const g = new three.Group();
	part(g, 1.2, .14, 1, m.galv(), 0, .07, 0);
	soft(g, 1.12, .95, .94, .06, std("#f2f0e6", .4, {
		transparent: true,
		opacity: .92
	})(), 0, .62, 0);
	for (let i = 0; i <= 4; i++) {
		const x = -.58 + i * .29;
		for (const sz of [-1, 1]) bar(g, v3(x, .14, sz * .5), v3(x, 1.12, sz * .5), .01, m.galv());
	}
	for (const y of [
		.4,
		.75,
		1.12
	]) for (const sz of [-1, 1]) bar(g, v3(-.6, y, sz * .5), v3(.6, y, sz * .5), .01, m.galv());
	drum(g, .08, .04, m.graphite(), 0, 1.1, 0);
//#piece beb6bca887886923a6b060ad8a954bcc592059e8846a1754dc04c8003b095b8f
* The sanitary container. From the open end: the laundry — two washing machines with dryers stacked on
* them, a utility sink, a folding table, the heat-pump water heater — then three washbasins under their mirrors, a bench
* and a hand dryer; then a corridor along the front past three toilets and three showers in their cubicles, frosted
* windows high over it and a door out at its end. Rainwater waits outside in a tank.
*/
function sanitaryContainer() {
	const b = box({
		name: "sanitary container",
		color: "#d8d2c4",
		floor: floorMaterial("#ffffff", tiles(), 1.2),
		lining: m.white(),
		label: "SANITARY",
		labelX: 3.6,
		front: [
			{
				u0: -5.85,
				u1: -4.95,
				y0: FLOOR,
				y1: 2.2,
				door: true
			},
			...[
				-4.3,
				-2.8,
				-1.3
			].map((x) => ({
				u0: x,
				u1: x + .8,
				y0: 1.9,
				y1: 2.45,
				glass: "frosted"
			})),
			{
				u0: .9,
				u1: 2.2,
				y0: 1.75,
				y1: 2.45,
				glass: "frosted"
			}
		]
	});
	const { g, solids } = b;
	const f = fitter(g, solids);
	const r = rng(5);
	unlit(sheet(g, .5, .18, plateMat("WC · SHOWERS", "#1f6f8b", "#ffffff"), -5.4, 2.45, W / 2 + .003));
	for (const x of [3, 3.65]) f.put(laundryTower(), x, atBack(.62), {
		w: .62,
		d: .62
	});
	f.put(utilitySink(), 4.35, atBack(.55), {
		w: .6,
		d: .55
	});
	stock(f.put(wallShelf(2, .3, 2.15, m.white()), 3.65, Z0, { y: FLOOR }).userData.on, 1.9, .26, 2.17, "bottles", r);
	f.put(heatPumpBoiler(), 5.45, Z0 + .4, {
		w: .65,
		d: .65
	});
	const fold = f.put(steelTable(1.6, .6, { upstand: false }), 3.6, atFront(.6), {
		ry: Math.PI,
		w: 1.6,
		d: .6
	});
	stock(fold, 1, .5, .92, "towels", r);
	stock(fold, 1.4, .5, .2, "towels", r);
	const basket = f.put(new three.Group(), 5, Z1 - .3, {
		w: .5,
		d: .4
	});
	part(basket, .5, .3, .38, std("#5f8fb0", .6)(), 0, .15, 0);
	soft(basket, .46, .08, .34, .03, m.cream(), 0, .31, 0);
	for (const x of [
		.9,
		1.6,
		2.3
	]) {
		f.put(washbasin(), x, Z0, { y: FLOOR });
		f.block(x - .3, x + .3, Z0, Z0 + .42);
		unlit(part(g, .55, .7, .01, m.mirror(), x, 1.5999999999999999, Z0 + .006));
		drum(g, .03, .14, m.white(), x + .2, 1.01, Z0 + .06, 10);
	}
	f.put(handDryer(), 2.5, Z1, {
		ry: Math.PI,
		y: 1.45
	});
	const bench = f.put(new three.Group(), 1.35, atFront(.35), {
		ry: Math.PI,
		w: 1.2,
		d: .35
	});
	part(bench, 1.2, .04, .35, m.beech(), 0, .45, 0);
	for (const sx of [-1, 1]) part(bench, .04, .43, .3, m.chrome(), sx * .55, .215, 0);
	for (let i = 0; i < 4; i++) {
		const x = .85 + i * .32;
		bar(g, v3(x, 1.75, Z1), v3(x, 1.77, Z1 - .06), .008, m.chrome());
		if (i % 2 === 0) soft(g, .22, .45, .04, .02, i ? std("#8fb3c4", .95)() : m.cream(), x, 1.5, Z1 - .06);
	}
	const zc = .13;
	const hpl = std("#7fa597", .5)();
	const edges = [
		.45,
		-.6,
		-1.65,
		-2.7,
		-3.8,
		-4.9,
		X0
	];
	/** a partition panel from x0 to x1, z0 to z1, raised off the floor @param {number} x0 @param {number} x1 @param {number} z0 @param {number} z1 */
	const panel = (x0, x1, z0, z1) => {
		part(g, Math.max(.025, x1 - x0), 1.88, Math.max(.025, z1 - z0), hpl, (x0 + x1) / 2, 1.21, (z0 + z1) / 2);
		f.block(Math.min(x0, x1 - .025), Math.max(x1, x0 + .025), Math.min(z0, z1 - .025), Math.max(z1, z0 + .025));
	};
	for (let i = 0; i < edges.length - 1; i++) {
		const xr = edges[i], xl = edges[i + 1], shower = i >= 3;
		if (i === 0) panel(xr - .0125, xr + .0125, Z0, zc);
		if (i < edges.length - 2) panel(xl - .0125, xl + .0125, Z0, zc);
		const dw = .7, d0 = xr - .05 - dw;
		panel(xl, d0, .11750000000000001, .14250000000000002);
		panel(xr - .05, xr, .11750000000000001, .14250000000000002);
		const leaf = new three.Group();
		leaf.position.set(xr - .05, .27, zc);
		leaf.rotation.y = -Math.PI / 2 + .1;
		g.add(leaf);
		part(leaf, dw, 1.88, .025, hpl, -.7 / 2, 1.88 / 2, 0);
		unlit(part(leaf, .04, .04, .004, m.ledGreen(), -.62, 1, .014));
		f.block(xr - .14, xr - .04, -.57, zc);
		const mid = (xl + xr) / 2;
		if (shower) {
			f.put(showerSet(), mid, Z0, { y: FLOOR });
			bar(g, v3(xl + .05, 2.05, -.12), v3(xl + .6, 2.05, -.12), .008, m.chrome());
			soft(g, .25, .5, .04, .02, m.white(), xl + .2, 1.75, -.12);
		} else {
			f.put(wallToilet(), mid, Z0, { y: FLOOR });
			f.block(mid - .2, mid + .2, Z0, Z0 + .6);
			drum(g, .05, .1, m.white(), xl + .08, .85, Z0 + .5).rotation.z = Math.PI / 2;
		}
		unlit(sheet(g, .16, .1, plateMat(shower ? "SHOWER" : "WC", "#ffffff", "#1f6f8b"), (xl + d0) / 2, 1.75, .14400000000000002));
	}
	f.put(ibcTank(), -L / 2 - .65, -.3, {
		ry: Math.PI / 2,
		w: 1.2,
		d: 1
	});
	bar(g, v3(-L / 2 - .65, 1.15, -.3), v3(-L / 2 - .65, 1.4, -.3), .025, m.grey());
	bar(g, v3(-L / 2 - .65, 1.4, -.3), v3(-L / 2, 1.4, -.3), .025, m.grey());
//#piece 9fe4d7a5c3a57f0228d10a8b40c58e70009e318ff4e0c558cbf3c42584741b56
	id: "container-sanitary",
	label: "Sanitary container",
	note: "washing machines and dryers, three washbasins, three showers and three toilets in cubicles, the hot-water heat pump; a rainwater tank outside. Walk in",
	usedIn: "Sandbox 1",
	make: () => sanitaryContainer()
//#piece a805881158d711f214494d7a3f7d58187dc9573d69dbb10f5306b43780e85b80

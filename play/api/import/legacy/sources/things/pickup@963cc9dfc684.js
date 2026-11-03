Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let three = require("three");
three = __toESM(three, 1);
let three_addons_geometries_RoundedBoxGeometry_js = require("three/addons/geometries/RoundedBoxGeometry.js");

//#region src/lib/models/parts.ts
const shared = (make) => {
	let v;
	return () => v ??= make();
};
const std = (color, roughness = .8, more = {}) => shared(() => new three.MeshStandardMaterial({
	color,
	roughness,
	...more
}));
/** A part: a box at its place, casting shadows (and catching them, unless `catches` is false). */
function part(g, w, h, d, m, x, y, z, catches = true) {
	const p = new three.Mesh(new three.BoxGeometry(w, h, d), m);
	p.position.set(x, y, z);
	p.castShadow = true;
	p.receiveShadow = catches;
	g.add(p);
	return p;
}
/** A soft part: a box with rounded edges (a mattress, a pillow, a seat). */
function soft(g, w, h, d, radius, m, x, y, z) {
	const p = new three.Mesh(new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 4, Math.min(radius, w / 2, h / 2, d / 2)), m);
	p.position.set(x, y, z);
	p.castShadow = p.receiveShadow = true;
	g.add(p);
	return p;
}
/** A round bar from a to b (a leg, a tube, a spindle). */
function bar(g, a, b, r0, m, r1 = r0) {
	const len = a.distanceTo(b);
	const p = new three.Mesh(new three.CylinderGeometry(r1, r0, len, 12), m);
	p.position.copy(a).add(b).multiplyScalar(.5);
	p.quaternion.setFromUnitVectors(new three.Vector3(0, 1, 0), b.clone().sub(a).normalize());
	p.castShadow = true;
	g.add(p);
	return p;
}
const v3 = (x, y, z) => new three.Vector3(x, y, z);

//#endregion
//#region src/lib/models/village.js
/** What each machine is, by the engine's asset id (COOPS.village): the Assets viewer's note, and the facts the game's asset card lists. */
const VILLAGE_INFO = {
	pickup: {
		model: "pickup",
		note: "a double-cab pickup, 5.33 × 1.86 m, 1.82 m high, a 3.1 m wheelbase: four doors, an open 1.55 m bed with a tool box and a jerrycan in it",
		specs: [
			["Size", "5.33 × 1.86 × 1.82 m"],
			["Seats", "5, a double cab"],
			["Payload", "about 1 t"],
			["Bed", "1.55 × 1.52 m, open"],
			["Fuel", "diesel, about 9 l per 100 km"],
			["Weight", "about 2.1 t"]
		]
	},
	powercube: {
		model: "electrocube",
		note: "the ElectroCube: our own cube on Open Source Ecology’s Power Cube frame (a 28 hp V-twin in a 27-inch steel frame) with a flat axial-flux generator on its shaft where the hydraulic pump would be, a power converter, breakers and sockets on the back, the same 27-inch size as every cube. Not an OSE design: its figures are inferred",
		specs: [
			["Size", "0.69 × 0.66 × 0.69 m"],
			["Power", "about 15 kW [inferred]"],
			["Output", "400 V three-phase, 2 × 230 V"],
			["Engine", "28 hp (20.9 kW) petrol V-twin"],
			["Fuel tank", "7 gal (26.5 l)"],
			["Design", "ours, on the OSE Power Cube VII frame"]
		]
	},
	solar: {
		model: "solar-panel",
		note: "one 1.72 × 1.13 m monocrystalline panel, about 410 W, on a galvanised ground rack tilted 30° to the sun, on ballast blocks",
		specs: [
			["Size", "1.72 × 1.13 m"],
			["Peak power", "about 410 W"],
			["Cells", "60 monocrystalline"],
			["Tilt", "30°, facing the sun"],
			["Yield", "about 1.4 kWh on a sunny day"],
			["Weight", "about 21 kg, on 4 ballast blocks"]
		]
	},
	battery: {
		model: "battery-pack",
		note: "the BatteryCube: the Power Cube’s 27-inch frame with no engine, four BatteryPacks of 280 cells each stacked to its top (about 20.7 kWh) and a 6 kW hybrid inverter on its back that turns their 52 V into 230 V and takes a solar panel straight in. Our design: its figures are inferred",
		specs: [
			["Size", "0.69 × 0.66 × 0.69 m"],
			["Capacity", "about 20.7 kWh, 4 BatteryPacks"],
			["Cells", "1,120 × 21700, 14S80P [inferred]"],
			["Power", "6 kW at 230 V, 12 kW peak"],
			["Solar in", "MPPT, up to 8 kWp"],
			["Weight", "about 140 kg"]
		]
	}
};
const m = /* @__PURE__ */ (() => ({
	paint: shared(() => new three.MeshStandardMaterial({
		color: "#3d6a8f",
		roughness: .35,
		metalness: .35
	})),
	glass: shared(() => new three.MeshStandardMaterial({
		color: "#1c2630",
		roughness: .08,
		metalness: .5
	})),
	tyre: std("#1f1f1f", .9),
	rim: std("#9a9ea2", .35, { metalness: .8 }),
	trim: std("#2a2c2e", .6),
	light: shared(() => new three.MeshStandardMaterial({
		color: "#f4f1e2",
		emissive: "#f4ecc8",
		emissiveIntensity: .5
	})),
	tail: shared(() => new three.MeshStandardMaterial({
		color: "#b3261e",
		emissive: "#7a140f",
		emissiveIntensity: .4
	})),
	bedliner: std("#2b2b2b", .95),
	jerry: std("#3f5a2a", .6),
	box: std("#b6b8b8", .35, { metalness: .75 }),
	genset: std("#d9a332", .5, { metalness: .2 }),
	skid: std("#3a3c3e", .55, { metalness: .4 }),
	louvre: std("#2d2f31", .7),
	steel: std("#8b8f92", .4, { metalness: .7 }),
	screen: shared(() => new three.MeshStandardMaterial({
		color: "#16303a",
		emissive: "#2c7f8f",
		emissiveIntensity: .6
	})),
	galv: std("#aeb3b5", .45, { metalness: .4 }),
	concrete: std("#b9b5ab", .95),
	cabinet: std("#ecebe6", .45, { metalness: .1 }),
	ok: shared(() => new three.MeshStandardMaterial({
		color: "#3fbf6a",
		emissive: "#3fbf6a",
		emissiveIntensity: .9
	})),
	warn: std("#f2c230", .5),
	cable: std("#161616", .7)
}))();
function wheel(g, x, z) {
	const w = new three.Group();
	const tyre = new three.Mesh(new three.CylinderGeometry(.39, .39, .27, 20), m.tyre());
	const rim = new three.Mesh(new three.CylinderGeometry(.22, .22, .28, 12), m.rim());
	tyre.castShadow = true;
	w.add(tyre, rim);
	w.rotation.z = Math.PI / 2;
	w.position.set(x, .39, z);
	g.add(w);
}
/** The pickup as at v1: one closed body under dark glass, nothing inside. */
function pickupV1() {
	const g = new three.Group();
	g.name = "pickup";
	for (const x of [-.8, .8]) for (const z of [-1.5, 1.6]) wheel(g, x, z);
	soft(g, 1.86, .62, 5.2, .12, m.paint(), 0, .82, 0);
	soft(g, 1.8, .16, .9, .06, m.paint(), 0, 1.16, 1.95);
	part(g, 1.78, .14, 2.3, m.paint(), 0, 1.2, .45);
	part(g, 1.72, .46, 2.2, m.glass(), 0, 1.5, .45);
	soft(g, 1.74, .1, 2.2, .04, m.paint(), 0, 1.77, .38);
	for (const z of [
		-.6,
		.45,
		1.5
	]) part(g, 1.76, .46, .08, m.paint(), 0, 1.5, z);
	part(g, 1.7, .04, 1.5, m.bedliner(), 0, 1.14, -1.8);
	for (const x of [-.89, .89]) part(g, .08, .42, 1.6, m.paint(), x, 1.34, -1.8);
	part(g, 1.86, .42, .08, m.paint(), 0, 1.34, -2.6);
	part(g, 1.6, .4, .4, m.box(), 0, 1.36, -.9);
	part(g, .17, .47, .35, m.jerry(), .6, 1.4, -2.2);
	part(g, 1.4, .3, .06, m.trim(), 0, .98, 2.6);
	part(g, 1.9, .18, .2, m.trim(), 0, .55, 2.62);
	part(g, 1.9, .16, .2, m.trim(), 0, .55, -2.62);
	for (const x of [-.72, .72]) {
		part(g, .3, .12, .05, m.light(), x, 1, 2.6);
		part(g, .08, .32, .05, m.tail(), x * 1.2, 1.28, -2.65);
		part(g, .06, .14, .2, m.trim(), x * 1.3, 1.45, 1.45);
	}
	for (const x of [-.93, .93]) for (const z of [.95, -.05]) part(g, .02, .03, .18, m.trim(), x, 1.12, z);
	return g;
}
/** where things are in the pickup (v2), in its own frame (+z ahead, its left +x, the ground at 0): the driver's and
*  the passenger's hip points on their seats, the cab's floor, the steering wheel's middle, the bed's floor and its
*  back edge (where the tailgate hinges), and how far the tailgate reaches when it is down */
const PICKUP = /* @__PURE__ */ (() => ({
	driver: v3(.42, .84, .62),
	passenger: v3(-.42, .84, .62),
	floor: .56,
	wheel: v3(.42, 1.2, 1.12),
	bed: 1.16,
	tailgate: -2.62,
	gate: .44,
	/** v3's four doors: which side (x of their outer face), and the z of their front edge (the hinge) and back edge */
	doors: {
		driver: {
			x: .93,
			front: 1.53,
			back: .47
		},
		passenger: {
			x: -.93,
			front: 1.53,
			back: .47
		},
		rearL: {
			x: .93,
			front: .43,
			back: -.6
		},
		rearR: {
			x: -.93,
			front: .43,
			back: -.6
		}
	}
}))();
/** how far a door opens (radians, about 70°) */
const DOOR_OPEN = /* @__PURE__ */ (() => 70 * Math.PI / 180)();
const cab = /* @__PURE__ */ (() => ({
	glass: shared(() => new three.MeshPhysicalMaterial({
		color: "#cfe2ea",
		roughness: .04,
		metalness: 0,
		transparent: true,
		opacity: .16,
		depthWrite: false,
		side: three.DoubleSide
	})),
	plastic: std("#2c2e31", .7),
	dash: std("#24262a", .55),
	seat: std("#3b3f45", .95),
	seatSide: std("#2a2d31", .9),
	lining: std("#8d8a84", .95),
	mat: std("#1b1c1d", .98),
	door: std("#4a4c50", .8),
	gauge: shared(() => new three.MeshStandardMaterial({
		color: "#0e1214",
		emissive: "#4a6f80",
		emissiveIntensity: .25,
		roughness: .4
	})),
	needle: shared(() => new three.MeshStandardMaterial({
		color: "#ff6a2a",
		emissive: "#ff6a2a",
		emissiveIntensity: .8
	})),
	chrome: std("#b8bcc0", .25, { metalness: .9 })
}))();
/** a seat: its cushion, its back raked, a headrest on two posts; at (x, z) on the floor, facing +z */
function seat(g, x, z, w, mat = cab.seat) {
	const s = new three.Group();
	soft(s, w, .13, .5, .05, mat, 0, .215, 0);
	soft(s, w * .75, .16, .4, .02, cab.plastic(), 0, .08, 0);
	const back = new three.Group();
	back.position.set(0, .24, -.24);
	back.rotation.x = -.28;
	soft(back, w, .62, .12, .05, mat, 0, .31, 0);
	for (const sx of [-1, 1]) soft(back, .06, .5, .14, .03, cab.seatSide(), sx * w / 2, .26, .01);
	if (w < .8) {
		for (const sx of [-1, 1]) bar(back, v3(sx * .06, .6, 0), v3(sx * .06, .7, 0), .006, cab.chrome());
		soft(back, .26, .17, .09, .04, mat, 0, .77, 0);
	} else for (const hx of [
		-w / 3,
		0,
		w / 3
	]) soft(back, .24, .15, .08, .04, mat, hx, .72, 0);
	s.add(back);
	s.position.set(x, PICKUP.floor, z);
	g.add(s);
	return s;
}
/** the steering wheel: a rim, three spokes, the hub and its pad; facing −z (the driver) and raked, on its column */
function steeringWheel(g) {
	const w = new three.Group();
	w.add(new three.Mesh(new three.TorusGeometry(.185, .016, 10, 48), cab.plastic()));
	const hub = new three.Mesh(new three.CylinderGeometry(.065, .075, .06, 20).rotateX(Math.PI / 2), cab.dash());
	w.add(hub);
	for (const a of [
		0,
		Math.PI,
		-Math.PI / 2
	]) {
		const sp = new three.Mesh(new three.BoxGeometry(.12, .03, .02), cab.plastic());
		sp.position.set(Math.cos(a) * .12, Math.sin(a) * .12, 0);
		sp.rotation.z = a;
		w.add(sp);
	}
	w.position.copy(PICKUP.wheel);
	w.rotation.x = .42;
	g.add(w);
	bar(g, PICKUP.wheel.clone().add(v3(0, -.03, .06)), v3(PICKUP.wheel.x, 1.06, 1.42), .03, cab.plastic(), .04);
}
/** The pickup: a double cab, 5.33 × 1.86 m, 1.82 m high, a 3.1 m wheelbase; four doors, an open 1.55 m bed with a
*  tool box and a jerrycan in it. v2 (2026-10-14): clear glass all round and the cab inside it, seen from inside —
*  two front seats and a bench behind, the dash with its gauges, screen and vents, the steering wheel on its column
*  on the left, pedals, a gear stick on the console, door cards, sun visors and a mirror; and a tailgate that opens
*  down flat (`tailgate`: 0 shut … 1 down; `userData.setTailgate(k)`). v3: four doors that open, each hinged at its
*  front edge and swinging out to about 70°, its window, card, armrest and handles going with it, sills under them
*  (`doors`: { driver, passenger, rearL, rearR } each 0 shut … 1 open; `userData.setDoor(name, k)`). Where its seats,
*  wheel, bed and doors are: PICKUP. */
function pickup({ v = 3, tailgate = 0, doors = {} } = {}) {
	if (v < 2) return pickupV1();
	const g = new three.Group();
	g.name = "pickup";
	for (const x of [-.8, .8]) for (const z of [-1.5, 1.6]) wheel(g, x, z);
	const F = PICKUP.floor;
	soft(g, 1.86, .62, 1.08, .12, m.paint(), 0, .82, 2.06);
	soft(g, 1.8, .16, .9, .06, m.paint(), 0, 1.16, 1.95);
	soft(g, 1.86, .62, 1.98, .12, m.paint(), 0, .82, -1.61);
	part(g, 1.78, .06, 2.22, m.trim(), 0, F - .03, .45);
	if (v < 3) for (const sx of [-1, 1]) {
		part(g, .05, .76, 2.22, m.paint(), sx * .905, .89, .45);
		part(g, .004, .6, .006, m.trim(), sx * .931, .92, -.06);
		for (const z of [.95, -.1]) part(g, .02, .03, .18, m.trim(), sx * .935, 1.12, z);
	}
	else for (const sx of [-1, 1]) {
		part(g, .06, .13, 2.17, m.trim(), sx * .9, .495, .455);
		part(g, .06, .72, .09, m.paint(), sx * .88, .92, .45);
	}
	part(g, 1.86, .76, .06, m.paint(), 0, .89, 1.55);
	part(g, 1.86, .79, .06, m.paint(), 0, .905, -.66);
	for (const sx of [-1, 1]) part(g, .26, .45, .06, m.paint(), sx * .8, 1.52, -.66);
	part(g, 1.86, .05, .06, m.paint(), 0, 1.74, -.66);
	soft(g, 1.76, .08, 1.96, .04, m.paint(), 0, 1.78, .27);
	part(g, 1.66, .012, 1.86, cab.lining(), 0, 1.733, .27);
	for (const sx of [-1, 1]) {
		bar(g, v3(sx * .88, 1.27, 1.54), v3(sx * .86, 1.75, 1.2), .035, m.paint());
		part(g, .06, .48, .09, m.paint(), sx * .88, 1.51, .45);
		part(g, .06, .48, .12, m.paint(), sx * .88, 1.51, -.6);
		if (v >= 3) continue;
		part(g, .05, .03, 2.2, m.paint(), sx * .89, 1.27, .45);
		const side = new three.Shape([
			[-.58, 1.285],
			[1.52, 1.285],
			[1.19, 1.735],
			[-.58, 1.735]
		].map(([z, y]) => new three.Vector2(z, y)));
		const pane = new three.Mesh(new three.ShapeGeometry(side), cab.glass());
		pane.rotation.y = -Math.PI / 2;
		pane.position.x = sx * .885;
		pane.renderOrder = 2;
		g.add(pane);
	}
	const screen = new three.Mesh(new three.PlaneGeometry(1.7, Math.hypot(.48, .36)), cab.glass());
	screen.position.set(0, 1.51, 1.37);
	screen.rotation.x = -Math.atan2(.36, .48);
	screen.renderOrder = 2;
	const back = new three.Mesh(new three.PlaneGeometry(1.34, .42), cab.glass());
	back.position.set(0, 1.52, -.66);
	back.renderOrder = 2;
	g.add(screen, back);
	part(g, 1.74, .5, .02, cab.plastic(), 0, F + .25, 1.51);
	part(g, 1.74, .58, .02, cab.plastic(), 0, F + .29, -.62);
	part(g, 1.72, .01, 2, cab.mat(), 0, F + .005, .5);
	soft(g, .26, .14, 1.9, .05, cab.mat(), 0, F + .07, .55);
	seat(g, PICKUP.driver.x, PICKUP.driver.z, .52);
	seat(g, PICKUP.passenger.x, PICKUP.passenger.z, .52);
	seat(g, 0, -.2, 1.62);
	soft(g, .24, .26, .62, .04, cab.plastic(), 0, F + .2, .88);
	bar(g, v3(0, F + .33, 1.05), v3(0, F + .47, 1), .008, cab.chrome());
	const knob = new three.Mesh(new three.SphereGeometry(.025, 14, 10), cab.dash());
	knob.position.set(0, F + .49, .995);
	g.add(knob);
	part(g, .03, .04, .2, cab.dash(), .05, F + .35, .72).rotation.x = -.3;
	soft(g, 1.74, .3, .36, .05, cab.dash(), 0, 1.14, 1.38);
	soft(g, 1.74, .06, .3, .03, cab.plastic(), 0, 1.3, 1.4).rotation.x = -.12;
	soft(g, .36, .09, .14, .035, cab.plastic(), PICKUP.driver.x, 1.31, 1.25);
	for (const dx of [-.075, .075]) {
		const face = new three.Mesh(new three.CircleGeometry(.05, 28), cab.gauge());
		face.position.set(PICKUP.driver.x + dx, 1.23, 1.198);
		face.rotation.y = Math.PI;
		const needle = new three.Mesh(new three.BoxGeometry(.004, .04, .002), cab.needle());
		needle.position.set(PICKUP.driver.x + dx, 1.24, 1.196);
		needle.rotation.z = dx > 0 ? -.7 : .5;
		g.add(face, needle);
	}
	const display = new three.Mesh(new three.PlaneGeometry(.2, .12), m.screen());
	display.position.set(0, 1.2, 1.196);
	display.rotation.y = Math.PI;
	g.add(display);
	for (const x of [
		-.7,
		-.16,
		.16,
		.7
	]) part(g, .1, .04, .01, m.louvre(), x, 1.25, 1.198);
	part(g, .4, .14, .01, cab.plastic(), PICKUP.passenger.x, 1.1, 1.198);
	steeringWheel(g);
	for (const [dx, w] of [
		[-.13, .05],
		[-.04, .08],
		[.08, .05]
	]) part(g, w, .07, .015, cab.dash(), PICKUP.driver.x + dx, F + .12, 1.42).rotation.x = -.4;
	for (const sx of [-1, 1]) {
		if (v < 3) for (const [z, len] of [[1, 1.05], [-.1, 1.05]]) {
			part(g, .02, .68, len, cab.door(), sx * .872, F + .35, z);
			part(g, .05, .03, .3, cab.plastic(), sx * .85, 1, z);
			part(g, .02, .025, .06, cab.chrome(), sx * .86, 1.12, z + .25);
		}
		part(g, .36, .015, .16, cab.lining(), sx * .42, 1.71, 1.12).rotation.x = .15;
	}
	/** @type {Record<string, THREE.Group>} */
	const hinged = {};
	if (v >= 3) for (const [name, d] of Object.entries(PICKUP.doors)) {
		const sx = Math.sign(d.x), L = d.front - d.back, front = name === "driver" || name === "passenger";
		const door = new three.Group();
		door.name = `door:${name}`;
		door.position.set(d.x, 0, d.front);
		part(door, .05, .71, L - .01, m.paint(), -sx * .025, .915, -L / 2);
		part(door, .05, .03, L - .01, m.paint(), -sx * .03, 1.27, -L / 2);
		part(door, .02, .03, .18, m.trim(), sx * .006, 1.12, -L + .17);
		const top = front ? -(d.front - 1.19) : 0;
		const pts = front ? [
			[-L + .02, 1.285],
			[-.01, 1.285],
			[top, 1.735],
			[-L + .02, 1.735]
		] : [
			[-L + .04, 1.285],
			[-.02, 1.285],
			[-.02, 1.735],
			[-L + .04, 1.735]
		];
		const pane = new three.Mesh(new three.ShapeGeometry(new three.Shape(pts.map(([z, y]) => new three.Vector2(z, y)))), cab.glass());
		pane.rotation.y = -Math.PI / 2;
		pane.position.x = -sx * .02;
		pane.renderOrder = 2;
		door.add(pane);
		const x = -sx * .02;
		bar(door, v3(x, 1.75, -L + .01), v3(x, 1.75, top), .015, m.paint());
		bar(door, v3(x, 1.27, -L + .01), v3(x, 1.75, -L + .01), .015, m.paint());
		bar(door, v3(x, 1.27, front ? -.01 : -.01), v3(x, 1.75, top), .015, m.paint());
		part(door, .02, .68, L - .06, cab.door(), -sx * .058, F + .35, -L / 2);
		part(door, .05, .03, .3, cab.plastic(), -sx * .08, 1, -L / 2);
		part(door, .02, .025, .06, cab.chrome(), -sx * .07, 1.12, -.25);
		if (front) part(door, .06, .14, .2, m.trim(), sx * .035, 1.45, -.1);
		g.add(door);
		hinged[name] = door;
	}
	/** open a door: `name` driver | passenger | rearL | rearR, `k` 0 shut … 1 open (about 70°, out from the body) */
	const setDoor = (name, k) => {
		const door = hinged[name];
		if (door) door.rotation.y = -Math.sign(PICKUP.doors[name].x) * DOOR_OPEN * Math.max(0, Math.min(1, k));
	};
	part(g, .22, .06, .02, cab.plastic(), 0, 1.62, 1.18);
	bar(g, v3(0, 1.65, 1.18), v3(0, 1.73, 1.2), .008, cab.plastic());
	part(g, 1.7, .04, 1.5, m.bedliner(), 0, 1.14, -1.8);
	for (const x of [-.89, .89]) part(g, .08, .42, 1.6, m.paint(), x, 1.34, -1.8);
	const gate = new three.Group();
	gate.name = "tailgate";
	gate.position.set(0, PICKUP.bed - .04, PICKUP.tailgate + .04);
	part(gate, 1.7, PICKUP.gate, .08, m.paint(), 0, PICKUP.gate / 2, 0);
	part(gate, 1.6, PICKUP.gate - .06, .01, m.bedliner(), 0, PICKUP.gate / 2, .045);
	part(gate, .2, .04, .02, m.trim(), 0, PICKUP.gate - .08, -.045);
	g.add(gate);
	part(g, 1.6, .4, .4, m.box(), 0, 1.36, -.9);
	part(g, .17, .47, .35, m.jerry(), .6, 1.4, -2.2);
	part(g, 1.4, .3, .06, m.trim(), 0, .98, 2.6);
	part(g, 1.9, .18, .2, m.trim(), 0, .55, 2.62);
	part(g, 1.9, .16, .2, m.trim(), 0, .55, -2.62);
	for (const x of [-.72, .72]) {
		part(g, .3, .12, .05, m.light(), x, 1, 2.6);
		part(g, .08, .32, .05, m.tail(), x * 1.2, 1.28, -2.65);
		if (v < 3) part(g, .06, .14, .2, m.trim(), x * 1.3, 1.45, 1.45);
	}
	const setTailgate = (k) => gate.rotation.x = -Math.PI / 2 * Math.max(0, Math.min(1, k));
	setTailgate(tailgate);
	for (const [name, k] of Object.entries(doors)) setDoor(name, k);
	g.userData = {
		tailgate: gate,
		setTailgate,
		doors: hinged,
		setDoor
	};
	return g;
}

//#endregion
//#region src/lib/app/versions.js
/** @typedef {{ v: number, date: string, note: string }} Change one version: its number, when, what changed */
/**
* @template B
* @typedef {Change & { build: B, kept: boolean }} Version a version and what builds it; `kept`: its own builder (the
*   latest's, or a frozen one), not the latest's standing in for one that was not kept
*/
/** The first version of everything: what every asset was when versions began. */
const FIRST = {
	v: 1,
	date: "2026-10-05",
	note: "First version"
};
/**
* An asset's versions, oldest first: its history, the latest built by `current`. A history lists every version; the
* ones before the latest bring their own (frozen) builders. With no history the asset is at v1.
* @template B
* @param {B} current the asset's builder today
* @param {(Change & { build?: B })[]} [history]
* @returns {Version<B>[]}
*/
function versionsOf(current, history = [FIRST]) {
	const sorted = [...history].sort((a, b) => a.v - b.v);
	return sorted.map((c, i) => {
		const latest = i === sorted.length - 1;
		return {
			v: c.v,
			date: c.date,
			note: c.note,
			build: latest ? current : c.build ?? current,
			kept: latest || c.build !== void 0
		};
	});
}
/** The latest version number. @param {{ v: number }[]} versions */
const latestOf = (versions) => versions[versions.length - 1]?.v ?? 1;
/**
* Every item of a list with its versions: `versions` from its `HISTORY` entry (by id) and its builder (`key`), and
* `version` its latest number.
* @template {{ id: string }} T
* @param {T[]} items @param {keyof T} key @param {Record<string, (Change & { build?: any })[]>} [history]
* @returns {(T & { versions: Version<any>[], version: number })[]}
*/
function versioned(items, key, history = {}) {
	return items.map((it) => {
		const versions = versionsOf(it[key], history[it.id]);
		return {
			...it,
			versions,
			version: latestOf(versions)
		};
	});
}

//#endregion
//#region src/lib/models/index.ts
/** the models' older versions, by id, each with its frozen builder (the rest are at v1) */
const HISTORY = /* @__PURE__ */ (() => ({ pickup: [
	{
		...FIRST,
		date: "2026-10-13",
		build: () => pickup({ v: 1 })
	},
	{
		v: 2,
		date: "2026-10-14",
		note: "Clear glass all round and the cab inside it, seen from inside: two front seats and a bench for three behind, the dash with two gauges under their hood, a screen and four vents, the steering wheel on its column on the left, three pedals, a gear stick and the handbrake on the console, door cards with their pulls, sun visors and the mirror; and a tailgate that opens down flat, level with the bed",
		build: () => pickup({ v: 2 })
	},
	{
		v: 3,
		date: "2026-10-14",
		note: "Four doors that open to get in: each hinged at its front edge and swinging out to about 70°, its window in its frame, its card, armrest and handles going with it; the outside mirrors on the front doors; sills under them"
	}
] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "pickup",
	label: "Pickup",
	note: `${VILLAGE_INFO.pickup.note}. The Village COOP’s`,
	usedIn: "MaiaCity V1",
	make: () => pickup()
}])();
const MODELS = /* @__PURE__ */ (() => versioned([...LIST], "make", HISTORY))();

//#endregion
//#region src/lib/assets/refs.js
/**
* The asset `id` at version `v` (its latest when not given), and a kind's variant (the one asked for, or its first), in a
* group's list: its item, its version and its builder. Undefined if there is no such asset, version or variant.
* @param {Item[]} list @param {string} id @param {number} [v] @param {string} [variant]
* @returns {{ item: Item, version: AnyVersion, build: any, kept: boolean } | undefined}
*/
function pick(list, id, v, variant) {
	const item = list.find((x) => x.id === id);
	const version = item && (v === void 0 ? item.versions[item.versions.length - 1] : item.versions.find((x) => x.v === v));
	if (!item || !version) return void 0;
	let build = version.build;
	if (Array.isArray(build) && build.every((x) => typeof x?.make === "function")) {
		build = (variant ? build.find((x) => x.id === variant) : build[0])?.make;
		if (!build) return void 0;
	} else if (variant) return void 0;
	return {
		item,
		version,
		build,
		kept: version.kept
	};
}

//#endregion
//#region src/lib/assets/recipe.js
/** @typedef {import('./groups.js').Item} Item @typedef {import('./groups.js').AnyVersion} AnyVersion */
/** @typedef {import('./card.js').Meta} Meta */
/** the keys of `o` that are set, as a fresh plain object */
const set = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
/**
* What a recipe says of the asset it builds: a kind's variant named (the one asked for, or its first), its label
* with the variant's, its note the variant's or the version's.
* @param {string} group @param {Item} item @param {AnyVersion} version @param {string} [variant]
* @returns {Meta}
*/
function metaOf(group, item, version, variant) {
	const v = Array.isArray(version.build) ? version.build.find((x) => x.id === (variant ?? version.build[0]?.id)) : null;
	return set({
		group,
		id: item.id,
		version: version.v,
		variant: variant ?? v?.id,
		label: v?.label ? `${item.label}: ${v.label}` : item.label,
		note: v?.note ?? version.note,
		params: item.params?.length ? JSON.parse(JSON.stringify(item.params)) : void 0
	});
}
/**
* The recipe of one asset in a group's list: what its file gives the engine. Throws when it has no builder of its own.
* @param {string} group @param {Item[]} list @param {string} id @param {number} v @param {string | null} [variant]
* @returns {{ meta: Meta, build: (...args: any[]) => any }}
*/
function recipeIn(group, list, id, v, variant) {
	const got = pick(list, id, v, variant ?? void 0);
	if (!got) throw new Error(`no asset ${group}/${id}@${v}${variant ? `:${variant}` : ""}`);
	if (!got.kept || typeof got.build !== "function") throw new Error(`${group}/${id}@${v}: no builder of its own`);
	return {
		meta: metaOf(group, got.item, got.version, variant ?? void 0),
		build: got.build
	};
}
/**
* Every recipe a group's list holds: each version that kept its builder, each variant of it.
* @param {Item[]} list @returns {{ id: string, v: number, variant: string | null }[]}
*/
function recipesIn(list) {
	/** @type {{ id: string, v: number, variant: string | null }[]} */
	const out = [];
	for (const item of list) for (const version of item.versions.filter((x) => x.kept)) if (Array.isArray(version.build)) for (const b of version.build) out.push({
		id: item.id,
		v: version.v,
		variant: b.id
	});
	else out.push({
		id: item.id,
		v: version.v,
		variant: null
	});
	return out;
}

//#endregion
//#region \0entry
const recipe = (id, v, variant) => recipeIn("things", MODELS, id, v, variant);
const list = () => recipesIn(MODELS);

//#endregion
exports.list = list;
exports.recipe = recipe;
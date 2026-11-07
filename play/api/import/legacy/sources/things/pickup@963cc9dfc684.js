//#piece f146fbf72edada4bfa3d771384d376a5fb3b6509729847bf501db8cd1674917d
//#piece 1fad81862bf595e11e35d09dd82eb51a8d3917092cf1748859fdf0fdc1e7d49d
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
//#piece b94919166bff991bd2e3e75a03e8822f20cac896bd615f7104fdc1951ce9a692
		part(g, .06, .14, .2, m.trim(), x * 1.3, 1.45, 1.45);
	}
	for (const x of [-.93, .93]) for (const z of [.95, -.05]) part(g, .02, .03, .18, m.trim(), x, 1.12, z);
	return g;
}
//#piece 7732a6dd4b40fde159d4c4127acee08a80dd235f5b371c52c024e12607fdabba
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
//#piece b94919166bff991bd2e3e75a03e8822f20cac896bd615f7104fdc1951ce9a692
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
//#piece c729b38b253f1abf985872fc0f824e9e23f518a8cc3f50841183a2676ff24549
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
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e

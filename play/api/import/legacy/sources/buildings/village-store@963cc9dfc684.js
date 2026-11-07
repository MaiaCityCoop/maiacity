//#piece f146fbf72edada4bfa3d771384d376a5fb3b6509729847bf501db8cd1674917d
//#piece 266c6394d3573f53dbf1fe1b42fc41a33d94bb86bd44d7f2eeaaaaab00accfba
const m$2 = /* @__PURE__ */ (() => ({
//#piece a0cde774154b00b7db657bc1ce342f40e48fed0ad288203cb310158caa19be20
	part(p, 1.72, .035, 1.13, m$2.galv(), 0, 0, 0);
//#piece 70ce7fc64284b554eac0a1ee9102c98d63456d40aadaf4f48d9e5ba58e9cfa70
	return p;
}

//#endregion
//#region src/lib/models/village.js
const m$1 = /* @__PURE__ */ (() => ({
//#piece ef971d9b5e8568f21475bbe774ac64910f49629e845392c432d3ae18be0806bb
/** The powercube: a diesel generator in a silenced cube, 2.2 m each way, about 60 kVA; a 500-litre tank in its skid, louvres each side, the control panel behind its front door, the exhaust up through its roof. */
function powercube() {
	const g = new three.Group();
	g.name = "powercube";
	part(g, 2.3, .3, 2.3, m$1.skid(), 0, .15, 0);
	soft(g, 2.2, 1.9, 2.2, .05, m$1.genset(), 0, 1.25, 0);
	for (const sx of [-1, 1]) for (let i = 0; i < 8; i++) part(g, .03, .06, 1.5, m$1.louvre(), sx * 1.11, .75 + i * .13, 0);
	part(g, .02, 1.6, .02, m$1.louvre(), 0, 1.25, 1.105);
	part(g, .5, .36, .03, m$1.screen(), -.5, 1.6, 1.11);
	for (const x of [-.12, .12]) part(g, .04, .22, .05, m$1.steel(), x, 1.3, 1.12);
	part(g, 1.6, .1, .03, m$1.louvre(), 0, 2, 1.11);
	bar(g, v3(.6, 2.2, -.6), v3(.6, 2.75, -.6), .075, m$1.steel());
	part(g, .22, .02, .22, m$1.steel(), .6, 2.78, -.6).rotation.x = .35;
	part(g, .14, .08, .14, m$1.louvre(), .9, .34, 1);
	for (const [x, z] of [
		[-.9, -.9],
		[-.9, .9],
		[.9, .9]
	]) bar(g, v3(x, 2.2, z), v3(x, 2.3, z), .04, m$1.steel());
	return g;
}
/** A solar row: n real panels side by side on their racks, 1.8 m apart, centred on the origin, along x. */
function solarRow(n = 6) {
	const g = new three.Group();
	g.name = "solar-row";
	for (let i = 0; i < n; i++) {
		const p = solarPanel();
		p.position.x = (i - (n - 1) / 2) * 1.8;
		g.add(p);
	}
	return g;
}
//#piece b10512ecda903f10c66e30aa2f061f47685ea738f4e21b2811a616c66ddfc429
		bar(g, v3(x, .1, front), v3(x, .47, front), .025, m$1.galv());
		bar(g, v3(x, .1, -front), v3(x, high - .03, -front), .025, m$1.galv());
		bar(g, v3(x, .12, front), v3(x, .12, -front), .02, m$1.galv());
		for (const z of [front, -front]) part(g, .3, .12, .3, m$1.concrete(), x, .06, z);
	}
	part(g, .12, .08, .05, m$1.trim(), 0, high - .12, -front + .08);
	bar(g, v3(0, high - .15, -front + .08), v3(0, .02, -front - .3), .012, m$1.cable());
	return g;
}
/** A big battery pack: an outdoor lithium iron phosphate cabinet, 1.3 × 1.1 m, 2.3 m high, about 230 kWh; two doors, vents, its status lights and screen, on a concrete plinth. */
function batteryPack() {
	const g = new three.Group();
	g.name = "battery-pack";
	part(g, 1.6, .15, 1.4, m$1.concrete(), 0, .075, 0);
	soft(g, 1.3, 2.3, 1.1, .03, m$1.cabinet(), 0, 1.3, 0);
	part(g, 1.36, .06, 1.16, m$1.cabinet(), 0, 2.48, 0);
	part(g, .015, 2, .02, m$1.trim(), 0, 1.3, .555);
	for (const x of [-.08, .08]) part(g, .03, .25, .04, m$1.steel(), x, 1.35, .57);
	part(g, .28, .18, .02, m$1.screen(), -.38, 1.8, .56);
	for (let i = 0; i < 4; i++) part(g, .04, .04, .02, m$1.ok(), .25 + i * .07, 1.85, .56);
	for (let i = 0; i < 6; i++) for (const x of [-.38, .38]) part(g, .4, .025, .02, m$1.louvre(), x, .4 + i * .06, .56);
	for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) part(g, .02, .03, .7, m$1.louvre(), sx * .655, 2 + i * .07, 0);
	const sign = new three.Mesh(new three.CircleGeometry(.09, 3), m$1.warn());
	sign.position.set(.38, 1.55, .565);
	sign.rotation.z = Math.PI / 2;
	g.add(sign);
	bar(g, v3(.5, .15, -.55), v3(.5, .02, -.9), .025, m$1.cable());
	return g;
}

//#endregion
//#region src/lib/models/wayside.js
const m = /* @__PURE__ */ (() => ({
//#piece 5a336f3e7c229536c1fb448a76aed44b41c85111e3d056c6b271fd28abd8b3aa
//#piece ae09d3d4474341d28e12ffd3ab133f55b0b24a50bfbf78964d9f299efd213aa6
	return g;
}
/** A place: the village store, the village centre's future storage area: the broken shed with the powercube inside,
*  and beside it the solar row and the big battery that still stand there. About 30 × 20 m. */
function villageStore({ withPowercube = true } = {}) {
	const g = new three.Group();
	g.name = "village-store";
	const shed = oldShed();
	g.add(shed);
	if (withPowercube) {
		const cube = powercube();
		cube.position.set(.6, .1, -.4);
		g.add(cube);
	}
	const solar = solarRow(6);
	solar.position.set(0, 0, -9);
	solar.rotation.y = Math.PI;
	const battery = batteryPack();
	battery.position.set(7, 0, -2);
	g.add(solar, battery);
//#piece 844380e3a4ea99bd12755544e70a85d5da6f40b258de1a1f2b89851ea6275878
	id: "village-store",
	label: "Village store",
	group: "Places",
	note: "the village centre's future storage area: the broken shed with the powercube inside, the solar row and the battery beside it. All the Village COOP's",
	usedIn: "MaiaCity V1",
	make: () => villageStore()
}])();
//#piece bc2f000888a03e3cbc16d5fcb09bcb5fe1b4711c42bea1627bce347b7b9dac7b

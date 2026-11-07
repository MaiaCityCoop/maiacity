//#piece 81829e5d1cbb30af4c6ae0489d431b1339c238d4cc026e2afcb1be1d1d8507c1
*/
//#piece bf5e0a1ce15777c1b1393acc123c91e82e2eff54a703290942afbd0857de062f
//#piece 417cd12c4b623a4e5bdef5f7b2dcbe91a42c4246bd426f44c1e0ed4d330cb9a5
//#piece 7083519d8371b44c4c8e464b2fc27651967c4b5aaa7a12e270ca262bd689aad3
}
/**
* The rabbit dome: wire all over, 5.2 m across and 1.6 m high, on grass, a small wooden dome inside to sleep in.
* @param {number} [seed] @returns {Space}
*/
function rabbitDome(seed = 4) {
	const r = seeded$1(seed);
	const g = new three.Group();
	const R = 2.6, O = .5;
	const shell = new three.Group();
	shell.position.z = O;
	dome(shell, R, 2, .62, .03, MAT.strut, () => MAT.wire);
	g.add(shell);
	floor(g, 2.5, MAT.grass, 0, O);
	const den = new three.Group();
	den.position.set(.6, 0, -.95);
	dome(den, .75, 1, .85, .02, MAT.strut, (c) => c.z > .45 && c.y < .4 && Math.abs(c.x) < .35 ? null : MAT.cedar);
	floor(den, .7, MAT.hay);
	g.add(den);
	const rack = new three.Group();
	rack.position.set(-1.1, 0, -.8);
	rack.rotation.y = -.6;
	for (const sx of [-.3, .3]) box(rack, .05, .6, .05, MAT.strut, sx, 0, 0);
	box(rack, .65, .22, .2, MAT.hay, 0, .32, 0);
	for (let k = 0; k < 6; k++) box(rack, .012, .26, .012, MAT.steel, -.27 + k * .11, .3, .1);
	g.add(rack);
	const bowl = new three.Mesh(new three.CylinderGeometry(.13, .1, .07, 14), MAT.steel);
	bowl.position.set(-1.5, .035, 1.4);
	g.add(bowl);
	const tunnel = new three.Mesh(new three.CylinderGeometry(.2, .2, .8, 14, 1, true), new three.MeshStandardMaterial({
		color: "#7a5a3c",
		roughness: .95,
		side: three.DoubleSide
	}));
	tunnel.rotation.z = Math.PI / 2;
	tunnel.rotation.y = .5 + r() * .4;
	tunnel.position.set(1.1, .17, 1.4);
	g.add(tunnel);
	for (const sx of [-.35, .35]) box(g, .06, 1.05, .06, MAT.strut, sx, 0, 2.75);
	box(g, .76, .06, .06, MAT.strut, 0, 1.05, 2.75);
//#piece c37428d57beb4714191d4173b23496625d7ffe96d143d6ab5d926f37eda1996c
/**
* A rabbit hutch, as big as a coop and laid out like one: a two-room timber hutch up on legs at the back — a wire-
* fronted room to sit in the light, a closed one to sleep in, a felt roof sloping back — a ramp down, and in front a
* run walled and roofed with wire against foxes and hawks: grass, a hay rack, a water bowl, a log tunnel to hide in
* (the rabbits are in animals.ts).
*/
function hutch(k, seed) {
	const g = new three.Group();
	const r = seeded(seed);
	const felt = col("#4a4a48", .95);
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(k.box(.1, .55, .1, k.timber, sx * .95, 0, -1.2 + sz * .45));
	g.add(k.box(2.1, .06, 1.05, k.oak, 0, .55, -1.2));
	g.add(k.box(2.1, .75, .06, k.oak, 0, .61, -1.7));
	for (const x of [
		-1.02,
		.3,
		1.02
	]) g.add(k.box(.06, .75, 1.05, k.oak, x, .61, -1.2));
	g.add(k.box(.7, .66, .05, k.oak, .66, .65, -.68));
	g.add(k.box(.04, .04, .04, k.steel, .4, .98, -.65));
	const wire = new three.MeshStandardMaterial({
		color: "#b9bcb4",
		transparent: true,
		opacity: .12,
		side: three.DoubleSide,
		depthWrite: false,
		roughness: .6
	});
	const front = new three.Mesh(new three.PlaneGeometry(1.3, .66), wire);
	front.position.set(-.36, .98, -.68);
	g.add(front);
	g.add(k.box(1.36, .05, .06, k.timber, -.36, 1.33, -.68), k.box(1.36, .05, .06, k.timber, -.36, .62, -.68));
	const roof = k.box(2.4, .05, 1.35, felt, 0, 0, 0);
	roof.position.set(0, 1.42, -1.2);
	roof.rotation.x = .16;
	g.add(roof);
	const ramp = k.box(.35, .03, .9, k.timber, 0, 0, 0);
	ramp.position.set(-.55, .32, -.25);
	ramp.rotation.x = .62;
	g.add(ramp);
	const w = 5, d = 4, h = .9;
	for (const [x, z] of [
		[-5 / 2, -2],
		[w / 2, -2],
		[-5 / 2, d / 2],
		[w / 2, d / 2],
		[0, d / 2],
		[-5 / 2, 0],
		[w / 2, 0]
	]) g.add(k.box(.08, h, .08, k.timber, x, 0, z));
//#piece 6af761ed874a400c57baeaa2997349425f16ca3a377a60f370f063c35118207f
		g.add(k.box(len, .06, .06, k.timber, x, h, z, rot));
		const net = new three.Mesh(new three.PlaneGeometry(len, h), wire);
		net.position.set(x, h / 2, z);
		net.rotation.y = rot;
		g.add(net);
	}
	const top = new three.Mesh(new three.PlaneGeometry(w, d), wire);
	top.rotation.x = -Math.PI / 2;
	top.position.y = .93;
	g.add(top);
	for (const z of [
		-1,
		0,
		1
	]) g.add(k.box(w, .04, .04, k.timber, 0, .93, z));
	const grass = new three.Mesh(new three.PlaneGeometry(4.9, 3.9), col("#7f9a52", 1));
	grass.rotation.x = -Math.PI / 2;
	grass.position.y = .03;
	g.add(grass);
	g.add(k.box(.6, .35, .18, k.timber, 1.4, .2, -1.55));
	g.add(k.box(.52, .12, .14, col("#d8c38a", 1), 1.4, .48, -1.55));
	const bowl = new three.Mesh(new three.CylinderGeometry(.13, .1, .07, 14), k.steel);
	bowl.position.set(-1.7, .035, 1.3);
	g.add(bowl);
	const tunnel = new three.Mesh(new three.CylinderGeometry(.2, .2, .8, 14, 1, true), col("#7a5a3c", .95));
	tunnel.material.side = three.DoubleSide;
	tunnel.rotation.z = Math.PI / 2;
	tunnel.rotation.y = .5 + r() * .4;
	tunnel.position.set(1.2, .17, 1);
	g.add(tunnel);
//#piece f4ca227df7487b72a8540984e6c2be04300603840781efbeaace7f0479e99a3a
/** the timber rabbit hutch and its run (the rabbit hutch's v1) */
const timberHutch = () => hutch(plainKit(), 4).group;
//#piece f347d8d92ac76e2bfa2365f673533d63dcd9d7d1acdb46c079f719e4561b5b9e
//#piece a82d348033c0e2e5c29e2c2f5ba33bbf468baf2d5afc2fc78837317361b6a78f
const HISTORY = /* @__PURE__ */ (() => ({ "rabbit-hutch": [{
	...FIRST,
	build: timberHutch
}, {
	v: 2,
	date: "2026-10-06",
	note: "A mini geodesic dome of wire on grass, a little shingled dome inside to sleep in"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "rabbit-hutch",
	label: "Rabbit hutch",
	note: "a mini geodesic dome of wire against foxes and hawks, 5.2 m across and 1.6 m high, on grass: a little shingled dome to sleep in, a hay rack, a water bowl, a hollow log to hide in",
	usedIn: "Sandbox 4",
	make: () => rabbitDome().group
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e

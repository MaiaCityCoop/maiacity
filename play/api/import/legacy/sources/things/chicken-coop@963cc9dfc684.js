//#piece 81829e5d1cbb30af4c6ae0489d431b1339c238d4cc026e2afcb1be1d1d8507c1
//#piece 93c53f72cab935027802111d5a88b3d3800f0e65f5ec5ea869650a506edc8dd9
function log(g, a, b, r, mat = MAT.log) {
//#piece a2cd9ec3a84d2dd055a3070228718984b66eea8c9e649d529072e622ed272efd
	g.add(m);
	return m;
}
const v = (x, y, z) => new three.Vector3(x, y, z);
//#piece 7083519d8371b44c4c8e464b2fc27651967c4b5aaa7a12e270ca262bd689aad3
}
/** An egg, 5.7 cm long, lying on its side. */
const EGG = /* @__PURE__ */ (() => new three.SphereGeometry(.022, 10, 8).scale(1, 1, 1.3))();
function egg(g, x, y, z, r) {
	const e = new three.Mesh(EGG, r() < .45 ? MAT.brownEgg : MAT.egg);
	e.position.set(x, y + .021, z);
	e.rotation.set((r() - .5) * .3, r() * Math.PI * 2, 0);
	e.castShadow = true;
	g.add(e);
}
/**
* The hen dome: a timber geodesic dome 5.6 m across, 2.3 m high, the hens' house at its back (-z), their run under
* its clear panels toward +z; the nests with eggs in them.
* @param {number} [seed] @returns {Space}
*/
function henDome(seed = 3) {
	const r = seeded$1(seed);
	const g = new three.Group();
	const R = 2.8, O = .5;
	const shell = new three.Group();
	shell.position.z = O;
	dome(shell, R, 2, .82, .035, MAT.strut, (c) => c.z < -2.8 * .1 && c.y > R * .06 ? MAT.shingle : c.y < R * .42 ? MAT.wire : MAT.clear);
	g.add(shell);
	for (const sx of [-.42, .42]) box(g, .07, 1.6, .07, MAT.strut, sx, 0, 3.05);
	box(g, .9, .07, .07, MAT.strut, 0, 1.6, 3.05);
	floor(g, 2.6799999999999997, MAT.straw, 0, O);
	for (const sx of [-.55, .55]) log(g, v(sx, 0, -.7), v(sx, 1.55, -1.5499999999999998), .035, MAT.darkLog);
	for (let k = 0; k < 4; k++) {
		const u = (k + .6) / 4.4;
		log(g, v(-.6, u * 1.55, -.7 - u * .85), v(.6, u * 1.55, -.7 - u * .85), .025, MAT.log);
	}
	const nests = new three.Group();
	nests.position.set(-1.35, 0, -1.25);
	nests.rotation.y = .55;
	box(nests, 1.2, .08, .42, MAT.cedar, 0, .42, 0);
	box(nests, 1.2, .36, .04, MAT.cedar, 0, .5, -.19);
	box(nests, 1.2, .05, .46, MAT.shingle, 0, .88, -.02);
	for (const x of [
		-.6,
		-.2,
		.2,
		.6
	]) box(nests, .03, .36, .42, MAT.cedar, x, .5, 0);
	box(nests, 1.2, .07, .03, MAT.cedar, 0, .5, .2);
	for (const sx of [-.55, .55]) box(nests, .06, .42, .06, MAT.strut, sx, 0, .12);
	for (const x of [
		-.4,
		0,
		.4
	]) {
		box(nests, .34, .05, .36, MAT.hay, x, .5, 0);
		const n = 1 + Math.floor(r() * 3);
		for (let e = 0; e < n; e++) egg(nests, x + (r() - .5) * .16, .55, (r() - .5) * .14, r);
	}
	g.add(nests);
	for (let e = 0; e < 2; e++) egg(g, -1.7 + r() * .6, .03, -.09999999999999998 + r() * .6, r);
	const drum = new three.Mesh(new three.CylinderGeometry(.16, .16, .35, 16), MAT.steel);
	drum.position.set(1.05, .42, .2);
	g.add(drum);
	const pan = new three.Mesh(new three.CylinderGeometry(.26, .22, .05, 18), MAT.steel);
	pan.position.set(1.05, .22, .2);
	g.add(pan);
	log(g, v(1.05, .6, .2), v(1.05, 1.9, .2), .006, MAT.steel);
	box(g, .8, .14, .24, MAT.steel, .9, 0, 1.9, .4);
//#piece c37428d57beb4714191d4173b23496625d7ffe96d143d6ab5d926f37eda1996c
//#piece 8bd1e2620f7532af81c35ebf163959c7db72374080322a3ddc6ef4869826c527
/** A coop: a timber henhouse on legs, a ramp down, and a fenced run (the hens are in animals.ts). */
function coop(k, seed) {
	const g = new three.Group();
	seeded(seed);
	const roofMat = awnings[seed % 2 ? 0 : 1];
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(k.box(.1, .6, .1, k.timber, sx * .85, 0, -1.2 + sz * .6));
	g.add(k.box(1.9, 1, 1.4, k.oak, 0, .6, -1.2));
	for (const side of [-1, 1]) {
		const roof = k.box(2.2, .06, 1, roofMat, 0, 0, 0);
		roof.position.set(0, 1.85, -1.2 + side * .38);
		roof.rotation.x = side * .6;
		g.add(roof);
	}
	g.add(k.box(.35, .4, .04, k.dark, .4, .75, -.48));
	g.add(k.box(.5, .45, 1.1, k.oak, 1.2, .8, -1.2));
	const ramp = k.box(.35, .03, 1, k.timber, .4, 0, 0);
	ramp.position.set(.4, .38, -.05);
	ramp.rotation.x = .62;
	g.add(ramp);
	const mesh = new three.MeshStandardMaterial({
		color: "#c9ccc4",
		transparent: true,
		opacity: .22,
		side: three.DoubleSide,
		depthWrite: false,
		roughness: .6
	});
	const w = 5, d = 4;
	for (const [x, z] of [
		[-5 / 2, -2],
		[w / 2, -2],
		[-5 / 2, d / 2],
		[w / 2, d / 2],
		[0, d / 2],
		[-5 / 2, 0],
		[w / 2, 0]
	]) g.add(k.box(.08, 1.2, .08, k.timber, x, 0, z));
//#piece 6af761ed874a400c57baeaa2997349425f16ca3a377a60f370f063c35118207f
		g.add(k.box(len, .06, .06, k.timber, x, 1.2, z, rot));
		const net = new three.Mesh(new three.PlaneGeometry(len, 1.2), mesh);
		net.position.set(x, .6, z);
		net.rotation.y = rot;
		g.add(net);
	}
	const straw = new three.Mesh(new three.PlaneGeometry(4.9, 3.9), col("#d8c38a", 1));
	straw.rotation.x = -Math.PI / 2;
	straw.position.y = .035;
	g.add(straw);
	g.add(k.box(.8, .15, .25, k.steel, -1.6, 0, 1.4));
//#piece f4ca227df7487b72a8540984e6c2be04300603840781efbeaace7f0479e99a3a
/** the timber henhouse and its run, as Sandbox 3 and 4 have it (the chicken coop's v1) */
const timberCoop = () => coop(plainKit(), 3).group;
//#piece f347d8d92ac76e2bfa2365f673533d63dcd9d7d1acdb46c079f719e4561b5b9e
//#piece a82d348033c0e2e5c29e2c2f5ba33bbf468baf2d5afc2fc78837317361b6a78f
const HISTORY = /* @__PURE__ */ (() => ({ "chicken-coop": [{
	...FIRST,
	build: timberCoop
}, {
	v: 2,
	date: "2026-10-06",
	note: "A mini geodesic dome: wire round its foot, clear over the run, a shingled back to roost in; perches, three nesting boxes with eggs in them"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "chicken-coop",
	label: "Chicken coop",
	note: "a mini geodesic dome of timber struts, 5.6 m across and 2.3 m high: wire round its foot, clear panels over the run, a cedar-shingled back where the hens roost; a ladder of perches, three nesting boxes on hay with the day’s eggs, a feeder and a water trough",
	usedIn: "Sandbox 4",
	make: () => henDome().group
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e

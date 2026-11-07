//#piece 49104d7457fe163f981b9e640a6f5937ff462c21b647214f4fdbb33127b7afea
const v3 = (x, y, z) => new three.Vector3(x, y, z);

//#endregion
//#region src/lib/models/village.js
const m = /* @__PURE__ */ (() => ({
//#piece ef971d9b5e8568f21475bbe774ac64910f49629e845392c432d3ae18be0806bb
//#piece 7732a6dd4b40fde159d4c4127acee08a80dd235f5b371c52c024e12607fdabba
/** the ramp's measures: from the ground up to the bed's floor (1.16 m) over 2 m, 0.86 m wide between its rails */
const RAMP = /* @__PURE__ */ (() => ({
	rise: PICKUP.bed,
	run: 2,
	w: .86
}))();
/** A loading ramp: one folding aluminium ramp, 0.86 m wide between two side rails, its deck crossed with grip bars
*  every 10 cm, a hinged lip at the top to rest on the bed and rubber feet at the bottom, rising 1.16 m over 2 m
*  (30°). Its origin is its foot, on the ground; it rises towards +z to its lip at (0, 1.16, 2.0): set it behind a
*  pickup facing the same way, its lip on the bed's back edge (PICKUP.tailgate, or the tailgate's end when it is
*  down). */
function loadingRamp() {
	const g = new three.Group();
	g.name = "loading-ramp";
	const { rise, run, w } = RAMP;
	const len = Math.hypot(rise, run), a = Math.atan2(rise, run);
	const deck = new three.Group();
	deck.rotation.x = -a;
	part(deck, w, .006, len - .12, m.galv(), 0, .03, len / 2);
	for (const sx of [-1, 1]) {
		part(deck, .04, .09, len, m.galv(), sx * (w / 2 + .02), .045, len / 2);
		part(deck, .045, .012, len, m.steel(), sx * (w / 2 + .02), .095, len / 2);
	}
	for (let z = .1; z < len - .1; z += .1) part(deck, w, .012, .014, m.steel(), 0, .039, z);
	for (const z of [len * .33, len * .66]) part(deck, w, .04, .03, m.galv(), 0, .012, z);
	const lip = new three.Group();
	lip.position.set(0, .03, len);
	lip.rotation.x = a;
	part(lip, w + .08, .008, .14, m.galv(), 0, 0, .07);
	deck.add(lip);
	for (const sx of [-1, 1]) part(deck, .06, .03, .08, m.cable(), sx * (w / 2 + .02), 0, .03);
	deck.position.y = -.03 * Math.cos(a);
	g.add(deck);
	g.traverse((o) => o.isMesh && (o.castShadow = true));
//#piece 6cdc5762c73bb286f714fbc6acd254fa986c6b14ef152c0e519354fa53a2303f
	id: "loading-ramp",
	label: "Loading ramp",
	note: "one folding aluminium ramp, 0.86 m wide between its rails, grip bars every 10 cm, a lip to lie on the bed: up 1.16 m over 2 m, from the ground to the pickup’s bed",
	usedIn: "MaiaCity V1",
	make: () => loadingRamp()
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e

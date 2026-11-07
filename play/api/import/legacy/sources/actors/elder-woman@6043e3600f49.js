//#piece 497d33a67474703f700a6454cc51374b1f92673ef06e06871d4f085d1a6b2778

//#piece 980f9c4401ab1127f2dc61af465af4d4c529f6b41daf49b3a97216df42a8ef59
//#piece d2c455529c8c40339e8d6a6a56cd4f0d766db9c285eb3d642894ff0906f90c6a
//#piece 488b9bd536935688f4182ee7352ce913ce7b9a913b2a8cf986cb007bb20e4d1b
//#piece bab9adf554de9c132470ee884e1972fa099ddd2d1b17f33332668a1c3c161855
const JAW = [
	[-.12, 1.565],
	[-.03, 1.565],
	[-.015, 1.59],
	[.01, 1.595],
	[.03, 1.572],
	[.05, 1.553],
	[.15, 1.55]
];
const jawAt = (z) => {
	if (z <= JAW[0][0]) return JAW[0][1];
	for (let k = 1; k < JAW.length; k++) if (z <= JAW[k][0]) return JAW[k - 1][1] + (z - JAW[k - 1][0]) / (JAW[k][0] - JAW[k - 1][0]) * (JAW[k][1] - JAW[k - 1][1]);
	return JAW[JAW.length - 1][1];
//#piece 4be7bd7380140d917add06876bf25bf5fede63a6417ba96a14b01a00a12c3bd7
	out.push(...lashes(h, kind), ...brows(h, k.brows, k.skin, kind), ...hair(h, k));
//#piece a063d2dd6b67729acfa82430fa8840ab7ddfb32a9d65c7f0175b566bca204ee4
function hair(h, k) {
//#piece 8aff24b2d9ee91011369cda0944bbab6a017182c93e1c76a7c1dc8a22e16bd52
const HEIGHT = 1.7;
/** the height its measures below are for: the top of its head (a man's), as built for a person of 1.80 m */
const MEASURED = /* @__PURE__ */ (() => crownOf("man"))();
/** the edge it sits on (a bed's, a chair's), m */
const SEAT = .5;
const LOOK = {
//#piece 2e053366df8c110e6f71956afb57fb0425a5f7b007e7241b251a4aa959525442
	lips: "#a8665a",
	face: "man"
};
//#piece b2de13a7d6fd81be5fdf4827029e34bf8b940feeb20e3264f58c908a53e71121
//#piece 0c827e26630d74cd9228ebe1df8427b70f39305c39cc23dbe418e806103115df
function parts(k, v) {
//#piece 64c6668d96fa7c528a0d08a204173cc5094f45d32b063bc6bd876d6412df4ee9
		...sides.flatMap(([s, x]) => [
//#piece 06447f9dbdc967f9504da010014ee0af8f838af8ef903a1224e61eed320c5ec0
function scaled(s, k, v) {
	const m = (v) => [
		v[0] * s,
		v[1] * s,
		v[2] * s
	];
	return {
		bones: BONES.map((b) => ({
			...b,
			at: m(b.at)
		})),
		parts: parts(k, v).map((p) => ({
//#piece cb49bb51bf51b3e0758cc9482da67d035b9c58ffd575c2af623b8a48b982348e
//#piece 4a259cace8484c2abff57f1f1a41035845ad745aa35fb13c7e34175ae32f9794
//#piece 4a917c2e5c1e2b4f3675f9b86b61add160fa51efc0cfc064c26c6f9922dae624
function human(look = {}, height = HEIGHT, v = 10) {
	const k = {
		...LOOK,
		...look
	};
	const s = height / crownOf(k.face);
	const { bones, parts: body } = scaled(s, k, v);
	const r = rig(bones, body, [
		skin(.74),
		skin(.12),
		skin(.85, { side: three.DoubleSide }),
		CATCHLIGHT()
	]);
	r.object.name = "stand-in";
//#piece 9d3e9270b515b96f2ed9ee34f33eae4e172cbf22e5871dca3b78f6b33153d4f9
//#region src/lib/actors/elder-woman.js
/** @type {Parameters<typeof human>[0]} */
const ELDER_LOOK = {
	face: "woman",
	skin: "#ead1bb",
	hair: "bun",
	hairColour: "#ded3b1",
	brows: "#b7aa8c",
	iris: "#73909a",
	lips: "#ae8079",
	shirt: "#71965b",
	trousers: "#59544d"
};
function elderWoman() {
	const cast = human(ELDER_LOOK, 1.64, 10);
	cast.rig.object.traverse((o) => {
		const g = o.geometry, p = g?.getAttribute("position"), c = g?.getAttribute("color"), n = g?.getAttribute("normal");
		if (!p || !c || !n) return;
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i), y = p.getY(i);
			if (p.getZ(i) < .025 || n.getZ(i) < .4 || Math.abs(x) > .065 || y < 1.43 || y > 1.59) continue;
			const forehead = Math.exp(-Math.pow((y - 1.56) / .002, 2)) + .7 * Math.exp(-Math.pow((y - 1.575) / .002, 2));
			const cheek = Math.exp(-Math.pow((Math.abs(x) - (.025 + (1.5 - y) * .45)) / .002, 2)) * Math.exp(-Math.pow((y - 1.48) / .025, 2));
			const shade = 1 - Math.min(.15, .1 * forehead + .08 * cheek);
			c.setXYZ(i, c.getX(i) * shade, c.getY(i) * shade, c.getZ(i) * shade);
		}
		c.needsUpdate = true;
	});
	return cast;
//#piece ca817ec2fc9fe61368a8ac2881e9d0bc88dff98689106955be77984b53ea44af
//#region src/lib/actors/index.ts
/** the kinds' older versions, by id, each with its frozen variants (the rest are at v1) */
const HISTORY = /* @__PURE__ */ (() => ({}))();
const LIST = /* @__PURE__ */ (() => [{
	id: "elder-woman",
	label: "Elder woman",
	note: "An older white woman, silver-blonde hair in a bun, a friendly gaze; 1.64 m",
	from: "MaiaCity V2",
	variants: [{
		id: "elder-woman",
		label: "Third settler",
		note: "Trailer 3",
		make: elderWoman
	}]
//#piece d154497429959619d3c0ac3645c575d8b5f1cbae64bbf97db523f3a1a0587006

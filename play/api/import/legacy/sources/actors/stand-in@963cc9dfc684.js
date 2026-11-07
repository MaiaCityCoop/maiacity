//#piece c13f7b18f4effb2aa2fd97fb04ca6ccf54408f5e43b765a9b616498ca2292886
//#piece 980f9c4401ab1127f2dc61af465af4d4c529f6b41daf49b3a97216df42a8ef59
//#piece d2c455529c8c40339e8d6a6a56cd4f0d766db9c285eb3d642894ff0906f90c6a
//#piece 756af81992b2eec8c0c165c6dc1be4de43ced3bb7a7e2722fa65f92fbb94e03c
//#piece bab9adf554de9c132470ee884e1972fa099ddd2d1b17f33332668a1c3c161855
const JAW$1 = [
	[-.12, 1.565],
	[-.03, 1.565],
	[-.015, 1.59],
	[.01, 1.595],
	[.03, 1.572],
	[.05, 1.553],
	[.15, 1.55]
];
const jawAt = (z) => {
	if (z <= JAW$1[0][0]) return JAW$1[0][1];
	for (let k = 1; k < JAW$1.length; k++) if (z <= JAW$1[k][0]) return JAW$1[k - 1][1] + (z - JAW$1[k - 1][0]) / (JAW$1[k][0] - JAW$1[k - 1][0]) * (JAW$1[k][1] - JAW$1[k - 1][1]);
	return JAW$1[JAW$1.length - 1][1];
//#piece 4be7bd7380140d917add06876bf25bf5fede63a6417ba96a14b01a00a12c3bd7
	out.push(...lashes(h, kind), ...brows(h, k.brows, k.skin, kind), ...hair$4(h, k));
//#piece a063d2dd6b67729acfa82430fa8840ab7ddfb32a9d65c7f0175b566bca204ee4
function hair$4(h, k) {
//#piece 8aff24b2d9ee91011369cda0944bbab6a017182c93e1c76a7c1dc8a22e16bd52
const HEIGHT$5 = 1.7;
/** the height its measures below are for: the top of its head (a man's), as built for a person of 1.80 m */
const MEASURED$5 = /* @__PURE__ */ (() => crownOf("man"))();
/** the edge it sits on (a bed's, a chair's), m */
const SEAT$5 = .5;
const LOOK$5 = {
//#piece 2e053366df8c110e6f71956afb57fb0425a5f7b007e7241b251a4aa959525442
	lips: "#a8665a",
	face: "man"
};
const sides$5 = [["L", 1], ["R", -1]];
const BONES$5 = /* @__PURE__ */ (() => [
//#piece 97efaf99a2993947c8eed1ae3bf96eb43de7d0717d1bcf0f0964e522d9c17b72
	...sides$5.flatMap(([s, x]) => [
//#piece 0c827e26630d74cd9228ebe1df8427b70f39305c39cc23dbe418e806103115df
function parts$5(k, v) {
//#piece 64c6668d96fa7c528a0d08a204173cc5094f45d32b063bc6bd876d6412df4ee9
		...sides$5.flatMap(([s, x]) => [
//#piece 06447f9dbdc967f9504da010014ee0af8f838af8ef903a1224e61eed320c5ec0
function scaled$5(s, k, v) {
	const m = (v) => [
		v[0] * s,
		v[1] * s,
		v[2] * s
	];
	return {
		bones: BONES$5.map((b) => ({
			...b,
			at: m(b.at)
		})),
		parts: parts$5(k, v).map((p) => ({
//#piece cb49bb51bf51b3e0758cc9482da67d035b9c58ffd575c2af623b8a48b982348e
const relaxed$5 = {
//#piece aa9c4b55c692166477ebac722ff511d5de8310549f1b2297d8c5ed0a2589d3d9
function posesFor$5(s) {
//#piece 11a834f3c232cfeeb85d3e01a280e8c89965f43c07d2dfa87ec9f15d839d3076
	const sitHip = SEAT$5 + .07 * s, a = slope(sitHip);
//#piece f7a5bafa42516457abce7971e092b0000964cb7f9426c36edc9e067bc26b1383
	const fallHips = SEAT$5 + .08 * s, b = slope(fallHips), back = -1.52;
	return {
		stand: relaxed$5,
//#piece 44151b4e388f50930fa5ca8a29131d0c9538bf088c6e2418114523a5d6268045
			...relaxed$5,
//#piece f9ac1c1ff1caa90425fb98f88370a2b89bace53b5d2bf9e1f925d33c98099a41
			...relaxed$5,
//#piece 06287d4e186081651ce9161a975ae4ef1eb8e8d6682232a4dbd7e5822e92586f
			...relaxed$5,
//#piece a10172c41a7e87c7745eb37ccfe79079ac33171a32ca9b2c238ce8286015746f
			...relaxed$5,
//#piece c03f5c9d12601fe9d4871c53ccc02203238f379dcfe6275f214edf3576437981
			...relaxed$5,
//#piece 76296f4466fa4e76362c7d70e6a2bcf9fc0b50aa9ea465466d3535a8388a76fb
const POSES$5 = /* @__PURE__ */ (() => posesFor$5(HEIGHT$5 / MEASURED$5))();
function clipsFor$5(s, poses) {
	const idle = (t) => ({
		...relaxed$5,
//#piece 2fc242b79782694edc8b7c3891228aa093391291aa056e57f715183914c96ced
		return blend(relaxed$5, poses.sit, k * k * (3 - 2 * k));
//#piece 4a917c2e5c1e2b4f3675f9b86b61add160fa51efc0cfc064c26c6f9922dae624
function human$5(look = {}, height = HEIGHT$5, v = 10) {
	const k = {
		...LOOK$5,
		...look
	};
	const s = height / crownOf(k.face);
	const { bones, parts: body } = scaled$5(s, k, v);
	const r = rig(bones, body, [
		skin(.74),
		skin(.12),
		skin(.85, { side: three.DoubleSide }),
		CATCHLIGHT()
	]);
	r.object.name = "stand-in";
	r.pose(relaxed$5);
	const poses = s === 1.7 / MEASURED$5 ? POSES$5 : posesFor$5(s);
	return {
		rig: r,
		clips: clipsFor$5(s, poses),
		poses,
		first: "idle"
	};
}

//#endregion
//#region src/lib/actors/human.v1.ts
/** how tall it is (m) */
const HEIGHT$4 = 1.7;
//#piece cf518cf5d4efc0c7a8a2756525b31dce09b6a45cfeed728cbe53431297fb3cf2
const MEASURED$4 = 1.823;
/** the edge it sits on (a bed's, a chair's), m */
const SEAT$4 = .5;
const LOOK$4 = {
	skin: "#d6b094",
	brows: "#3a2a1f",
	shirt: "#3c4452",
	trousers: "#47566c",
	belt: "#2d251f",
	shoes: "#2a2a2d",
	soles: "#e9e6df"
};
const sides$4 = [["L", 1], ["R", -1]];
const BONES$4 = /* @__PURE__ */ (() => [
//#piece 97efaf99a2993947c8eed1ae3bf96eb43de7d0717d1bcf0f0964e522d9c17b72
	...sides$4.flatMap(([s, x]) => [
//#piece 0c827e26630d74cd9228ebe1df8427b70f39305c39cc23dbe418e806103115df
function parts$4(k) {
//#piece 573eb83fb26cb503a7744d73d03d6b1eaa2d16b2e3cc6de4ce3299597cdfb310
					y: 1.545,
					w: .02,
					d: .02,
					z: -.015
				}
			]),
//#piece af85a5bfcd0b725a3fff6bf607e75c13ae3b55efbd1999e4fb18aa3bb9d0722a
			}
		},
		{
			geo: limb([
				0,
				1.64,
//#piece 2729c08181cdcadfae04abac802eea2884c013bbd390bd4d9ab8ad9f410df77a
			], [28, 20]),
			color: k.skin,
			bone: "head"
		},
		{
			geo: egg([
				0,
				1.648,
				.045
			], [
				.07,
				.05,
				.07
			]),
			color: k.skin,
			bone: "head"
		},
		...sides$4.flatMap(([, x]) => [
			{
				geo: egg([
					x * .093,
					1.695,
					0
				], [
					.016,
					.03,
					.022
				]),
				color: k.skin,
				bone: "head"
			},
			{
				geo: egg([
					x * .034,
					1.712,
					.098
				], [
					.012,
					.009,
					.006
				]),
				color: "#2b2622",
				bone: "head"
			},
			{
				geo: egg([
					x * .035,
					1.736,
					.101
				], [
					.022,
					.005,
					.008
				], [
					0,
					0,
					x * -.12
				]),
				color: k.brows,
				bone: "head"
			}
		]),
		{
			geo: spike([
				0,
				1.692,
				.108
			], [
				0,
				-.35,
				1
			], .016, .035, { seg: 12 }),
			color: k.skin,
			bone: "head"
		},
		{
			geo: egg([
				0,
				1.655,
				.1
			], [
				.022,
				.004,
				.006
			]),
			color: "#9a6a5a",
			bone: "head"
		},
		...sides$4.flatMap(([s, x]) => [
//#piece 06447f9dbdc967f9504da010014ee0af8f838af8ef903a1224e61eed320c5ec0
function scaled$4(s, k) {
	const m = (v) => [
		v[0] * s,
		v[1] * s,
		v[2] * s
	];
	return {
		bones: BONES$4.map((b) => ({
			...b,
			at: m(b.at)
		})),
		parts: parts$4(k).map((p) => ({
//#piece 19bcdfabf8a43e56680481ed2dd89d0d71d10ee296ec04a72bfaca1a309b6978
const relaxed$4 = {
//#piece aa9c4b55c692166477ebac722ff511d5de8310549f1b2297d8c5ed0a2589d3d9
function posesFor$4(s) {
//#piece 11a834f3c232cfeeb85d3e01a280e8c89965f43c07d2dfa87ec9f15d839d3076
	const sitHip = SEAT$4 + .07 * s, a = slope(sitHip);
//#piece f7a5bafa42516457abce7971e092b0000964cb7f9426c36edc9e067bc26b1383
	const fallHips = SEAT$4 + .08 * s, b = slope(fallHips), back = -1.52;
	return {
		stand: relaxed$4,
//#piece 44151b4e388f50930fa5ca8a29131d0c9538bf088c6e2418114523a5d6268045
			...relaxed$4,
//#piece f9ac1c1ff1caa90425fb98f88370a2b89bace53b5d2bf9e1f925d33c98099a41
			...relaxed$4,
//#piece 06287d4e186081651ce9161a975ae4ef1eb8e8d6682232a4dbd7e5822e92586f
			...relaxed$4,
//#piece a10172c41a7e87c7745eb37ccfe79079ac33171a32ca9b2c238ce8286015746f
			...relaxed$4,
//#piece c03f5c9d12601fe9d4871c53ccc02203238f379dcfe6275f214edf3576437981
			...relaxed$4,
//#piece 76296f4466fa4e76362c7d70e6a2bcf9fc0b50aa9ea465466d3535a8388a76fb
const POSES$4 = /* @__PURE__ */ (() => posesFor$4(HEIGHT$4 / MEASURED$4))();
function clipsFor$4(s, poses) {
	const idle = (t) => ({
		...relaxed$4,
//#piece 2fc242b79782694edc8b7c3891228aa093391291aa056e57f715183914c96ced
		return blend(relaxed$4, poses.sit, k * k * (3 - 2 * k));
//#piece c5cbed2be6223b3630756b8c993b9aa6f664a8a7730b4cc409e086b3e9ded4d6
function human$4(look = {}, height = HEIGHT$4) {
	const s = height / MEASURED$4;
	const { bones, parts: body } = scaled$4(s, {
		...LOOK$4,
		...look
	});
	const r = rig(bones, body, [skin(.78)]);
	r.object.name = "stand-in";
	r.pose(relaxed$4);
	const poses = s === 1.7 / MEASURED$4 ? POSES$4 : posesFor$4(s);
	return {
		rig: r,
		clips: clipsFor$4(s, poses),
		poses,
		first: "idle"
	};
}

//#endregion
//#region src/lib/actors/human.v2.ts
/** how tall it is (m) */
const HEIGHT$3 = 1.7;
//#piece cf518cf5d4efc0c7a8a2756525b31dce09b6a45cfeed728cbe53431297fb3cf2
const MEASURED$3 = 1.823;
/** the edge it sits on (a bed's, a chair's), m */
const SEAT$3 = .5;
const LOOK$3 = {
//#piece 2e053366df8c110e6f71956afb57fb0425a5f7b007e7241b251a4aa959525442
	lips: "#a8665a"
};
const sides$3 = [["L", 1], ["R", -1]];
const BONES$3 = /* @__PURE__ */ (() => [
//#piece 97efaf99a2993947c8eed1ae3bf96eb43de7d0717d1bcf0f0964e522d9c17b72
	...sides$3.flatMap(([s, x]) => [
//#piece 0c827e26630d74cd9228ebe1df8427b70f39305c39cc23dbe418e806103115df
/** its hair, on the head bone: a cap over the skull, its front edge lifted off the brow, and for `long` a fall down the
*  back of the neck, for `bun` a knot at the back of the crown */
function hair$3(k) {
	if (k.hair === "none") return [];
	const cap = new three.SphereGeometry(1, 44, 22, 0, Math.PI * 2, 0, Math.PI * .56);
	cap.applyMatrix4(new three.Matrix4().compose(new three.Vector3(0, 1.709, .008), new three.Quaternion().setFromEuler(new three.Euler(-.5, 0, 0)), new three.Vector3(.1, .126, .112)));
	const out = [{
		geo: cap,
		color: k.hairColour,
		bone: "head"
	}];
	if (k.hair === "long") {
		out.push({
			geo: egg([
				0,
				1.62,
				-.055
			], [
				.098,
				.15,
				.06
			], [
				.12,
				0,
				0
			], [28, 20]),
			color: k.hairColour,
			bone: "head"
		});
		for (const x of [-1, 1]) out.push({
			geo: egg([
				x * .085,
				1.64,
				-.01
			], [
				.03,
				.11,
				.06
//#piece 92f9cd502e9858eda4034943ae8463b718f9d16dedd1d395464bad58dc43fd2c
			-.085
		], [
			.042,
			.04,
			.04
		], [
			0,
			0,
			0
		], [20, 16]),
		color: k.hairColour,
		bone: "head"
	});
	return out;
}
/** how far forward the face's skin is at (x, y): the skull or, lower down, the jaw, whichever stands out */
const SKULL = {
	c: [
		0,
		1.705,
		.012
	],
	r: [
		.093,
		.118,
		.105
	]
};
const JAW = {
	c: [
		0,
		1.648,
		.045
	],
	r: [
		.07,
		.05,
		.07
	]
};
function skinAt$3(x, y) {
	const z = (e) => {
		const q = 1 - (x / e.r[0]) ** 2 - ((y - e.c[1]) / e.r[1]) ** 2;
		return q > 0 ? e.c[2] + e.r[2] * Math.sqrt(q) : -1;
	};
	return Math.max(z(SKULL), z(JAW));
}
//#piece 768ec656142e2ffd18bfe578f94df12fa620d5ca3e4287a869988491819a7fda
*  bridge, a tip, its wings and nostrils; two lips with the line between them */
function face$3(k) {
	const on = (x, y, out, s, rot, color, detail = [16, 12]) => ({
		geo: egg([
			x,
			y,
			skinAt$3(x, y) + out
		], s, rot, detail),
		color,
		bone: "head"
	});
	const out = [];
	for (const [, x] of sides$3) {
		const ex = x * .034, ey = 1.712, turn = [
//#piece 89ed621ae4c870d7930a1ee704d0a3683353970aeb5e8abb100ec376ffdd42d9
		], k.brows, [14, 8]), on(x * .0105, 1.6745, -.0035, [
			.0062,
			.006,
			.0065
		], [
			0,
			0,
			0
		], k.skin, [12, 10]), on(x * .0058, 1.6705, .0035, [
			.0032,
			.0018,
			.0028
		], [
			0,
			0,
			0
		], "#5a3a2e", [10, 6]));
	}
	out.push(on(0, 1.697, -.0078, [
		.0085,
		.022,
		.011
	], [
		-.25,
		0,
		0
	], k.skin, [14, 12]), on(0, 1.679, -5e-4, [
		.0125,
		.0095,
		.0105
	], [
		0,
		0,
		0
	], k.skin), on(0, 1.6585, -.0028, [
		.0205,
		.0045,
		.0068
	], [
		0,
		0,
		0
	], k.lips, [16, 10]), on(0, 1.6515, -.003, [
		.0185,
		.0052,
		.0072
	], [
		0,
		0,
		0
	], k.lips, [16, 10]), on(0, 1.6548, .0036, [
		.0185,
		8e-4,
		.0018
	], [
		0,
		0,
		0
	], "#6a3a34", [14, 6]));
	return out;
}
function parts$3(k) {
//#piece 573eb83fb26cb503a7744d73d03d6b1eaa2d16b2e3cc6de4ce3299597cdfb310
//#piece ce268140e5403f5fdabafbbd90c3020dd465a9b30f378390a88645683599faaa
			}
		},
		{
			geo: limb([
				0,
				1.64,
//#piece 2729c08181cdcadfae04abac802eea2884c013bbd390bd4d9ab8ad9f410df77a
			], [44, 32]),
			color: k.skin,
			bone: "head"
		},
		{
			geo: egg([
				0,
				1.648,
				.045
			], [
				.07,
				.05,
				.07
			], [
				0,
				0,
				0
			], [28, 18]),
			color: k.skin,
			bone: "head"
		},
		...sides$3.map(([, x]) => ({
			geo: egg([
				x * .093,
				1.695,
				0
			], [
				.016,
				.03,
				.022
			], [
				0,
				0,
				0
			], [16, 12]),
			color: k.skin,
			bone: "head"
		})),
		...face$3(k),
		...hair$3(k),
		...sides$3.flatMap(([s, x]) => [
//#piece 06447f9dbdc967f9504da010014ee0af8f838af8ef903a1224e61eed320c5ec0
function scaled$3(s, k) {
	const m = (v) => [
		v[0] * s,
		v[1] * s,
		v[2] * s
	];
	return {
		bones: BONES$3.map((b) => ({
			...b,
			at: m(b.at)
		})),
		parts: parts$3(k).map((p) => ({
//#piece 19bcdfabf8a43e56680481ed2dd89d0d71d10ee296ec04a72bfaca1a309b6978
const relaxed$3 = {
//#piece aa9c4b55c692166477ebac722ff511d5de8310549f1b2297d8c5ed0a2589d3d9
function posesFor$3(s) {
//#piece 11a834f3c232cfeeb85d3e01a280e8c89965f43c07d2dfa87ec9f15d839d3076
	const sitHip = SEAT$3 + .07 * s, a = slope(sitHip);
//#piece f7a5bafa42516457abce7971e092b0000964cb7f9426c36edc9e067bc26b1383
	const fallHips = SEAT$3 + .08 * s, b = slope(fallHips), back = -1.52;
	return {
		stand: relaxed$3,
//#piece 44151b4e388f50930fa5ca8a29131d0c9538bf088c6e2418114523a5d6268045
			...relaxed$3,
//#piece f9ac1c1ff1caa90425fb98f88370a2b89bace53b5d2bf9e1f925d33c98099a41
			...relaxed$3,
//#piece 06287d4e186081651ce9161a975ae4ef1eb8e8d6682232a4dbd7e5822e92586f
			...relaxed$3,
//#piece a10172c41a7e87c7745eb37ccfe79079ac33171a32ca9b2c238ce8286015746f
			...relaxed$3,
//#piece c03f5c9d12601fe9d4871c53ccc02203238f379dcfe6275f214edf3576437981
			...relaxed$3,
//#piece 76296f4466fa4e76362c7d70e6a2bcf9fc0b50aa9ea465466d3535a8388a76fb
const POSES$3 = /* @__PURE__ */ (() => posesFor$3(HEIGHT$3 / MEASURED$3))();
function clipsFor$3(s, poses) {
	const idle = (t) => ({
		...relaxed$3,
//#piece 2fc242b79782694edc8b7c3891228aa093391291aa056e57f715183914c96ced
		return blend(relaxed$3, poses.sit, k * k * (3 - 2 * k));
//#piece c5cbed2be6223b3630756b8c993b9aa6f664a8a7730b4cc409e086b3e9ded4d6
function human$3(look = {}, height = HEIGHT$3) {
	const s = height / MEASURED$3;
	const { bones, parts: body } = scaled$3(s, {
		...LOOK$3,
		...look
	});
	const r = rig(bones, body, [skin(.78)]);
	r.object.name = "stand-in";
	r.pose(relaxed$3);
	const poses = s === 1.7 / MEASURED$3 ? POSES$3 : posesFor$3(s);
	return {
		rig: r,
		clips: clipsFor$3(s, poses),
		poses,
		first: "idle"
	};
}

//#endregion
//#region src/lib/actors/human.v3.ts
/** how tall it is (m) */
const HEIGHT$2 = 1.7;
//#piece cf518cf5d4efc0c7a8a2756525b31dce09b6a45cfeed728cbe53431297fb3cf2
const MEASURED$2 = 1.823;
/** the edge it sits on (a bed's, a chair's), m */
const SEAT$2 = .5;
const LOOK$2 = {
//#piece 2e053366df8c110e6f71956afb57fb0425a5f7b007e7241b251a4aa959525442
	lips: "#a8665a"
};
const sides$2 = [["L", 1], ["R", -1]];
const BONES$2 = /* @__PURE__ */ (() => [
//#piece 97efaf99a2993947c8eed1ae3bf96eb43de7d0717d1bcf0f0964e522d9c17b72
	...sides$2.flatMap(([s, x]) => [
//#piece f40e2fcdf6f4d665bf36d567a8bd33dff456efdaf11b5ba9d49b4d3bec6d8d29
const HEAD$2 = [
//#piece 2194b7b1e2534f94590195ee61eeaea2e4a2a38f417613560a3bdfbfe27f99b0
const CHIN$2 = /* @__PURE__ */ (() => HEAD$2[0][0])();
const CROWN$2 = /* @__PURE__ */ (() => HEAD$2[HEAD$2.length - 1][0])();
/** the head's section at height y, smoothly between those given (Catmull-Rom) */
function section$2(y) {
	let i = 0;
	while (i < HEAD$2.length - 2 && y > HEAD$2[i + 1][0]) i++;
	const at = (k) => HEAD$2[Math.max(0, Math.min(HEAD$2.length - 1, k))];
//#piece 62416cde1209986c02e6f7c81ca558298049680515570cb8efb5cc237c384915
const BUMPS$2 = [
//#piece 083e98b517ce7d588f6192655f8294437f05ab94d39c5a2af16c88cf4be5685f
		.002
	]
];
//#piece 28d4a8adc8c2d2692cade06dd8e9f660efa959f919c839fd3e19867c65b2b757
function nose$2(x, y) {
//#piece daf3dcd617f61503150743467bb02870d1d3968a1527d76a5363a4892c370e9b
const LIPS$2 = [
	[
		0,
		1.6588,
		.019,
		.0032,
		.0032
	],
	[
		0,
		1.6508,
		.0165,
		.0038,
		.0038
	],
	[
		0,
		1.6549,
		.021,
		.0011,
		-.0018
	]
];
//#piece 377528ad524c188cf8d60694c4c2f545d8fe963491fcde5846f9cb85a5adbaa7
const onLips$2 = (x, y) => Math.min(1, Math.max(0, (1 - Math.sqrt((x / .0205) ** 2 + ((y - 1.6551) / .0074) ** 2)) / .18));
/** the skin's colour, or the lips' where the lips are */
const lipsOr$1 = (skinC, lipsC) => {
	const a = new three.Color(skinC), b = new three.Color(lipsC), c = new three.Color();
	return (p) => p.z > .06 ? `#${c.copy(a).lerp(b, onLips$2(p.x, p.y)).getHexString()}` : skinC;
};
const bump$2 = (x, y) => nose$2(x, y) + [
	...BUMPS$2,
	...LIPS$2,
	[
		.0125,
		1.6735,
		.0068,
		.0058,
		.0062
//#piece 7c9c8f6093c94ae8c762ed3d13930e7e3b85488715ba025bf577e2d395f9acbf
function skinAt$2(x, y) {
	const { w, zf, zs, n } = section$2(y);
	const S = (1 - Math.min(1, Math.abs(x) / w) ** n) ** (1 / n);
	return zs + (zf - zs + bump$2(x, y)) * S;
//#piece 51431da619039d08939e879827f541daff14f06b2802caf404c544ccfc8fb075
const ROW_Y$2 = /* @__PURE__ */ (() => (() => {
	const n = 2e3, ys = [], cum = [0];
	const dense = (y) => 1 + 3.2 * Math.exp(-(((y - 1.684) / .042) ** 2)) + 1.2 * Math.exp(-(((y - CHIN$2) / .01) ** 2)) + 1.2 * Math.exp(-(((y - CROWN$2) / .012) ** 2));
	for (let i = 0; i <= n; i++) {
		ys.push(CHIN$2 + (CROWN$2 - CHIN$2) * i / n);
//#piece 85b28a48469829a56020d5b3ca685fe27479f3b6f4bf5a491f92fa7c221f48bc
function headPoint$2(u, a) {
	const y = ROW_Y$2(u);
	const { w, zf, zs, zb, n } = section$2(y);
//#piece f739b4f718d8a2ddec30ed9fd5bc53523ca7a51c2cde3770d78bcf6ec93e68db
		sn >= 0 ? zs + (zf - zs + bump$2(x, y)) * S : zs - (zs - zb) * S
//#piece 8ddeb7e2b8bc15d6e4ea162b94866708bc1fe1506adba14b4e89fd94b76533e2
function headGrid$2(rows, cols, out = () => 0, keep = () => true) {
//#piece 0157a895474a42571421d7cf39fed00950b63a255d576d7f88ad0de00bc86c26
			const p = headPoint$2(i / rows, Math.PI / 2 + Math.PI * Math.sign(t) * Math.abs(t) ** 1.7);
//#piece debe9e8d787f033d56e9b9b166370299598e98ab9401bf2f172ad24a4854ef29
const HAIRLINE$2 = /* @__PURE__ */ (() => [
	[0, 1.79],
	[.7, 1.777],
	[1.12, 1.748],
	[1.42, 1.726],
	[1.75, 1.718],
	[2.2, 1.7],
	[Math.PI, 1.668]
])();
function hairline$2(p) {
	const th = Math.abs(Math.atan2(p[0], p[2] + .005));
	let i = 0;
	while (i < HAIRLINE$2.length - 2 && th > HAIRLINE$2[i + 1][0]) i++;
	const [a0, h0] = HAIRLINE$2[i], [a1, h1] = HAIRLINE$2[i + 1];
//#piece 2f7c0329dc533dfa72fe54be06636f22ea831cf8a77376053a6d65a3aedaeee9
function hair$2(k) {
	if (k.hair === "none") return [];
	const thick = (p) => {
		const t = Math.min(1, Math.max(0, (p[1] - hairline$2(p)) / .028));
		return -.002 + .0105 * t * t * (3 - 2 * t);
	};
	const out = [{
		geo: headGrid$2(84, 112, thick, (p) => p[1] > hairline$2(p) - .012),
//#piece e7253706ab0f4c86ae02ad84e359a73055e2fcc90d1ad8a61d95ac5113f7f829
function face$2(k) {
	const on = (x, y, out, s, rot, color, detail = [16, 12]) => ({
		geo: egg([
			x,
			y,
			skinAt$2(x, y) + out
		], s, rot, detail),
		color,
		bone: "head"
	});
	const out = [];
	for (const [, x] of sides$2) {
		const ex = x * .033, ey = 1.712, turn = [
//#piece 89ed621ae4c870d7930a1ee704d0a3683353970aeb5e8abb100ec376ffdd42d9
		], k.brows, [14, 8]), on(x * .0058, 1.6696, -.0012, [
			.003,
			.0012,
			.0034
		], [
			.35,
			0,
			0
		], "#4a2e25", [10, 6]));
	}
	out.push(on(0, 1.6549, -6e-4, [
		.0175,
		7e-4,
		.0012
	], [
		0,
		0,
		0
	], "#6a3a34", [14, 6]));
	return out;
}
function parts$2(k) {
//#piece 0ae0dd3c8fa15605f21b2f99b1d230ffabe725d788ff2083d6407c018dc13477
			geo: headGrid$2(150, 128),
			color: lipsOr$1(k.skin, k.lips),
			bone: "head"
		},
		...sides$2.map(([, x]) => ({
			geo: egg([
				x * (section$2(1.703).w - .001),
//#piece 4d1a3a1fa19f39e92a26aad2f9a5e337f3ffd413c0c3aec08bc041588dbf961e
		...face$2(k),
		...hair$2(k),
		...sides$2.flatMap(([s, x]) => [
//#piece 06447f9dbdc967f9504da010014ee0af8f838af8ef903a1224e61eed320c5ec0
function scaled$2(s, k) {
	const m = (v) => [
		v[0] * s,
		v[1] * s,
		v[2] * s
	];
	return {
		bones: BONES$2.map((b) => ({
			...b,
			at: m(b.at)
		})),
		parts: parts$2(k).map((p) => ({
//#piece 19bcdfabf8a43e56680481ed2dd89d0d71d10ee296ec04a72bfaca1a309b6978
const relaxed$2 = {
//#piece aa9c4b55c692166477ebac722ff511d5de8310549f1b2297d8c5ed0a2589d3d9
function posesFor$2(s) {
//#piece 11a834f3c232cfeeb85d3e01a280e8c89965f43c07d2dfa87ec9f15d839d3076
	const sitHip = SEAT$2 + .07 * s, a = slope(sitHip);
//#piece f7a5bafa42516457abce7971e092b0000964cb7f9426c36edc9e067bc26b1383
	const fallHips = SEAT$2 + .08 * s, b = slope(fallHips), back = -1.52;
	return {
		stand: relaxed$2,
//#piece 44151b4e388f50930fa5ca8a29131d0c9538bf088c6e2418114523a5d6268045
			...relaxed$2,
//#piece f9ac1c1ff1caa90425fb98f88370a2b89bace53b5d2bf9e1f925d33c98099a41
			...relaxed$2,
//#piece 06287d4e186081651ce9161a975ae4ef1eb8e8d6682232a4dbd7e5822e92586f
			...relaxed$2,
//#piece a10172c41a7e87c7745eb37ccfe79079ac33171a32ca9b2c238ce8286015746f
			...relaxed$2,
//#piece c03f5c9d12601fe9d4871c53ccc02203238f379dcfe6275f214edf3576437981
			...relaxed$2,
//#piece 76296f4466fa4e76362c7d70e6a2bcf9fc0b50aa9ea465466d3535a8388a76fb
const POSES$2 = /* @__PURE__ */ (() => posesFor$2(HEIGHT$2 / MEASURED$2))();
function clipsFor$2(s, poses) {
	const idle = (t) => ({
		...relaxed$2,
//#piece 2fc242b79782694edc8b7c3891228aa093391291aa056e57f715183914c96ced
		return blend(relaxed$2, poses.sit, k * k * (3 - 2 * k));
//#piece c5cbed2be6223b3630756b8c993b9aa6f664a8a7730b4cc409e086b3e9ded4d6
function human$2(look = {}, height = HEIGHT$2) {
	const s = height / MEASURED$2;
	const { bones, parts: body } = scaled$2(s, {
		...LOOK$2,
		...look
	});
	const r = rig(bones, body, [skin(.78)]);
	r.object.name = "stand-in";
	r.pose(relaxed$2);
	const poses = s === 1.7 / MEASURED$2 ? POSES$2 : posesFor$2(s);
	return {
		rig: r,
		clips: clipsFor$2(s, poses),
		poses,
		first: "idle"
	};
}

//#endregion
//#region src/lib/actors/human.v4.ts
/** how tall it is (m) */
const HEIGHT$1 = 1.7;
//#piece cf518cf5d4efc0c7a8a2756525b31dce09b6a45cfeed728cbe53431297fb3cf2
const MEASURED$1 = 1.823;
/** the edge it sits on (a bed's, a chair's), m */
const SEAT$1 = .5;
const LOOK$1 = {
//#piece 2e053366df8c110e6f71956afb57fb0425a5f7b007e7241b251a4aa959525442
	lips: "#a8665a"
};
const sides$1 = [["L", 1], ["R", -1]];
const BONES$1 = /* @__PURE__ */ (() => [
//#piece 97efaf99a2993947c8eed1ae3bf96eb43de7d0717d1bcf0f0964e522d9c17b72
	...sides$1.flatMap(([s, x]) => [
//#piece f40e2fcdf6f4d665bf36d567a8bd33dff456efdaf11b5ba9d49b4d3bec6d8d29
const HEAD$1 = [
//#piece 2194b7b1e2534f94590195ee61eeaea2e4a2a38f417613560a3bdfbfe27f99b0
const CHIN$1 = /* @__PURE__ */ (() => HEAD$1[0][0])();
const CROWN$1 = /* @__PURE__ */ (() => HEAD$1[HEAD$1.length - 1][0])();
/** the head's section at height y, smoothly between those given (Catmull-Rom) */
function section$1(y) {
	let i = 0;
	while (i < HEAD$1.length - 2 && y > HEAD$1[i + 1][0]) i++;
	const at = (k) => HEAD$1[Math.max(0, Math.min(HEAD$1.length - 1, k))];
//#piece 62416cde1209986c02e6f7c81ca558298049680515570cb8efb5cc237c384915
const BUMPS$1 = [
//#piece 083e98b517ce7d588f6192655f8294437f05ab94d39c5a2af16c88cf4be5685f
		.002
	],
	[
		.032,
		1.679,
		.013,
		.01,
		.0042
	],
	[
		.025,
		1.6625,
		.004,
		.006,
		-.0016
	]
];
/** how far up the mouth turns at x (as built for 1.80 m): its corners lifted into a soft smile */
const SMILE$1 = (x) => .0055 * Math.min(1.1, (x / .021) ** 2);
//#piece 28d4a8adc8c2d2692cade06dd8e9f660efa959f919c839fd3e19867c65b2b757
function nose$1(x, y) {
//#piece daf3dcd617f61503150743467bb02870d1d3968a1527d76a5363a4892c370e9b
const LIPS$1 = [
	[
		0,
		1.6588,
		.021,
		.0032,
		.0032
	],
	[
		0,
		1.6506,
		.018,
		.0042,
		.0042
	],
	[
		0,
		1.6549,
		.023,
		.0011,
		-.0018
	]
];
//#piece 377528ad524c188cf8d60694c4c2f545d8fe963491fcde5846f9cb85a5adbaa7
const onLips$1 = (x, y) => Math.min(1, Math.max(0, (1 - Math.sqrt((x / .0225) ** 2 + ((y - SMILE$1(x) - 1.6549) / .0078) ** 2)) / .18));
/** the skin's colour, or the lips' where the lips are */
const lipsOr = (skinC, lipsC) => {
	const a = new three.Color(skinC), b = new three.Color(lipsC), c = new three.Color();
	return (p) => p.z > .06 ? `#${c.copy(a).lerp(b, onLips$1(p.x, p.y)).getHexString()}` : skinC;
};
const bump$1 = (x, y) => nose$1(x, y) + LIPS$1.reduce((sum, [, by, rx, ry, dz]) => sum + dz * Math.exp(-((x / rx) ** 2) - ((y - SMILE$1(x) - by) / ry) ** 2), 0) + [...BUMPS$1, [
	.0125,
	1.6735,
	.0068,
	.0058,
	.0062
]].reduce((sum, [bx, by, rx, ry, dz]) => sum + dz * (Math.exp(-(((x - bx) / rx) ** 2) - ((y - by) / ry) ** 2) + (bx ? Math.exp(-(((x + bx) / rx) ** 2) - ((y - by) / ry) ** 2) : 0)), 0);
/** how far forward the face's skin is at (x, y), as built for 1.80 m; behind its sides, the sides' z */
function skinAt$1(x, y) {
	const { w, zf, zs, n } = section$1(y);
	const S = (1 - Math.min(1, Math.abs(x) / w) ** n) ** (1 / n);
	return zs + (zf - zs + bump$1(x, y)) * S;
//#piece 51431da619039d08939e879827f541daff14f06b2802caf404c544ccfc8fb075
const ROW_Y$1 = /* @__PURE__ */ (() => (() => {
	const n = 2e3, ys = [], cum = [0];
	const dense = (y) => 1 + 3.2 * Math.exp(-(((y - 1.684) / .042) ** 2)) + 1.2 * Math.exp(-(((y - CHIN$1) / .01) ** 2)) + 1.2 * Math.exp(-(((y - CROWN$1) / .012) ** 2));
	for (let i = 0; i <= n; i++) {
		ys.push(CHIN$1 + (CROWN$1 - CHIN$1) * i / n);
//#piece 85b28a48469829a56020d5b3ca685fe27479f3b6f4bf5a491f92fa7c221f48bc
function headPoint$1(u, a) {
	const y = ROW_Y$1(u);
	const { w, zf, zs, zb, n } = section$1(y);
//#piece f739b4f718d8a2ddec30ed9fd5bc53523ca7a51c2cde3770d78bcf6ec93e68db
		sn >= 0 ? zs + (zf - zs + bump$1(x, y)) * S : zs - (zs - zb) * S
//#piece 8ddeb7e2b8bc15d6e4ea162b94866708bc1fe1506adba14b4e89fd94b76533e2
function headGrid$1(rows, cols, out = () => 0, keep = () => true) {
//#piece 0157a895474a42571421d7cf39fed00950b63a255d576d7f88ad0de00bc86c26
			const p = headPoint$1(i / rows, Math.PI / 2 + Math.PI * Math.sign(t) * Math.abs(t) ** 1.7);
//#piece debe9e8d787f033d56e9b9b166370299598e98ab9401bf2f172ad24a4854ef29
const HAIRLINE$1 = /* @__PURE__ */ (() => [
	[0, 1.79],
	[.7, 1.777],
	[1.12, 1.748],
	[1.42, 1.726],
	[1.75, 1.718],
	[2.2, 1.7],
	[Math.PI, 1.668]
])();
function hairline$1(p) {
	const th = Math.abs(Math.atan2(p[0], p[2] + .005));
	let i = 0;
	while (i < HAIRLINE$1.length - 2 && th > HAIRLINE$1[i + 1][0]) i++;
	const [a0, h0] = HAIRLINE$1[i], [a1, h1] = HAIRLINE$1[i + 1];
//#piece 2f7c0329dc533dfa72fe54be06636f22ea831cf8a77376053a6d65a3aedaeee9
function hair$1(k) {
	if (k.hair === "none") return [];
	const thick = (p) => {
		const t = Math.min(1, Math.max(0, (p[1] - hairline$1(p)) / .028));
		return -.002 + .0105 * t * t * (3 - 2 * t);
	};
	const out = [{
		geo: headGrid$1(84, 112, thick, (p) => p[1] > hairline$1(p) - .012),
//#piece e7253706ab0f4c86ae02ad84e359a73055e2fcc90d1ad8a61d95ac5113f7f829
function face$1(k) {
	const on = (x, y, out, s, rot, color, detail = [16, 12]) => ({
		geo: egg([
			x,
			y,
			skinAt$1(x, y) + out
		], s, rot, detail),
		color,
		bone: "head"
	});
	const out = [];
	for (const [, x] of sides$1) {
		const ex = x * .033, ey = 1.712, turn = [
//#piece 543250573511a9409b19be5f0872097185547d04320e89bf50085796504b17b4
		], turn, "#ffffff", [8, 6]), on(ex, 1.7206, -.0022, [
			.0142,
			.0044,
			.0058
		], [
			0,
			x * .42,
			x * .04
		], k.skin), on(ex, 1.7168999999999999, .0021, [
			.0134,
			.001,
			.0022
		], [
			0,
			x * .42,
			x * .04
		], "#2a1d17", [14, 6]), on(ex, 1.7056, -.0014, [
			.0128,
			.0026,
			.0046
		], [
			0,
			x * .42,
			x * .05
		], k.skin, [14, 8]), on(x * .0058, 1.6696, -.0012, [
			.003,
			.0012,
			.0034
		], [
			.35,
			0,
			0
		], "#4a2e25", [10, 6]));
	}
	out.push();
	for (const [, sx] of sides$1) {
		const pts = Array.from({ length: 9 }, (_, i) => {
			const u = i / 8, x = sx * (.016 + .036 * u), y = 1.7385 + .0045 * Math.sin(Math.PI * (.15 + .8 * u));
			return new three.Vector3(x, y, skinAt$1(x, y) + 6e-4);
		});
		const g = new three.TubeGeometry(new three.CatmullRomCurve3(pts), 20, 1, 6, false);
		const pos = g.attributes.position, c = new three.CatmullRomCurve3(pts), q = new three.Vector3(), m = new three.Vector3();
		for (let v = 0; v < pos.count; v++) {
			const t = Math.floor(v / 7) / 20;
			c.getPointAt(Math.min(1, t), m);
			q.fromBufferAttribute(pos, v).sub(m).multiplyScalar(.0024 * (1 - .55 * t));
			q.y *= .8;
			pos.setXYZ(v, m.x + q.x, m.y + q.y, m.z + q.z);
		}
		g.computeVertexNormals();
		out.push({
			geo: g,
			color: k.brows,
			bone: "head"
		});
	}
	const line = new three.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => {
		const x = -.0205 + i * .041 / 12, y = 1.6549 + SMILE$1(x);
		return new three.Vector3(x, y, skinAt$1(x, y) - 2e-4);
	}));
	out.push({
		geo: new three.TubeGeometry(line, 24, 7e-4, 6, false),
		color: "#6a3a34",
		bone: "head"
	});
	return out;
}
function parts$1(k) {
//#piece 0ae0dd3c8fa15605f21b2f99b1d230ffabe725d788ff2083d6407c018dc13477
			geo: headGrid$1(150, 128),
			color: lipsOr(k.skin, k.lips),
			bone: "head"
		},
		...sides$1.map(([, x]) => ({
			geo: egg([
				x * (section$1(1.703).w - .001),
//#piece 4d1a3a1fa19f39e92a26aad2f9a5e337f3ffd413c0c3aec08bc041588dbf961e
		...face$1(k),
		...hair$1(k),
		...sides$1.flatMap(([s, x]) => [
//#piece 06447f9dbdc967f9504da010014ee0af8f838af8ef903a1224e61eed320c5ec0
function scaled$1(s, k) {
	const m = (v) => [
		v[0] * s,
		v[1] * s,
		v[2] * s
	];
	return {
		bones: BONES$1.map((b) => ({
			...b,
			at: m(b.at)
		})),
		parts: parts$1(k).map((p) => ({
//#piece 19bcdfabf8a43e56680481ed2dd89d0d71d10ee296ec04a72bfaca1a309b6978
const relaxed$1 = {
//#piece aa9c4b55c692166477ebac722ff511d5de8310549f1b2297d8c5ed0a2589d3d9
function posesFor$1(s) {
//#piece 11a834f3c232cfeeb85d3e01a280e8c89965f43c07d2dfa87ec9f15d839d3076
	const sitHip = SEAT$1 + .07 * s, a = slope(sitHip);
//#piece f7a5bafa42516457abce7971e092b0000964cb7f9426c36edc9e067bc26b1383
	const fallHips = SEAT$1 + .08 * s, b = slope(fallHips), back = -1.52;
	return {
		stand: relaxed$1,
//#piece 44151b4e388f50930fa5ca8a29131d0c9538bf088c6e2418114523a5d6268045
			...relaxed$1,
//#piece f9ac1c1ff1caa90425fb98f88370a2b89bace53b5d2bf9e1f925d33c98099a41
			...relaxed$1,
//#piece 06287d4e186081651ce9161a975ae4ef1eb8e8d6682232a4dbd7e5822e92586f
			...relaxed$1,
//#piece a10172c41a7e87c7745eb37ccfe79079ac33171a32ca9b2c238ce8286015746f
			...relaxed$1,
//#piece c03f5c9d12601fe9d4871c53ccc02203238f379dcfe6275f214edf3576437981
			...relaxed$1,
//#piece 76296f4466fa4e76362c7d70e6a2bcf9fc0b50aa9ea465466d3535a8388a76fb
const POSES$1 = /* @__PURE__ */ (() => posesFor$1(HEIGHT$1 / MEASURED$1))();
function clipsFor$1(s, poses) {
	const idle = (t) => ({
		...relaxed$1,
//#piece 2fc242b79782694edc8b7c3891228aa093391291aa056e57f715183914c96ced
		return blend(relaxed$1, poses.sit, k * k * (3 - 2 * k));
//#piece c5cbed2be6223b3630756b8c993b9aa6f664a8a7730b4cc409e086b3e9ded4d6
function human$1(look = {}, height = HEIGHT$1) {
	const s = height / MEASURED$1;
	const { bones, parts: body } = scaled$1(s, {
		...LOOK$1,
		...look
	});
	const r = rig(bones, body, [skin(.78)]);
	r.object.name = "stand-in";
	r.pose(relaxed$1);
	const poses = s === 1.7 / MEASURED$1 ? POSES$1 : posesFor$1(s);
	return {
		rig: r,
		clips: clipsFor$1(s, poses),
		poses,
		first: "idle"
	};
}

//#endregion
//#region src/lib/actors/human.v5.ts
/** how tall it is (m) */
const HEIGHT = 1.7;
//#piece cf518cf5d4efc0c7a8a2756525b31dce09b6a45cfeed728cbe53431297fb3cf2
const MEASURED = 1.823;
/** the edge it sits on (a bed's, a chair's), m */
const SEAT = .5;
const LOOK = {
//#piece 2e053366df8c110e6f71956afb57fb0425a5f7b007e7241b251a4aa959525442
	lips: "#a8665a"
};
//#piece b2de13a7d6fd81be5fdf4827029e34bf8b940feeb20e3264f58c908a53e71121
//#piece f40e2fcdf6f4d665bf36d567a8bd33dff456efdaf11b5ba9d49b4d3bec6d8d29
const HEAD = [
	[
		1.594,
		.012,
		.062,
		.045,
		.03,
		2
	],
	[
		1.598,
		.03,
		.074,
		.03,
		0,
		2.3
	],
	[
		1.606,
		.044,
		.08,
		.02,
		-.015,
		2.4
	],
	[
		1.618,
		.051,
		.082,
		.015,
		-.025,
		2.5
	],
	[
		1.632,
		.0565,
		.084,
		.01,
		-.035,
		2.5
	],
	[
//#piece f9618e5259a8b101b1b57ebb50d6d889859fd88e6d8c7e708ae3b93c40597265
/** the lower face (under the nose's base) shorter than its first measure (v5): the chin less long */
for (const r of HEAD) if (r[0] < 1.668) {
	const d = 1.668 - r[0];
	r[0] = 1.668 - d + .13 * d * d / (d + .02);
}
const CHIN = /* @__PURE__ */ (() => HEAD[0][0])();
const CROWN = /* @__PURE__ */ (() => HEAD[HEAD.length - 1][0])();
/** the head's section at height y, smoothly between those given (Catmull-Rom) */
function sectionAt(y) {
	let i = 0;
	while (i < HEAD.length - 2 && y > HEAD[i + 1][0]) i++;
	const at = (k) => HEAD[Math.max(0, Math.min(HEAD.length - 1, k))];
//#piece 7c4430671979400b0923364cb4a419e92459b661f236b673611a4b8e31b0303e
/** the same, softened over a few millimetres up and down (from v5), so no row of the table shows as a crease */
function section(y) {
	const o = {
		w: 0,
		zf: 0,
		zs: 0,
		zb: 0,
		n: 0
	};
	for (const [dy, f] of [
		[-.006, 1],
		[-.003, 4],
		[0, 6],
		[.003, 4],
		[.006, 1]
	]) {
		const t = sectionAt(Math.min(CROWN, Math.max(CHIN, y + dy)));
		o.w += t.w * f / 16;
		o.zf += t.zf * f / 16;
		o.zs += t.zs * f / 16;
		o.zb += t.zb * f / 16;
		o.n += t.n * f / 16;
	}
	if (y < CHIN + .006 || y > CROWN - .006) o.w = Math.min(o.w, sectionAt(y).w);
	return o;
}
/** where the lips meet (as built for 1.80 m) and half the mouth's width */
const MOUTH = {
	y: 1.6505,
	w: .024
};
/** the eyes' middles (as built for 1.80 m), left and right of the face's middle by x */
const EYE = {
	x: .0325,
	y: 1.712,
	r: .0124
};
/** the bumps of the face under the skin: [x, y, reach across, reach up, how far forward] (mirrored left and right) */
const BUMPS = /* @__PURE__ */ (() => [
	[
		.034,
		1.712,
		.015,
		.0095,
		-.0085
	],
	[
		.03,
		1.737,
		.02,
		.006,
		.002
	],
	[
		.052,
		1.692,
		.012,
		.012,
		.005
	],
	[
		.05,
		1.655,
		.012,
		.012,
		-.0015
	],
	[
		0,
		1.613,
		.015,
		.009,
		.0045
	],
	[
		0,
		MOUTH.y + .002,
		.026,
		.016,
		.004
	],
	[
		0,
		MOUTH.y + .0135,
		.017,
		.0075,
		.0042
	],
	[
		.035,
		1.68,
		.015,
		.011,
		.0055
	],
	[
		.0275,
		MOUTH.y + .0068,
		.004,
		.005,
		-.0016
	]
])();
/** how far up the mouth turns at x (as built for 1.80 m): flat in its middle, its corners lifted into a smile */
const SMILE = (x) => {
	const q = (x / .022) ** 2;
	return .0062 * Math.min(1.15, .4 * q + .6 * q * q);
};
/** the nose, part of the surface: a ridge from the root between the eyes to its tip, rounding under the tip to the
*  lip; its wings either side of the tip */
function nose(x, y) {
	const ROOT = 1.722, TIP = 1.679;
	const BASE = 1.6675 + .0045 * Math.min(1, (x / .013) ** 2);
	if (y <= BASE || y >= ROOT) return 0;
	const p = y >= TIP ? .0195 * ((ROOT - y) / .04299999999999993) ** 1.35 : .0195 * ((y - BASE) / (TIP - BASE)) ** .9;
	const wx = .0052 + .0055 * (ROOT - Math.max(y, TIP)) / .04299999999999993;
	return p * Math.exp(-((x / wx) ** 2));
}
/** the lips, part of the surface: the upper, the lower and the line between them */
const LIPS = /* @__PURE__ */ (() => [
	[
		0,
		MOUTH.y + .0042,
		.022,
		.0036,
		.0034
	],
	[
		0,
		MOUTH.y - .0048,
		.019,
		.0048,
		.0045
	],
	[
		0,
		MOUTH.y,
		.024,
		.0011,
		-.0019
	]
])();
//#piece 377528ad524c188cf8d60694c4c2f545d8fe963491fcde5846f9cb85a5adbaa7
const onLips = (x, y) => Math.min(1, Math.max(0, (1 - Math.sqrt((x / (MOUTH.w - 5e-4)) ** 2 + ((y - SMILE(x) - MOUTH.y) / .0088) ** 2)) / .18));
/** a soft spot of the face, 0…1: 1 at (x, y) (mirrored when x is not 0), fading over rx, ry */
const spot = (p, x, y, rx, ry) => Math.exp(-(((Math.abs(p.x) - x) / rx) ** 2) - ((p.y - y) / ry) ** 2);
/** the skin's colour over the face: warmer on the cheeks and the nose's tip, a little shadow in the lids' crease, the
*  lips' colour on the lips */
const skinTone = (k) => {
	const base = new three.Color(k.skin), lips = new three.Color(k.lips), warm = new three.Color(k.skin).lerp(new three.Color("#d4655a"), .55);
	const shade = new three.Color(k.skin).multiplyScalar(.8), light = new three.Color(k.skin).lerp(new three.Color("#ffffff"), .25), c = new three.Color();
	return (p) => {
		if (p.z < .03) return k.skin;
		c.copy(base);
		c.lerp(warm, .32 * spot(p, .043, 1.68, .015, .012) + .22 * spot(p, 0, 1.676, .008, .007));
		c.lerp(shade, .35 * spot(p, .034, 1.7235, .012, .0035) + .18 * spot(p, .017, 1.715, .004, .006));
		c.lerp(light, .4 * spot(p, 0, MOUTH.y + .0135, .014, .0045) + .45 * spot(p, 0, 1.6685, .015, .0028));
		c.lerp(lips, .85 * onLips(p.x, p.y));
		return `#${c.getHexString()}`;
	};
};
const bump = (x, y) => nose(x, y) + LIPS.reduce((sum, [, by, rx, ry, dz]) => sum + dz * Math.exp(-((x / rx) ** 2) - ((y - SMILE(x) - by) / ry) ** 2), 0) + [
	...BUMPS,
	[
		.0112,
		1.6745,
		.0062,
		.0046,
		.0048
	],
	[
		0,
		1.677,
		.0068,
		.0058,
		.0026
//#piece 7c9c8f6093c94ae8c762ed3d13930e7e3b85488715ba025bf577e2d395f9acbf
function skinAt(x, y) {
	const { w, zf, zs, n } = section(y);
	const S = (1 - Math.min(1, Math.abs(x) / w) ** n) ** (1 / n);
	return zs + (zf - zs + bump(x, y)) * S;
//#piece 51431da619039d08939e879827f541daff14f06b2802caf404c544ccfc8fb075
const ROW_Y = /* @__PURE__ */ (() => (() => {
	const n = 2e3, ys = [], cum = [0];
	const dense = (y) => 1 + 3.2 * Math.exp(-(((y - 1.684) / .042) ** 2)) + 2 * Math.exp(-(((y - MOUTH.y) / .008) ** 2)) + 1.2 * Math.exp(-(((y - CHIN) / .01) ** 2)) + 1.2 * Math.exp(-(((y - CROWN) / .012) ** 2));
	for (let i = 0; i <= n; i++) {
		ys.push(CHIN + (CROWN - CHIN) * i / n);
//#piece 85b28a48469829a56020d5b3ca685fe27479f3b6f4bf5a491f92fa7c221f48bc
function headPoint(u, a) {
	const y = ROW_Y(u);
	const { w, zf, zs, zb, n } = section(y);
//#piece f739b4f718d8a2ddec30ed9fd5bc53523ca7a51c2cde3770d78bcf6ec93e68db
		sn >= 0 ? zs + (zf - zs + bump(x, y)) * S : zs - (zs - zb) * S
//#piece 8ddeb7e2b8bc15d6e4ea162b94866708bc1fe1506adba14b4e89fd94b76533e2
function headGrid(rows, cols, out = () => 0, keep = () => true) {
//#piece 0157a895474a42571421d7cf39fed00950b63a255d576d7f88ad0de00bc86c26
			const p = headPoint(i / rows, Math.PI / 2 + Math.PI * Math.sign(t) * Math.abs(t) ** 1.7);
//#piece debe9e8d787f033d56e9b9b166370299598e98ab9401bf2f172ad24a4854ef29
const HAIRLINE = /* @__PURE__ */ (() => [
	[0, 1.784],
	[.7, 1.773],
	[1.12, 1.746],
	[1.42, 1.726],
	[1.75, 1.718],
	[2.2, 1.7],
	[Math.PI, 1.668]
])();
function hairline(p) {
	const th = Math.abs(Math.atan2(p[0], p[2] + .005));
	let i = 0;
	while (i < HAIRLINE.length - 2 && th > HAIRLINE[i + 1][0]) i++;
	const [a0, h0] = HAIRLINE[i], [a1, h1] = HAIRLINE[i + 1];
//#piece 2f7c0329dc533dfa72fe54be06636f22ea831cf8a77376053a6d65a3aedaeee9
function hair(k) {
	if (k.hair === "none") return [];
	const thick = (p) => {
		const t = Math.min(1, Math.max(0, (p[1] - hairline(p)) / .028));
		const top = Math.min(1, Math.max(0, (p[1] - 1.75) / .05)), fore = Math.min(1, Math.max(0, .5 + p[2] / .12));
		return -.002 + (.0105 + .008 * top * (.4 + .6 * fore)) * t * t * (3 - 2 * t);
	};
	const out = [{
		geo: headGrid(84, 112, thick, (p) => p[1] > hairline(p) - .012),
//#piece ea2dc916d2cf8833e6dd6f5179e99fbfb72f42702003f657ab6776e9125f4a7e
/** a cap of a sphere of radius r round c, its middle towards `pole`, reaching `half` (radians) from it, turned by q */
function cap(c, r, pole, half, q, seg = 36) {
	const g = new three.SphereGeometry(r, seg, Math.max(4, Math.round(seg * half / Math.PI)), 0, Math.PI * 2, 0, half);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), pole.clone().normalize()));
	g.applyQuaternion(q);
	g.translate(...c);
	return g;
}
/** the front of a cap's edge (as `cap` lays it), as a line of points */
function capEdge(c, r, pole, half, q) {
	const u = pole.clone().normalize(), e1 = new three.Vector3(1, 0, 0), e2 = new three.Vector3().crossVectors(u, e1).normalize();
	const pts = [];
	for (let i = 0; i <= 48; i++) {
		const f = -Math.PI + Math.PI * i / 48;
		const v = u.clone().multiplyScalar(Math.cos(half)).add(e1.clone().multiplyScalar(Math.cos(f) * Math.sin(half))).add(e2.clone().multiplyScalar(Math.sin(f) * Math.sin(half))).multiplyScalar(r);
		if (v.z > .3 * r) pts.push(v.applyQuaternion(q).add(new three.Vector3(...c)));
	}
	return pts;
}
/** a lid: the direction of its cap's middle (up or down, leaning back by `lean`) and how far the cap reaches, so its
*  edge crosses the eye's front `front` (a share of its radius) above or below its middle */
function lid(front, lean, up) {
	const sy = up ? 1 : -1;
	return {
		pole: new three.Vector3(0, sy * Math.cos(lean), -Math.sin(lean)),
		half: Math.acos(Math.abs(front) * Math.cos(lean) - Math.sqrt(1 - front * front) * Math.sin(lean))
	};
}
/** the face, every feature set on the skin where it is (so none sinks into the head, none floats off it): from v5 each
*  eye a glossy ball in its socket — its white, an iris with a darker rim, a pupil, a catchlight — under two lids, curved
*  caps of skin round it, the upper one with its lash line; brows; nostrils; the line between the lips (the nose and
*  lips are part of the head's surface) */
function face(k) {
	const on = (x, y, out, s, rot, color, detail = [16, 12]) => ({
		geo: egg([
			x,
			y,
			skinAt(x, y) + out
		], s, rot, detail),
		color,
		bone: "head"
	});
	const out = [];
	const R = EYE.r, front = new three.Vector3(0, 0, 1), still = new three.Quaternion();
	const lidC = new three.Color(k.skin).multiplyScalar(.94).getHexString(), rim = new three.Color(k.iris).multiplyScalar(.45).getHexString();
	const upper = lid(.47, .78, true), lower = lid(-.34, 1.08, false);
	for (const [, x] of sides) {
		const ex = x * EYE.x, ey = EYE.y;
		const c = [
			ex,
			ey,
			skinAt(ex, ey) + .005 - R
		];
		const q = new three.Quaternion().setFromEuler(new three.Euler(0, x * .18, x * .07));
		out.push({
			geo: cap(c, R, front, Math.PI, still, 32),
			color: "#f4f0ea",
			bone: "head",
			mat: 1
		}, {
			geo: cap(c, R + 8e-5, front, .56, still),
			color: `#${rim}`,
			bone: "head",
			mat: 1
		}, {
			geo: cap(c, R + 16e-5, front, .5, still),
			color: k.iris,
			bone: "head",
			mat: 1
		}, {
			geo: cap(c, R + 24e-5, front, .2, still, 24),
			color: "#0d0b0a",
			bone: "head",
			mat: 1
		}, {
			geo: egg(new three.Vector3(-.3, .36, .88).normalize().multiplyScalar(R + 4e-4).add(new three.Vector3(...c)).toArray(), [
				9e-4,
				9e-4,
				4e-4
			], [
				0,
				0,
				0
			], [8, 6]),
			color: "#ffffff",
			bone: "head",
			mat: 1
		}, {
			geo: cap(c, R + 9e-4, upper.pole, upper.half, q),
			color: `#${lidC}`,
			bone: "head"
		}, {
			geo: cap(c, R + 4e-4, lower.pole, lower.half, q),
			color: k.skin,
			bone: "head"
		}, {
			geo: new three.TubeGeometry(new three.CatmullRomCurve3(capEdge(c, R + .0011, upper.pole, upper.half, q)), 28, 65e-5, 6, false),
			color: "#231915",
			bone: "head"
		}, {
			geo: new three.TubeGeometry(new three.CatmullRomCurve3(capEdge(c, R + 5e-4, lower.pole, lower.half, q)), 28, 3e-4, 5, false),
			color: "#9a6a5e",
			bone: "head"
		}, on(x * .0062, 1.6686, -.0012, [
			.0027,
			.0011,
			.003
		], [
			.45,
			0,
			x * .3
		], `#${new three.Color(k.skin).multiplyScalar(.42).getHexString()}`, [10, 6]));
	}
	for (const [, sx] of sides) {
		const pts = Array.from({ length: 9 }, (_, i) => {
			const u = i / 8, x = sx * (.015 + .036 * u), y = 1.7355 + .0038 * Math.sin(Math.PI * (.1 + .85 * u)) - .001 * u;
			return new three.Vector3(x, y, skinAt(x, y) + 2e-4);
		});
		const g = new three.TubeGeometry(new three.CatmullRomCurve3(pts), 20, 1, 8, false);
		const pos = g.attributes.position, cv = new three.CatmullRomCurve3(pts), v3 = new three.Vector3(), m = new three.Vector3();
		for (let v = 0; v < pos.count; v++) {
			const t = Math.floor(v / 9) / 20;
			cv.getPointAt(Math.min(1, t), m);
			v3.fromBufferAttribute(pos, v).sub(m).multiplyScalar(.0025 * (1 - .5 * t) * Math.min(1, .55 + 4 * t));
			v3.z *= .4;
			pos.setXYZ(v, m.x + v3.x, m.y + v3.y, m.z + v3.z);
		}
		g.computeVertexNormals();
		out.push({
			geo: g,
			color: `#${new three.Color(k.brows).lerp(new three.Color(k.skin), .08).getHexString()}`,
			bone: "head"
		});
	}
	const line = new three.CatmullRomCurve3(Array.from({ length: 15 }, (_, i) => {
		const x = -(MOUTH.w - 8e-4) + i * 2 * (MOUTH.w - 8e-4) / 14, y = MOUTH.y + SMILE(x);
		return new three.Vector3(x, y, skinAt(x, y) - 2e-4);
	}));
	out.push({
		geo: new three.TubeGeometry(line, 28, 75e-5, 6, false),
		color: `#${new three.Color(k.lips).multiplyScalar(.5).getHexString()}`,
		bone: "head"
	});
	return out;
}
function parts(k) {
//#piece a4847a6d50f197aab9999bd2bf8672a886b53f89fad7852b6d921700a96ddcb1
//#piece ce268140e5403f5fdabafbbd90c3020dd465a9b30f378390a88645683599faaa
			}
		},
		{
			geo: limb([
				0,
				1.64,
				-.012
			], [
				0,
				1.47,
				-.018
			], .061, .072),
//#piece 4c0051444e5a6d00b67140b8bcc24654cb1cd1eb64af8b17ca3f2e4f55ef7d22
			geo: headGrid(160, 136),
			color: skinTone(k),
			bone: "head"
		},
		...sides.map(([, x]) => ({
			geo: egg([
				x * (section(1.703).w - .001),
//#piece 4d1a3a1fa19f39e92a26aad2f9a5e337f3ffd413c0c3aec08bc041588dbf961e
		...face(k),
		...hair(k),
		...sides.flatMap(([s, x]) => [
//#piece 06447f9dbdc967f9504da010014ee0af8f838af8ef903a1224e61eed320c5ec0
function scaled(s, k) {
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
		parts: parts(k).map((p) => ({
//#piece 19bcdfabf8a43e56680481ed2dd89d0d71d10ee296ec04a72bfaca1a309b6978
//#piece 4a259cace8484c2abff57f1f1a41035845ad745aa35fb13c7e34175ae32f9794
//#piece c5cbed2be6223b3630756b8c993b9aa6f664a8a7730b4cc409e086b3e9ded4d6
function human(look = {}, height = HEIGHT) {
	const s = height / MEASURED;
	const { bones, parts: body } = scaled(s, {
		...LOOK,
		...look
	});
	const r = rig(bones, body, [skin(.74), skin(.12)]);
	r.object.name = "stand-in";
//#piece 9d3e9270b515b96f2ed9ee34f33eae4e172cbf22e5871dca3b78f6b33153d4f9
//#piece 6fa14bc9f71080dc6eed4f7571b8ed4b1ae2d47f88bfd3f617bd036efba60f78
//#region src/lib/actors/index.ts
/** the kinds' older versions, by id, each with its frozen variants (the rest are at v1) */
const HISTORY = /* @__PURE__ */ (() => ({ "stand-in": [
	{
		...FIRST,
		build: [{
			id: "stand-in",
			label: "Stand-in",
			note: "as at v1: bald, dark slits for eyes, a beak of a nose",
			make: () => human$4()
		}]
	},
	{
		v: 2,
		date: "2026-10-13",
		note: "A face and hair: eyes with their whites, irises, pupils and a glint, lids over them, a nose with a bridge and a tip, two lips, a finer skull; and hair (short, long, a bun, or none) in its own colour",
		build: [{
			id: "stand-in",
			label: "Stand-in",
			note: "as at v2: an egg of a skull, a small jaw ball under it",
			make: () => human$3()
		}]
	},
	{
		v: 3,
		date: "2026-10-13",
		note: "A real head: one sculpted surface on a skull’s proportions (22.8 cm chin to crown, 15.4 cm across, the eyes half way down, brows, nose base and chin a third of the face apart), with a brow ridge, eye sockets, cheekbones, a square jaw 10 cm across at its angle and a chin; ears from brow to nose base; the hair one layer grown from a hairline, thin at the line and full above it",
		build: [{
			id: "stand-in",
			label: "Stand-in",
			note: "as at v3: a neutral face",
			make: () => human$2()
		}]
	},
	{
		v: 4,
		date: "2026-10-13",
		note: "Friendly: a soft smile (the mouth’s corners lifted, fuller lips, dimples), the cheeks lifted with it, the eyes open with the lower lids raised a little, and thin arched brows raised a little",
		build: [{
			id: "stand-in",
			label: "Stand-in",
			note: "as at v4: lid pads, one flat skin colour",
			make: () => human$1()
		}]
	},
	{
		v: 5,
		date: "2026-10-13",
		note: "Real and warm: each eye a glossy ball in its socket (white, iris with a darker rim, pupil, catchlight) under two curved lids with a lash line; a toned skin (warm cheeks and nose tip, the lips’ colour, light under the nose); a round nose, a fuller upper lip and a wider warm smile; a shorter chin and a softer jaw; relaxed brows; fuller hair on top; a sturdier neck",
		build: [{
			id: "stand-in",
			label: "Stand-in",
			note: "as at v5: a head drawn by sums, its smile laid on",
			make: () => human()
		}]
	},
	{
		v: 6,
		date: "2026-10-13",
		note: "A sculpted head: MakeHuman’s head and neck (CC0), a man’s or a woman’s (`face`), smoothed; eyes in its lids with a lash line of single lashes, brows of single hairs, the lips’ colour by their shape, teeth one by one and a tongue, the hair grown over the scalp from a hairline with sideburns, round the ears; and a real smile as a blend shape (`joy`): the mouth open wide, the upper teeth showing, the eyes narrowed",
		build: [{
			id: "stand-in",
			label: "Stand-in",
			note: "as at v6: its smile open wide on the teeth",
			make: () => human$5({}, HEIGHT$5, 6)
		}]
	},
	{
		v: 7,
		date: "2026-10-14",
		note: "A warm smile in place of the open one (`joy`, its name kept): the lips stay closed, the mouth’s corners go up and wide, the cheeks lift and narrow the eyes from below",
		build: [{
			id: "stand-in",
			label: "Stand-in",
			note: "as at v7: its jaw’s underside on the neck",
			make: () => human$5({}, HEIGHT$5, 7)
		}]
	},
	{
		v: 8,
		date: "2026-10-14",
		note: "The jaw turns with the head: the whole jaw and chin ride the head bone, and the neck blends in below them, so no edge runs from the ear to the chin when the head turns",
		build: [{
			id: "stand-in",
			label: "Stand-in",
			note: "as at v8: a tiny glint in each eye, no friendly gaze",
			make: () => human$5({}, HEIGHT$5, 8)
		}]
	},
	{
		v: 9,
		date: "2026-10-14",
		note: "Friendlier eyes: a friendly gaze to wear all the time as its own blend shape (`friendly`: the lower lids lifted a little, the upper ones kept open, the brows raised a touch, no smile in it), and a soft catchlight on each pupil’s edge, 1.8 mm across with a lighter ring, lit a little from within so it shows at a medium close-up in any light",
		build: [{
			id: "stand-in",
			label: "Stand-in",
			note: "as at v9: its back teeth left without a colour",
			make: () => human$5({}, HEIGHT$5, 9)
		}]
	},
	{
		v: 10,
		date: "2026-10-15",
		note: "Every tooth coloured: the two molars behind the premolars are in the teeth’s table, so no point of the skin is left without a colour (350 had none)",
		build: [{
			id: "stand-in",
			label: "Stand-in",
			note: "as at v10: one look, 1.70 m",
			make: () => human$5({}, HEIGHT$5, 10)
		}]
	},
	{
		v: 11,
		date: "2026-10-16",
		note: "Built with how tall it is and its look (`height`, and `face`, `skin`, `hair`, `hairColour`, `shirt`, `trousers` and the rest, as ./human.ts LOOK has them): MaiaCity V1’s players and the people in its van, each their own; as v10 otherwise, and at v10’s 1.70 m and look when given none"
	}
] }))();
/** the stand-in's look, one parameter each after its height, in LOOK's order (./human.ts) */
const LOOK_KEYS = /* @__PURE__ */ (() => Object.keys(LOOK$5))();
const LOOK_LABELS = {
	skin: "Skin",
	brows: "Brows",
	shirt: "T-shirt",
	trousers: "Jeans",
	belt: "Belt",
	shoes: "Trainers",
	soles: "Soles",
	hair: "Hair (none, short, long, bun)",
	hairColour: "Hair colour",
	iris: "Eyes",
	lips: "Lips",
	face: "Face (man, woman)"
};
/** what the stand-in is built with from v11: its height (1.0 to 2.2 m) and its look, a colour or a word each */
const STAND_IN_PARAMS = /* @__PURE__ */ (() => [{
	id: "height",
	label: "Height (m)",
	type: "number",
	min: 1,
	max: 2.2,
	step: .01,
	value: HEIGHT$5
}, ...LOOK_KEYS.map((k) => ({
	id: k,
	label: LOOK_LABELS[k],
	type: "string",
	value: LOOK$5[k],
	maxLength: k === "hair" || k === "face" ? 8 : 16
}))])();
const HAIRS = [
	"none",
	"short",
	"long",
	"bun"
];
/** a look from the parameters after the height, in LOOK's order: a hair or a face it does not know is LOOK's */
function lookOf(given) {
	const out = {};
	LOOK_KEYS.forEach((k, i) => given[i] !== void 0 && (out[k] = String(given[i])));
	if (out.hair !== void 0 && !HAIRS.includes(out.hair)) delete out.hair;
	if (out.face !== void 0 && out.face !== "man" && out.face !== "woman") delete out.face;
	return out;
}
const LIST = /* @__PURE__ */ (() => [{
	id: "stand-in",
	label: "Stand-in",
	note: "a person of 1.70 m with a face and hair, rigged head to toe — 17 bones under one skin, any pose, any move",
	from: "the room: Day 01, Day 02",
	params: STAND_IN_PARAMS,
	variants: [{
		id: "stand-in",
		label: "Stand-in",
		note: "a person of 1.70 m",
		make: (height, ...look) => human$5(lookOf(look), height)
	}]
//#piece d154497429959619d3c0ac3645c575d8b5f1cbae64bbf97db523f3a1a0587006

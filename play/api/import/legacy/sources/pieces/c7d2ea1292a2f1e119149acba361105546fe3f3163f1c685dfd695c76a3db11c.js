*/
const LOOK = {
	robin: {
		k: 1,
		bill: [
			.012,
			.0028,
			"#2a2420"
		],
		legs: "#8a7a6a",
		wing: "#6e5c42",
		tail: "#6a5840"
	},
	blackbird: {
		k: 1.55,
		bill: [
			.016,
			.0034,
			"#f2a51c"
		],
		legs: "#2a2624",
		ring: "#f2b23a",
		wing: "#161515",
		tail: "#141313"
	},
	greattit: {
		k: .96,
		bill: [
			.009,
			.0028,
			"#1c1c1e"
		],
		legs: "#5a6a7a",
		wing: "#6d8197",
		bars: "#f2f2ec",
		tail: "#5f6f82"
	},
	sparrow: {
		k: 1.04,
		bill: [
			.0095,
			.0042,
			"#2c2a2a"
		],
		legs: "#a08a72",
		wing: "#7a5434",
		bars: "#f0ece2",
		tail: "#5e4630"
	},
	chaffinch: {
		k: 1.05,
		bill: [
			.0105,
			.004,
			"#7c8a96"
		],
		legs: "#8a7a70",
		wing: "#232222",
		bars: "#f4f2ec",
		tail: "#2c2a2a"
	}
};
/** a robin's joints (m); the others are its measure times their size */
const ROBIN = {
	body: [
		0,
		.052,
		0
	],
	neck: [[
		0,
		.064,
		.016
	], [
		0,
		.071,
		.021
	]],
	head: [
		0,
		.078,
		.024
	],
	beak: [
		0,
		.077,
		.044
	],
	tail: [
		0,
		.052,
		-.026
	],
	wing: [
		.016,
		.064,
		.012
	],
	leg: [
		[
			.008,
			.045,
			.002
		],
		[
			.009,
			.036,
			.011
		],
		[
			.009,
			.0245,
			-.002
		],
		[
			.009,
			.002,
			.003
		],
		[
			.009,
			0,
			.015
		]
	]
};
/** how far the whole bird above its legs sits lower than the robin's joints say (its legs mostly hidden in its feathers) */
const SINK = .011;
/** a robin's point, sunk @param {number[]} p @returns {number[]} */
const sunk = (p) => [
	p[0],
	p[1] - SINK,
	p[2]
];
/** a point scaled by k @param {number[]} p @param {number} k @returns {V3} */
const at = (p, k) => [
	p[0] * k,
	p[1] * k,
	p[2] * k
];
const SPAN_F = /* @__PURE__ */ (() => new three.Vector3(0, -.3, -1).normalize())();
const LEAD_F = /* @__PURE__ */ (() => new three.Vector3(0, 1, -.3).normalize())();
const NORM_F = /* @__PURE__ */ (() => SPAN_F.clone().cross(LEAD_F))();
const FOLDED = /* @__PURE__ */ (() => new three.Matrix4().makeBasis(SPAN_F, LEAD_F, NORM_F))();
const SPREAD = /* @__PURE__ */ (() => new three.Matrix4().makeBasis(new three.Vector3(1, 0, 0), new three.Vector3(0, 0, 1), new three.Vector3(1, 0, 0).cross(new three.Vector3(0, 0, 1))))();
/** folded → spread, as a turn of the wing bone (the left wing) */
const OPEN = /* @__PURE__ */ (() => new three.Quaternion().setFromRotationMatrix(SPREAD.clone().multiply(FOLDED.clone().transpose())))();
const FLAP = /* @__PURE__ */ (() => new three.Quaternion())();
const QW = /* @__PURE__ */ (() => new three.Quaternion())();
const EW = /* @__PURE__ */ (() => new three.Euler())();
/**
* The wing bone's turn: `open` 0 (folded) … 1 (spread), `beat` how far the spread wing is raised (rad; negative: down),
* `sweep` how far it is swept back; the right wing the left's mirror.
* @param {'L' | 'R'} side @param {number} open @param {number} beat @param {number} [sweep]
* @returns {[number, number, number]}
*/
function wingTurn(side, open, beat, sweep = 0) {
	FLAP.setFromEuler(EW.set(0, -sweep, beat, "YZX"));
	FLAP.multiply(OPEN);
	QW.set(0, 0, 0, 1).slerp(FLAP, open);
	if (side === "R") QW.set(QW.x, -QW.y, -QW.z, QW.w);
	EW.setFromQuaternion(QW, "XYZ");
	return [
		EW.x,
		EW.y,
		EW.z
	];
}
/**
* A wing, folded at rest along the flank from `shoulder`: `span` long, `chord` deep at its root, the primaries'
* tips notched along its trailing edge; coloured by `color` (its bars).
* @param {V3} shoulder @param {number} span @param {number} chord @param {number} x which side (1 left, −1 right)
* @param {(u: number, v: number) => string} color by how far along the span (0…1) and back from the leading edge (0…1)
* @param {string} bone
* @returns {PartSpec}

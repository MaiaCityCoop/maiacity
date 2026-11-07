//#piece e879da17c4aa97eac47f13e9ac31df760a9a12790169ad5d1261bd195f4f2ac9
const SIDES = [["L", 1], ["R", -1]];
const PAINT = "#f0a90f";
const DARK = "#2b2c2e";
const STEEL = "#8c9094";
const CHROME = "#d8d8d6";
const SEAT = "#3a3b3d";
//#piece 3d8e5a77b519fbff6ef447b7ebf8fc0d3bbe59ccb60a9126d638967d582581f5
//#piece 036ad15dcdfabce97206dda7714f0f090c7a43a21096f014e9d25494c29a2fe6
//#piece 534fc9588c3a86a3b3c73be38a571137eea1e521d17e305c81ed4d03582708fe
function spoke(r, x, y, z, a) {
//#piece 7d4cc5566ae6f69b5c31a98037eb413189e39e4c291343957477499546c3a7ec
function bucketParts({ pivot, R, w, teeth, pin, plate = R * .06 }) {
//#piece 8b514208cc33268ddccd196c04ec8ca5a5a332bc90d31884e1f6f11ae6bfe974
		geo: beam(at(from + (to - from) * i / n), at(from + (to - from) * (i + 1) / n), w, plate, plate * .25),
		color: DARK,
//#piece efa4d504fa5f9028e0963e227eae371cbbd7bc18bfdc28e317754eb9c6d747f2
		out.push({
			geo: g,
			color: DARK,
//#piece dc03fb04658ee3613b50d9dc5853b274592413550e34697580284ab49f0297a3
//#piece 0c18a3581d9ec5e0bd7f751281466daacd03d65c10d60fc7c3473640dfc498ae
			color: STEEL,
			bone: "bucket"
		});
	}
	for (const sx of [-1, 1]) out.push({
		geo: beam([
			sx * w * .22,
			py + R * .12,
			pz - R * .15
		], [
			sx * w * .22,
			pin[1],
			pin[2]
		], R * .12, R * .5, R * .04),
		color: DARK,
//#piece 089a79e73138bcfd0758825683e597b4617355824b2e780e28e89918376971dd
			color: PAINT,
			bone: `${name}Barrel`
		}, {
			geo: limb(ram.b, rodEnd, ram.r * .5, ram.r * .5),
			color: CHROME,
			bone: `${name}Rod`
		}];
	});
}
/** @param {number} th @param {number} y @param {number} z @returns {[number, number]} */
const rot = (th, y, z) => [y * Math.cos(th) - z * Math.sin(th), y * Math.sin(th) + z * Math.cos(th)];
/** the angle of (y, z) the way a turn about x counts it @param {number} y @param {number} z */
const ang = (y, z) => Math.atan2(z, y);
/**
//#piece efac18fc73282911241f17a5655a1aa3b645773c5b6084766aff95e9d60bf800
function rams(spec, boom, arm, bucket) {
//#piece cc694ecee2d901c716b4c979975c8e0881fdf0fcf3b2bbb99081e96cffcad9c0
			[y, z] = rot(th, y - j[1], z - j[2]);
//#piece aec7018ee33d16cd067b8fb5218bfc469df7ba746d66d6fc5618848dbb9426f1
		const now = ang(b[0] - a[0], b[1] - a[1]) - ang(ram.b[1] - ram.a[1], ram.b[2] - ram.a[2]);
//#piece f514b108424ddcd6665be3741e3c47400e2413f2664f574d0ab409b3ba1a61cb
function machine(spec, { slew = 0, swing = 0, boom = 0, arm = 0, bucket = 0, blade = 0, wheels = 0, root }) {
//#piece 4915b4a39fc16d0d4a28e9c5cfa9cedc6e86985805f15c421bd69a882dbbdb60
		...rams(spec, boom, arm, bucket)
	};
	if (spec.J.blade) p.blade = [
		blade,
		0,
		0
	];
	for (const [s] of SIDES) for (const w of ["sprocket", "idler"]) p[`${w}${s}`] = [
		wheels,
		0,
		0
	];
	if (root) p.root = root;
	return p;
}
/** smoothly from 0 to 1 @param {number} x */
const ease = (x) => x * x * (3 - 2 * x);
/** Between key poses (each at its time in the cycle, 0…1), eased. @param {[number, Joints][]} keys @param {number} u @returns {Joints} */
//#piece 5f42d815e38ecb3f11fd13341515f2f56c4bb1b129226ff63ecd960e98008d3b
//#piece 2549435751bababc29f4fe0a1f1fd323a2980940b6e4f22dd519ae7427b5c3af
		...SIDES.flatMap(([s, x]) => [{
//#piece 899801af50b3d44a744c0fc0b2654e05d29687647f6ecc0ce11dc4f9dc12e905
	const m = (j) => machine(spec, j);
	/** @type {Record<string, import('./rig').Clip>} */
	const clips = {
		dig: (t) => m(through([
//#piece 7593c722f73a914847702497c1c7be92093442698d3dc0a6963eb8138d126a0f
		const dist = 1.2 * (u < .5 ? ease(u * 2) : ease(2 - u * 2));
		const blade = u < .45 ? .03 : u < .55 ? .03 - .28 * ease((u - .45) * 10) : u < .95 ? -.25 : -.25 + .28 * ease((u - .95) * 20);
//#piece be0a4c4cea6f7eaad660c590622b8e6cee098bd96d15fd108c8e01680ce1514c
//#region src/lib/actors/crawler-excavator.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Piece} Piece */
/** @typedef {import('./excavator-rig.js').Spec} Spec */
const WEIGHT = "#3a3b3d";
const GLASS = "#a9c3cd";
const LAMP = "#ffe9b0";
const AMBER = "#ffb000";
const X = -.03;
const J = {
	base: [
		0,
		.5,
		0
	],
	house: [
		0,
		.98,
		0
	],
	swing: [
		X,
		1.55,
		1.2
	],
	boom: [
		X,
		1.55,
		1.2
	],
	arm: [
		X,
		3.45,
		4.75
	],
	bucket: [
		X,
		1,
		5.25
	]
};
const KNEE = [
	X,
	3.75,
	2.85
];
/** @type {Record<string, import('./excavator-rig.js').Ram>} */
const RAMS = {
	boomRamL: {
		a: [
			.32999999999999996,
			1.25,
			1.7
		],
		b: [
			.32999999999999996,
			3.08,
			2.88
		],
		on: ["swing", "boom"],
		r: .085
	},
	boomRamR: {
		a: [
			-.39,
			1.25,
			1.7
		],
		b: [
			-.39,
			3.08,
			2.88
		],
		on: ["swing", "boom"],
		r: .085
	},
	armRam: {
		a: [
			X,
			3.11,
			1.87
		],
		b: [
			X,
			4.15,
			4.55
		],
		on: ["boom", "arm"],
		r: .095
	},
	bucketRam: {
		a: [
			X,
			3.23,
			5.15
		],
		b: [
			X,
			1.25,
			5.55
		],
		on: ["arm", "bucket"],
		r: .08
	}
};
/** the tracks: centres, the wheels' axle height and radius, sprocket (back) and idler (front), the shoes' loop */
const T = {
	x: .995,
	w: .5,
	y: .45,
	r: .35,
	back: -1.45,
	front: 1.45,
	loop: .38
};
/** The shoes of one track, round its loop: each a plate and its grouser, laid every 19 cm along the loop. */
/** @param {number} tx @returns {THREE.BufferGeometry[]} */
function shoes(tx) {
	const run = T.front - T.back, arc = Math.PI * T.loop, total = 2 * run + 2 * arc, pitch = .19;
	/** where along the loop (0…total) a shoe is, and which way is out @param {number} s @returns {[number, number, number, number]} */
	const along = (s) => {
		if (s < run) return [
			T.y + T.loop,
			T.back + s,
			1,
			0
		];
		s -= run;
		if (s < arc) {
			const a = s / T.loop;
			return [
				T.y + Math.cos(a) * T.loop,
				T.front + Math.sin(a) * T.loop,
				Math.cos(a),
				Math.sin(a)
			];
		}
		s -= arc;
		if (s < run) return [
			T.y - T.loop,
			T.front - s,
			-1,
			0
		];
		s -= run;
		const a = Math.PI + s / T.loop;
		return [
			T.y + Math.cos(a) * T.loop,
			T.back + Math.sin(a) * T.loop,
			Math.cos(a),
			Math.sin(a)
		];
	};
	/** @type {THREE.BufferGeometry[]} */
	const out = [];
	const n = Math.round(total / pitch);
	for (let i = 0; i < n; i++) {
		const [y, z, ny, nz] = along(i * total / n);
		const basis = new three.Matrix4().makeBasis(new three.Vector3(1, 0, 0), new three.Vector3(0, ny, nz), new three.Vector3(0, -nz, ny));
		basis.setPosition(tx, y, z);
		const plate = new three.BoxGeometry(T.w, .05, pitch * .92);
		plate.applyMatrix4(basis);
		const grouser = new three.BoxGeometry(T.w, .035, .03).translate(0, .042, 0);
		grouser.applyMatrix4(basis);
		out.push(plate, grouser);
	}
	return out;
}
/** Every part, riding its joint. @returns {Piece[]} */
function parts() {
	/** @type {Piece[]} */
	const out = [];
	/** @param {THREE.BufferGeometry} geo @param {string} color @param {string} bone @param {number} [mat] */
	const add = (geo, color, bone, mat = 0) => out.push({
		geo,
		color,
		bone,
		mat
	});
	add(block(.95, .42, 1.7, [
		0,
		.62,
		0
	], .04), DARK, "base");
	add(block(1.7, .3, .9, [
		0,
		.58,
		0
	], .04), DARK, "base");
	add(new three.CylinderGeometry(.78, .78, .12, 36).translate(0, .9, 0), DARK, "base");
	for (const [s, x] of SIDES) {
		const tx = x * T.x;
		add(block(.36, .42, T.front - T.back + .1, [
			tx,
			T.y,
			0
		], .03), DARK, "base");
		for (const g of shoes(tx)) add(g, STEEL, "base");
		for (let i = 0; i < 7; i++) add(wheel(.1, .26, [
			tx,
			.2,
			-1.08 + i * .36
		], 14), STEEL, "base");
		for (const z of [-.5, .5]) add(wheel(.08, .2, [
			tx,
			T.y + T.loop - .105,
			z
		], 14), STEEL, "base");
		for (const [w, z] of [["sprocket", T.back], ["idler", T.front]]) {
			add(wheel(T.r - .02, .32, [
				tx,
				T.y,
				z
			], 24), DARK, `${w}${s}`);
			for (let k = 0; k < 3; k++) add(spoke(T.r - .04, tx + x * .17, T.y, z, k * Math.PI / 3), STEEL, `${w}${s}`);
		}
		add(wheel(.24, .22, [
			tx - x * .26,
			T.y,
			T.back
		], 20), DARK, "base");
	}
	add(block(2.45, .22, 3.75, [
		0,
		1.1,
		-.3
	], .03), DARK, "house");
	const weight = new three.CylinderGeometry(2.25, 2.25, .85, 40, 1, false, Math.PI - .6, 1.2);
	weight.translate(0, 1.64, 0);
	add(weight, WEIGHT, "house");
	add(block(2.25, .85, 1.3, [
		-.05,
		1.64,
		-1.3
	], .06), PAINT, "house");
	for (let i = 0; i < 6; i++) add(block(.9, .012, .05, [
		-.45,
		2.075,
		-1.75 + i * .12
	], .004), DARK, "house");
	add(limb([
		-.62,
		2.05,
		-.95
	], [
		-.62,
		2.62,
		-.95
	], .055, .05), DARK, "house");
	add(block(.95, .95, 1.55, [
		-.73,
		1.68,
		.78
	], .05), PAINT, "house");
	add(block(.9, .02, .5, [
		-.73,
		1.45,
		1.56
	], .005), DARK, "house");
	for (const z of [
		.1,
		.8,
		1.5
	]) add(limb([
		-1.17,
		2.15,
		z
	], [
		-1.17,
		2.62,
		z
	], .022, .022), PAINT, "house");
	add(limb([
		-1.17,
		2.62,
		.1
	], [
		-1.17,
		2.62,
		1.5
	], .022, .022), PAINT, "house");
	add(block(.42, .05, .28, [
		-1,
		1,
		1.72
	], .01), STEEL, "house");
	add(block(.62, .5, .75, [
		X,
		1.45,
		1.2
	], .05), PAINT, "house");
	for (const sx of [-1, 1]) add(block(.12, .3, .42, [
		X + sx * .36,
		1.25,
		1.62
	], .02), DARK, "swing");
	const cx = .7, cz = .1, cw = 1, cd = 1.7;
	add(block(cw, .25, cd, [
		cx,
		1.345,
		cz
	], .03), DARK, "house");
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(block(.07, 1.7, .07, [
		cx + sx * (cw / 2 - .035),
		4.14 / 2,
		cz + sz * (cd / 2 - .035)
	], .01), DARK, "house");
	add(block(1.06, .09, 1.76, [
		cx,
		2.9499999999999997,
		cz
	], .03), PAINT, "house");
	const gy = 4.39 / 2, gh = 1.43;
	add(block(.92, gh, .012, [
		cx,
		gy,
		.95 - .02
	]), GLASS, "house", 1);
	add(block(.92, gh, .012, [
		cx,
		gy,
		-.73
	]), GLASS, "house", 1);
	for (const sx of [-1, 1]) add(block(.012, gh, 1.6199999999999999, [
		cx + sx * (cw / 2 - .02),
		gy,
		cz
	]), GLASS, "house", 1);
	add(block(.05, gh, .04, [
		1.18,
		gy,
		-.04999999999999999
	], .01), DARK, "house");
	add(block(.05, .03, .18, [
		1.22,
		2.05,
		.5
	], .01), DARK, "house");
	add(block(.5, .12, .5, [
		cx,
		1.62,
		-.04999999999999999
	], .04), SEAT, "house");
	add(block(.5, .65, .12, [
		cx,
		1.98,
		-.31999999999999995
	], .05), SEAT, "house");
	for (const sx of [-1, 1]) {
		add(block(.14, .3, .5, [
			cx + sx * .36,
			1.6,
			.05
		], .03), DARK, "house");
		add(limb([
			cx + sx * .36,
			1.76,
			.22
		], [
			cx + sx * .36,
			1.92,
			.25
		], .015, .015), DARK, "house");
	}
	add(limb([
		1.26,
		1.3,
		.85
	], [
		1.26,
		2.6,
		.85
	], .02, .02), DARK, "house");
	add(limb([
		1.2,
		2.55,
		.95
	], [
		1.45,
		2.6,
		1.05
	], .012, .012), DARK, "house");
	add(block(.04, .28, .18, [
		1.47,
		2.52,
		1.05
	], .01), DARK, "house");
	add(new three.SphereGeometry(.07, 12, 8).translate(1, 3.05, -.5), AMBER, "house");
	add(block(.12, .08, .06, [
		.39999999999999997,
		2.98,
		.95
	], .01), LAMP, "house");
	add(beam(J.boom, KNEE, .5, .62, .04), PAINT, "boom");
	add(beam(KNEE, J.arm, .48, .52, .04), PAINT, "boom");
	add(wheel(.13, .66, J.boom), STEEL, "boom");
	add(wheel(.12, .6, J.arm), STEEL, "boom");
	for (const sx of [-1, 1]) add(beam([
		X + sx * .3,
		3.35,
		2.55
	], [
		X + sx * .36,
		RAMS.boomRamL.b[1],
		RAMS.boomRamL.b[2]
	], .08, .3, .02), PAINT, "boom");
	add(beam([
		X,
		2.87,
		2.19
	], RAMS.armRam.a, .3, .2, .02), PAINT, "boom");
	add(block(.14, .1, .08, [
		.27,
		3.65,
		2.95
	], .01), LAMP, "boom");
	add(beam(J.arm, J.bucket, .42, .5, .04), PAINT, "arm");
	add(beam(J.arm, RAMS.armRam.b, .36, .34, .03), PAINT, "arm");
	add(beam([
		X,
		3.16,
		4.81
	], RAMS.bucketRam.a, .26, .2, .02), PAINT, "arm");
	add(wheel(.1, .52, J.bucket), STEEL, "arm");
	out.push(...bucketParts({
		pivot: J.bucket,
		R: .5,
		w: 1,
		teeth: 5,
		pin: RAMS.bucketRam.b,
		plate: .035
	}));
	out.push(...ramParts(RAMS));
	return out;
}
/** @type {Spec} */
const CRAWLER = /* @__PURE__ */ (() => ({
	name: "crawler excavator",
	J,
	rams: RAMS,
	wheels: {
		x: T.x,
		y: T.y,
		sprocket: T.back,
		idler: T.front,
		r: T.r
	},
	parts,
	poses: {
		tucked: {
			boom: -.35,
			arm: -.95,
			bucket: .4
		},
		reach: {
			boom: .38,
			arm: .65,
			bucket: -1.3
		},
		curled: {
			boom: .48,
			arm: -.25,
			bucket: .7
		},
		lifted: {
			boom: -.15,
			arm: -.3,
			bucket: .6
		},
		dump: {
			boom: -.15,
			arm: .25,
			bucket: -1.4
		}
	},
	slew: 1.6,
	period: 12,
	speed: 1,
	materials: [skin(.08, {
		transparent: true,
		opacity: .32,
		depthWrite: false
	})]
}))();
/** Build the crawler excavator and its moves: dig, drive, idle. */
const crawlerExcavator = () => excavatorCast(CRAWLER);
//#piece d75aea4541bd4c6f9a0e5cf85614f67f7de4302c28fe65017d658d8d14706c6c
const HISTORY = /* @__PURE__ */ (() => ({ "excavator-large": [{
	v: 1,
	date: "2026-10-06",
	note: "A 14-tonne crawler excavator built as one: steel tracks, an enclosed cab, a mono boom on two rams, no blade (the Excavator’s big variant until 18 Oct 2026, now its own asset)"
}] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "excavator-large",
	label: "Large excavator",
	note: "a crawler excavator of 14 t, rigged: the house slews, boom, arm and bucket work on their rams, the wheels turn; it digs, slews and dumps, and drives",
	from: "Sandbox 1: building the settlement",
	variants: [{
		id: "excavator-large",
		label: "Large · 14 t",
		note: "steel tracks, an enclosed cab, a mono boom on two rams, a 1 m bucket, 8.3 m reach",
		make: () => crawlerExcavator()
//#piece 20511e453deb92755bacd120421d0eb6ad8a5a0f798a0e64253b61fe9748854f

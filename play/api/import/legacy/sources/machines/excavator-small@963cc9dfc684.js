//#piece e879da17c4aa97eac47f13e9ac31df760a9a12790169ad5d1261bd195f4f2ac9
const SIDES$2 = [["L", 1], ["R", -1]];
const PAINT$2 = "#f0a90f";
const DARK$2 = "#2b2c2e";
const STEEL$2 = "#8c9094";
const RUBBER$2 = "#1d1e20";
const CHROME$2 = "#d8d8d6";
const SEAT$2 = "#3a3b3d";
/** a box w × h × len from a to b, turned along the line */
/** @param {V3} a @param {V3} b @param {number} w @param {number} h @param {number} [r] */
function beam$2(a, b, w, h, r = .02) {
//#piece 3bb7cb240f7960e4a78fe604269f5bf1b915f015253d2b755a3e72e9fe816c4b
//#piece a49be102c24c9f4b4a75b5e1fa1a0b256679f88fef7eff1be81f62bfc59f9e3a
function block$2(w, h, d, at, r = .02) {
	const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
	g.translate(...at);
	return g;
}
/** a wheel turning about x: radius r, width w, at */
/** @param {number} r @param {number} w @param {V3} at @param {number} [seg] */
function wheel$2(r, w, at, seg = 18) {
	const g = new three.CylinderGeometry(r, r, w, seg);
	g.rotateZ(Math.PI / 2);
	g.translate(...at);
	return g;
}
//#piece 534fc9588c3a86a3b3c73be38a571137eea1e521d17e305c81ed4d03582708fe
function spoke$2(r, x, y, z, a) {
//#piece 7d4cc5566ae6f69b5c31a98037eb413189e39e4c291343957477499546c3a7ec
function bucketParts$2({ pivot, R, w, teeth, pin, plate = R * .06 }) {
//#piece 8b514208cc33268ddccd196c04ec8ca5a5a332bc90d31884e1f6f11ae6bfe974
		geo: beam$2(at(from + (to - from) * i / n), at(from + (to - from) * (i + 1) / n), w, plate, plate * .25),
		color: DARK$2,
//#piece efa4d504fa5f9028e0963e227eae371cbbd7bc18bfdc28e317754eb9c6d747f2
		out.push({
			geo: g,
			color: DARK$2,
//#piece dc03fb04658ee3613b50d9dc5853b274592413550e34697580284ab49f0297a3
//#piece 0c18a3581d9ec5e0bd7f751281466daacd03d65c10d60fc7c3473640dfc498ae
			color: STEEL$2,
			bone: "bucket"
		});
	}
	for (const sx of [-1, 1]) out.push({
		geo: beam$2([
			sx * w * .22,
			py + R * .12,
			pz - R * .15
		], [
			sx * w * .22,
			pin[1],
			pin[2]
		], R * .12, R * .5, R * .04),
		color: DARK$2,
//#piece 089a79e73138bcfd0758825683e597b4617355824b2e780e28e89918376971dd
			color: PAINT$2,
			bone: `${name}Barrel`
		}, {
			geo: limb(ram.b, rodEnd, ram.r * .5, ram.r * .5),
			color: CHROME$2,
			bone: `${name}Rod`
		}];
	});
}
/** @param {number} th @param {number} y @param {number} z @returns {[number, number]} */
const rot$2 = (th, y, z) => [y * Math.cos(th) - z * Math.sin(th), y * Math.sin(th) + z * Math.cos(th)];
/** the angle of (y, z) the way a turn about x counts it @param {number} y @param {number} z */
const ang$2 = (y, z) => Math.atan2(z, y);
/**
//#piece efac18fc73282911241f17a5655a1aa3b645773c5b6084766aff95e9d60bf800
function rams$2(spec, boom, arm, bucket) {
//#piece cc694ecee2d901c716b4c979975c8e0881fdf0fcf3b2bbb99081e96cffcad9c0
			[y, z] = rot$2(th, y - j[1], z - j[2]);
//#piece aec7018ee33d16cd067b8fb5218bfc469df7ba746d66d6fc5618848dbb9426f1
		const now = ang$2(b[0] - a[0], b[1] - a[1]) - ang$2(ram.b[1] - ram.a[1], ram.b[2] - ram.a[2]);
//#piece f514b108424ddcd6665be3741e3c47400e2413f2664f574d0ab409b3ba1a61cb
function machine$2(spec, { slew = 0, swing = 0, boom = 0, arm = 0, bucket = 0, blade = 0, wheels = 0, root }) {
//#piece 4915b4a39fc16d0d4a28e9c5cfa9cedc6e86985805f15c421bd69a882dbbdb60
		...rams$2(spec, boom, arm, bucket)
	};
	if (spec.J.blade) p.blade = [
		blade,
		0,
		0
	];
	for (const [s] of SIDES$2) for (const w of ["sprocket", "idler"]) p[`${w}${s}`] = [
		wheels,
		0,
		0
	];
	if (root) p.root = root;
	return p;
}
/** smoothly from 0 to 1 @param {number} x */
const ease$2 = (x) => x * x * (3 - 2 * x);
/** Between key poses (each at its time in the cycle, 0…1), eased. @param {[number, Joints][]} keys @param {number} u @returns {Joints} */
function through$2(keys, u) {
//#piece 33db15a490bbeecb10a780bfe8e3832cb6d0dc28c84a88b7651070e6ae1ca5c5
	const k = ease$2(Math.min(1, Math.max(0, (u - t0) / (t1 - t0))));
//#piece d96c5ee309bc48afb2da16e150c3016e26ebe2f75e175322ea3874bac16d4079
//#piece 2549435751bababc29f4fe0a1f1fd323a2980940b6e4f22dd519ae7427b5c3af
		...SIDES$2.flatMap(([s, x]) => [{
//#piece 899801af50b3d44a744c0fc0b2654e05d29687647f6ecc0ce11dc4f9dc12e905
	const m = (j) => machine$2(spec, j);
	/** @type {Record<string, import('./rig').Clip>} */
	const clips = {
		dig: (t) => m(through$2([
//#piece 7593c722f73a914847702497c1c7be92093442698d3dc0a6963eb8138d126a0f
		const dist = 1.2 * (u < .5 ? ease$2(u * 2) : ease$2(2 - u * 2));
		const blade = u < .45 ? .03 : u < .55 ? .03 - .28 * ease$2((u - .45) * 10) : u < .95 ? -.25 : -.25 + .28 * ease$2((u - .95) * 20);
//#piece be0a4c4cea6f7eaad660c590622b8e6cee098bd96d15fd108c8e01680ce1514c
//#region src/lib/actors/excavator.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Piece} Piece */
/** @typedef {import('./excavator-rig.js').Spec} Spec */
const J$2 = {
//#piece be4cd697ea540172ed5b45e803b5d3a482db247123ed91145cca4098379f1a5f
/** @type {Record<string, import('./excavator-rig.js').Ram>} */
const RAMS$2 = {
//#piece 2f1ea4699a0f2f8563aa1a774f2322c767d824376174ff6f2893087699210b4c
const TRACK_X$2 = .37;
const TRACK_W$2 = .25;
const TRACK_L$2 = 1.55;
const WHEEL$2 = .17;
/** Every part, riding its joint. */
/** @returns {Piece[]} */
function parts$2() {
//#piece 2b2a19d07037358e7730f932c89b01f32d3eeb1dc740a77cd85237c4c5894f97
	add(block$2(.5, .2, 1.1, [
		0,
		.3,
		0
	]), DARK$2, "base");
	add(new three.CylinderGeometry(.42, .42, .08, 28).translate(0, .44, 0), DARK$2, "base");
	for (const [s, x] of SIDES$2) {
		const tx = x * TRACK_X$2;
		add(block$2(TRACK_W$2 * .6, .14, 1.15, [
			tx,
			.2,
			0
		]), DARK$2, "base");
		add(block$2(TRACK_W$2, .05, TRACK_L$2 - 2 * WHEEL$2, [
			tx,
			.34500000000000003,
			0
		]), RUBBER$2, "base");
		add(block$2(TRACK_W$2, .05, TRACK_L$2 - 2 * WHEEL$2, [
			tx,
			.025,
			0
		]), RUBBER$2, "base");
		for (const ez of [-1, 1]) {
			const g = new three.CylinderGeometry(.2, .2, TRACK_W$2, 20, 1, true, ez > 0 ? 0 : Math.PI, Math.PI);
			g.rotateZ(Math.PI / 2);
			g.translate(tx, .17500000000000002, ez * (TRACK_L$2 / 2 - WHEEL$2));
			add(g, RUBBER$2, "base");
		}
		for (let i = 0; i < 10; i++) {
			const z = -.575 + i * ((TRACK_L$2 - 2 * WHEEL$2 - .06) / 9);
			add(block$2(TRACK_W$2, .025, .04, [
				tx,
				0,
				z
			], .005), RUBBER$2, "base");
			add(block$2(TRACK_W$2, .025, .04, [
				tx,
				.375,
				z
			], .005), RUBBER$2, "base");
		}
		for (const [w, ez] of [["sprocket", -1], ["idler", 1]]) {
			const z = ez * (TRACK_L$2 / 2 - WHEEL$2);
			add(wheel$2(.16, TRACK_W$2 * .7, [
				tx,
				.17500000000000002,
				z
			]), STEEL$2, `${w}${s}`);
			for (let k = 0; k < 3; k++) {
				const a = k * Math.PI / 3;
				add(spoke$2(.15000000000000002, tx + x * TRACK_W$2 * .36, .17500000000000002, z, a), DARK$2, `${w}${s}`);
			}
		}
		for (const z of [
			-.3,
			0,
			.3
		]) add(wheel$2(.06, TRACK_W$2 * .5, [
			tx,
			.09,
			z
		]), STEEL$2, "base");
	}
	add(block$2(.99, .3, .05, [
		0,
		.2,
		.98
	], .01), PAINT$2, "blade");
	add(block$2(.99, .02, .06, [
		0,
		.05,
		1
	], .005), STEEL$2, "blade");
	for (const sx of [-1, 1]) add(beam$2([
		sx * .2,
		.32,
		.62
	], [
		sx * .25,
		.25,
		.96
	], .07, .1), PAINT$2, "blade");
	add(limb([
		0,
		.38,
		.58
	], [
		0,
		.3,
		.9
	], .035, .03), CHROME$2, "blade");
	add(block$2(1, .1, 1.15, [
		0,
		.55,
		-.05
	]), DARK$2, "house");
	add(block$2(.98, .5, .55, [
		0,
		.85,
		-.33
	], .08), PAINT$2, "house");
//#piece d2ddba9cb2ec89b42a9bb6e8639061b30f9dee8ef39dd07be4f9fe94d04cff5e
	add(cw, DARK$2, "house");
	add(block$2(.9, .06, .6, [
		0,
		.62,
		.3
	]), DARK$2, "house");
	add(block$2(.48, .1, .45, [
		.05,
		.98,
		.05
	], .04), SEAT$2, "house");
	add(block$2(.48, .5, .1, [
		.05,
		1.25,
		-.16
	], .05), SEAT$2, "house");
	for (const sx of [-1, 1]) {
		add(block$2(.12, .25, .35, [
			.05 + sx * .3,
			.85,
			.18
		], .03), DARK$2, "house");
		add(limb([
			.05 + sx * .3,
			.97,
			.25
		], [
			.05 + sx * .3,
			1.15,
			.28
		], .012, .012), DARK$2, "house");
		add(new three.SphereGeometry(.03, 10, 8).translate(.05 + sx * .3, 1.17, .28), DARK$2, "house");
//#piece 2a74fddf7eb76d167521ec29c9d09643039277d7e38a1a9a551f091be7e2fba4
	], .03, .03), DARK$2, "house");
	add(block$2(.98, .06, 1.05, [
		0,
		2.28,
		-.04
	], .03), DARK$2, "house");
	add(limb([
		.36,
		1.05,
		-.62
	], [
		.36,
		1.35,
		-.62
	], .025, .02), DARK$2, "house");
	add(block$2(.04, .04, .02, [
		-.36,
		2.22,
		.45
	], .01), "#ffd27a", "house");
	add(block$2(.34, .36, .3, [
		0,
		.72,
		.62
	], .03), PAINT$2, "swing");
	add(beam$2([
		0,
		.6,
		.62
	], [
		0,
		.6,
		.85
	], .2, .12), DARK$2, "swing");
	const knee = [
		0,
		1.85,
		1.25
	];
	add(beam$2(J$2.boom, knee, .2, .26), PAINT$2, "boom");
	add(beam$2(knee, J$2.arm, .2, .22), PAINT$2, "boom");
	add(beam$2([
		0,
		1.65,
		1
	], RAMS$2.armRam.a, .12, .12), PAINT$2, "boom");
	add(wheel$2(.07, .26, J$2.arm), STEEL$2, "boom");
	add(beam$2([
		0,
		2.35,
		1.65
	], J$2.bucket, .16, .2), PAINT$2, "arm");
	add(beam$2(J$2.arm, RAMS$2.armRam.b, .16, .12), PAINT$2, "arm");
	add(wheel$2(.06, .24, J$2.bucket), STEEL$2, "arm");
	add(beam$2([
		0,
		2.3,
		1.72
	], RAMS$2.bucketRam.a, .1, .1), PAINT$2, "arm");
	out.push(...bucketParts$2({
		pivot: J$2.bucket,
		R: .24,
		w: .4,
		teeth: 4,
		pin: RAMS$2.bucketRam.b,
		plate: .025
	}));
	out.push(...ramParts(RAMS$2));
	return out;
}
/** @type {Spec} */
const MINI = {
	name: "mini excavator",
	J: J$2,
	rams: RAMS$2,
	wheels: {
		x: TRACK_X$2,
		y: .17500000000000002,
		sprocket: -.605,
		idler: TRACK_L$2 / 2 - WHEEL$2,
		r: WHEEL$2
	},
	parts: parts$2,
	poses: {
		tucked: {
			boom: -.35,
			arm: -.55,
			bucket: -1.2,
			blade: -.25
		},
		reach: {
			boom: .55,
			arm: .6,
			bucket: -1.6,
			blade: .08
		},
		curled: {
			boom: .62,
			arm: -.35,
			bucket: .55,
			blade: .08
		},
		lifted: {
			boom: -.2,
			arm: -.4,
			bucket: .6,
			blade: .08
		},
		dump: {
			boom: -.2,
			arm: .1,
			bucket: -1.4,
			blade: .08
		}
	},
	slew: 1.4,
	period: 9,
	speed: .55
};
/** Build the mini excavator and its moves: dig, drive, doze, idle. */
const miniExcavator = () => excavatorCast(MINI);

//#endregion
//#region src/lib/actors/excavator.v1.js
//#piece 6bcb44f7e5b1530a02b5eefa5f4651448307e266df9fec2203d82b209356ce30
const PAINT$1 = "#f0a90f";
const DARK$1 = "#2b2c2e";
const STEEL$1 = "#8c9094";
const RUBBER$1 = "#1d1e20";
const CHROME$1 = "#d8d8d6";
const SEAT$1 = "#3a3b3d";
/** @type {Record<string, V3>} */
const J$1 = {
//#piece 0ca2dc83028e0118c96e21449ae430f8c788f01c62436b3f1dd24843ea9f26b3
const RAMS$1 = {
//#piece 2f1ea4699a0f2f8563aa1a774f2322c767d824376174ff6f2893087699210b4c
const SIDES$1 = [["L", 1], ["R", -1]];
const TRACK_X$1 = .37;
const TRACK_W$1 = .25;
const TRACK_L$1 = 1.55;
const WHEEL$1 = .17;
/** a box w × h × len from a to b (len its length), its other sides across, turned along the line */
/** @param {V3} a @param {V3} b @param {number} w @param {number} h @param {number} [r] */
function beam$1(a, b, w, h, r = .02) {
//#piece 68f0ab3c181c6def46cf0b8b16fa883b770824be4bc94696c576bcb287e017e8
//#piece a49be102c24c9f4b4a75b5e1fa1a0b256679f88fef7eff1be81f62bfc59f9e3a
function block$1(w, h, d, at, r = .02) {
	const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
	g.translate(...at);
	return g;
}
/** a wheel turning about x: radius r, width w, at */
/** @param {number} r @param {number} w @param {V3} at */
function wheel$1(r, w, at) {
//#piece 968da3646a9f0d16b879373df41ef112e3e74c3786a1dfef966a959001b023d0
function bucketParts$1() {
	const [, py, pz] = J$1.bucket;
	const cy = py - .24, cz = pz + .04, R = .24, w = .4;
	/** @type {Piece[]} */
	const out = [];
	/** a point on the curl, φ from up (0) through back (−π/2) to down (−π) @param {number} phi @param {number} [r] @returns {V3} */
	const at = (phi, r = R) => [
		0,
		cy + Math.cos(phi) * r,
		cz + Math.sin(phi) * r
	];
	const n = 9, from = .15, to = -Math.PI - .55;
	for (let i = 0; i < n; i++) {
		const p0 = at(from + (to - from) * i / n), p1 = at(from + (to - from) * (i + 1) / n);
		out.push({
			geo: beam$1(p0, p1, w, .025, .006),
			color: DARK$1,
//#piece ed8b32677407d9040bfb41ee3bf1e0157bb624820ab3c9d56356b8c480f7c583
		out.push({
			geo: g,
			color: DARK$1,
			bone: "bucket"
		});
	}
	const lip = at(to);
	for (let k = 0; k < 4; k++) {
		const x = -.15 + k * .1;
		const tooth = new three.ConeGeometry(.025, .09, 6);
		tooth.applyMatrix4(new three.Matrix4().makeRotationX(-Math.PI / 2 - .35));
		tooth.translate(x, lip[1] - .01, lip[2] + .035);
		out.push({
			geo: tooth,
			color: STEEL$1,
			bone: "bucket"
		});
	}
	for (const sx of [-1, 1]) out.push({
		geo: beam$1([
			sx * .09,
			py + .03,
			pz - .04
		], [
			sx * .09,
			RAMS$1.bucketRam.b[1],
			RAMS$1.bucketRam.b[2]
		], .03, .12, .01),
		color: DARK$1,
		bone: "bucket"
	});
	return out;
}
/** Every part, riding its joint. */
/** @returns {Piece[]} */
function parts$1() {
//#piece 2b2a19d07037358e7730f932c89b01f32d3eeb1dc740a77cd85237c4c5894f97
	add(block$1(.5, .2, 1.1, [
		0,
		.3,
		0
	]), DARK$1, "base");
	add(new three.CylinderGeometry(.42, .42, .08, 28).translate(0, .44, 0), DARK$1, "base");
	for (const [s, x] of SIDES$1) {
		const tx = x * TRACK_X$1;
		add(block$1(TRACK_W$1 * .6, .14, 1.15, [
			tx,
			.2,
			0
		]), DARK$1, "base");
		add(block$1(TRACK_W$1, .05, TRACK_L$1 - 2 * WHEEL$1, [
			tx,
			.34500000000000003,
			0
		]), RUBBER$1, "base");
		add(block$1(TRACK_W$1, .05, TRACK_L$1 - 2 * WHEEL$1, [
			tx,
			.025,
			0
		]), RUBBER$1, "base");
		for (const ez of [-1, 1]) {
			const g = new three.CylinderGeometry(.2, .2, TRACK_W$1, 20, 1, true, ez > 0 ? 0 : Math.PI, Math.PI);
			g.rotateZ(Math.PI / 2);
			g.translate(tx, .17500000000000002, ez * (TRACK_L$1 / 2 - WHEEL$1));
			add(g, RUBBER$1, "base");
		}
		for (let i = 0; i < 10; i++) {
			const z = -.575 + i * ((TRACK_L$1 - 2 * WHEEL$1 - .06) / 9);
			add(block$1(TRACK_W$1, .025, .04, [
				tx,
				0,
				z
			], .005), RUBBER$1, "base");
			add(block$1(TRACK_W$1, .025, .04, [
				tx,
				.375,
				z
			], .005), RUBBER$1, "base");
		}
		for (const [w, ez] of [["sprocket", -1], ["idler", 1]]) {
			const z = ez * (TRACK_L$1 / 2 - WHEEL$1);
			add(wheel$1(.16, TRACK_W$1 * .7, [
				tx,
				.17500000000000002,
				z
			]), STEEL$1, `${w}${s}`);
			for (let k = 0; k < 3; k++) {
				const a = k * Math.PI / 3;
				add(spoke$1(tx + x * TRACK_W$1 * .36, .17500000000000002, z, a), DARK$1, `${w}${s}`);
			}
		}
		for (const z of [
			-.3,
			0,
			.3
		]) add(wheel$1(.06, TRACK_W$1 * .5, [
			tx,
			.09,
			z
		]), STEEL$1, "base");
	}
	add(block$1(.99, .3, .05, [
		0,
		.2,
		.98
	], .01), PAINT$1, "blade");
	add(block$1(.99, .02, .06, [
		0,
		.05,
		1
	], .005), STEEL$1, "blade");
	for (const sx of [-1, 1]) add(beam$1([
		sx * .2,
		.32,
		.62
	], [
		sx * .25,
		.25,
		.96
	], .07, .1), PAINT$1, "blade");
	add(limb([
		0,
		.38,
		.58
	], [
		0,
		.3,
		.9
	], .035, .03), CHROME$1, "blade");
	add(block$1(1, .1, 1.15, [
		0,
		.55,
		-.05
	]), DARK$1, "house");
	add(block$1(.98, .5, .55, [
		0,
		.85,
		-.33
	], .08), PAINT$1, "house");
//#piece d2ddba9cb2ec89b42a9bb6e8639061b30f9dee8ef39dd07be4f9fe94d04cff5e
	add(cw, DARK$1, "house");
	add(block$1(.9, .06, .6, [
		0,
		.62,
		.3
	]), DARK$1, "house");
	add(block$1(.48, .1, .45, [
		.05,
		.98,
		.05
	], .04), SEAT$1, "house");
	add(block$1(.48, .5, .1, [
		.05,
		1.25,
		-.16
	], .05), SEAT$1, "house");
	for (const sx of [-1, 1]) {
		add(block$1(.12, .25, .35, [
			.05 + sx * .3,
			.85,
			.18
		], .03), DARK$1, "house");
		add(limb([
			.05 + sx * .3,
			.97,
			.25
		], [
			.05 + sx * .3,
			1.15,
			.28
		], .012, .012), DARK$1, "house");
		add(new three.SphereGeometry(.03, 10, 8).translate(.05 + sx * .3, 1.17, .28), DARK$1, "house");
//#piece 2a74fddf7eb76d167521ec29c9d09643039277d7e38a1a9a551f091be7e2fba4
	], .03, .03), DARK$1, "house");
	add(block$1(.98, .06, 1.05, [
		0,
		2.28,
		-.04
	], .03), DARK$1, "house");
	add(limb([
		.36,
		1.05,
		-.62
	], [
		.36,
		1.35,
		-.62
	], .025, .02), DARK$1, "house");
	add(block$1(.04, .04, .02, [
		-.36,
		2.22,
		.45
	], .01), "#ffd27a", "house");
	add(block$1(.34, .36, .3, [
		0,
		.72,
		.62
	], .03), PAINT$1, "swing");
	add(beam$1([
		0,
		.6,
		.62
	], [
		0,
		.6,
		.85
	], .2, .12), DARK$1, "swing");
	const knee = [
		0,
		1.85,
		1.25
	];
	add(beam$1(J$1.boom, knee, .2, .26), PAINT$1, "boom");
	add(beam$1(knee, J$1.arm, .2, .22), PAINT$1, "boom");
	add(beam$1([
		0,
		1.65,
		1
	], RAMS$1.armRam.a, .12, .12), PAINT$1, "boom");
	add(wheel$1(.07, .26, J$1.arm), STEEL$1, "boom");
	add(beam$1([
		0,
		2.35,
		1.65
	], J$1.bucket, .16, .2), PAINT$1, "arm");
	add(beam$1(J$1.arm, RAMS$1.armRam.b, .16, .12), PAINT$1, "arm");
	add(wheel$1(.06, .24, J$1.bucket), STEEL$1, "arm");
	add(beam$1([
		0,
		2.3,
		1.72
	], RAMS$1.bucketRam.a, .1, .1), PAINT$1, "arm");
	out.push(...bucketParts$1());
	for (const [name, ram] of Object.entries(RAMS$1)) {
//#piece c12f397863c6cf26d5c6b7b486b680931357b28931ac1a4301276cec806fe3db
		add(limb(ram.a, barrelEnd.toArray(), ram.r, ram.r), PAINT$1, `${name}Barrel`);
		add(limb(ram.b, rodEnd.toArray(), ram.r * .5, ram.r * .5), CHROME$1, `${name}Rod`);
//#piece 6b1dfe3bd552137187ca094c733e9e6284c9e2d62e628a0b05c7b4803db12077
function spoke$1(x, y, z, a) {
//#piece 203cfe38f025fbf7bba6b205a8a95d64468e2e32ec3024ba2230d9e542bfe69e
const rot$1 = (th, y, z) => [y * Math.cos(th) - z * Math.sin(th), y * Math.sin(th) + z * Math.cos(th)];
/** the angle of (y, z) the way a turn about x counts it */
/** @param {number} y @param {number} z */
const ang$1 = (y, z) => Math.atan2(z, y);
/**
//#piece f8b9f6ff36b149beb05a25aad4548ede989de7717a7a7cfc189947b7b292bd78
function rams$1(boom, arm, bucket) {
//#piece 191465be94151ad78b02c6d2515149a2f7a2fcb43f83ca7830dc22d0d4331035
			const j = J$1[n];
			const total = steps[i][1];
			[y, z] = rot$1(total, y - j[1], z - j[2]);
//#piece 3e34b8b9b88de7112339163c82bc67983542852025e3a1b0f1ec534f55fa18c5
	for (const [name, ram] of Object.entries(RAMS$1)) {
		const [on0, on1] = ram.on;
		const a = place(on0, ram.a), b = place(on1, ram.b);
		const rest = ang$1(ram.b[1] - ram.a[1], ram.b[2] - ram.a[2]);
		const now = ang$1(b[0] - a[0], b[1] - a[1]);
//#piece d6a8e9ea8b1f9b713c8c8a6ecc670a9da06cd268dbd0fde36d13fe147b56ccfa
function machine$1({ slew = 0, swing = 0, boom = 0, arm = 0, bucket = 0, blade = 0, wheels = 0, root }) {
//#piece 4915b4a39fc16d0d4a28e9c5cfa9cedc6e86985805f15c421bd69a882dbbdb60
		blade: [
			blade,
			0,
			0
		],
		...rams$1(boom, arm, bucket)
	};
	for (const [s] of SIDES$1) for (const w of ["sprocket", "idler"]) p[`${w}${s}`] = [
		wheels,
		0,
		0
	];
	if (root) p.root = root;
	return p;
}
/** smoothly from 0 to 1 */
/** @param {number} x */
const ease$1 = (x) => x * x * (3 - 2 * x);
//#piece 8f36deed0806fd16132d4fba3aac107ee2c56a91850da1c0030000562dc3c292
function through$1(keys, u) {
//#piece 33db15a490bbeecb10a780bfe8e3832cb6d0dc28c84a88b7651070e6ae1ca5c5
	const k = ease$1(Math.min(1, Math.max(0, (u - t0) / (t1 - t0))));
//#piece d96c5ee309bc48afb2da16e150c3016e26ebe2f75e175322ea3874bac16d4079
	]) {
		const x = a[name] ?? 0;
		mix[name] = x + ((b[name] ?? 0) - x) * k;
	}
	return mix;
}
const TUCKED$1 = {
	boom: -.35,
	arm: -.55,
	bucket: -1.2,
	blade: -.25
};
const REACH$1 = {
	boom: .55,
	arm: .6,
	bucket: -1.6,
	blade: .08
};
const CURLED$1 = {
	boom: .62,
	arm: -.35,
	bucket: .55,
	blade: .08
};
const LIFTED$1 = {
	boom: -.2,
	arm: -.4,
	bucket: .6,
	blade: .08
};
/** Build the mini excavator and its moves. @returns {Cast} */
function excavator$1() {
	/** @type {import('./rig').BoneSpec[]} */
	const bones = [
		{
			name: "base",
			at: J$1.base
		},
		{
			name: "blade",
			parent: "base",
			at: J$1.blade
		},
		...SIDES$1.flatMap(([s, x]) => [{
			name: `sprocket${s}`,
			parent: "base",
			at: [
				x * TRACK_X$1,
				.17500000000000002,
				-.605
			]
		}, {
			name: `idler${s}`,
			parent: "base",
			at: [
				x * TRACK_X$1,
				.17500000000000002,
				TRACK_L$1 / 2 - WHEEL$1
			]
		}]),
		{
			name: "house",
			parent: "base",
			at: J$1.house
		},
		{
			name: "swing",
			parent: "house",
			at: J$1.swing
		},
		{
			name: "boom",
			parent: "swing",
			at: J$1.boom
		},
		{
			name: "arm",
			parent: "boom",
			at: J$1.arm
		},
		{
			name: "bucket",
			parent: "arm",
			at: J$1.bucket
		},
		...Object.entries(RAMS$1).flatMap(([name, ram]) => [{
//#piece 127c44d0acc8ef217bdcd66e82bf26f5ac29625a798f18943195f727533ecfb5
	const r = rig(bones, parts$1(), [skin(.5, { side: three.DoubleSide })]);
	r.object.name = "mini excavator";
	return {
		rig: r,
		clips: {
			dig: (t) => {
				const u = loop(t, 9);
				return machine$1(through$1([
					[0, { ...LIFTED$1 }],
					[.14, { ...REACH$1 }],
					[.3, { ...CURLED$1 }],
					[.42, { ...LIFTED$1 }],
					[.58, {
						...LIFTED$1,
						slew: 1.4
					}],
					[.7, {
						...LIFTED$1,
						slew: 1.4,
						bucket: -1.4,
						arm: .1
					}],
					[.82, {
						...LIFTED$1,
						slew: 1.4
					}],
					[1, { ...LIFTED$1 }]
				], u));
			},
			drive: (t) => machine$1({
				...TUCKED$1,
				wheels: -t * 3.2,
				root: [
					0,
					Math.sin(t * 9) * .004,
					0
				]
			}),
			doze: (t) => {
				const u = loop(t, 6);
				const dist = 1.2 * (u < .5 ? ease$1(u * 2) : ease$1(2 - u * 2));
				const blade = u < .45 ? .03 : u < .55 ? .03 - .28 * ease$1((u - .45) * 10) : u < .95 ? -.25 : -.25 + .28 * ease$1((u - .95) * 20);
				return machine$1({
					...TUCKED$1,
					blade,
					wheels: -dist / WHEEL$1,
					root: [
						0,
						0,
						dist
					]
				});
			},
			idle: (t) => machine$1({
				...LIFTED$1,
				root: [
					0,
					Math.sin(t * 40) * .002,
					0
				]
			})
		},
		poses: {
			tucked: machine$1(TUCKED$1),
			reaching: machine$1(REACH$1),
			curled: machine$1(CURLED$1),
			rest: machine$1({})
		},
		first: "dig"
	};
}

//#endregion
//#region src/lib/actors/excavator.v2.js
//#piece 6bcb44f7e5b1530a02b5eefa5f4651448307e266df9fec2203d82b209356ce30
const PAINT = "#f0a90f";
const DARK = "#2b2c2e";
const STEEL = "#8c9094";
const RUBBER = "#1d1e20";
const CHROME = "#d8d8d6";
const SEAT = "#3a3b3d";
/** @type {Record<string, V3>} */
const J = {
//#piece 0ca2dc83028e0118c96e21449ae430f8c788f01c62436b3f1dd24843ea9f26b3
const RAMS = {
//#piece 2f1ea4699a0f2f8563aa1a774f2322c767d824376174ff6f2893087699210b4c
const SIDES = [["L", 1], ["R", -1]];
const TRACK_X = .37;
const TRACK_W = .25;
const TRACK_L = 1.55;
const WHEEL = .17;
/** how much bigger than the mini it is built as: twice, every measure */
const SCALE = 2;
/** a box w × h × len from a to b (len its length), its other sides across, turned along the line */
/** @param {V3} a @param {V3} b @param {number} w @param {number} h @param {number} [r] */
function beam(a, b, w, h, r = .02) {
//#piece 68f0ab3c181c6def46cf0b8b16fa883b770824be4bc94696c576bcb287e017e8
//#piece 2a7442971549f495d97c6a4ed5a60f0a50062642a5b7dd1730b39af8c1b464da
//#piece f0a3a9fe9e2ca99ef335a24762c59fdb5f3870bf8b7d267f8dd419b123a8f039
/** a wheel turning about x: radius r, width w, at */
/** @param {number} r @param {number} w @param {V3} at */
function wheel(r, w, at) {
//#piece 968da3646a9f0d16b879373df41ef112e3e74c3786a1dfef966a959001b023d0
function bucketParts() {
	const [, py, pz] = J.bucket;
	const cy = py - .24, cz = pz + .04, R = .24, w = .4;
	/** @type {Piece[]} */
	const out = [];
	/** a point on the curl, φ from up (0) through out (π/2, away from the cab) to down (π) and on round under it: a
	*  backhoe's bucket, its back to the outside and its mouth and teeth towards the machine @param {number} phi
	*  @param {number} [r] @returns {V3} */
	const at = (phi, r = R) => [
		0,
		cy + Math.cos(phi) * r,
		cz + Math.sin(phi) * r
	];
	const n = 9, from = -.15, to = Math.PI + .55;
	for (let i = 0; i < n; i++) {
		const p0 = at(from + (to - from) * i / n), p1 = at(from + (to - from) * (i + 1) / n);
		out.push({
			geo: beam(p0, p1, w, .025, .006),
			color: DARK,
//#piece ed8b32677407d9040bfb41ee3bf1e0157bb624820ab3c9d56356b8c480f7c583
		out.push({
			geo: g,
			color: DARK,
//#piece dc03fb04658ee3613b50d9dc5853b274592413550e34697580284ab49f0297a3
	for (let k = 0; k < 4; k++) {
		const x = -.15 + k * .1;
		const tooth = new three.ConeGeometry(.025, .09, 6);
		tooth.translate(0, .045, 0);
		tooth.applyQuaternion(aim);
		tooth.translate(x, lip[1], lip[2]);
		out.push({
			geo: tooth,
			color: STEEL,
			bone: "bucket"
		});
	}
	for (const sx of [-1, 1]) out.push({
		geo: beam([
			sx * .09,
			py + .03,
			pz - .04
		], [
			sx * .09,
			RAMS.bucketRam.b[1],
			RAMS.bucketRam.b[2]
		], .03, .12, .01),
		color: DARK,
		bone: "bucket"
	});
	return out;
}
/** Every part, riding its joint. */
/** @returns {Piece[]} */
function parts() {
//#piece 2b2a19d07037358e7730f932c89b01f32d3eeb1dc740a77cd85237c4c5894f97
	add(block(.5, .2, 1.1, [
		0,
		.3,
		0
	]), DARK, "base");
	add(new three.CylinderGeometry(.42, .42, .08, 28).translate(0, .44, 0), DARK, "base");
	for (const [s, x] of SIDES) {
		const tx = x * TRACK_X;
		add(block(TRACK_W * .6, .14, 1.15, [
			tx,
			.2,
			0
		]), DARK, "base");
		add(block(TRACK_W, .05, TRACK_L - 2 * WHEEL, [
			tx,
			.34500000000000003,
			0
		]), RUBBER, "base");
		add(block(TRACK_W, .05, TRACK_L - 2 * WHEEL, [
			tx,
			.025,
			0
		]), RUBBER, "base");
		for (const ez of [-1, 1]) {
			const g = new three.CylinderGeometry(.2, .2, TRACK_W, 20, 1, true, ez > 0 ? 0 : Math.PI, Math.PI);
			g.rotateZ(Math.PI / 2);
			g.translate(tx, .17500000000000002, ez * (TRACK_L / 2 - WHEEL));
			add(g, RUBBER, "base");
		}
		for (let i = 0; i < 10; i++) {
			const z = -.575 + i * ((TRACK_L - 2 * WHEEL - .06) / 9);
			add(block(TRACK_W, .025, .04, [
				tx,
				0,
				z
			], .005), RUBBER, "base");
			add(block(TRACK_W, .025, .04, [
				tx,
				.375,
				z
			], .005), RUBBER, "base");
		}
		for (const [w, ez] of [["sprocket", -1], ["idler", 1]]) {
			const z = ez * (TRACK_L / 2 - WHEEL);
			add(wheel(.16, TRACK_W * .7, [
				tx,
				.17500000000000002,
				z
			]), STEEL, `${w}${s}`);
			for (let k = 0; k < 3; k++) {
				const a = k * Math.PI / 3;
				add(spoke(tx + x * TRACK_W * .36, .17500000000000002, z, a), DARK, `${w}${s}`);
			}
		}
		for (const z of [
			-.3,
			0,
			.3
		]) add(wheel(.06, TRACK_W * .5, [
			tx,
			.09,
			z
		]), STEEL, "base");
	}
	add(block(.99, .3, .05, [
		0,
		.2,
		.98
	], .01), PAINT, "blade");
	add(block(.99, .02, .06, [
		0,
		.05,
		1
	], .005), STEEL, "blade");
	for (const sx of [-1, 1]) add(beam([
		sx * .2,
		.32,
		.62
	], [
		sx * .25,
		.25,
		.96
	], .07, .1), PAINT, "blade");
	add(limb([
		0,
		.38,
		.58
	], [
		0,
		.3,
		.9
	], .035, .03), CHROME, "blade");
	add(block(1, .1, 1.15, [
		0,
		.55,
		-.05
	]), DARK, "house");
	add(block(.98, .5, .55, [
		0,
		.85,
		-.33
	], .08), PAINT, "house");
//#piece d2ddba9cb2ec89b42a9bb6e8639061b30f9dee8ef39dd07be4f9fe94d04cff5e
	add(cw, DARK, "house");
	add(block(.9, .06, .6, [
		0,
		.62,
		.3
	]), DARK, "house");
	add(block(.48, .1, .45, [
		.05,
		.98,
		.05
	], .04), SEAT, "house");
	add(block(.48, .5, .1, [
		.05,
		1.25,
		-.16
	], .05), SEAT, "house");
	for (const sx of [-1, 1]) {
		add(block(.12, .25, .35, [
			.05 + sx * .3,
			.85,
			.18
		], .03), DARK, "house");
		add(limb([
			.05 + sx * .3,
			.97,
			.25
		], [
			.05 + sx * .3,
			1.15,
			.28
		], .012, .012), DARK, "house");
		add(new three.SphereGeometry(.03, 10, 8).translate(.05 + sx * .3, 1.17, .28), DARK, "house");
//#piece 2a74fddf7eb76d167521ec29c9d09643039277d7e38a1a9a551f091be7e2fba4
	], .03, .03), DARK, "house");
	add(block(.98, .06, 1.05, [
		0,
		2.28,
		-.04
	], .03), DARK, "house");
	add(limb([
		.36,
		1.05,
		-.62
	], [
		.36,
		1.35,
		-.62
	], .025, .02), DARK, "house");
	add(block(.04, .04, .02, [
		-.36,
		2.22,
		.45
	], .01), "#ffd27a", "house");
	add(block(.34, .36, .3, [
		0,
		.72,
		.62
	], .03), PAINT, "swing");
	add(beam([
		0,
		.6,
		.62
	], [
		0,
		.6,
		.85
	], .2, .12), DARK, "swing");
	const knee = [
		0,
		1.85,
		1.25
	];
	add(beam(J.boom, knee, .2, .26), PAINT, "boom");
	add(beam(knee, J.arm, .2, .22), PAINT, "boom");
	add(beam([
		0,
		1.65,
		1
	], RAMS.armRam.a, .12, .12), PAINT, "boom");
	add(wheel(.07, .26, J.arm), STEEL, "boom");
	add(beam([
		0,
		2.35,
		1.65
	], J.bucket, .16, .2), PAINT, "arm");
	add(beam(J.arm, RAMS.armRam.b, .16, .12), PAINT, "arm");
	add(wheel(.06, .24, J.bucket), STEEL, "arm");
	add(beam([
		0,
		2.3,
		1.72
	], RAMS.bucketRam.a, .1, .1), PAINT, "arm");
	out.push(...bucketParts());
	for (const [name, ram] of Object.entries(RAMS)) {
//#piece c12f397863c6cf26d5c6b7b486b680931357b28931ac1a4301276cec806fe3db
		add(limb(ram.a, barrelEnd.toArray(), ram.r, ram.r), PAINT, `${name}Barrel`);
		add(limb(ram.b, rodEnd.toArray(), ram.r * .5, ram.r * .5), CHROME, `${name}Rod`);
//#piece 6b1dfe3bd552137187ca094c733e9e6284c9e2d62e628a0b05c7b4803db12077
function spoke(x, y, z, a) {
//#piece 203cfe38f025fbf7bba6b205a8a95d64468e2e32ec3024ba2230d9e542bfe69e
const rot = (th, y, z) => [y * Math.cos(th) - z * Math.sin(th), y * Math.sin(th) + z * Math.cos(th)];
/** the angle of (y, z) the way a turn about x counts it */
/** @param {number} y @param {number} z */
const ang = (y, z) => Math.atan2(z, y);
/**
//#piece f8b9f6ff36b149beb05a25aad4548ede989de7717a7a7cfc189947b7b292bd78
function rams(boom, arm, bucket) {
//#piece 191465be94151ad78b02c6d2515149a2f7a2fcb43f83ca7830dc22d0d4331035
			const j = J[n];
			const total = steps[i][1];
			[y, z] = rot(total, y - j[1], z - j[2]);
//#piece 3e34b8b9b88de7112339163c82bc67983542852025e3a1b0f1ec534f55fa18c5
	for (const [name, ram] of Object.entries(RAMS)) {
		const [on0, on1] = ram.on;
		const a = place(on0, ram.a), b = place(on1, ram.b);
		const rest = ang(ram.b[1] - ram.a[1], ram.b[2] - ram.a[2]);
		const now = ang(b[0] - a[0], b[1] - a[1]);
//#piece d6a8e9ea8b1f9b713c8c8a6ecc670a9da06cd268dbd0fde36d13fe147b56ccfa
function machine({ slew = 0, swing = 0, boom = 0, arm = 0, bucket = 0, blade = 0, wheels = 0, root }) {
//#piece 4915b4a39fc16d0d4a28e9c5cfa9cedc6e86985805f15c421bd69a882dbbdb60
		blade: [
			blade,
			0,
			0
		],
		...rams(boom, arm, bucket)
	};
	for (const [s] of SIDES) for (const w of ["sprocket", "idler"]) p[`${w}${s}`] = [
		wheels,
		0,
		0
	];
	if (root) p.root = root;
	return p;
}
/** smoothly from 0 to 1 */
/** @param {number} x */
const ease = (x) => x * x * (3 - 2 * x);
//#piece 8f36deed0806fd16132d4fba3aac107ee2c56a91850da1c0030000562dc3c292
//#piece 5f42d815e38ecb3f11fd13341515f2f56c4bb1b129226ff63ecd960e98008d3b
	]) {
		const x = a[name] ?? 0;
		mix[name] = x + ((b[name] ?? 0) - x) * k;
	}
	return mix;
}
const TUCKED = {
	boom: -.35,
	arm: -.55,
	bucket: -1.2,
	blade: -.25
};
const REACH = {
	boom: .55,
	arm: .6,
	bucket: -1.6,
	blade: .08
};
const CURLED = {
	boom: .62,
	arm: -.35,
	bucket: .55,
	blade: .08
};
const LIFTED = {
	boom: -.2,
	arm: -.4,
	bucket: .6,
	blade: .08
};
/** Build the mini excavator and its moves. @returns {Cast} */
function excavator() {
	/** @type {import('./rig').BoneSpec[]} */
	const bones = [
		{
			name: "base",
			at: J.base
		},
		{
			name: "blade",
			parent: "base",
			at: J.blade
		},
		...SIDES.flatMap(([s, x]) => [{
			name: `sprocket${s}`,
			parent: "base",
			at: [
				x * TRACK_X,
				.17500000000000002,
				-.605
			]
		}, {
			name: `idler${s}`,
			parent: "base",
			at: [
				x * TRACK_X,
				.17500000000000002,
				TRACK_L / 2 - WHEEL
//#piece be909fd7173afd0698da32dc285fea9564c36fc0106ab4b23de6ec70cfd4f674
		...Object.entries(RAMS).flatMap(([name, ram]) => [{
//#piece 127c44d0acc8ef217bdcd66e82bf26f5ac29625a798f18943195f727533ecfb5
	const r = rig(bones, parts(), [skin(.5, { side: three.DoubleSide })]);
	r.object.name = "excavator";
	r.object.scale.setScalar(2);
	return {
		rig: r,
		clips: {
			dig: (t) => {
				const u = loop(t, 9);
				return machine(through([
					[0, { ...LIFTED }],
					[.14, { ...REACH }],
					[.3, { ...CURLED }],
					[.42, { ...LIFTED }],
					[.58, {
						...LIFTED,
						slew: 1.4
					}],
					[.7, {
						...LIFTED,
						slew: 1.4,
						bucket: -1.4,
						arm: .1
					}],
					[.82, {
						...LIFTED,
						slew: 1.4
					}],
					[1, { ...LIFTED }]
				], u));
			},
			drive: (t) => machine({
				...TUCKED,
				wheels: -t * 3.2,
				root: [
					0,
					Math.sin(t * 9) * .004,
					0
				]
			}),
			doze: (t) => {
				const u = loop(t, 6);
				const dist = 1.2 * (u < .5 ? ease(u * 2) : ease(2 - u * 2));
				const blade = u < .45 ? .03 : u < .55 ? .03 - .28 * ease((u - .45) * 10) : u < .95 ? -.25 : -.25 + .28 * ease((u - .95) * 20);
				return machine({
					...TUCKED,
					blade,
					wheels: -dist / WHEEL,
					root: [
						0,
						0,
						dist
					]
				});
			},
			idle: (t) => machine({
				...LIFTED,
				root: [
					0,
					Math.sin(t * 40) * .002,
					0
				]
			})
		},
		poses: {
			tucked: machine(TUCKED),
			reaching: machine(REACH),
			curled: machine(CURLED),
			rest: machine({})
		},
		first: "dig"
	};
}

//#endregion
//#piece 3532b0d665f0eafc01676fed7d204bcc39878ec23b8713471ddbe88f6ab93fb2
const HISTORY = /* @__PURE__ */ (() => ({ "excavator-small": [
	{
		...FIRST,
		build: [{
			id: "excavator-small",
			label: "Mini excavator",
			note: "yellow, an open canopy, a 40 cm bucket",
			make: () => excavator$1()
		}]
	},
	{
		v: 2,
		date: "2026-10-06",
		note: "Twice the size; the bucket turned round, its mouth and teeth towards the machine as a backhoe’s are",
		build: [{
			id: "excavator-small",
			label: "Excavator",
			note: "yellow, an open canopy, an 80 cm backhoe bucket",
			make: () => excavator()
		}]
	},
	{
		v: 3,
		date: "2026-10-06",
		note: "The mini back at its own size, 1.7 t: rubber tracks, an open canopy, a dozer blade, a swinging boom, a 40 cm bucket (beside the large excavator, which was built new then; each its own asset since 18 Oct 2026)"
	}
] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "excavator-small",
	label: "Small excavator",
	note: "a mini excavator of 1.7 t, rigged: the house slews, boom, arm and bucket work on their rams, the wheels turn; it digs, slews and dumps, drives and dozes with its blade",
	from: "Sandbox 1: building the settlement",
	variants: [{
		id: "excavator-small",
		label: "Small · 1.7 t",
		note: "rubber tracks, an open canopy, a dozer blade, a swinging boom, a 40 cm bucket",
		make: () => miniExcavator()
//#piece 20511e453deb92755bacd120421d0eb6ad8a5a0f798a0e64253b61fe9748854f

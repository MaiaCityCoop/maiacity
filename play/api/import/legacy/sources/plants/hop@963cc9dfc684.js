//#piece 257c41a393167d25b0ab34563388c270249ab48a6157ba52e040955edf133b72
//#piece 7a065cbb747806be22ecd610efd159d4733f880727c9435083c5d8f0836fdae5
*/
//#piece de3f295906672bd6cfe8186fb876d8af2c8936b4a311bc7703a2513ee856eb80
//#piece c2d4ee9cfcf857ad82919a39e34d001c475e668c1850ecc78af525989c3207b8
/** a level direction at the compass bearing a */
const level = (a) => v3(Math.cos(a), 0, Math.sin(a));
//#piece 7962f1959e5fb09234a37eb560ab4520025d3aac7b45fa720ae5b93b86663d52
//#piece fd02c6621375cf36255cb8fd8a80c972b58d9f61b12a2660e291c4a778dbf08c
*/
//#piece b9785dbfc4f5c3600aaf610a31cf6c7188b8e72adbfdfb1e10f98e084133fcce
//#piece 729540c7ee21b889b4768e2b74cddb8729909b4b755ff7b4a758e6f1a98cea9d
}
/**
//#piece 017b5312986ff638a99de27e481e796efcad058b721f1123b2d0f19db36dc179
//#piece e58426f110fea6c65cc8ce071ae102beceb3e73a409613c68f1df5d5981c6221
//#piece 26cc096b8c6ed241b97858f346135b6f6c00f9a1532fc07c2c9beb70c59c8724
};
const HOP_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Rhizome",
		0,
		"A piece of last year’s rhizome with its buds, a hand down at the foot of its pole, in early spring."
	],
	[
		"Shoots",
		20,
		"Red-flushed shoots push up; most are cut and eaten like asparagus, the three strongest kept."
	],
	[
		"Training",
		35,
		"The three bines find the pole and wind clockwise up it, their stems rough with hooked hairs that grip."
	],
	[
		"Climbing",
		50,
		"Up to a hand’s breadth a day, a pair of rough, lobed leaves at every node."
	],
	[
		"Halfway",
		70,
		"Over two metres up the pole; the lowest leaves stripped to let the air through."
	],
	[
		"Over the top",
		95,
		"At the top of the pole and over; side arms grow from the leaf axils in the upper half."
	],
	[
		"Burrs",
		110,
		"The female flowers: soft, spiky green burrs clustered on the side arms."
	],
	[
		"Green cones",
		125,
		"The burrs swell into papery green cones, bract over bract."
	],
	[
		"Ripening",
		145,
		"The cones dry and rustle, yellow lupulin dust inside smelling of beer and resin."
	],
	[
		"Harvest",
		160,
		"Golden cones picked; the bines cut down and the leaves yellowing; in spring it comes again from the rhizome."
	]
]))();
const POLE = /* @__PURE__ */ (() => v3(.09, 0, .02))();
const POLE_TOP = 4.5;
const POLE_R = .04;
/** the twining: round the pole, so many radians a metre up, clockwise from above */
const TWINE = /* @__PURE__ */ (() => Math.PI * 2 / .4)();
/** a hop leaf's reach at the angle a: heart-based, cut into three or five pointed, toothed lobes (`lobes`) */
const hopEdge = (a, lobes) => {
	const heart = rhubarbEdge(a);
	const at = lobes >= 5 ? [
		0,
		.85,
		-.85,
		1.65,
		-1.65
	] : lobes >= 3 ? [
		0,
		.9,
		-.9
	] : [0];
	let lobe = 0;
	for (const t of at) lobe = Math.max(lobe, Math.exp(-Math.pow((a - t) / .33, 2)) * (t === 0 ? 1 : Math.abs(t) > 1.2 ? .7 : .9));
	return heart * (lobes > 1 ? .5 + .55 * lobe : 1) * (1 + .05 * Math.abs(Math.sin(a * 22)));
};
/**
* The hop at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function hop(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .06);
	const space = bag.space;
	const rz = [
		v3(-.12, -.09, -.02),
		v3(-.05, -.08, .01),
		v3(.02, -.085, -.01),
		v3(.09, -.09, .02)
	];
	bag.add("body", tube(rz, () => .01 + .004 * span(g, 1, 6), (u) => mix("#6a4a34", "#8a6a4a", u), 6));
	for (let i = 0; i < 6; i++) {
		const rr = chance(seed, "hop-root", i);
		const a = i * 2.39996;
		root(bag, {
			seed,
			key: ["r", i],
			from: point(rz, i / 5),
			dir: v3(Math.cos(a) * .4, -1, Math.sin(a) * .4),
			length: between(rr, .5, .9) * vigour,
			grown: table(g, [
				[0, .3],
				[2, .5],
				[5, 1]
			]),
			radius: .004,
			down: .06,
			wander: .2,
			laterals: 4,
			lateral: .3,
			depth: 1,
			age: span(g, 1, 6),
			young: "#f0e2c8",
			old: "#8a6a48"
		});
	}
	if (g >= 1.2) bag.add("prop", tube([POLE.clone().add(v3(0, -.4, 0)), POLE.clone().add(v3(0, POLE_TOP, 0))], (u) => POLE_R * (1 - .25 * u), (u, v) => mix("#7a5a3e", "#9a7a58", Math.abs(Math.sin(u * 140 + v * 9)) > .85 ? 1 : .3), 8));
	space.rod([POLE.clone(), POLE.clone().add(v3(0, POLE_TOP, 0))], .045);
	const spare = span(g, .5, 1.2) * (1 - span(g, 1.7, 1.9));
	if (spare > 0) for (let k = 0; k < 5; k++) {
		const sr = chance(seed, "hop-spare", k);
		const from = point(rz, between(sr, 0, 1));
		const h = (.06 + .2 * sr()) * spare;
		bag.add("body", tube([from, from.clone().add(v3((sr() - .5) * .04, -from.y + h, (sr() - .5) * .04))], (u) => .004 * (1 - .5 * u), (u) => mix("#c8b0a0", "#8a3a4a", u), 4));
	}
	/** @type {{ at: THREE.Vector3, size: number, key: (string | number)[], near: Space }[]} */
	const clusters = [];
	for (let b = 0; b < 3; b++) {
		const br = chance(seed, "hop-bine", b);
		const phase = b / 3 * Math.PI * 2 + br() * .5;
		const H = table(g, [
			[.6, 0],
			[1, .08],
			[1.5, .3],
			[2, .7],
			[3, 1.8],
			[4, 3],
			[5, 4.6],
			[6, 5.2],
			[9, 5.4]
		]) * between(br, .92, 1.04) * vigour;
		if (H < .005) continue;
		const start = point(rz, .3 + b * .25).setY(-.06);
		const over = level(phase);
		/** the bine at height h: from the rhizome over to the pole, round and round it clockwise; over the top, arching out and down */
		const bineAt = (h) => {
			const to = clamp((h - .04) / .3);
			const e = to * to * (3 - 2 * to);
			const T = 4.45;
			const a = phase + Math.min(h, T) * TWINE;
			const ring = POLE_R * (1 - .25 * Math.min(h, T) / POLE_TOP) + .006;
			const p = v3(lerp(start.x, POLE.x + Math.cos(a) * ring, e), start.y + Math.min(h, T), lerp(start.z, POLE.z + Math.sin(a) * ring, e));
			if (h <= T) return p;
			const x = h - T;
			const arc = .4 * Math.PI / 2;
			const dx = x <= arc ? .4 * (1 - Math.cos(x / .4)) : .4;
			const dy = x <= arc ? .4 * Math.sin(x / .4) : .4 - (x - arc);
			return p.addScaledVector(over, dx).add(v3(0, dy, 0));
		};
		const steps = Math.max(2, Math.ceil(H / .03));
		const pts = [];
		for (let k = 0; k <= steps; k++) pts.push(bineAt(k / steps * H));
		const yellow = span(g, 8.7, 9.6);
		bag.add("body", tube(pts, (u) => (.0028 + .0018 * span(g, 2, 6)) * (1 - .5 * u), (u) => mix(mix("#5a7a3a", "#8a4a4a", u > .97 ? .5 : 0), "#8a7a4a", yellow), 5));
		space.rod(pts, .005);
		/** @type {Space | null} */
		let below = null;
		for (let n = 0;; n++) {
			const h = .15 + n * .24;
			if (H < h + .02) break;
			const nr = chance(seed, "hop-node", b, n);
			const p = bineAt(h);
			const radial = p.clone().sub(POLE).setY(0);
			const out = radial.lengthSq() > 1e-8 ? radial.normalize() : over.clone();
			const grown = clamp((H - h) / .45);
			const stripped = h < .9 && g > 4.2;
			const old = h < 2 ? span(g, 8.3, 9.4) : span(g, 8.9, 9.8) * .6;
			const near = new Space();
			if (below) near.balls.push(...below.balls);
			near.rod([
				bineAt(h - .3),
				bineAt(h),
				bineAt(h + .3)
			], .005);
			near.rod([POLE.clone().setY(h - .4), POLE.clone().setY(h + .4)], .045);
			below = near;
			if (!stripped) for (const s of [-1, 1]) hopLeaf(bag, near, p, out.clone().applyAxisAngle(UP, s * (.9 + n % 2 * .3) + about(nr, 0, .2)), (h > 3.6 ? .11 : .14) * vigour * about(nr, 1, .1), grown, h > 3.6 ? 3 : 5, old);
			if (h < 1.4) continue;
			const armBorn = 4.4 + (h - 1.4) * .16;
			const arm = span(g, armBorn, armBorn + 1.3);
			if (arm <= 0) continue;
			for (const s of h > 2.4 ? [-1, 1] : [n % 2 ? 1 : -1]) {
				const ar = chance(seed, "hop-arm", b, n, s);
				const ap = arch(p, out.clone().applyAxisAngle(UP, s * 1.1 + about(ar, 0, .2)).multiplyScalar(.85).add(v3(0, .5, 0)), between(ar, .3, .55) * arm * vigour, .7, 6);
				bag.add("body", tube(ap, (u) => .0024 * (1 - .5 * u), () => mix("#5a7a3a", "#8a7a4a", yellow), 4));
				near.rod(ap, .004);
				for (let m = 1; m <= 3; m++) {
					const u = m / 3;
					const q = point(ap, u);
					const ta = towards(ap, u).setY(0);
					const side = ta.lengthSq() > 1e-8 ? ta.normalize() : out;
					for (const t of [-1, 1]) hopLeaf(bag, near, q, side.clone().applyAxisAngle(UP, t * (m < 3 ? 1.3 : .7)), (m < 3 ? .085 : .06) * vigour * about(ar, 1, .1), clamp(arm * 3 - m * .6), m < 3 ? 3 : 1, old);
					if (m > 1) clusters.push({
						at: q,
						size: m === 3 ? 3 : 2,
						key: [
							b,
							n,
							s,
							m
						],
						near
					});
				}
			}
		}
	}
	const burr = span(g, 5.6, 6.1), cone = span(g, 6.3, 7.3), ripe = span(g, 7.8, 8.6), gold = span(g, 8.7, 9.4);
	if (burr > 0) for (const c of clusters) for (let k = 0; k < c.size; k++) {
		const cr = chance(seed, "hop-cone", ...c.key, k);
		const a = k * 2.39996 + cr() * .5;
		const L = (.012 + .03 * cone) * vigour * about(cr, 1, .12);
		const R = (.006 + .007 * cone) * vigour;
		/** @type {{ balls: { c: THREE.Vector3, r: number }[], cost: number, data: { at: THREE.Vector3, dir: THREE.Vector3 } }[]} */
		const options = [];
		for (let o = 0; o < 7; o++) {
			const dir = level(a + o * .9).multiplyScalar(o ? .6 : .35).add(v3(0, -1, 0)).normalize();
			const at = c.at.clone().addScaledVector(dir, .012 + (o > 3 ? .012 : 0));
			options.push({
				balls: [{
					c: at.clone().addScaledVector(dir, L * .3),
					r: R
				}, {
					c: at.clone().addScaledVector(dir, L * .75),
					r: R * .8
				}],
				cost: o * .002,
				data: {
					at,
					dir
				}
			});
		}
		const place = c.near.best(options);
		if (cone > 0) bag.fruit([
			"hop-cone",
			...c.key,
			k
		], c.at, place.dir);
		bag.add("body", tube([c.at, place.at], () => 8e-4, () => tint("#7a9a4a"), 3));
		const bracts = new Slivers();
		hopCone(bag, bracts, place.at, place.dir, L, R, burr, cone, ripe, gold, cr());
		bracts.into(bag);
		if (cone > 0) bag.fruitDone();
	}
	return bag.build();
}
/**
* A hop leaf from the node at `at`: its stalk out along `out`, the blade cut into lobes, rough, dark green; its blade
* set down in the `space` for the cones to keep clear of.
* @param {Bag} bag @param {Space} space @param {THREE.Vector3} at @param {THREE.Vector3} out @param {number} size @param {number} grown
* @param {number} lobes @param {number} old
*/
function hopLeaf(bag, space, at, out, size, grown, lobes, old) {
	if (grown <= .02) return;
	const R = size * lerp(.3, 1, grown);
	const o = out.clone().setY(0).normalize();
	const stalk = arch(at, o.clone().add(v3(0, .5, 0)), R * .6, .6, 2);
	const top = stalk[2];
	bag.add("body", tube(stalk, () => .0012, () => mix("#6a8a3a", "#a89a4a", old), 3));
	const dir = o.clone().add(v3(0, lerp(1.4, -.85, grown) - old * .5, 0)).normalize();
	space.ball(top.clone().addScaledVector(dir, R * .55), R * .5);
	bag.add("sheet", fan({
		size: R,
		from: -Math.PI,
		to: Math.PI,
		edge: (a) => hopEdge(a, lobes) * (1 - .4 * (1 - grown) * Math.abs(Math.sin(a))),
		lift: (s, a) => (1 - grown) * .6 * s * Math.abs(Math.sin(a)) - .08 * s * s + .015 * Math.sin(s * 14) * Math.cos(a * 6) * s,
		paint: (s, a) => leafColour("#2f5a24", "#6a9a3a", grown, old, s).lerp(tint("#7a9a5a"), [
			0,
			.85,
			-.85,
			1.65,
			-1.65
		].some((t) => Math.abs(a - t) < .035) ? .4 : 0),
		rings: 3,
		rays: 15
	}), face(top, dir, UP));
}
/**
* A hop cone hanging from `at` along `dir`: first a soft spiky burr, then papery bracts overlapping down a short
* axis, green, drying straw-yellow, then golden with brown tips.
* @param {Bag} bag @param {Slivers} bracts where its bracts are gathered @param {THREE.Vector3} at @param {THREE.Vector3} dir
* @param {number} L @param {number} R @param {number} burr @param {number} cone @param {number} ripe @param {number} gold @param {number} twist
*/
function hopCone(bag, bracts, at, dir, L, R, burr, cone, ripe, gold, twist) {
	const d = dir.clone().normalize();
	const turn = upTo(d);
	const colour = mix(mix("#a8c86a", "#d0d080", ripe), "#c8a858", gold);
	const mid = at.clone().addScaledVector(d, L * .5);
	bag.add("body", bead(mid, v3(R * .7, L * .5, R * .7).multiplyScalar(lerp(.5, 1, burr)), mix("#8aa858", colour, cone), 3, turn));
	if (cone < .05) {
		for (let k = 0; k < 6; k++) {
			const a = k * 2.39996;
			const o = v3(Math.cos(a), .2, Math.sin(a)).normalize().applyQuaternion(turn);
			bag.add("body", tube([mid, mid.clone().addScaledVector(o, R * 1.3 * burr)], () => 6e-4, () => tint("#e0ecc8"), 2));
		}
		return;
	}
	const tip = mix(colour, "#8a6a3a", gold * .6);
	const n = DETAIL.level < 1 ? 6 : 9;
	for (let k = 0; k < n; k++) {
		const t = (k + .5) / n;
		const a = k * 2.39996 + twist * 6;
		const radial = v3(Math.cos(a), 0, Math.sin(a)).applyQuaternion(turn);
		const p = at.clone().addScaledVector(d, L * (.1 + .75 * t)).addScaledVector(radial, R * .45 * Math.sin(Math.PI * (.2 + .7 * t)));
		const bd = d.clone().addScaledVector(radial, .35 + .25 * ripe).normalize();
		bracts.add(p, bd, L * .45 * cone, R * .5, k % 3 ? colour : tip, 0, false, new three.Vector3().crossVectors(bd, radial));
	}
}
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "hop",
	label: "Hop",
	latin: "Humulus lupulus · Hopfen",
	note: "From its rhizome, three bines twining clockwise up a pole four and a half metres high, rough lobed leaves in pairs, side arms hung with papery cones ripening golden.",
	from: "Climber · perennial",
	stages: HOP_STAGES,
	grow: hop,
	layer: "climber"
//#piece 4b1b0d87ac174e41c3ba4bfa76099d5b0338dfa9582e7a65fd739d1ff6327ce5

//#piece 4dd285985d2bddab3999177a981f3d1c5d753ee66b62efce80404635e2087807
//#piece a10558115dd0d7def54813d8261f1ba80e98b89b2e3ec40b39d1579cd716fce1
//#region src/lib/plants/cucumber.js
const STAGES = [
	{
		name: "Seed",
		day: 0,
		note: "A flat cream seed, a centimetre long, two centimetres down in warm soil."
	},
	{
		name: "Germination",
		day: 3,
		note: "The radicle dives; the hypocotyl arches up through the soil, its peg holding the coat back."
	},
	{
		name: "Seed leaves",
		day: 7,
		note: "Two oblong cotyledons open on a stem a few centimetres high; the taproot already branches."
	},
	{
		name: "True leaves",
		day: 18,
		note: "The first rough, lobed true leaves; the vine begins between the seed leaves."
	},
	{
		name: "Vining",
		day: 32,
		note: "Half a metre of vine, a leaf at each node, tendrils finding the stake and coiling round it."
	},
	{
		name: "Flowering",
		day: 45,
		note: "Yellow flowers in the leaf axils: clusters of male ones, and females with a tiny cucumber behind."
	},
	{
		name: "Fruit set",
		day: 50,
		note: "Pollinated, the tiny prickly cucumbers behind the female flowers start to swell; the flowers shrivel."
	},
	{
		name: "Swelling",
		day: 55,
		note: "The first cucumbers hang a hand long, pale-striped and spiny; more flowers open higher up."
	},
	{
		name: "Filling out",
		day: 62,
		note: "Cucumbers down the vine, dark green and warted; the lowest leaves begin to yellow."
	},
	{
		name: "Harvest",
		day: 70,
		note: "Full-sized cucumbers ready to cut, young ones following behind; the roots spread wide and shallow."
	}
];
/** the stages as the plant grows them: flowering at 5, then the fruit's four stages */
const growth = (stage) => stage <= 5 ? stage : 5 + (stage - 5) * .5;
const SEED_AT = /* @__PURE__ */ (() => v3(0, -.02, 0))();
const NODES = 20;
const STAKE = /* @__PURE__ */ (() => v3(.05, 0, 0))();
/** how long the vine is at g */
const vineLength = (g) => table(g, [
	[2.2, 0],
	[3, .13],
	[4, .5],
	[5, 1.15],
	[6, 1.6],
	[7, 1.75]
]);
/**
* The cucumber at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} stage
* @param {string} seed
*/
function cucumber(stage, seed) {
	const g = growth(stage);
//#piece a92fb2fed60fdca61956e261dede4951505a72726283bd34b7169f5cd55d1ad7
		size: v3(.0048, .0011, .0021),
		coat: "#ece2c2",
		coatShade: "#c9b98c",
		stem: table(g, [
			[0, 0],
			[.3, .001],
			[1, .03],
			[2, .065],
			[3, .075],
			[6, .08]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.55, 0]
		]),
		radius: .0016 + .0016 * span(g, 2, 5),
		stemColor: "#86a74a",
		leaf: {
			length: .034,
			width: .0095,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .85)), .6) * (u < .12 ? .45 + u * 4.5 : 1),
			color: "#4f9134",
			vein: "#a5cf7d"
		},
		open: span(g, 1.1, 2),
		shed: span(g, .75, 1.4),
		wither: span(g, 4.6, 5.8),
		keepCoat: true
	});
	root(bag, {
		seed,
		key: ["taproot"],
		from: SEED_AT.clone(),
		dir: v3(.02, -1, .03),
		length: .42,
		grown: table(g, [
			[0, 0],
			[.35, .004],
			[1, .08],
			[2, .2],
			[3, .4],
			[4, .75],
			[5, .95],
			[6, 1]
		]),
		radius: .0024,
		down: .04,
		wander: .12,
		laterals: 0,
		depth: 0,
		age: span(g, 2, 5),
		young: "#f7f1e0",
		old: "#c4a57c"
	});
	const tap = chance(seed, "laterals");
	for (let i = 0; i < 26; i++) {
		const at = .006 + i * .012 + tap() * .006;
		const born = 1.2 + i * .16;
		const bear = i * 2.39996 + tap() * .5;
		const reach = (i < 12 ? between(tap, .18, .32) : between(tap, .08, .16)) * vigour;
		root(bag, {
			seed,
			key: ["lateral", i],
			from: SEED_AT.clone().add(v3(0, -at, 0)),
			dir: v3(Math.cos(bear), -.25, Math.sin(bear)),
			length: reach,
			grown: (g - born) / 2.6,
			radius: .0012,
			down: .035,
			wander: .3,
			laterals: 6,
			lateral: .3,
			depth: 2,
			age: (g - born - 1) / 3,
			young: "#f6efdc",
			old: "#c3a27a"
		});
	}
	if (g >= 3.5) bag.add("prop", tube([STAKE.clone().add(v3(0, -.22, 0)), STAKE.clone().add(v3(0, 1.7, 0))], (u) => .0055 * (1 - .3 * u), (u) => mix("#c8a865", "#d9c08a", Math.abs(Math.sin(u * 60)) < .06 ? 0 : 1), 8));
	const L = vineLength(g) * vigour;
	const space = bag.space;
	if (g >= 3.5) space.rod([STAKE.clone(), STAKE.clone().add(v3(0, 1.7, 0))], .008);
	if (L > .002) vine(bag, seed, s.top, L, g, vigour, space);
	return bag.build();
}
/**
* The vine's whole path, drawn once: it leans to the stake and climbs it, wandering round it as tendrils catch.
* @param {string} seed @param {THREE.Vector3} start
*/
function vinePath(seed, start) {
	const vr = chance(seed, "vine");
	const pts = [start.clone()];
	const phase = vr() * Math.PI * 2;
	const step = .02;
	const total = 1.9;
	for (let s = step; s <= 1.900000001; s += step) {
		const k = s / total;
		const toStake = clamp(s / .25);
		const a = phase + s * 3.1 + Math.sin(s * 7 + phase) * .35;
		const ring = lerp(0, .035 + .015 * Math.sin(s * 5 + phase * 2), toStake);
		const x = lerp(start.x, STAKE.x, toStake * toStake * (3 - 2 * toStake)) + Math.cos(a) * ring;
		const z = lerp(start.z, STAKE.z, toStake * toStake * (3 - 2 * toStake)) + Math.sin(a) * ring;
		pts.push(v3(x, 0, z));
		pts[pts.length - 1].y = start.y + s * (.92 - .06 * k);
	}
	return {
		pts,
		step
	};
}
/**
* @param {Bag} bag @param {string} seed @param {THREE.Vector3} start @param {number} L @param {number} g @param {number} vigour
* @param {Space} space
*/
function vine(bag, seed, start, L, g, vigour, space) {
	const { pts, step } = vinePath(seed, start);
//#piece abd66e2b14c0816ee5ea03f5234a04e7a2b6857d1d435f9eb5e08da5a425b76d
	const thick = .0028 + .0022 * span(g, 3, 6);
	bag.add("body", tube(now, (u) => thick * (1 - .55 * Math.pow(u, 3)), (u) => mix("#6f9440", "#8fbf5a", u), 7));
	space.rod(now, thick + .004);
	/** the leaves wait until the cucumbers hang, then turn away from them @type {(() => void)[]} */
	const leaves = [];
	/** a place along the vine, and its direction */
	const at = (s) => {
		const f = Math.min(pts.length - 1.001, s / step);
		const k = Math.floor(f);
//#piece 3a19e0b7ae945c8b7175c29a45e4ff8ba5b6019be5c31317acb1fa74a03b1266
	let s = .03;
	for (let i = 0; i < NODES; i++) {
		const nr = chance(seed, "node", i);
		s += i === 0 ? 0 : between(nr, .07, .095);
		const past = L - s;
		if (past <= 0) break;
		const { p, d } = at(s);
		const bear = i * 2.51 + about(nr, 0, .3);
		const out = new three.Vector3(Math.cos(bear), 0, Math.sin(bear));
		const fromStake = p.clone().sub(STAKE).setY(0);
		if (fromStake.lengthSq() > 1e-6) out.lerp(fromStake.normalize(), .45).normalize();
		const grown = clamp(past / .16);
		const size = lerp(.55, 1, clamp(i / 4)) * about(nr, 1, .12) * vigour;
		const old = i < 3 ? span(g, 5.4 + i * .2, 6.3 + i * .2) : 0;
		leaves.push(() => leaf(bag, {
			seed,
			key: i,
			at: p,
			out: space.steer(p, out, .2, .17 * size, .05 * size),
			size,
			grown,
			old
		}));
		if (i >= 2 && past > .03) tendril(bag, seed, i, p, d, out, clamp((past - .03) / .2));
		if (i >= 4) flowers(bag, seed, i, p, out, g, past, vigour, space);
	}
	for (const leaf of leaves) leaf();
	const tip = now[now.length - 1];
	bag.add("body", bead(tip, v3(1, 1.4, 1).multiplyScalar(.004), "#9bc46a"));
}
/** the cucumber leaf's edge: five shallow pointed lobes and the notch at its base, finely toothed */
function lobes(a) {
	const tips = [
		[0, 1],
		[1.12, .88],
		[-1.12, .88],
		[2.2, .62],
		[-2.2, .62]
	];
	let reach = 0;
	for (const [at, size] of tips) reach = Math.max(reach, size * (1 - .34 * Math.min(1, Math.abs(a - at) / .6)));
	return reach * (1 + .035 * Math.abs(Math.sin(a * 22)));
}
/**
* A cucumber leaf on its long stalk: broad, roughly hairy, the veins pale and running out from the stalk to each lobe.
* @param {Bag} bag
* @param {{ seed: string, key: number, at: THREE.Vector3, out: THREE.Vector3, size: number, grown: number, old: number }} o
*/
function leaf(bag, o) {
	const lr = chance(o.seed, "leaf", o.key);
	const g = o.grown;
	const len = .11 * o.size * lerp(.25, 1, g);
	const lift = between(lr, .5, .9) - o.old * .6;
	let d = o.out.clone().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0)).normalize();
	let p = o.at.clone();
	const pts = [];
	for (let k = 0; k <= 8; k++) {
		pts.push(p.clone());
		d = d.clone().addScaledVector(v3(0, -1, 0), .05 * (k / 8) * (1 + o.old * 2)).normalize();
		p = p.clone().addScaledVector(d, len / 8);
	}
	bag.add("body", tube(pts, (u) => .0024 * o.size * (1 - .3 * u), () => mix("#78a446", "#c6b24a", o.old), 5));
	const top = pts[8];
	const size = .095 * o.size * lerp(.2, 1, g);
	const tilt = lerp(.9, between(lr, -.85, -.45), g) - o.old * .4;
	const facing = o.out.clone().multiplyScalar(Math.cos(tilt)).add(v3(0, Math.sin(tilt), 0)).normalize();
	const curl = (1 - g) * .5;
	const blade = fan({
		size,
		from: -Math.PI + .32,
		to: Math.PI - .32,
		edge: lobes,
		lift: (s, a) => -.12 * s * s * (1 + o.old) + curl * s * Math.abs(Math.sin(a)) + .012 * Math.cos(a * 5) * s,
		paint: (s, a) => {
			const vein = [
				0,
				1.12,
				-1.12,
				2.2,
				-2.2
			].some((t) => Math.abs(a - t) < .04) ? .5 : 0;
			const green = mix(mix("#2e6a25", "#5c9a3c", 1 - g), "#9cc173", vein * (1 - s * .5));
			return o.old ? green.lerp(mix("#d6c24c", "#a9873a", s), clamp(o.old * 1.3)) : green;
		},
		rings: 9,
		rays: 64
	});
	bag.add("sheet", blade, aim(top.clone().addScaledVector(facing, -.012 * o.size * g), facing, about(lr, 0, .2)));
}
/**
* A tendril: a thin green thread that reaches for the stake, then coils into a spring.
* @param {Bag} bag @param {string} seed @param {number} i @param {THREE.Vector3} at @param {THREE.Vector3} along @param {THREE.Vector3} out @param {number} grown
*/
function tendril(bag, seed, i, at, along, out, grown) {
	const tr = chance(seed, "tendril", i);
	const toStake = STAKE.clone().setY(at.y + .04).sub(at);
	const reach = Math.min(.12, toStake.length() + .01);
	const dir = toStake.lengthSq() > 1e-6 ? toStake.normalize().lerp(along, .3).normalize() : out.clone().negate();
	const len = (.06 + reach) * grown;
	const coil = span(grown, .55, 1);
	const pts = [];
	const straight = len * (1 - coil * .55);
	const side = new three.Vector3().crossVectors(dir, v3(0, 1, 0)).normalize();
	const upw = new three.Vector3().crossVectors(side, dir).normalize();
	const twist = tr() * Math.PI;
	for (let k = 0; k <= 30; k++) {
		const s = k / 30 * len;
		if (s <= straight) pts.push(at.clone().addScaledVector(dir, s));
		else {
			const w = (s - straight) / Math.max(1e-6, len - straight);
			const ang = twist + w * Math.PI * 2 * (2 + coil * 3);
			const rad = .006 * (1 - .5 * w);
			pts.push(at.clone().addScaledVector(dir, straight + w * .015).addScaledVector(side, Math.cos(ang) * rad).addScaledVector(upw, Math.sin(ang) * rad));
		}
	}
	bag.add("body", tube(pts, (u) => 75e-5 * (1 - .6 * u), () => "#9cc26a", 4));
}
/**
* The flowers at a node: a cluster of male flowers on short stalks, or one female flower with its ovary behind it —
* the cucumber it becomes once it is pollinated.
* @param {Bag} bag @param {string} seed @param {number} i @param {THREE.Vector3} at @param {THREE.Vector3} out @param {number} g @param {number} past @param {number} vigour
* @param {Space} space
*/
function flowers(bag, seed, i, at, out, g, past, vigour, space) {
	const fr = chance(seed, "flowers", i);
	const female = i >= 6 && (i % 2 === 0 ? fr() < .75 : fr() < .3);
	const opens = 4.25 + i * .07 + fr() * .15;
	if (g < opens - .25 || past < .05) return;
	const bud = clamp((g - (opens - .25)) / .25);
	const up = out.clone().add(v3(0, .6, 0)).normalize();
	if (!female) {
		const count = 2 + Math.floor(fr() * 3);
		for (let k = 0; k < count; k++) {
			const mr = chance(seed, "male", i, k);
			const born = opens + k * .12;
			if (g < born - .25) continue;
			const d = up.clone().applyAxisAngle(v3(0, 1, 0), about(mr, 0, .9)).lerp(v3(0, 1, 0), .2).normalize();
			const stalk = at.clone().addScaledVector(d, .025);
			bag.add("body", tube([at.clone(), stalk], () => 7e-4, () => "#86ad52", 4));
			const life = clamp((g - born) / .2);
			const wilt = span(g, born + .55, born + .8);
			if (wilt < 1) blossom(bag, stalk, d, life, wilt, .85);
		}
		return;
	}
	const set = span(g, opens + .3, opens + 1.25 - (i - 6) * .04);
	const hang = clamp(set * 1.6);
	const dir = up.clone().lerp(v3(0, -1, 0), .25 + hang * .7).normalize();
	const stalkEnd = at.clone().addScaledVector(dir, .015 + .02 * set);
	const size = vigour * about(fr, 1, .12) * (i > 13 ? .7 : 1);
	const length = lerp(.022 * bud, .21 * size, set);
	const R = length * .15;
	const place = space.settle(stalkEnd, dir, (a, d) => [
		.15,
		.38,
		.62,
		.85
	].map((f) => ({
		c: a.clone().addScaledVector(d, length * f),
		r: R
	})), .04);
	if (set > 0) bag.fruit([i], at, place.dir);
	bag.add("body", tube([
		at.clone(),
		stalkEnd,
		place.at
	], () => .0012 + .002 * set, () => "#6e9640", 5));
	const tipAt = fruit(bag, seed, i, place.at, place.dir, length, set);
	bag.fruitDone();
	const life = clamp((g - opens) / .2);
	const wilt = span(g, opens + .5, opens + .9);
	blossom(bag, tipAt.p, tipAt.d, life, wilt, 1);
}
/**
* A cucumber flower: five yellow petals joined at their base, wrinkled, flaring open; wilting, they fold shut and
* brown.
* @param {Bag} bag @param {THREE.Vector3} at @param {THREE.Vector3} facing @param {number} open @param {number} wilt @param {number} size
*/
function blossom(bag, at, facing, open, wilt, size) {
	const m = new three.Matrix4().compose(at, new three.Quaternion().setFromUnitVectors(v3(0, 1, 0), facing.clone().normalize()), v3(size, size, size).multiplyScalar(1 - wilt * .45));
	const colour = mix(mix("#e5d670", "#f2c518", open), "#b08a3a", wilt);
	for (let k = 0; k < 5; k++) {
		const petal = sheet({
			length: .017,
			width: .0085,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .7) * (1 + .06 * Math.sin(u * 30)),
			lift: (u, v) => .04 * Math.sin(u * 18 + v * 3) * u + .08 * u * u,
			paint: (u) => mix(colour, "#e9a800", (1 - u) * .35 * (1 - wilt)),
			along: 10,
			across: 6
		});
		const up = lerp(1.3, .22, open) + wilt * 1;
		bag.add("sheet", petal, m.clone().multiply(new three.Matrix4().makeRotationY(k / 5 * Math.PI * 2)).multiply(new three.Matrix4().makeRotationZ(up)));
	}
	bag.add("body", bead(v3(0, .0025, 0).applyMatrix4(m), v3(.0025, .003, .0025).multiplyScalar(size), wilt > .5 ? "#8f7a3a" : "#e0a91a", 5));
}
/**
* A cucumber: long and a little bent, rounded at its ends, dark green paling in stripes toward its blossom end,
* studded with small warts each with a pale spine. Grows from `at` along `dir`; returns its blossom end.
* @param {Bag} bag @param {string} seed @param {number} i @param {THREE.Vector3} at @param {THREE.Vector3} dir @param {number} length @param {number} set
*/
function fruit(bag, seed, i, at, dir, length, set) {
	const cr = chance(seed, "cucumber", i);
	const R = length * lerp(.2, between(cr, .13, .16), set);
	const bend = about(cr, 0, .12) * set;
	const side = new three.Vector3().crossVectors(dir, v3(0, 1, 0));
	if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
	side.normalize();
	const axis = [];
	for (let k = 0; k <= 20; k++) {
		const u = k / 20;
		axis.push(at.clone().addScaledVector(dir, u * length).addScaledVector(side, Math.sin(u * Math.PI) * bend * length));
	}
	const radius = (u) => R * Math.pow(Math.max(0, Math.sin(Math.PI * u)), .32) * (.82 + .18 * u);
	const stripes = Math.round(8 + cr() * 4);
	bag.add("gloss", tube(axis, radius, (u, v) => {
		const stripe = Math.pow(Math.max(0, Math.cos(v * Math.PI * 2 * stripes)), 6) * clamp(u * 1.6 - .35);
		return mix(mix("#3a7329", "#5a8f3c", u * .6), "#b8d08a", stripe * .8 + clamp(u - .85) * 1.5);
	}, 16));
	const warts = Math.round(40 + 80 * set);
	const wr = chance(seed, "warts", i);
	for (let k = 0; k < warts; k++) {
		const u = between(wr, .08, .92);
		const a = wr() * Math.PI * 2;
		const f = u * 20;
		const kk = Math.min(19, Math.floor(f));
		const c = axis[kk].clone().lerp(axis[kk + 1], f - kk);
		const t = axis[kk + 1].clone().sub(axis[kk]).normalize();
		const n1 = new three.Vector3().crossVectors(t, side).normalize();
		const radial = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(n1, Math.sin(a));
		const w = Math.max(4e-4, R * .07);
		bag.add("body", bead(c.clone().addScaledVector(radial, radius(u) * .97), v3(w, w, w), set < .4 ? "#cfe0a8" : "#4a7f35", 3));
		bag.add("body", bead(c.clone().addScaledVector(radial, radius(u) + w * .9), v3(w, w, w).multiplyScalar(.35), "#f2f0dc", 2));
	}
	return {
		p: axis[20].clone().addScaledVector(dir, .001),
		d: dir.clone()
	};
}

//#endregion
//#piece fb10ce2bde67f6075f83f86430f2191be7c630529abacae1e7d63859864d93c7
//#piece f6075a0d5519020795e7918510f359755df90fb8f679196734abed1a268881c1
//#piece 05113af219e0ac89b09fd1edbec3e838d00a5c59175f46f8e2ffdeb30758211f
*/
/** @type {Plant[]} */
const ALL = [{
	id: "cucumber",
	label: "Cucumber",
	latin: "Cucumis sativus",
	note: "From a flat seed to a vine on its stake: lobed rough leaves, coiling tendrils, yellow flowers, warted cucumbers hanging.",
	from: "Vine · 70 days",
	stages: STAGES,
	grow: cucumber
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

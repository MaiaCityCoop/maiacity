//#piece 5b781c36deb0510881d96ccdb339ed16ff3561bc1cc2676662377d0282992898
*/
//#piece de3f295906672bd6cfe8186fb876d8af2c8936b4a311bc7703a2513ee856eb80
const mix = (a, b, t) => tint(a).clone().lerp(tint(b), clamp(t));
//#piece afddabd4f3d8482990c08283475a5ade6ea370fa4bb86c0030fdadc6ed732d5a
//#piece 7962f1959e5fb09234a37eb560ab4520025d3aac7b45fa720ae5b93b86663d52
//#piece fd02c6621375cf36255cb8fd8a80c972b58d9f61b12a2660e291c4a778dbf08c
//#piece d9fbf1bcb3dd12603d17bb06379710dcb6bfd795862c2b4b6ffa14f65e685549
const NASTURTIUM_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A big, wrinkled, ribbed seed like a dried chickpea, two centimetres down after the last frost."
	],
	[
		"Germination",
		8,
		"The root goes down and the shoot comes up alone: the seed leaves stay below, in the seed."
	],
	[
		"First leaves",
		14,
		"Round shield leaves on long stalks, the stalk joined at the middle; water beads and rolls off them."
	],
	[
		"Leafy",
		25,
		"A little mound of round, pale-veined leaves."
	],
	[
		"Trailing",
		40,
		"Stems sprawl out over the soil, a round leaf at every node."
	],
	[
		"Spreading",
		55,
		"A mat of shield leaves a metre and more across, covering the soil under the fruit trees."
	],
	[
		"Buds",
		60,
		"Spurred buds on long stalks from the leaf axils."
	],
	[
		"Flowering",
		70,
		"Orange, red or yellow flowers, each with its long nectar spur; leaves and flowers both peppery, eaten in salad."
	],
	[
		"Seeds set",
		90,
		"Behind each faded flower, three green wrinkled seeds joined in a triangle — pickled as poor man’s capers."
	],
	[
		"Ripe seeds",
		110,
		"The seeds turn pale and drop, to come up again next year; it flowers on until the first frost blackens it."
	]
]))();
/** the flower colours: orange, scarlet, yellow, mahogany — one a plant, by its seed */
const NASTURTIUM = [
	["#f07a1a", "#f8b030"],
	["#d42a1a", "#f05a2a"],
	["#f2c21e", "#f8e070"],
	["#9a2418", "#c84a2a"]
];
/**
* Nasturtium at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function nasturtium(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const pick = chance(seed, "nasturtium-colour")();
	const colours = NASTURTIUM[pick < .4 ? 0 : pick < .65 ? 1 : pick < .88 ? 2 : 3];
	const SEED = v3(0, -.02, 0);
	const s = sprout(bag, {
		seed,
		at: SEED,
		size: v3(.0045, .004, .004),
		coat: "#8a8a5a",
		coatShade: "#5a5a3a",
		stem: table(g, [
			[0, 0],
			[.4, .002],
			[1, .03],
			[1.6, .04],
			[9, .04]
		]),
		hook: table(g, [
			[0, 1],
			[1.1, 1],
			[1.6, 0]
		]),
		radius: .0012 + .0018 * span(g, 1.5, 5),
		stemColor: "#8aa860",
//#piece a7d54288d49ea41d5b8e967ba42770c1c0661f72df133404fcf9e3877d7f3282
	root(bag, {
		seed,
		key: ["tap"],
		from: SEED.clone(),
		dir: v3(0, -1, 0),
		length: .25,
		grown: table(g, [
			[0, 0],
			[.4, .04],
			[1, .15],
			[3, .5],
			[5, 1]
		]),
		radius: .0016,
		down: .04,
		wander: .25,
		laterals: 8,
		lateral: .4,
		depth: 1,
		age: span(g, 3, 7),
		young: "#f4ead6",
		old: "#c8a878"
	});
	bag.space;
	/** @type {(() => void)[]} */
	const leaves = [];
	const top = s.top.clone();
	for (let i = 0; i < 3; i++) {
		const born = 1.5 + i * .4;
		if (g <= born) break;
		leaves.push(() => shield(bag, seed, ["first", i], top, i * 2.39996, clamp((g - born) / .8), .06 + .02 * i, .03, g));
	}
	for (let k = 0; k < 5; k++) {
		const kr = chance(seed, "nasturtium-stem", k);
		const born = 2.6 + k * .45;
		if (g <= born) break;
		const run = table(g - born, [
			[0, 0],
			[.6, .08],
			[1.5, .3],
			[2.5, .55],
			[3.5, .75],
			[4.5, .9],
			[7, 1]
		]) * vigour * between(kr, .75, 1.05) * (k ? .85 : 1);
		trail(bag, seed, [k], top, k * 2.39996 + kr() * .4, run, g, born, vigour, colours, leaves, 0);
	}
	for (const f of leaves) f();
	return bag.build();
}
/**
* A nasturtium stem trailing over the soil from `from`, wandering, its tip lifting off it: at every node a leaf on its
* stalk, from the older nodes a flower and then its seeds, and now and then a side stem.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} from @param {number} head
* @param {number} run @param {number} g @param {number} born @param {number} vigour @param {string[]} colours
* @param {(() => void)[]} leaves @param {number} order
*/
function trail(bag, seed, key, from, head, run, g, born, vigour, colours, leaves, order) {
	if (run < .01) return;
	const kr = chance(seed, "nasturtium-trail", ...key);
	const space = bag.space;
	let a = head;
	const step = .03;
	const pts = [from.clone()];
	for (let d = step; d <= run + 1e-9; d += step) {
		a += (kr() - .5) * .45;
		const last = pts[pts.length - 1];
		const lift = .012 + .008 * Math.sin(d * 9) + .05 * clamp(1 - (run - d) / .12);
		pts.push(v3(last.x + Math.cos(a) * step, lift, last.z + Math.sin(a) * step));
	}
	if (pts.length < 2) return;
	bag.add("body", tube(pts, (u) => .0032 * (1 - .4 * u) * (order ? .8 : 1), (u) => mix("#7a9a4a", "#a8c070", u), 4));
	space.rod(pts, .004);
	for (let i = 1; i < pts.length; i++) {
		const nr = chance(seed, "nasturtium-node", ...key, i);
		const p = pts[i];
		const ta = pts[i].clone().sub(pts[i - 1]);
		const along = Math.atan2(ta.z, ta.x);
		const age = (run - i * step) / .25;
		const grown = clamp(age);
		const b = along + (i % 2 ? 1.2 : -1.2) + (nr() - .5) * .6;
		if (i % 2 === 0 || order) leaves.push(() => shield(bag, seed, [...key, i], p, b, grown, between(nr, .09, .17), between(nr, .04, .06) * vigour, g));
		if (order === 0 && i > 3 && i % 5 === 0 && nr() < .75) trail(bag, seed, [
			...key,
			"side",
			i
		], p, along + (nr() < .5 ? .9 : -.9), (run - i * step) * .6, g, born, vigour, colours, leaves, 1);
		if (i < 4 || nr() > .5) continue;
		const opens = Math.max(6.3, born + 1.2 + i * step / .3) + nr() * .5;
		if (g < opens - .6) continue;
		const fd = level(b + .6);
		const stalk = arch(p, fd.clone().add(v3(0, 1.6, 0)), between(nr, .11, .17), .6, 4);
		const at = stalk[4];
		const open = span(g, opens, opens + .25), fall = span(g, opens + 1.1, opens + 1.3);
		const swell = nr() < .75 ? span(g, opens + 1.2, opens + 2.1) : 0, ripe = span(g, 8.9, 9.5);
		if (fall >= 1 && swell <= 0) continue;
		if (swell > 0) bag.fruit([
			"nasturtium-node",
			...key,
			i
		], p, at.clone().sub(p));
		bag.add("body", tube(stalk, () => .0012, () => tint("#8aa860"), 3));
		if (swell > 0) {
			const R = .0045 * lerp(.4, 1, swell);
			const c = at.clone().add(v3(0, -R * 1.2, 0));
			for (let q = 0; q < 3; q++) {
				const sp = c.clone().addScaledVector(level(q * 2.094 + b), R * .9);
				bag.add("body", bead(sp, v3(R, R * .9, R), mix("#6a9a3a", "#c8b890", ripe), 4));
			}
			bag.fruitDone();
			space.ball(c, R * 2);
		} else {
			flower(bag, at, fd.clone().add(v3(0, .7, 0)).normalize(), colours, open, fall);
			space.ball(at.clone().addScaledVector(fd, .01), .025);
		}
	}
}
/**
* A nasturtium leaf: a round shield held level on its stalk, the stalk joined at its middle, pale veins radiating; its
* stalk leans this way or that until the blade is clear of the flowers and the leaves already there.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} at @param {number} bear
* @param {number} grown @param {number} height @param {number} size @param {number} g
*/
function shield(bag, seed, key, at, bear, grown, height, size, g) {
	if (grown <= .02) return;
	const lr = chance(seed, "shield", ...key);
	const R = size * lerp(.3, 1, grown);
	const H = height * lerp(.4, 1, grown);
	/** @type {{ balls: { c: THREE.Vector3, r: number }[], cost: number, data: THREE.Vector3 }[]} */
	const options = [];
	for (let o = 0; o < 9; o++) {
		const lean = o === 0 ? .25 : .55;
		const dir = tilted(level(bear + (o === 0 ? 0 : (o - 1) * .785)), lean);
		const t = at.clone().addScaledVector(dir, H * (o > 4 ? 1.25 : 1));
		options.push({
			balls: [{
				c: t.clone(),
				r: R * .85
			}],
			cost: o * .002,
			data: t
		});
	}
	const t = bag.space.best(options);
	const old = span(g, 9.2, 9.9) * lr() * .5;
	bag.add("body", tube([
		at,
		at.clone().lerp(t, .5).add(v3(0, H * .1, 0)),
		t
	], () => .0012 * lerp(.6, 1, grown), () => tint("#9ab868"), 3));
	const out = t.clone().sub(at).setY(0);
	const tip = out.lengthSq() > 1e-8 ? out.normalize() : level(bear);
	bag.add("sheet", fan({
		size: R,
		from: -Math.PI,
		to: Math.PI,
		edge: (a) => 1 + .06 * Math.sin(a * 5 + 1),
		lift: (s, a) => (1 - grown) * .5 * s * Math.abs(Math.sin(a)) + .07 * s * s + .012 * Math.sin(a * 10) * s,
		paint: (s, a) => {
			const ray = Math.abs(Math.sin(a * 4.5)) < .04 + .03 * (1 - s);
			return leafColour("#3f7e2c", "#7ab452", grown, old, s).lerp(tint("#b8d4a0"), s < .07 ? .5 : ray ? .3 : 0);
		},
		rings: 4,
		rays: 18
	}), face(t, tip, v3(tip.x * .25, 1, tip.z * .25)));
}
/**
* A nasturtium flower at `at`, looking along `facing`: five round petals (the lower three fringed at their claws), the
* long nectar spur behind; opening, then falling.
* @param {Bag} bag @param {THREE.Vector3} at @param {THREE.Vector3} facing @param {string[]} colours @param {number} open @param {number} fall
*/
function flower(bag, at, facing, colours, open, fall) {
	const f = facing.clone().normalize();
	const e1 = new three.Vector3().crossVectors(f, UP);
	if (e1.lengthSq() < 1e-6) e1.set(1, 0, 0);
	e1.normalize();
	const e2 = new three.Vector3().crossVectors(e1, f).normalize();
	const [deep, pale] = colours;
	const spur = [
		at.clone(),
		at.clone().addScaledVector(f, -.012).addScaledVector(e2, .004),
		at.clone().addScaledVector(f, -.025).addScaledVector(e2, -.004)
	];
	bag.add("body", tube(spur, (u) => .003 * (1 - .8 * u), () => mix(deep, "#c8a040", .3), 4));
	if (fall >= 1) return;
	if (open < .05) {
		bag.add("body", bead(at.clone().addScaledVector(f, .004), v3(.006, .008, .006), mix("#a8b060", deep, .4), 3, upTo(f)));
		return;
	}
	const size = lerp(.45, 1, open) * (1 - fall * .4);
	for (let k = 0; k < 5; k++) {
		const th = Math.PI / 2 + (k - 2) * 1.2 + (k === 0 || k === 4 ? 0 : 0) + Math.PI;
		const dir = e1.clone().multiplyScalar(Math.cos(th)).addScaledVector(e2, Math.sin(th)).clone().addScaledVector(f, lerp(1.4, .3, open) + fall).normalize();
		bag.add("sheet", sheet({
			length: .026 * size,
			width: .013 * size,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .45)), .6) * (u < .3 ? .4 + u * 2 : 1),
			lift: (u, v) => .08 * v * v - .05 * u,
			paint: (u, v) => mix(deep, pale, u < .3 ? .5 : 0).lerp(tint("#5a1a10"), u < .4 && Math.abs(Math.sin(v * 9)) < .25 ? .6 : 0),
			along: 3,
			across: 2
		}), face(at.clone().addScaledVector(f, .002), dir, f));
	}
	bag.add("body", bead(at.clone().addScaledVector(f, .003), v3(.0025, .0025, .0025), "#e8c040", 2));
}
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "nasturtium",
	label: "Nasturtium",
	latin: "Tropaeolum majus · Kapuzinerkresse",
	note: "Trailing stems over the soil, round shield leaves with the stalk at the middle, spurred flowers orange, red or yellow, and wrinkled green seeds in threes.",
	from: "Annual · 110 days",
	stages: NASTURTIUM_STAGES,
	grow: nasturtium,
	layer: "ground"
//#piece 4b1b0d87ac174e41c3ba4bfa76099d5b0338dfa9582e7a65fd739d1ff6327ce5

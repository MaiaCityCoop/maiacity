//#piece 17499c420a648df7747b5bdc91cdad34478f702e3ee8c5f5f4402083df60d0c6
const PINEAPPLE_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Crown",
		0,
		"The leafy crown twisted off a ripe pineapple, dried a few days, set in the soil."
	],
	[
		"Rooting",
		21,
		"Roots break from the base of the crown; its old leaves hold on."
	],
	[
		"New leaves",
		60,
		"New leaves from the heart, longer than the crown’s."
	],
	[
		"Rosette",
		180,
		"A rosette of stiff, channelled, grey-green leaves edged with small spines."
	],
	[
		"Big rosette",
		420,
		"A metre across, forty leaves and more, the old crown leaves gone."
	],
	[
		"Flowering",
		540,
		"A red cone rises from the heart; its violet flowers open a few each day, from the bottom up."
	],
	[
		"Fruitlets",
		570,
		"Each flower’s fruit swells and fuses with its neighbours’; a little crown of leaves on top."
	],
	[
		"Green fruit",
		640,
		"A green-grey pineapple, its eyes in spirals, growing on its stalk."
	],
	[
		"Colouring",
		690,
		"It yellows from the base up, eye by eye."
	],
	[
		"Ripe",
		710,
		"Golden, fragrant at its base: ripe. A slip already grows below it."
	]
]))();
/** a pineapple leaf: a long stiff sword, channelled, tapering to a spine */
const sword = (u) => Math.pow(1 - u, .7) * Math.min(1, .55 + u * 5);
/**
* The pineapple at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g
* @param {string} seed
*/
function pineapple(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const base = v3(0, .01, 0);
	rosette(bag, seed, ["mother"], base, g, vigour, true);
	if (g > 6) rosette(bag, seed, ["slip"], base.clone().add(v3(.12, .08, .05)), (g - 6) * .9, vigour * .5, false);
	return bag.build();
}
/**
* A pineapple rosette: its roots, its leaves, and (if it flowers) its fruit.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} base @param {number} g @param {number} vigour @param {boolean} fruits
*/
function rosette(bag, seed, key, base, g, vigour, fruits) {
	chance(seed, "pine", ...key);
	const roots = Math.round(table(g, [
		[.3, 0],
		[1, 8],
		[3, 18],
		[5, 26],
		[9, 30]
	]));
	for (let i = 0; i < roots; i++) {
		const rr = chance(seed, "pine-root", ...key, i);
		const a = i * 2.39996;
		root(bag, {
			seed,
			key: [
				...key,
				"r",
				i
			],
			from: base.clone().add(v3(Math.cos(a) * .02, -.02, Math.sin(a) * .02)),
			dir: v3(Math.cos(a), -between(rr, .2, .8), Math.sin(a)),
			length: between(rr, .25, .6) * vigour,
			grown: (g - .3 - i * .1) / 2.5,
			radius: .0018,
			down: .03,
			wander: .2,
			laterals: 5,
			lateral: .3,
			depth: 1,
			age: (g - 2 - i * .1) / 3,
			young: "#f2e8d2",
			old: "#a8865a"
		});
	}
	const count = Math.round(table(g, [
		[0, 22],
		[2, 30],
		[3, 42],
		[4, 60],
		[9, 66]
	]));
	for (let i = 0; i < count; i++) {
		const lr = chance(seed, "pine-leaf", ...key, i);
		const crownLeaf = i < 22;
		if (crownLeaf && span(g, 3, 4.5) > .6 + lr() * .4) continue;
		const born = crownLeaf ? -1 : .6 + (i - 22) * .09;
		if (g <= born) break;
		const grown = crownLeaf ? 1 : clamp((g - born) / .8);
		const L = (crownLeaf ? .12 + .08 * (i / 22) : lerp(.25, .95, clamp((i - 22) / 25))) * vigour * lerp(.3, 1, grown);
		const bear = i * 2.39996 + about(lr, 0, .1);
		const inner = clamp((count - i) / 12);
		const tilt = lerp(lerp(.5, 1.15, clamp(i / 50)), .12, inner * .8) + about(lr, 0, .1) + (crownLeaf ? span(g, 1, 4) * .6 : 0);
		const out = v3(Math.cos(bear), 0, Math.sin(bear));
//#piece 0067898aa7e9aef54cfbd3b0a0426870894d3cfe1c9ddb7c65cccca811455bf2
		const old = crownLeaf ? span(g, 1.5, 4) : 0;
		const colour = mix(mix("#5f7a5a", "#6a8a5a", lr()), "#a8865a", old);
		bag.add("sheet", sheet({
			length: L,
			width: .022 * vigour * (crownLeaf ? .8 : 1),
			shape: sword,
			lift: (u, v) => .18 * Math.abs(v) * .05 - .12 * u * u,
			paint: (u, v) => colour.clone().lerp(new three.Color("#4a2a2a"), Math.abs(v) > .85 && Math.abs(Math.sin(u * 90)) > .92 ? .6 : 0).lerp(new three.Color("#9aa89a"), Math.abs(v) < .3 ? .2 : 0),
			along: 10,
			across: 4
		}), aim(base.clone().addScaledVector(out, .012), dir, about(lr, 0, .3)));
	}
	if (!fruits || g < 4.9) return;
	const rise = span(g, 4.9, 5.4);
	const stalkTop = base.clone().add(v3(0, .18 + .22 * rise, 0));
	bag.add("body", tube([base, stalkTop], () => .012, () => "#7a9a5a", 6));
	const fruit = span(g, 5.4, 7.6);
	const ripe = span(g, 7.6, 9);
	const H = (.06 + .16 * fruit) * vigour, R = (.025 + .045 * fruit) * vigour;
	const axis = [];
	for (let k = 0; k <= 14; k++) axis.push(stalkTop.clone().add(v3(0, k / 14 * H, 0)));
	const flowering = g < 5.6;
	if (!flowering) bag.fruit([...key, "fruit"], stalkTop, v3(0, 1, 0));
	bag.add("body", tube(axis, (u) => R * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .12 + u * .88))), .45), (u) => flowering ? mix("#c43a4a", "#e05a5a", u) : mix("#4f7a3a", "#e8a83a", clamp(ripe * 1.5 - u * .6)), 16));
	const eyes = 110;
	for (let k = 0; k < eyes; k++) {
		const u = .06 + .88 * ((k + .5) / eyes);
		const a = k * 2.39996;
		const rad = R * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .12 + u * .88))), .45);
		const out = v3(Math.cos(a), 0, Math.sin(a));
		const at = stalkTop.clone().add(v3(0, u * H, 0)).addScaledVector(out, rad * .98);
		const opens = 5 + u * .5;
		if (flowering && g > opens && g < opens + .2) bag.add("body", bead(at.clone().addScaledVector(out, .006), v3(.005, .005, .005), "#7a5ab8", 3));
		else bag.add("body", bead(at, v3(1, .7, 1).multiplyScalar(rad * .22), flowering ? "#d24a5a" : mix("#3f6a32", "#d88a2a", clamp(ripe * 1.5 - u * .6)), 3, new three.Quaternion().setFromUnitVectors(v3(0, 1, 0), out)));
	}
	const crownAt = stalkTop.clone().add(v3(0, H * .97, 0));
	for (let k = 0; k < 26; k++) {
		const a = k * 2.39996;
		const tilt = .15 + k / 26 * .7;
		const dir = v3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt));
		bag.add("sheet", sheet({
			length: (.05 + .1 * (1 - k / 26)) * lerp(.4, 1, fruit) * vigour,
			width: .012,
			shape: sword,
			lift: (u) => -.08 * u * u,
			paint: () => mix("#5f7a5a", "#4f6a4a", k / 26),
			along: 6,
			across: 2
		}), aim(crownAt, dir, 0));
	}
	bag.fruitDone();
//#piece 69f1d3d6a1a9ba606895e988f6b2d3bf22c7c85e9e9f4295855e80951be3b7da
	id: "pineapple",
	label: "Pineapple",
	latin: "Ananas comosus · Ananas",
	note: "From a crown: a rosette of stiff spiny grey-green leaves; a red cone of violet flowers rises from its heart and fuses into one fruit, its eyes in spirals, yellowing from the base.",
	from: "Rosette · 2 years",
	stages: PINEAPPLE_STAGES,
	grow: pineapple
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

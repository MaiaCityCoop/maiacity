//#piece 5b781c36deb0510881d96ccdb339ed16ff3561bc1cc2676662377d0282992898
//#piece b6ef2ce50708891b5fc6551bd99957da123395110f6ad44a5d4a0ce9e7c47b66
*/
//#piece 089670bef0592ba63818d307efe99f8192634737d8973bde272804f4c11cef86
const SORREL_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small, glossy, three-sided brown seed, barely covered."
	],
	[
		"Germination",
		7,
		"The radicle goes down, the hook comes up."
	],
	[
		"Seed leaves",
		12,
		"Two narrow seed leaves."
	],
	[
		"True leaves",
		25,
		"The first true leaves, already arrow-shaped and sharp with oxalic acid."
	],
	[
		"Rosette",
		45,
		"A rosette of long-stalked arrow-shaped leaves, the stalks red at the base."
	],
	[
		"Clump",
		70,
		"A dense clump a hand and a half high; a reddish taproot below. It comes back every spring."
	],
	[
		"First picking",
		380,
		"Its second spring, the first green of the year: the young leaves picked for soup and sauce, lemony and sour."
	],
	[
		"Cut and come again",
		410,
		"Picked from the outside, new leaves keep coming from the middle."
	],
	[
		"Flowering",
		430,
		"Slender stems rise knee-high with whorls of tiny reddish flowers up their branches."
	],
	[
		"Seeding",
		460,
		"The spikes turn rust-red with winged seeds; cut them off and the leaves come again."
	]
]))();
/** a sorrel blade's reach at the angle a: arrow-shaped, its two basal lobes pointing back beside the stalk */
const arrowEdge = (a) => table(Math.abs(a), [
	[0, 1],
	[.25, .72],
	[.6, .4],
	[1.2, .27],
	[1.6, .25],
	[2.2, .24],
	[2.6, .32],
	[2.85, .2],
	[Math.PI, .03]
]);
/**
* Sorrel at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function sorrel(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .1);
	const at = v3(0, -.005, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.0013, 9e-4, 9e-4),
		coat: "#6a3a24",
		coatShade: "#3a2014",
		stem: table(g, [
			[0, 0],
			[.3, 6e-4],
			[1, .008],
			[2, .014],
			[9, .014]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.5, 0]
		]),
		radius: 6e-4 + .0012 * span(g, 1, 4),
		stemColor: "#8a5a4a",
		leaf: {
			length: .009,
			width: .0025,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .6),
			color: "#5a9a3c",
			vein: "#9cc46e"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.5),
		wither: span(g, 3.5, 4.5)
	});
	root(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(0, -1, 0),
		length: .35,
		grown: table(g, [
			[0, 0],
			[.3, .02],
			[1, .1],
			[3, .4],
			[5, .85],
			[7, 1]
		]),
		radius: .0015 + .005 * span(g, 3, 8),
		down: .04,
		wander: .18,
		laterals: 7,
		lateral: .35,
		depth: 1,
		age: span(g, 3, 8),
		young: "#f0e0d0",
		old: "#8a4a30"
	});
	const crown = v3(0, Math.min(s.top.y, .008), 0);
	for (let i = 0; i < 26; i++) {
		const born = 2.3 + i * .24;
		if (g <= born) break;
		if (i % 3 !== 2 && i < 14 && g > 6.1 + i * .12) continue;
		const lr = chance(seed, "sorrel-leaf", i);
		const grown = clamp((g - born) / 1.1);
		const out = level(i * 2.39996 + about(lr, 0, .15));
		const L = (.03 + .1 * clamp(i / 8)) * vigour * about(lr, 1, .1) * lerp(.3, 1, grown);
		const tilt = lerp(.1, between(lr, .45, .85), grown);
		const pts = arch(crown.clone().addScaledVector(out, .003), tilted(out, tilt), L * .95, .1 * grown, 4);
		bag.add("body", tube(pts, (u) => .0018 * lerp(.4, 1, grown) * (1 - .4 * u), (u) => mix("#a8443a", "#6a9a46", clamp(u * 2)), 4));
		const fold = (1 - grown) * .8;
		bag.add("sheet", fan({
			size: L,
			from: -Math.PI,
			to: Math.PI,
			edge: (a) => arrowEdge(a) * (1 - .4 * fold * Math.abs(Math.sin(a))),
			lift: (ss, a) => fold * Math.abs(Math.sin(a)) * ss * .6 + .04 * Math.abs(Math.sin(a)) * ss - .05 * ss * ss * Math.max(0, Math.cos(a)),
			paint: (ss, a) => leafColour("#3a7a2c", "#7ab04a", grown, 0, ss).lerp(tint("#a8c88a"), Math.abs(a) < .04 || Math.abs(Math.abs(a) - 2.55) < .04 ? .45 : 0),
			rings: 5,
			rays: 18
		}), face(pts[pts.length - 1], tilted(out, tilt + lerp(.1, .55, grown)), UP));
	}
	const stems = 3 + Math.floor(chance(seed, "sorrel-stems")() * 3);
	for (let k = 0; k < stems; k++) {
		const fr = chance(seed, "sorrel-stem", k);
		const born = 7 + k * .12 + fr() * .15;
		if (g <= born) break;
		const rise = span(g, born, born + .8);
		const H = (.6 + .3 * fr()) * vigour * rise;
		const a = k * 2.39996 + fr();
		const stem = arch(crown.clone().addScaledVector(level(a), .01), tilted(level(a), between(fr, .05, .22)), H, -.05, 8);
		bag.add("body", tube(stem, (u) => .0028 * (1 - .6 * u), (u) => mix("#7a8a3a", "#a8483a", u), 4));
		for (let j = 0; j < 2; j++) {
			const p = point(stem, .15 + j * .18);
			const o = level(a + 2.4 * (j + 1));
			bag.add("sheet", fan({
				size: .05 * rise * (1 - j * .3),
				from: -Math.PI,
				to: Math.PI,
				edge: arrowEdge,
				lift: (ss) => -.05 * ss * ss,
				paint: (ss) => leafColour("#3a7a2c", "#7ab04a", 1, 0, ss),
				rings: 3,
				rays: 12
			}), face(p, tilted(o, 1), UP));
		}
		const bloom = span(g, 7.6, 8.1), seeding = span(g, 8.5, 9.2);
		const flower = seeding > 0 ? mix("#b04a34", "#8a3420", seeding) : mix("#8aa04a", "#b85a44", bloom);
		if (seeding > 0) bag.fruit(["sorrel-stem", k], point(stem, .55), towards(stem, .55));
		for (let b = 0; b < 5; b++) {
			const from = point(stem, .55 + b * .09);
			const len = (.16 - b * .02) * rise;
			const twig = b === 4 ? stem.slice(-3) : arch(from, level(a + b * 2.4).multiplyScalar(.4).add(v3(0, 1, 0)), len, -.05, 3);
			if (b < 4) bag.add("body", tube(twig, () => .0012, () => tint("#8a7a3a"), 3));
			for (let w = 0; w < 7; w++) {
				const p = point(twig, .25 + w * .11);
				for (let m = 0; m < 3; m++) bag.add("body", bead(p.clone().add(level(m * 2.1 + w).multiplyScalar(.003)), v3(.0018, .0022, .0018).multiplyScalar(lerp(.5, 1, rise)), flower, 2));
			}
		}
		if (seeding > 0) bag.fruitDone();
	}
	return bag.build();
}
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "sorrel",
	label: "Sorrel",
	latin: "Rumex acetosa · Sauerampfer",
	note: "A clump of long-stalked, arrow-shaped, lemon-sour leaves, picked from the outside; then slender stems of tiny reddish flowers turning rust-red with seed.",
	from: "Perennial · 2 years",
	stages: SORREL_STAGES,
	grow: sorrel,
//#piece feef0e8121e2feb0d65027316063df20b3e6bc2baf1ef0d05b1b48087cb64841

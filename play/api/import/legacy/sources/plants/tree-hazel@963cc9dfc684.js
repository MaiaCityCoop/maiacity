//#piece fedc80a64c0535599bebb812bad15bc32a87d6986b4041348d11615b1730a587
const TREE_HAZEL_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Nut",
		0,
		"A thick-shelled hazelnut, sown in the autumn three centimetres down, chilled by the winter."
	],
	[
		"Germination",
		150,
		"The shell cracks at its tip: the root goes down; the seed leaves stay in the nut."
	],
	[
		"Seedling",
		180,
		"A single straight shoot of broad, double-toothed leaves — no suckers: this hazel is a tree."
	],
	[
		"Sapling",
		900,
		"A neat young tree on one trunk, its crown a narrow cone; it shrugs off drought, heat and city air."
	],
	[
		"Young tree",
		2600,
		"A tall pyramid of a crown on a straight trunk with corky, flaking grey bark, its limbs level, the leaves big and dark."
	],
	[
		"Flowering",
		3e3,
		"In late winter, before the leaves: long yellow lamb’s tails by the hundred, and the tiny crimson-tufted female flowers."
	],
	[
		"Nut set",
		3100,
		"The leaves come; at the shoot tips the nuts form in clusters of three to six, each wrapped in a long, deeply fringed husk."
	],
	[
		"Green clusters",
		3200,
		"Clusters of nuts in their curly green bracts, like little bunches of lettuce, all over the crown."
	],
	[
		"Turning",
		3260,
		"The husks dry and curl at their tips; the shells turn tan."
	],
	[
		"Ripe",
		3290,
		"Brown hazelnuts falling out of their dry fringed husks in September — the same sweet hazelnut, from a tree twenty metres tall."
	]
]))();
const treeHazel = /* @__PURE__ */ (() => wood({
	seed: {
		size: v3(.01, .009, .009),
		coat: "#9a6a3a",
		shade: "#6a4626",
		depth: .03
	},
	hypogeal: true,
	leader: {
		height: [
			[2, 0],
			[2.4, .3],
			[3, 1.4],
			[4, 3.6],
			[5, 5.6],
			[6, 6.6],
			[9, 7.3]
		],
		radius: .17,
		tiers: 34,
		clear: 1.6,
		spacing: .19,
		angle: 1.05,
		limb: (h) => 3.4 * (1 - .7 * h) + .3,
		rate: 1.5,
		crown: 6.2,
		sides: .75,
		side: .2,
		bark: ["#8a8074", "#6a6258"],
		droop: .08
	},
	roots: {
		tap: 2.2,
		spread: 3,
		count: 10,
		radius: .07
	},
	leaf: {
		blade: {
			stalk: .02,
			length: .12,
			width: .06,
			shape: (u) => (u < .2 ? .55 + .45 * Math.sin(Math.PI / 2 * (u / .2)) : u < .7 ? 1 - .12 * Math.pow((u - .2) / .5, 2) : .88 * Math.pow(Math.max(0, Math.cos(Math.PI / 2 * ((u - .7) / .3))), .7)) * (1 + .04 * Math.sin(u * 50)),
			back: .08,
			along: 6,
			bow: .07
		},
		colour: "#2e5a22",
		young: "#7ab048",
		autumn: "#c8a840",
		droop: .3,
		gap: .08,
		per: 3,
		twig: .14,
		tuft: 3,
		limb: .2,
		top: 2.4,
		bare: true
	},
	bear(ctx) {
		const { bag, g, seed } = ctx;
		for (const sh of ctx.shoots) {
			if (sh.gen !== 2) continue;
			const fr = chance(seed, "flowering", ...sh.key);
			if (fr() > .45) continue;
			const { at, dir } = along(sh.pts, between(fr, .75, 1));
			const phase = g - (4.55 + fr() * .25);
			if (phase > -.45 && phase < .6) {
				const n = 2 + Math.floor(fr() * 3);
				for (let k = 0; k < n; k++) {
					const a = k * 2.39996 + fr();
					const len = lerp(.03, .09, span(phase, -.45, -.05)) * lerp(1, .6, span(phase, .3, .6));
					catkin(bag, at, v3(Math.cos(a) * .3, -1, Math.sin(a) * .3), len, .005, phase < .25 ? mix("#a8a860", "#e8d050", span(phase, -.3, -.05)) : mix("#e8d050", "#7a6a40", span(phase, .25, .55)), .05);
				}
			}
			const set = span(phase, .6, 2.3), ripe = span(phase, 2.6, 3.7);
			if (set <= 0) continue;
			const keep = 3 + Math.floor(fr() * 4);
			for (let k = 0; k < keep; k++) {
				const kr = chance(seed, "treehazel", ...sh.key, k);
				const size = ctx.vigour * about(kr, 1, .08) * lerp(.15, 1, set);
				const L = .019 * size, W = .0085 * size;
				const swing = v3(Math.cos(k * 2.4 + kr()), 0, Math.sin(k * 2.4 + kr()));
				const place = hang(ctx, at.clone().addScaledVector(swing, .01), swing.clone().add(v3(0, -.7, 0)).normalize(), L * 1.6, W * 1.5, .02 + W);
				bag.fruit([
					"treehazel",
					...sh.key,
					k
				], at, place.dir);
				bag.add("body", tube([at, place.at], () => .0018, () => "#6a7a3a", 3));
				const m = hung(place.at, place.dir, kr() * TAU);
				const nut = ripe < .4 ? mix("#d8dcb0", "#c8a868", ripe / .4) : mix("#c8a868", "#8a5a2e", (ripe - .4) / .6);
				bag.add("gloss", bead(v3(0, -L * .55, 0), v3(W, L * .5, W * .95), nut, 3), m);
				const husk = ripe < .5 ? mix("#5e9234", "#9aa04a", ripe * 2) : mix("#9aa04a", "#9a7a4a", (ripe - .5) * 2);
				const axis = [];
				for (let r = 0; r <= 6; r++) axis.push(v3(0, -.001 - r / 6 * L * 1.6, 0));
				bag.add("body", tube(axis, (u, v) => W * (.55 + .9 * Math.sqrt(u)) * (u > .45 ? 1 + .6 * (u - .45) * Math.abs(Math.sin(v * Math.PI * 7)) : 1) * (1 + .2 * ripe * u), (u, v) => husk.clone().multiplyScalar(u > .75 ? 1.12 : .94 + .1 * Math.sin(v * 31)), 10), m);
//#piece c21f1890dc0deecddd6a93c2d7d07fe8a647b373d98840251dac78ceb611cbce
	id: "tree-hazel",
	label: "Turkish tree hazel",
	latin: "Corylus colurna · Baumhasel",
	note: "A hazel grown into a tall tree: one straight trunk with corky bark, a narrow pyramid of big dark leaves, yellow lamb’s tails in late winter, then hazelnuts by the cluster in long, curly fringed husks.",
	from: "Tree · 9 years",
	stages: TREE_HAZEL_STAGES,
	grow: treeHazel,
//#piece e1797c241a6f0bc0a3c1a16ce83f21c08d995da4d10a55c215193f25cdcb6014

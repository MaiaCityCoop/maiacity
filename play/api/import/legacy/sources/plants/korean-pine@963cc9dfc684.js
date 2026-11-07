//#piece 216a9e078015134015ed043da72b05d9c367477b3d679c01f8abea1939b943c3
//#piece 24d96b97fe17ddba5dbd7c3548246c81e3eb65737e0f91ca9a9bac1fae0224f4
//#piece 45e644d9da8dad34f84caeca384d2a841d22cb17d854b52096c4b83fb9e582d3
const PINE_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A big wingless pine nut in its hard shell, soaked and chilled through the winter, sown in the spring two centimetres down."
	],
	[
		"Germination",
		30,
		"The root goes down; the shoot comes up wearing the shell like a cap."
	],
	[
		"Seedling",
		60,
		"A ring of a dozen slender seed leaves, then the first single needles."
	],
	[
		"Sapling",
		1100,
		"A small dense cone of soft blue-green needles in fives, slow for its first years, a whorl of branches a year."
	],
	[
		"Young tree",
		3300,
		"A tall cone of level tiers on one straight trunk, its bark grey-brown and scaly, its needles in long soft bundles."
	],
	[
		"Flowering",
		4300,
		"In June: clusters of yellow pollen cones at the base of the new shoots low in the crown; small red seed cones at the tips of the topmost shoots."
	],
	[
		"Cone set",
		4320,
		"The pollinated seed cones turn green and stop — a pine nut takes two summers to ripen."
	],
	[
		"Green cones",
		4700,
		"In the second summer the cones swell, upright at the top of the crown: green, fat, sticky with resin."
	],
	[
		"Turning",
		4760,
		"The cones go brown from their tips, their scales thick and woody."
	],
	[
		"Ripe",
		4790,
		"Big brown cones, their scales loosening on the big pine nuts — the sweet, rich nuts of the Siberian taiga, falling whole in the autumn."
	]
]))();
/** a bundle of pine needles: long and narrow, splaying a little from its foot, to a point */
const needle = (u) => u < .1 ? .6 + 4 * u : 1 - .85 * Math.pow((u - .1) / .9, 2);
const pine = /* @__PURE__ */ (() => wood({
	seed: {
		size: v3(.006, .005, .009),
		coat: "#6a4a2e",
		shade: "#4a3220",
		depth: .02
	},
	hypogeal: false,
	cotyledon: {
		length: .03,
		width: .0018,
		colour: "#5a8a4a"
	},
	leader: {
		height: [
			[2, 0],
			[2.4, .2],
			[3, .9],
			[4, 3.2],
			[5, 5.6],
			[6, 6.9],
			[9, 7.6]
		],
		radius: .19,
		tiers: 44,
		clear: 1.2,
		spacing: .15,
		angle: 1.32,
		limb: (h) => 3.3 * Math.pow(1 - h, 1.05) + .25,
		rate: 1.4,
		crown: 6.8,
		sides: .55,
		side: .15,
		bark: ["#7a6450", "#54443a"],
		droop: .14
	},
	roots: {
		tap: 1.6,
		spread: 3.4,
		count: 10,
		radius: .07
	},
	leaf: {
		blade: {
			stalk: 0,
			length: .12,
			width: .014,
			shape: needle,
			along: 2,
			bow: .12,
			cross: true
		},
		colour: "#335e3a",
		young: "#6a9a5a",
		autumn: "#335e3a",
		droop: -.05,
		gap: .065,
		per: 5,
		twig: .05,
		tuft: 12,
		limb: .1,
		top: 2
	},
	bear(ctx) {
		const { bag, g, seed } = ctx;
		const high = ctx.shoots.filter((sh) => sh.gen === 2 && sh.tip.y > 0);
		const top = high.reduce((m, sh) => Math.max(m, sh.tip.y), 0);
		for (const sh of high) {
			if (sh.tip.y < top * .68) continue;
			const fr = chance(seed, "cones", ...sh.key);
			if (fr() > .5) continue;
			const phase = g - (4.8 + fr() * .2);
			if (phase < -.2) continue;
			const set = span(phase, 0, 2.2), ripe = span(phase, 2.6, 3.7);
			const n = 1 + Math.floor(fr() * 2);
			for (let k = 0; k < n; k++) {
				const kr = chance(seed, "cone", ...sh.key, k);
				const L = lerp(.015, .13, set) * about(kr, 1, .08), W = lerp(.006, .05, set) * about(kr, 1, .06);
				const a = k * 2.39996 + kr();
				const dir = v3(Math.cos(a) * .25, 1, Math.sin(a) * .25).normalize();
				const base = sh.tip.clone().addScaledVector(dir, .01);
				if (set > 0) bag.fruit([
					"cone",
					...sh.key,
					k
				], sh.tip, dir);
				const colour = set < .15 ? mix("#a83a3a", "#6a8a4a", set / .15) : ripe < .5 ? mix("#6a8a4a", "#7a6a3a", ripe * 2) : mix("#7a6a3a", "#5a3a22", (ripe - .5) * 2);
				const open = span(ripe, .6, 1);
				const axis = [];
				for (let r = 0; r <= 8; r++) axis.push(v3(0, -(r / 8) * L, 0));
				bag.add("body", tube(axis, (u, v) => W * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .08 + u * .92))), .55) * (1 + (.1 + .22 * open) * ((Math.round(u * 9) + Math.round(v * 8)) % 2)), (u, v) => colour.clone().multiplyScalar((Math.round(u * 9) + Math.round(v * 8)) % 2 ? 1.12 : .78), 8), hung(base, dir, kr() * TAU));
				if (set > 0) bag.fruitDone();
			}
//#piece 90d5b61545bfa24968849ea32dd9b1924a72608a6f5f55dd5aee28c67c3ae436
	id: "korean-pine",
	label: "Korean pine",
	latin: "Pinus koraiensis · Korea-Kiefer",
	note: "The evergreen of the canopy and the hardiest nut pine: a tall cone of level tiers, soft blue-green needles in fives, and at the top of the crown fat upright cones that ripen over two summers and fall full of big sweet pine nuts.",
	from: "Tree · 13 years",
	stages: PINE_STAGES,
	grow: pine,
//#piece e1797c241a6f0bc0a3c1a16ce83f21c08d995da4d10a55c215193f25cdcb6014

//#piece 9a056d8c18ef085a20966ca810253ebdec65470a25d4025abbeb020843586751
//#piece a964d7e2f9c137a44dbc8857c439a8107d6658c661f20bb5df9ce70a4099e3a8
const DURIAN_COLOUR = /* @__PURE__ */ (() => ripening("#6f8a36", "#8c9a42", "#b3a24c"))();
const DURIAN_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A big glossy brown seed, four centimetres long, sown fresh — it dies if it dries."
	],
	[
		"Germination",
		10,
		"A thick root goes down, the shoot comes up from between the fleshy halves."
	],
	[
		"Seedling",
		40,
		"A slender stem, its leaves glossy green above, golden-brown and scaly beneath."
	],
	[
		"Sapling",
		365,
		"A straight leader with its first level side limbs: a young cone."
	],
	[
		"Young tree",
		1460,
		"A tall conical tree, its limbs near level in tiers up the trunk; the lowest dying off."
	],
	[
		"Flowering",
		2900,
		"Clusters of big cream flowers hang along the limbs, opening at dusk for the bats."
	],
	[
		"Fruit set",
		2920,
		"A few flowers in each cluster set small green fruit, spiny from the start."
	],
	[
		"Green fruit",
		2980,
		"Heavy spiny fruit, as big as a head, hanging from the limbs on stout stalks."
	],
	[
		"Ripening",
		3010,
		"The spines turn from green to yellow-brown; the smell begins."
	],
	[
		"Ripe",
		3020,
		"Ripe durians, yellow-brown and fragrant, ready to fall in the night."
//#piece 2d3bbac24c7c1301788a02565439647fbc84c2a2ade09f2659616ad9e1590719
const DURIAN = /* @__PURE__ */ (() => ({
	seed: {
		size: v3(.02, .013, .014),
		coat: "#7a4a2a",
		shade: "#4a2a18",
		depth: .03
	},
	hypogeal: true,
	leader: {
		height: [
			[1.2, 0],
			[2, .18],
			[3, .7],
			[4, 2.4],
			[5, 5.2],
			[6, 7.6],
			[7, 9.2],
			[8, 10.6],
			[9, 12]
		],
		radius: .3,
		tiers: 34,
		clear: 2.4,
		spacing: .36,
		angle: 1.3,
		limb: (h) => 4.2 * (1 - .65 * h) + .8,
		rate: 2.2,
		crown: 8,
		sides: 1.2,
		side: .26,
		bark: ["#8a6a4a", "#6a5040"],
		droop: .05
	},
	roots: {
		tap: 2.2,
		spread: 3,
		count: 18,
		radius: .07
	},
	leaf: {
		length: .17,
		width: .05,
		shape: lance,
		colour: "#3d5a2a",
		young: "#a8a050",
		style: "along",
		per: 5,
		droop: .25
	},
	flower: {
		kind: {
			petals: 5,
			length: .03,
			width: .012,
			colour: "#f1ead0",
			heart: "#e8d8a0",
			sepals: 5,
			sepal: .02,
			sepalBack: .2,
			stamens: 26,
			stamenColour: "#f4e8b0"
		},
		size: 1.4,
		opens: 5,
		sites: "limbs",
		chance: 1.1,
		per: [3, 6]
	},
	fruit: {
		length: .27,
		width: .105,
		stalk: .09,
		keep: [1, 2],
		setFor: 2,
		ripeFrom: 3,
		ripeFor: .8,
		gloss: false,
		shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .55),
		colour: (ripe) => DURIAN_COLOUR(ripe),
		skin: {
			colour: (ripe) => ripe < .5 ? "#6a8434" : "#9a8a42",
			count: 230,
			size: .0065,
			length: 2.4
		}
	}
}))();
const durian = /* @__PURE__ */ (() => orchard$1(DURIAN))();
//#piece 733ca5d30663b44e498ffd51c5913b2ba3f0995f65a37826037ae038e9a02b8f
	id: "durian",
	label: "Durian",
	latin: "Durio zibethinus",
	note: "A tall conical tree, its near-level limbs in tiers; clusters of cream flowers along the limbs, then heavy spiny fruit hanging from them.",
	from: "Tree · 8 years",
	stages: DURIAN_STAGES,
	grow: durian
//#piece 35171bffb608ead070eb23e7bc8d1d229032839d59049e6db39550def1097bf9
const HISTORY = /* @__PURE__ */ (() => ({ durian: [{
	...FIRST,
	build: orchard(DURIAN)
//#piece 00063e65fadd36c3f6312b37de5e9d66f57a353169c6de10cf5366d2ff826801

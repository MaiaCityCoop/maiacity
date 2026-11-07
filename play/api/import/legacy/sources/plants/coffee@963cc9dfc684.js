//#piece af8bfe044895ed002838a850a5da4e004e9ab078880ff77c6dcf74ec1167a78a
const pointed = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .72)), .6) * (u < .05 ? u / .05 : 1) * (u > .85 ? 1 - (u - .85) * 2.5 : 1);
const COFFEE_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Bean",
		0,
		"A coffee bean still in its parchment, sown fresh and flat side down, a centimetre deep in the shade."
	],
	[
		"Germination",
		40,
		"The root goes down; the stem rises like a match, the parchment still on its head (the soldier)."
	],
	[
		"Seed leaves",
		70,
		"The parchment drops: two round, wavy seed leaves open like a butterfly."
	],
	[
		"Sapling",
		365,
		"One upright stem of glossy dark leaves in pairs; the first pairs of level branches."
	],
	[
		"Young shrub",
		900,
		"Two metres of shrub, its level branches tier on tier, the lowest the longest."
	],
	[
		"Flowering",
		1100,
		"After the first rains, white star flowers crowd the leaf axils along the branches, scented like jasmine — for two days."
	],
	[
		"Fruit set",
		1120,
		"Little green cherries set in clusters where the flowers were."
	],
	[
		"Green cherries",
		1250,
		"Clusters of hard green cherries along the branches, filling for months."
	],
	[
		"Turning",
		1340,
		"Cherry by cherry they yellow, then blush red."
	],
	[
		"Ripe",
		1370,
		"Glossy red cherries crowding the branches, two beans in each: picked by hand, the ripe ones only."
	]
]))();
const coffee = /* @__PURE__ */ (() => orchard({
	seed: {
		size: v3(.011, .0055, .0075),
		coat: "#d8c8a0",
		shade: "#a8905a",
		depth: .012
	},
	hypogeal: false,
	cotyledon: {
		length: .03,
		width: .016,
		colour: "#4f8a34"
	},
	leader: {
		height: [
			[2, 0],
			[3, .35],
			[4, 1.1],
			[5, 1.8],
			[6, 2.1],
			[7, 2.25],
			[9, 2.4]
		],
		radius: .16,
		tiers: 22,
		clear: .25,
		spacing: .1,
		angle: 1.2,
		limb: (h) => .95 - .55 * h,
		rate: .9,
		crown: 3,
		sides: .22,
		side: .2,
		bark: ["#8a8064", "#6a6250"],
		droop: .12
	},
	roots: {
		tap: .6,
		spread: 1.2,
		count: 14,
		radius: .025
	},
	leaf: {
		length: .13,
		width: .026,
		shape: pointed,
		colour: "#1e4a1e",
		young: "#6a9a3a",
		style: "along",
		per: 2,
		droop: .25,
		gloss: true
	},
	flower: {
		kind: {
			petals: 5,
			length: .01,
			width: .0035,
			colour: "#fbfaf4",
			heart: "#f0ecd0",
			sepals: 5,
			sepal: .0015,
			stamens: 5,
			stamenColour: "#f0e8a0",
			flat: .15
		},
		size: 1,
		opens: 4.6,
		sites: "limbs",
		chance: 3.2,
		per: [4, 6]
	},
	fruit: {
		length: .016,
		width: .0072,
		stalk: .008,
		keep: [2, 4],
		setFor: 2,
		ripeFrom: 2.6,
		ripeFor: 1.2,
		gloss: true,
		shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .45),
		colour: (ripe, u) => (ripe < .45 ? mix("#5f8f2e", "#d8c040", ripe / .45) : mix("#d8c040", "#b8141e", (ripe - .45) / .55)).lerp(new three.Color("#3a2a1a"), u > .94 ? .6 : 0)
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "coffee",
	label: "Coffee",
	latin: "Coffea arabica · Kaffee",
	note: "One upright stem, level branches in pairs tier on tier, glossy dark leaves; white star flowers crowding the leaf axils along the branches, then cherries turning yellow and red.",
	from: "Shrub · 4 years",
	stages: COFFEE_STAGES,
	grow: coffee
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

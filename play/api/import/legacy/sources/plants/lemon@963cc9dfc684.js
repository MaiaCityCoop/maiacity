//#piece b94cdc82c5d956788d495f83eae79d211e483e6ed00f2a369d1e87f022d8e49d
//#piece 9b384ad759eb18fb556835bc58106c3d9ae808841aa36c25467d499082b1098b
const LEMON_COLOUR = /* @__PURE__ */ (() => ripening("#4a8a2e", "#b8c44a", "#f5d72a"))();
//#piece 9c8b194c762fea3ae11e0de9f4f45a82cd77f9444aea3806e8f28f0890ef0ae4
const LEMON_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A pale pointed seed, fresh from the fruit, a centimetre down."
	],
	[
		"Germination",
		21,
		"The root goes down; the shoot hooks up, its seed leaves staying in the seed."
	],
	[
		"Seedling",
		45,
		"Glossy leaves, the newest flushed purple-red."
	],
	[
		"Sapling",
		365,
		"An open, rangy little tree, a sharp thorn at every leaf."
	],
	[
		"Young tree",
		1300,
		"An irregular crown, flushing and flowering on and off all year."
	],
	[
		"Blossom",
		2100,
		"Purple-tinged buds opening white, sweet-scented, at the shoot tips."
	],
	[
		"Fruit set",
		2120,
		"Small dark-green lemons set below the falling petals."
	],
	[
		"Green fruit",
		2220,
		"Oval green lemons with a nipple at their tip, full-sized but sour."
	],
	[
		"Colouring",
		2290,
		"The green pales to yellow from the tip."
	],
	[
		"Ripe",
		2320,
		"Bright yellow lemons, fragrant, while the tree flowers again above them."
	]
]))();
const lemon = /* @__PURE__ */ (() => orchard({
	seed: {
		size: v3(.006, .0028, .0035),
		coat: "#efe6c8",
		shade: "#c9b98c",
		depth: .012
	},
	hypogeal: true,
	flush: {
		trunk: .45,
		trunkBorn: 1.2,
		trunkFlush: 1.5,
		scaffolds: [3, 4],
		scaffoldAngle: .8,
		gens: 7,
		flush: .22,
		rest: .22,
		shoot: (gen) => [
			0,
			.8,
			.65,
			.52,
			.42,
			.34,
			.3,
			.26
		][gen] ?? .26,
		whorl: [2, 3],
		spread: .7,
		up: .03,
		droop: .07,
		wander: .14,
		radius: .085,
		taper: .62,
		thicken: 4,
		bark: ["#6f8a42", "#6c6250"]
	},
	roots: {
		tap: .9,
		spread: 1.6,
		count: 14,
		radius: .03
	},
	leaf: {
		length: .11,
		width: .05,
		shape: ellipse,
		colour: "#3a6a2c",
		young: "#8a4a5a",
		style: "along",
		per: 0,
		droop: .3
	},
	flower: {
		kind: citrusFlower("#f9f2f4"),
		size: 1.1,
		opens: 4.5,
		sites: "tips",
		chance: .45,
		per: [2, 4]
	},
	fruit: {
		length: .09,
		width: .031,
		stalk: .03,
		keep: [1, 2],
		setFor: 1.8,
		ripeFrom: 2.7,
		ripeFor: 1,
		gloss: true,
		calyx: "#5f7a34",
		shape: (u, v) => pitted(Math.min(1, u * 1.04), v, .62) * (1 + .25 * Math.exp(-Math.pow((u - .93) / .04, 2))),
		colour: (ripe, u) => LEMON_COLOUR(clamp(ripe * 1.3 - (1 - u) * .3))
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "lemon",
	label: "Lemon",
	latin: "Citrus × limon · Zitrone",
	note: "An open, thorny little tree, its new leaves flushed purple, purple-budded white flowers, oval fruit with a nipple turning yellow from the tip.",
	from: "Tree · 6 years",
	stages: LEMON_STAGES,
	grow: lemon
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

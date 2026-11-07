//#piece 471ae05ca4f88118c6c033108196b4d9db9f80c9c3ae2c195ad766aa3a4f020a
//#piece 71b0d0b335e6985450fc7bdcb4dcd3000c8ec75c14ce2a2849e2b0abbe5e8690
const CHERRY_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Stone",
		0,
		"A cherry stone, chilled through the winter, three centimetres down."
	],
	[
		"Germination",
		20,
		"The stone cracks along its seam; the root goes down, the hook comes up."
	],
	[
		"Seedling",
		40,
		"Two fleshy seed leaves, then toothed true leaves, the stem reddish."
	],
	[
		"Sapling",
		365,
		"A straight leader, its side shoots in tiers."
	],
	[
		"Young tree",
		1460,
		"A tall, steep crown; short fruiting spurs on the thin outer branches."
	],
	[
		"Blossom",
		1830,
		"Clusters of white blossom on long stalks hang from every spur."
	],
	[
		"Fruit set",
		1840,
		"The petals snow down; little green cherries in pairs and threes."
	],
	[
		"Green cherries",
		1860,
		"Hard green cherries swelling on their long stalks."
	],
	[
		"Colouring",
		1880,
		"Yellow, then blushing, then red."
	],
	[
		"Ripe",
		1890,
		"Glossy dark red cherries hanging in pairs: picking time, before the birds."
	]
]))();
const cherry = /* @__PURE__ */ (() => orchard({
	seed: STONE(.009),
	hypogeal: false,
	cotyledon: {
		length: .018,
		width: .008,
		colour: "#6aa046"
	},
	flush: crown({
		trunk: 1.1,
		scaffolds: [4, 5],
		scaffoldAngle: .6,
		up: .05,
		droop: .04,
		radius: .13,
		bark: ["#8a5a4a", "#6a4a44"]
	}),
	roots: {
		tap: 1.4,
		spread: 2.2,
		count: 16,
		radius: .04
	},
	leaf: {
		length: .11,
		width: .05,
		shape: toothed,
		colour: "#3a6a2a",
		young: "#9ab45a",
		style: "along",
		per: 0,
		droop: .4
	},
	flower: {
		kind: rosy("#fbf8f2", .013),
		size: 1.1,
		opens: 4.6,
		sites: "spurs",
		chance: 6,
		per: [3, 4]
	},
	fruit: {
		length: .024,
		width: .0125,
		stalk: .045,
		keep: [2, 4],
		setFor: 1.5,
		ripeFrom: 2.2,
		ripeFor: 1.4,
		gloss: true,
		shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .5) * (1 + .08 * Math.sin(Math.PI * u)),
		colour: (ripe) => ripe < .3 ? mix("#8ab84a", "#e8d05a", ripe / .3) : ripe < .6 ? mix("#e8d05a", "#d8302a", (ripe - .3) / .3) : mix("#d8302a", "#6a0a1a", (ripe - .6) / .4)
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "cherry",
	label: "Cherry",
	latin: "Prunus avium · Kirsche",
	note: "A tall steep crown; white blossom in clusters on the spurs, glossy cherries in pairs on long stalks, yellow to red to dark red.",
	from: "Tree · 5 years",
	stages: CHERRY_STAGES,
	grow: cherry
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

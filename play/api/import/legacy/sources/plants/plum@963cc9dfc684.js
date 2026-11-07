//#piece 471ae05ca4f88118c6c033108196b4d9db9f80c9c3ae2c195ad766aa3a4f020a
//#piece 9ad7d8debfe18c7dcf4bef3020fb37218983bac8111dbdf60dd83a4b115c5be4
const PLUM_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Stone",
		0,
		"A pointed Zwetschge stone, chilled through the winter, three centimetres down."
	],
	[
		"Germination",
		25,
		"The stone splits; the root goes down."
	],
	[
		"Seedling",
		45,
		"Toothed oval leaves on a downy stem."
	],
	[
		"Sapling",
		365,
		"A young tree, its shoots grey-brown."
	],
	[
		"Young tree",
		1300,
		"A rounded crown, its outer branches knobbly with spurs."
	],
	[
		"Blossom",
		1700,
		"White blossom in pairs, smothering the spurs."
	],
	[
		"Fruit set",
		1715,
		"Little green plums set."
	],
	[
		"Green plums",
		1780,
		"Oval green plums, their suture down one side."
	],
	[
		"Colouring",
		1830,
		"They turn purple, then blue-black under a pale bloom."
	],
	[
		"Ripe",
		1850,
		"Blue Zwetschgen, the stone coming clean from the yellow flesh: Zwetschgendatschi time."
	]
]))();
const plum = /* @__PURE__ */ (() => orchard({
	seed: STONE(.02),
	hypogeal: true,
	flush: crown({
		trunk: .9,
		scaffolds: [3, 4],
		scaffoldAngle: .75,
		droop: .065,
		radius: .12,
		bark: ["#5a5048", "#3a3430"]
	}),
	roots: {
		tap: 1.2,
		spread: 2,
		count: 16,
		radius: .04
	},
	leaf: {
		length: .08,
		width: .04,
		shape: toothed,
		colour: "#2f5a2a",
		young: "#8ab45a",
		style: "along",
		per: 0,
		droop: .35
	},
	flower: {
		kind: rosy("#fbfbf6", .011),
		size: 1,
		opens: 4.5,
		sites: "spurs",
		chance: 3,
		per: [2, 3]
	},
	fruit: {
		length: .05,
		width: .017,
		stalk: .02,
		keep: [2, 3],
		setFor: 1.8,
		ripeFrom: 2.7,
		ripeFor: 1.1,
		gloss: false,
		shape: (u, v) => sutured(u, v, .55) * (1 - .1 * u),
		colour: (ripe) => (ripe < .5 ? mix("#8ab04a", "#7a4a6a", ripe * 2) : mix("#7a4a6a", "#2a2a5a", (ripe - .5) * 2)).lerp(new three.Color("#9aa0c8"), ripe * .25)
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "plum",
	label: "Plum",
	latin: "Prunus domestica · Zwetschge",
	note: "A rounded crown, knobbly with spurs; white blossom in pairs, oval plums with a suture turning blue-black under a pale bloom.",
	from: "Tree · 5 years",
	stages: PLUM_STAGES,
	grow: plum
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

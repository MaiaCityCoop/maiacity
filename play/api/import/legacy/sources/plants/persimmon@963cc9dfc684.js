//#piece a7bc7ca0671914b3638292f6a1aec01b14a5447bfe8d616d98379e8db73dd67e
//#piece 963d49086fa6dcaa1b862ecf6e13bd03bc9ff76262f1ca6d1da996bdbc1491d9
const PERSIMMON_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A flat brown seed from a ripe kaki, chilled through the winter, two centimetres down."
	],
	[
		"Germination",
		30,
		"Slow: a thick root goes down first, then the hook comes up."
	],
	[
		"Seedling",
		60,
		"Two leathery seed leaves, then broad glossy true leaves."
	],
	[
		"Sapling",
		365,
		"A slender young tree, its bark already chequered."
	],
	[
		"Young tree",
		1460,
		"A rounded crown of big, glossy, leathery leaves."
	],
	[
		"Flowering",
		2e3,
		"Small pale-yellow bell flowers, one in each leaf axil of the new shoots, under a big green calyx."
	],
	[
		"Fruit set",
		2015,
		"The bells drop; little green fruit sit in their four-lobed calyxes."
	],
	[
		"Green fruit",
		2080,
		"Round green fruit swelling among the leaves."
	],
	[
		"Colouring",
		2160,
		"They turn yellow, then orange, as the leaves turn scarlet."
	],
	[
		"Ripe",
		2190,
		"Glossy orange kaki like lanterns; they hang on even after the leaves have fallen."
	]
]))();
const persimmon = /* @__PURE__ */ (() => orchard({
	seed: {
		size: v3(.009, .004, .006),
		coat: "#6a4a2a",
		shade: "#4a3020",
		depth: .02
	},
	hypogeal: false,
	cotyledon: {
		length: .025,
		width: .012,
		colour: "#5a8a3a"
	},
	flush: crown({
		trunk: 1,
		scaffolds: [3, 4],
		scaffoldAngle: .8,
		droop: .06,
		radius: .13,
		bark: ["#6a5a4a", "#3a3028"]
	}),
	roots: {
		tap: 1.6,
		spread: 2,
		count: 16,
		radius: .045
	},
	leaf: {
		length: .14,
		width: .075,
		shape: ellipse,
		colour: "#2a5a24",
		young: "#9ab45a",
		style: "along",
		per: 0,
		droop: .3
	},
	flower: {
		kind: {
			petals: 4,
			length: .009,
			width: .006,
			colour: "#f0e8b0",
			heart: "#d8c87a",
			sepals: 4,
			sepal: .012,
			stamens: 0,
			flat: -.6
		},
		size: 1.2,
		opens: 4.6,
		sites: "shoots",
		chance: .7,
		axils: [2, 4],
		per: [1, 1]
	},
	fruit: {
		length: .06,
		width: .04,
		stalk: .012,
		keep: [1, 1],
		setFor: 1.9,
		ripeFrom: 2.8,
		ripeFor: 1,
		gloss: true,
		calyx: "#4a6a2a",
		shape: (u, v) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .38) * (1 + .035 * Math.cos(v * Math.PI * 8)),
		colour: (ripe) => ripe < .5 ? mix("#6a9a3a", "#e8b02a", ripe * 2) : mix("#e8b02a", "#e8641a", (ripe - .5) * 2)
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "persimmon",
	label: "Persimmon",
	latin: "Diospyros kaki · Kaki",
	note: "A rounded crown of big glossy leaves; pale bell flowers in the leaf axils, glossy orange fruit in four-lobed calyxes that hang on like lanterns after the leaves fall.",
	from: "Tree · 6 years",
	stages: PERSIMMON_STAGES,
	grow: persimmon
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

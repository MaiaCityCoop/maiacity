//#piece a78bc772c161519da0f53c3e488e6ba88bf2a8e96aee923f3072b69968961145
//#piece 2c00b6c88c72bf150beabc3265b89d623a6f009b34e293c8cff54c9ac4d649cf
//#piece 9ad7d8debfe18c7dcf4bef3020fb37218983bac8111dbdf60dd83a4b115c5be4
const PEACH_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Stone",
		0,
		"A deeply pitted peach stone, chilled through the winter, five centimetres down."
	],
	[
		"Germination",
		25,
		"The stone splits; a root goes down, a shoot comes up."
	],
	[
		"Seedling",
		45,
		"Long narrow leaves on a reddish stem."
	],
	[
		"Sapling",
		365,
		"Fast: a metre in its first year."
	],
	[
		"Young tree",
		1100,
		"Opened into a vase on three or four limbs, the middle kept open to the sun."
	],
	[
		"Blossom",
		1300,
		"Pink blossom all along last year’s shoots, before the leaves."
	],
	[
		"Fruit set",
		1315,
		"Fuzzy green peaches set below the falling petals."
	],
	[
		"Green peaches",
		1370,
		"The peaches swell, their suture showing, still green and hard."
	],
	[
		"Colouring",
		1420,
		"The ground colour turns yellow; a red blush spreads from the sunny side."
	],
	[
		"Ripe",
		1435,
		"Soft, fragrant, yellow and red under their fuzz."
	]
]))();
const peach = /* @__PURE__ */ (() => orchard({
	seed: STONE(.03),
	hypogeal: true,
	flush: crown({
		trunk: .6,
		scaffolds: [3, 4],
		scaffoldAngle: 1,
		droop: .07,
		spread: .55,
		radius: .11,
		bark: ["#8a5a4a", "#5a4038"]
	}),
	roots: {
		tap: 1,
		spread: 1.8,
		count: 14,
		radius: .035
	},
	leaf: {
		length: .15,
		width: .035,
		shape: lance,
		colour: "#3a6a2a",
		young: "#9ab45a",
		style: "along",
		per: 0,
		droop: .45
	},
	flower: {
		kind: rosy("#f2a8c0", .016),
		size: 1.2,
		opens: 4.5,
		sites: "shoots",
		chance: .55,
		axils: [2, 3],
		per: [1, 2]
	},
	fruit: {
		length: .068,
		width: .035,
		stalk: .012,
		keep: [1, 2],
		setFor: 1.9,
		ripeFrom: 2.8,
		ripeFor: 1,
		gloss: false,
		shape: (u, v) => sutured(u, v, .45),
		colour: (ripe, u, v) => ripening("#8ab050", "#e8c05a", "#f2b048")(ripe).lerp(new three.Color("#c83a3a"), clamp(ripe * 1.3 - .2) * (.35 + .65 * Math.max(0, Math.cos(v * Math.PI * 2 + 1)))).lerp(new three.Color("#e8d0c0"), .08)
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "peach",
	label: "Peach",
	latin: "Prunus persica · Pfirsich",
	note: "An open vase on three or four limbs, long narrow leaves, pink blossom; fuzzy peaches with a suture, yellow blushing red.",
	from: "Tree · 4 years",
	stages: PEACH_STAGES,
	grow: peach
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

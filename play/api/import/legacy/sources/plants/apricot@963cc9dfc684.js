//#piece a78bc772c161519da0f53c3e488e6ba88bf2a8e96aee923f3072b69968961145
//#piece 451da356fddf36473723e68c65bb3e9dc96e21e21ddad6ff2bf1dcaf9e01c61c
//#piece 9ad7d8debfe18c7dcf4bef3020fb37218983bac8111dbdf60dd83a4b115c5be4
const APRICOT_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Stone",
		0,
		"A smooth flat apricot stone, chilled through the winter, four centimetres down."
	],
	[
		"Germination",
		25,
		"The stone splits along its edge; the root goes down."
	],
	[
		"Seedling",
		45,
		"Round, pointed leaves on long reddish stalks."
	],
	[
		"Sapling",
		365,
		"A young tree, its bark reddish."
	],
	[
		"Young tree",
		1100,
		"An open, spreading crown, spurs on its outer branches."
	],
	[
		"Blossom",
		1300,
		"White blossom blushed pink, the very first of the year."
	],
	[
		"Fruit set",
		1315,
		"Small velvety green apricots set."
	],
	[
		"Green apricots",
		1360,
		"They fill out, their suture showing."
	],
	[
		"Colouring",
		1400,
		"Yellow-orange, freckled red on the sunny side."
	],
	[
		"Ripe",
		1410,
		"Orange apricots, soft and sweet, falling at a touch."
	]
]))();
const apricot = /* @__PURE__ */ (() => orchard({
	seed: STONE(.024),
	hypogeal: true,
	flush: crown({
		trunk: .7,
		scaffolds: [3, 4],
		scaffoldAngle: .95,
		droop: .06,
		radius: .12,
		bark: ["#8a4a3a", "#5a3a30"]
	}),
	roots: {
		tap: 1.1,
		spread: 1.9,
		count: 14,
		radius: .035
	},
	leaf: {
		length: .08,
		width: .06,
		shape: (u) => toothed(u) * (1 - .25 * u),
		colour: "#3a6a2a",
		young: "#a85a4a",
		style: "along",
		per: 0,
		droop: .3
	},
	flower: {
		kind: rosy("#fbeef0", .014),
		size: 1.1,
		opens: 4.5,
		sites: "spurs",
		chance: 4,
		per: [1, 2]
	},
	fruit: {
		length: .05,
		width: .024,
		stalk: .01,
		keep: [1, 3],
		setFor: 1.8,
		ripeFrom: 2.7,
		ripeFor: 1,
		gloss: false,
		shape: (u, v) => sutured(u, v, .45),
		colour: (ripe, u, v) => ripening("#8ab050", "#f0c050", "#f29a28")(ripe).lerp(new three.Color("#d8483a"), clamp(ripe * 1.3 - .3) * Math.max(0, Math.cos(v * Math.PI * 2)) * (.5 + .5 * Math.pow(Math.abs(Math.sin(u * 40 + v * 50)), 6)))
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "apricot",
	label: "Apricot",
	latin: "Prunus armeniaca · Aprikose",
	note: "An open spreading crown, round pointed leaves; white blossom blushed pink, velvety orange apricots freckled red.",
	from: "Tree · 4 years",
	stages: APRICOT_STAGES,
	grow: apricot
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

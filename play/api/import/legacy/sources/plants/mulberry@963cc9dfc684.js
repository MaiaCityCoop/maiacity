//#piece 471ae05ca4f88118c6c033108196b4d9db9f80c9c3ae2c195ad766aa3a4f020a
//#piece 443d321425ba010b220366a5191c0937fa7de6a479d138eeb26bf19eea30e786
const MULBERRY_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A tiny seed from a berry, sown on the surface."
	],
	[
		"Germination",
		14,
		"The radicle goes down, the hook comes up."
	],
	[
		"Seedling",
		30,
		"Two small seed leaves, then toothed, heart-shaped leaves."
	],
	[
		"Sapling",
		365,
		"Fast: a branching young tree, some leaves lobed, some whole."
	],
	[
		"Young tree",
		1100,
		"A broad, spreading, rounded crown."
	],
	[
		"Flowering",
		1460,
		"Small green catkins hang among the new leaves in spring."
	],
	[
		"Fruit set",
		1470,
		"The catkins swell into little green berries along their length."
	],
	[
		"Green berries",
		1495,
		"Clusters of hard green mulberries, like small blackberries."
	],
	[
		"Colouring",
		1510,
		"They go white, then red, berry by berry."
	],
	[
		"Ripe",
		1525,
		"Black mulberries, soft and juicy, ripening for weeks: the ground under the tree stained purple."
	]
]))();
/** a mulberry leaf: heart-shaped, toothed, often cut into lobes */
const mulberryLeaf = (u) => toothed(u) * (u > .3 && u < .7 ? 1 - .35 * Math.sin((u - .3) / .4 * Math.PI) : 1);
const mulberry = /* @__PURE__ */ (() => orchard({
	seed: {
		size: v3(.002, .0012, .0015),
		coat: "#a8865a",
		shade: "#7a5a3a",
		depth: .004
	},
	hypogeal: false,
	cotyledon: {
		length: .008,
		width: .004,
		colour: "#6aa046"
	},
	flush: crown({
		trunk: .9,
		scaffolds: [4, 5],
		scaffoldAngle: .95,
		droop: .075,
		spread: .65,
		radius: .15,
		shoot: (gen) => [
			0,
			1.4,
			1,
			.75,
			.55,
			.42,
			.34
		][gen] ?? .3,
		bark: ["#8a7058", "#5a4838"]
	}),
	roots: {
		tap: 1.4,
		spread: 2.4,
		count: 16,
		radius: .05
	},
	leaf: {
		length: .13,
		width: .08,
		shape: mulberryLeaf,
		colour: "#3a6a2a",
		young: "#9ac05a",
		style: "along",
		per: 0,
		droop: .35
	},
	flower: {
		catkin: true,
		size: .5,
		opens: 4.6,
		sites: "shoots",
		chance: .6,
		axils: [2, 4],
		per: [1, 2]
	},
	fruit: {
		length: .03,
		width: .008,
		stalk: .012,
		keep: [2, 4],
		setFor: 1.6,
		ripeFrom: 2.2,
		ripeFor: 1.6,
		gloss: true,
		shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .5),
		colour: (ripe) => ripe < .35 ? mix("#8ab84a", "#ece8d8", ripe / .35) : ripe < .65 ? mix("#ece8d8", "#c8283a", (ripe - .35) / .3) : mix("#c8283a", "#2a0a1a", (ripe - .65) / .35),
		skin: {
			colour: (ripe) => ripe < .35 ? "#9ac05a" : ripe < .65 ? "#e04a5a" : "#3a0a1a",
			count: 16,
			size: .0032,
			length: 1
		}
	}
}))();
//#piece d2dc349e1f1f0bd6d0a674965d7ef2507a466222eb9173b0f8849f0f0cad7122
	id: "mulberry",
	label: "Mulberry",
	latin: "Morus nigra · Maulbeere",
	note: "A broad spreading crown of toothed, often lobed leaves; green catkins, then berries like long blackberries going white, red, black, for weeks.",
	from: "Tree · 4 years",
	stages: MULBERRY_STAGES,
	grow: mulberry
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

//#piece b94cdc82c5d956788d495f83eae79d211e483e6ed00f2a369d1e87f022d8e49d
//#piece 9b384ad759eb18fb556835bc58106c3d9ae808841aa36c25467d499082b1098b
const ORANGE_COLOUR = /* @__PURE__ */ (() => ripening("#3f7a2a", "#b8a83a", "#f2911c"))();
//#piece 9c8b194c762fea3ae11e0de9f4f45a82cd77f9444aea3806e8f28f0890ef0ae4
const ORANGE_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A pale ridged seed a centimetre long, fresh from the fruit, a centimetre down."
	],
	[
		"Germination",
		21,
		"The root goes down; the shoot hooks up — its seed leaves stay below in the seed."
	],
	[
		"Seedling",
		45,
		"The first glossy leaves, their stalks winged, smelling of orange when crushed."
	],
	[
		"Sapling",
		365,
		"A bushy little tree, flush after flush of dark glossy leaves."
	],
	[
		"Young tree",
		1460,
		"A dense rounded crown on a short trunk, evergreen."
	],
	[
		"Blossom",
		2400,
		"Waxy white flowers in small clusters at the shoot tips, heavy with scent: orange blossom."
	],
	[
		"Fruit set",
		2420,
		"Little green fruit set; most drop, the strongest stay."
	],
	[
		"Green fruit",
		2550,
		"Round green oranges, full-sized long before they colour."
	],
	[
		"Colouring",
		2650,
		"In the cool of the season the green fades and the orange comes through."
	],
	[
		"Ripe",
		2700,
		"Deep orange fruit among dark leaves, sweet; they keep on the tree for weeks."
	]
]))();
const orange = /* @__PURE__ */ (() => orchard({
	seed: {
		size: v3(.006, .003, .004),
		coat: "#efe6c8",
		shade: "#c9b98c",
		depth: .012
	},
	hypogeal: true,
	flush: {
		trunk: .55,
		trunkBorn: 1.2,
		trunkFlush: 1.6,
		scaffolds: [3, 4],
		scaffoldAngle: .7,
		gens: 7,
		flush: .22,
		rest: .22,
		shoot: (gen) => [
			0,
			.85,
			.65,
			.5,
			.4,
			.33,
			.28,
			.25
		][gen] ?? .25,
		whorl: [2, 4],
		spread: .5,
		up: .04,
		droop: .05,
		wander: .08,
		radius: .1,
		taper: .64,
		thicken: 4,
		bark: ["#6f8a42", "#6a604c"]
	},
	roots: {
		tap: 1,
		spread: 1.8,
		count: 16,
		radius: .03
	},
	leaf: {
		length: .11,
		width: .055,
		shape: ellipse,
		colour: "#2a5424",
		young: "#7aa04a",
		style: "along",
		per: 0,
		droop: .25
	},
	flower: {
		kind: citrusFlower("#fbf8ef"),
		size: 1.1,
		opens: 4.6,
		sites: "tips",
		chance: .45,
		per: [2, 4]
	},
	fruit: {
		length: .078,
		width: .04,
		stalk: .03,
		keep: [1, 2],
		setFor: 1.8,
		ripeFrom: 2.7,
		ripeFor: 1.2,
		gloss: true,
		calyx: "#5f7a34",
		shape: (u, v) => pitted(u, v, .5),
		colour: (ripe, u) => ORANGE_COLOUR(clamp(ripe * 1.3 - (1 - u) * .3))
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "orange",
	label: "Orange",
	latin: "Citrus × sinensis · Orange",
	note: "A dense evergreen dome of glossy leaves, waxy white blossom heavy with scent, round fruit full-sized green before they turn orange.",
	from: "Tree · 7 years",
	stages: ORANGE_STAGES,
	grow: orange
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

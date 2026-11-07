//#piece a7bc7ca0671914b3638292f6a1aec01b14a5447bfe8d616d98379e8db73dd67e
//#piece 963d49086fa6dcaa1b862ecf6e13bd03bc9ff76262f1ca6d1da996bdbc1491d9
const SAFOU_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"The big seed of a safou, sown fresh — it will not keep."
	],
	[
		"Germination",
		14,
		"A root goes down; the shoot comes up from between the fleshy seed leaves."
	],
	[
		"Seedling",
		40,
		"Its first leaves, compound, glossy."
	],
	[
		"Sapling",
		365,
		"A slender young tree."
	],
	[
		"Young tree",
		1460,
		"A dense, rounded evergreen crown of glossy compound leaves."
	],
	[
		"Flowering",
		2200,
		"Panicles of small yellowish flowers at the shoot tips."
	],
	[
		"Fruit set",
		2220,
		"Small pink fruit set in clusters."
	],
	[
		"Pink fruit",
		2280,
		"Oblong fruit swelling, pink and pale."
	],
	[
		"Colouring",
		2320,
		"They darken through violet toward blue."
	],
	[
		"Ripe",
		2340,
		"Clusters of deep blue-violet safous, their green-cream flesh buttery: roast them."
	]
]))();
const safou = /* @__PURE__ */ (() => orchard({
	seed: {
		size: v3(.02, .01, .012),
		coat: "#6a4a3a",
		shade: "#4a3020",
		depth: .03
	},
	hypogeal: false,
	cotyledon: {
		length: .03,
		width: .012,
		colour: "#5a8a3a"
	},
	flush: crown({
		trunk: 1.4,
		scaffolds: [4, 5],
		scaffoldAngle: .75,
		gens: 6,
		whorl: [2, 3],
		radius: .18,
		shoot: (gen) => [
			0,
			1.6,
			1.15,
			.85,
			.62,
			.48,
			.38,
			.32
		][gen] ?? .3,
		bark: ["#8a8070", "#5a5448"]
	}),
	roots: {
		tap: 2,
		spread: 2.6,
		count: 18,
		radius: .06
	},
	leaf: {
		length: .14,
		width: .05,
		shape: ellipse,
		colour: "#2a5424",
		young: "#a8a050",
		style: "along",
		per: 0,
		droop: .3
	},
	flower: {
		panicle: true,
		size: .8,
		opens: 4.7,
		sites: "tips",
		chance: .4,
		per: [1, 1]
	},
	fruit: {
		length: .08,
		width: .023,
		stalk: .03,
		keep: [3, 6],
		setFor: 1.8,
		ripeFrom: 2.6,
		ripeFor: 1.2,
		gloss: true,
		shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .42),
		colour: (ripe) => ripe < .4 ? mix("#e8a8b8", "#a85a9a", ripe / .4) : mix("#a85a9a", "#2a2a6a", (ripe - .4) / .6)
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "safou",
	label: "Safou",
	latin: "Dacryodes edulis · Safou",
	note: "A dense evergreen dome; panicles of small flowers at the tips, then clusters of oblong fruit turning from pink to deep blue-violet.",
	from: "Tree · 6 years",
	stages: SAFOU_STAGES,
	grow: safou
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

//#piece 38da2038f4d994c65759ab7986884d34849ef0aa65dd64e423fdf14fac46cb77
const BASIL_STAGES = /* @__PURE__ */ (() => herbStages("A tiny black seed that turns jelly-coated when wet, barely covered: basil wants warmth and light.", [
	[
		"Young plant",
		35,
		"Pairs of glossy cupped leaves up a soft square stem."
	],
	[
		"Pinched",
		45,
		"The tip pinched out: two side shoots from every axil, a bushy plant."
	],
	[
		"Bushy",
		60,
		"A bush of bright green, cupped, sweet-smelling leaves: harvest from the top."
	],
	[
		"Buds",
		75,
		"Flower spikes form at the tips."
	],
	[
		"Flowering",
		85,
		"White whorled spikes, loud with bees; the leaves now fewer and sharper."
	],
	[
		"Seeding",
		100,
		"The spikes brown and set seed; an annual, it is done for the year."
	]
]))();
const basil = /* @__PURE__ */ (() => bush({
	seed: {
		size: 9e-4,
		colour: "#1a1a1a"
	},
	height: [
		[2, 0],
		[3, .04],
		[4, .14],
		[5, .25],
		[6, .35],
		[7, .42],
		[8, .48],
		[9, .5]
	],
	internode: .035,
	branching: .85,
	depth: 2,
	spread: 1,
	stem: "#6a9a3a",
	leaf: {
		length: .055,
		width: .024,
		shape: ovate,
		colour: "#3f8a2a",
		young: "#7ac04a",
		droop: .25
	},
	flower: {
		colour: "#f4f2ea",
		at: 7,
		kind: "spike",
		size: .002
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "basil",
	label: "Basil",
	latin: "Ocimum basilicum · Basilikum",
	note: "Glossy cupped leaves in pairs on a soft square stem, pinched into a bush; white whorled flower spikes; an annual.",
	from: "Herb · 100 days",
	stages: BASIL_STAGES,
	grow: basil
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

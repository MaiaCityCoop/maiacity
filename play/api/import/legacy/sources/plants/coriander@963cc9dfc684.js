//#piece 78f4a200eafdf3104f73676cb0cb9fc399907dfc443c01d4fc51ef4d36e00580
const CORIANDER_STAGES = /* @__PURE__ */ (() => herbStages("A round, ridged, pale brown seed — it is two seeds in one husk.", [
	[
		"Leafy",
		30,
		"Broad, rounded, lobed lower leaves: the coriander leaf (cilantro)."
	],
	[
		"Bolting",
		45,
		"A stem shoots up; its upper leaves are fine and feathery."
	],
	[
		"Tall",
		55,
		"Branching stems, the leaf harvest over."
	],
	[
		"Umbels",
		60,
		"Small umbels of white and pale pink flowers, the outer petals larger."
	],
	[
		"Flowering",
		70,
		"Lacy white umbels everywhere."
	],
	[
		"Seeding",
		90,
		"Round green seeds that ripen pale brown: coriander seed, the spice."
	]
]))();
const coriander = /* @__PURE__ */ (() => umbellifer({
	seed: {
		size: .003,
		colour: "#b89a6a"
	},
	leaves: 9,
	leafLength: .14,
	pairs: 1,
	colour: "#3f8a2e",
	leaflet: {
		length: .035,
		width: .03,
		shape: flatLeaf
	},
	stalk: .6,
	stalkAt: 4.6,
	bloomAt: 6.6,
	seedAt: 8.4,
	umbel: {
		colour: "#f4e8ec",
		rays: 8,
		size: .03,
		seed: "#b89a6a"
	},
	feathery: true
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "coriander",
	label: "Coriander",
	latin: "Coriandrum sativum · Koriander",
	note: "Broad lobed leaves first, feathery upper ones as it bolts; lacy white umbels, then round seeds.",
	from: "Herb · 90 days",
	stages: CORIANDER_STAGES,
	grow: coriander
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

//#piece 38da2038f4d994c65759ab7986884d34849ef0aa65dd64e423fdf14fac46cb77
const SAGE_STAGES = /* @__PURE__ */ (() => herbStages("A round dark seed, a few millimetres down.", [
	[
		"Young plant",
		45,
		"Soft grey-green leaves, pebbled and felted."
	],
	[
		"Bushing",
		120,
		"A low bush; its oldest stems turning woody."
	],
	[
		"Woody",
		365,
		"An evergreen shrub on woody stems, the leaves silver-grey."
	],
	[
		"Buds",
		400,
		"Tall flower spikes rise above the leaves in its second spring."
	],
	[
		"Flowering",
		420,
		"Violet-blue two-lipped flowers in whorls up the spikes."
	],
	[
		"Seeding",
		450,
		"Cut back after flowering, it pushes new soft growth."
	]
]))();
const sage = /* @__PURE__ */ (() => bush({
	seed: {
		size: .0016,
		colour: "#2a2a20"
	},
	height: [
		[2, 0],
		[3, .04],
		[4, .15],
		[5, .3],
		[6, .45],
		[7, .55],
		[9, .6]
	],
	internode: .04,
	branching: .6,
	depth: 2,
	spread: 1,
	stem: "#8a9a7a",
	woody: "#7a6a54",
	stems: 3,
	leaf: {
		length: .065,
		width: .022,
		shape: ovate,
		colour: "#7a8a6a",
		young: "#9aa88a",
		droop: .2,
		wrinkle: .6,
		grey: .25
	},
	flower: {
		colour: "#7a6ac8",
		at: 7,
		kind: "spike",
		size: .0028
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "sage",
	label: "Sage",
	latin: "Salvia officinalis · Salbei",
	note: "A shrub of soft, pebbled, silver-grey leaves on woody stems; violet-blue flowers in whorls up tall spikes.",
	from: "Shrub · perennial",
	stages: SAGE_STAGES,
	grow: sage
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

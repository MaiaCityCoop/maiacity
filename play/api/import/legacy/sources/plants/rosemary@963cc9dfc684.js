//#piece 5d881d2881e7fede7d1d9ab8cb17c1b195643825437ea6776c6b32fb856ebcc1
const needle = (u) => (1 - u * .6) * Math.min(1, u * 8 + .3);
//#piece 31f5362d931ac70b0941fb2181aa66da23aebe737b277345b4e51237c43cdcc4
const ROSEMARY_STAGES = /* @__PURE__ */ (() => herbStages("A small brown seed, slow and fickle — most rosemary is grown from cuttings.", [
	[
		"Young plant",
		60,
		"An upright stem crowded with dark needle leaves, white beneath."
	],
	[
		"Bushing",
		180,
		"Several stems, the lower ones going woody."
	],
	[
		"Woody",
		450,
		"An evergreen shrub of upright woody stems, resinous to the touch."
	],
	[
		"Buds",
		520,
		"Buds in the leaf axils along last year’s shoots."
	],
	[
		"Flowering",
		540,
		"Pale blue flowers all along the stems in late winter and spring."
	],
	[
		"Seeding",
		580,
		"Flowering over; cut back the tips to keep it dense."
	]
]))();
const rosemary = /* @__PURE__ */ (() => bush({
	seed: {
		size: .0016,
		colour: "#6a4a30"
	},
	height: [
		[2, 0],
		[3, .04],
		[4, .2],
		[5, .38],
		[6, .55],
		[7, .68],
		[9, .75]
	],
	internode: .008,
	branching: .12,
	depth: 1,
	spread: .5,
	stem: "#6a7a4a",
	woody: "#6a5a4a",
	stems: 4,
	leaf: {
		length: .028,
		width: .0022,
		shape: needle,
		colour: "#2f4f2a",
		young: "#5a7a4a",
		droop: .05
	},
	flower: {
		colour: "#a8b8e8",
		at: 7,
		kind: "axils",
		size: .0022
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "rosemary",
	label: "Rosemary",
	latin: "Salvia rosmarinus · Rosmarin",
	note: "Upright woody stems crowded with dark needle leaves, pale blue flowers along them in late winter.",
	from: "Shrub · perennial",
	stages: ROSEMARY_STAGES,
	grow: rosemary
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

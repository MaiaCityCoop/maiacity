//#piece 5d881d2881e7fede7d1d9ab8cb17c1b195643825437ea6776c6b32fb856ebcc1
const needle = (u) => (1 - u * .6) * Math.min(1, u * 8 + .3);
const LAVENDER_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small, shiny dark-brown seed pressed onto the surface: slow and uneven to come up — most lavender is grown from cuttings."
	],
	[
		"Germination",
		21,
		"The radicle goes down, the hook comes up."
	],
	[
		"Seed leaves",
		28,
		"Two small round seed leaves."
	],
	[
		"True leaves",
		45,
		"Narrow grey-green leaves in pairs, already smelling of lavender."
	],
	[
		"Young plant",
		90,
		"Upright stems crowded with narrow leaves, branching from low down."
	],
	[
		"Bushing",
		240,
		"A round mound of grey-green, the oldest stems turning woody."
	],
	[
		"Woody",
		400,
		"An evergreen sub-shrub on a woody base, half a metre across."
	],
	[
		"Buds",
		520,
		"Its second summer: long bare stalks rise above the leaves, tipped with spikes of grey-violet buds."
	],
	[
		"Flowering",
		545,
		"The spikes open, whorl over whorl of small purple flowers, loud with bees."
	],
	[
		"Harvest",
		560,
		"Cut the stalks as the first flowers open and hang them to dry; then trim the mound back to keep it from going leggy."
	]
]))();
const lavender = /* @__PURE__ */ (() => bush({
	seed: {
		size: .0012,
		colour: "#3a2a20"
	},
	height: [
		[2, 0],
		[3, .03],
		[4, .12],
		[5, .24],
		[6, .34],
		[7, .4],
		[9, .44]
	],
	internode: .02,
	branching: .4,
	depth: 2,
	spread: .9,
	stem: "#7a8a6a",
	woody: "#6a5a48",
	stems: 8,
	leaf: {
		length: .035,
		width: .0026,
		shape: needle,
		colour: "#6a7f62",
		young: "#8a9a7a",
		droop: .05,
		grey: .35
	},
	flower: {
		colour: "#7a5aa8",
		at: 6.6,
		kind: "spike",
		size: .0019,
		seed: "#6a5a88",
		stalk: .2,
		length: .055,
		whorls: 8
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "lavender",
	label: "Lavender",
	latin: "Lavandula angustifolia · Lavendel",
	note: "A grey-green mound of narrow leaves on a woody base; long bare stalks above it, each tipped with a spike of purple whorls.",
	from: "Shrub · perennial",
	stages: LAVENDER_STAGES,
	grow: lavender
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

//#piece 5d881d2881e7fede7d1d9ab8cb17c1b195643825437ea6776c6b32fb856ebcc1
const round = (u) => Math.pow(Math.sin(Math.PI * u), .55);
//#piece 31f5362d931ac70b0941fb2181aa66da23aebe737b277345b4e51237c43cdcc4
const OREGANO_STAGES = /* @__PURE__ */ (() => herbStages("A seed like dust, sown on the surface.", [
	[
		"Young plant",
		35,
		"A low mat of small round downy leaves."
	],
	[
		"Spreading",
		80,
		"Creeping stems spread the mat wide."
	],
	[
		"Upright",
		120,
		"Upright stems rise from the mat."
	],
	[
		"Buds",
		140,
		"The stems branch at their tops into tight bud clusters."
	],
	[
		"Flowering",
		150,
		"Flat clusters of tiny pink-purple flowers with purple bracts: the bees’ favourite."
	],
	[
		"Seeding",
		180,
		"Cut the stems in flower and dry them: that is when it tastes strongest."
	]
]))();
const oregano = /* @__PURE__ */ (() => bush({
	seed: {
		size: 4e-4,
		colour: "#4a3a2a"
	},
	height: [
		[2, 0],
		[3, .03],
		[4, .1],
		[5, .2],
		[6, .32],
		[7, .4],
		[9, .45]
	],
	internode: .025,
	branching: .55,
	depth: 2,
	spread: 1.1,
	stem: "#7a4a4a",
	stems: 7,
	leaf: {
		length: .02,
		width: .011,
		shape: round,
		colour: "#4a7a3a",
		young: "#7aa04a",
		droop: .2
	},
	flower: {
		colour: "#c878b0",
		at: 7,
		kind: "cluster",
		size: .0022
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "oregano",
	label: "Oregano",
	latin: "Origanum vulgare · Oregano",
	note: "A low mat of small round leaves sending up branching stems topped with clusters of pink-purple flowers.",
	from: "Herb · perennial",
	stages: OREGANO_STAGES,
	grow: oregano
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

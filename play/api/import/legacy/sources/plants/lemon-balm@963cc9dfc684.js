//#piece 5d881d2881e7fede7d1d9ab8cb17c1b195643825437ea6776c6b32fb856ebcc1
const heart = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .6)), .6) * (1 + (u > .1 && u < .92 ? u * 11 % 1 * .12 : 0));
//#piece 31f5362d931ac70b0941fb2181aa66da23aebe737b277345b4e51237c43cdcc4
const LEMON_BALM_STAGES = /* @__PURE__ */ (() => herbStages("A small dark seed on the surface, kept moist.", [
	[
		"Young plant",
		40,
		"Bright green, heart-shaped, toothed and crinkled leaves, smelling of lemon."
	],
	[
		"Bushing",
		90,
		"A dense clump of upright branching stems."
	],
	[
		"Clump",
		150,
		"A clump half a metre high and wide; it self-seeds freely."
	],
	[
		"Buds",
		170,
		"Tiny buds in the leaf axils along the upper stems."
	],
	[
		"Flowering",
		180,
		"Small white flowers in the axils: Melissa, the bees’ herb."
	],
	[
		"Seeding",
		210,
		"It seeds everywhere unless cut back after flowering."
	]
]))();
const lemonBalm = /* @__PURE__ */ (() => bush({
	seed: {
		size: .0012,
		colour: "#2a2018"
	},
	height: [
		[2, 0],
		[3, .04],
		[4, .16],
		[5, .3],
		[6, .42],
		[7, .5],
		[9, .55]
	],
	internode: .04,
	branching: .5,
	depth: 2,
	spread: .9,
	stem: "#7a9a4a",
	stems: 4,
	leaf: {
		length: .05,
		width: .024,
		shape: heart,
		colour: "#5a9a3a",
		young: "#8ac05a",
		droop: .2,
		wrinkle: .5
	},
	flower: {
		colour: "#f6f2e8",
		at: 7,
		kind: "axils",
		size: .0016
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "lemon-balm",
	label: "Lemon balm",
	latin: "Melissa officinalis · Zitronenmelisse",
	note: "A clump of bright, crinkled, heart-shaped lemony leaves; small white flowers in the axils.",
	from: "Herb · perennial",
	stages: LEMON_BALM_STAGES,
	grow: lemonBalm
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

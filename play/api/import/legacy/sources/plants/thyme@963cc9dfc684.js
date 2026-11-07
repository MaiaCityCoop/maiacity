//#piece 5d881d2881e7fede7d1d9ab8cb17c1b195643825437ea6776c6b32fb856ebcc1
const lance = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .65);
//#piece 31f5362d931ac70b0941fb2181aa66da23aebe737b277345b4e51237c43cdcc4
const THYME_STAGES = /* @__PURE__ */ (() => herbStages("A seed like dust, sown on the surface: thyme wants light.", [
	[
		"Young plant",
		40,
		"Wiry stems with tiny pointed leaves in pairs."
	],
	[
		"Bushing",
		120,
		"A dense mound of wiry branches."
	],
	[
		"Woody",
		365,
		"A little evergreen shrub, its stems woody and twisted."
	],
	[
		"Buds",
		400,
		"Tiny buds crowd the shoot tips."
	],
	[
		"Flowering",
		410,
		"Clouds of tiny pink flowers, alive with bees."
	],
	[
		"Seeding",
		440,
		"Trimmed after flowering, it stays compact for years."
	]
]))();
const thyme = /* @__PURE__ */ (() => bush({
	seed: {
		size: 5e-4,
		colour: "#4a3a2a"
	},
	height: [
		[2, 0],
		[3, .02],
		[4, .07],
		[5, .13],
		[6, .18],
		[7, .22],
		[9, .24]
	],
	internode: .012,
	branching: .75,
	depth: 3,
	spread: 1.2,
	stem: "#7a6a4a",
	woody: "#6a5040",
	stems: 6,
	leaf: {
		length: .008,
		width: .0028,
		shape: lance,
		colour: "#4a6a3a",
		young: "#6a8a4a",
		droop: .1,
		grey: .15
	},
	flower: {
		colour: "#e0a8c8",
		at: 7,
		kind: "cluster",
		size: .0016
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "thyme",
	label: "Thyme",
	latin: "Thymus vulgaris · Thymian",
	note: "A little woody evergreen shrub of wiry stems and tiny leaves, clouds of pink flowers at the tips.",
	from: "Herb · perennial",
	stages: THYME_STAGES,
	grow: thyme
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

//#piece 850a18f23409242330320425e4184375b23d7f893dd573f219b3523b2566fbcb
//#piece 2b831405890f9ba766015f448bf6b86cdeb1dc951d4738174d2fd071526f4d02
const toothed = (u) => ovate(u) * (1 + (u > .1 && u < .9 ? u * 12 % 1 * .12 : 0));
//#piece 31f5362d931ac70b0941fb2181aa66da23aebe737b277345b4e51237c43cdcc4
const MINT_STAGES = /* @__PURE__ */ (() => herbStages("A dust-fine brown seed on the surface — or, as most do, a piece of runner from a friend.", [
	[
		"Young plant",
		30,
		"Toothed, wrinkled leaves in pairs on a purplish square stem."
	],
	[
		"Running",
		50,
		"Runners creep out over and under the soil, rooting as they go."
	],
	[
		"Spreading",
		80,
		"A patch: new shoots come up wherever the runners root. Plant it in a pot or it takes the garden."
	],
	[
		"Buds",
		100,
		"Slim flower spikes at the tips."
	],
	[
		"Flowering",
		110,
		"Lilac whorled spikes humming with bees and butterflies."
	],
	[
		"Seeding",
		130,
		"The spikes brown; the runners keep spreading underground."
	]
]))();
const mint = /* @__PURE__ */ (() => bush({
	seed: {
		size: 6e-4,
		colour: "#5a4030"
	},
	height: [
		[2, 0],
		[3, .04],
		[4, .18],
		[5, .3],
		[6, .4],
		[7, .5],
		[8, .55],
		[9, .55]
	],
	internode: .035,
	branching: .4,
	depth: 1,
	spread: .8,
	stem: "#6a5a4a",
	leaf: {
		length: .05,
		width: .02,
		shape: toothed,
		colour: "#3a7a2a",
		young: "#6aa84a",
		droop: .15,
		wrinkle: .4
	},
	flower: {
		colour: "#c8a0d8",
		at: 7,
		kind: "spike",
		size: .0018
	},
	runners: 6
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "mint",
	label: "Mint",
	latin: "Mentha × piperita · Minze",
	note: "Toothed wrinkled leaves on purplish square stems, runners rooting all round it, lilac flower spikes.",
	from: "Herb · perennial",
	stages: MINT_STAGES,
	grow: mint
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

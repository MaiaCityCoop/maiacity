//#piece 78f4a200eafdf3104f73676cb0cb9fc399907dfc443c01d4fc51ef4d36e00580
const PARSLEY_STAGES = /* @__PURE__ */ (() => herbStages("A ribbed grey-brown seed, slow: three or four weeks to come up.", [
	[
		"Rosette",
		60,
		"A rosette of flat, deeply divided, toothed leaves on long stalks: cut from the outside."
	],
	[
		"Full rosette",
		120,
		"A full dark-green rosette, cut and cut again all summer."
	],
	[
		"Winter",
		240,
		"It sits through the winter, a few leaves green."
	],
	[
		"Bolting",
		300,
		"Its second spring: a stem shoots up from the middle."
	],
	[
		"Flowering",
		320,
		"Flat umbels of tiny yellow-green flowers."
	],
	[
		"Seeding",
		350,
		"Ribbed seeds ripen and brown; the plant dies, having seeded."
	]
]))();
const parsley = /* @__PURE__ */ (() => umbellifer({
	seed: {
		size: .0025,
		colour: "#8a7a5a"
	},
	leaves: 16,
	leafLength: .22,
	pairs: 2,
	colour: "#2f6a28",
	leaflet: {
		length: .03,
		width: .026,
		shape: flatLeaf
	},
	stalk: .7,
	stalkAt: 6.6,
	bloomAt: 7.6,
	seedAt: 8.5,
	umbel: {
		colour: "#d8d880",
		rays: 14,
		size: .035,
		seed: "#6a5a3a"
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "parsley",
	label: "Parsley",
	latin: "Petroselinum crispum · Petersilie",
	note: "A rosette of flat, divided, toothed leaves through its first year; in its second, a stem of yellow-green umbels and ribbed seeds.",
	from: "Herb · 2 years",
	stages: PARSLEY_STAGES,
	grow: parsley
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

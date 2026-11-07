//#piece ff85838fc38b2913a625519c18373084b8b70f3d3e5b8559ea21cc2c6875b36c
/** a feathery leaflet: thread-thin (dill), or cut into narrow lobes (coriander's upper leaves) */
const thread = (u) => .15 * (1 - u) + .05;
/**
* @param {Umbel} spec
* @returns {(g: number, seed: string) => THREE.Group}
//#piece 6bf428bd391139cb7aac064fddcd2c69e861216f06fa871abbffef8e7a795d7e
const DILL_STAGES = /* @__PURE__ */ (() => herbStages("A flat oval ribbed seed, a centimetre down, straight where it is to grow.", [
	[
		"Feathery",
		30,
		"Thread-fine blue-green leaves, a feathery plume."
	],
	[
		"Stem",
		45,
		"A single hollow, ribbed stem shoots up, feathery leaves along it."
	],
	[
		"Tall",
		55,
		"A metre of blue-green stem."
	],
	[
		"Umbels",
		65,
		"Big flat umbels of tiny yellow flowers, like fireworks."
	],
	[
		"Flowering",
		75,
		"Umbel after umbel open; the hoverflies come."
	],
	[
		"Seeding",
		95,
		"Flat seeds ripen brown in the umbels: dill seed, for pickles."
	]
]))();
const dill = /* @__PURE__ */ (() => umbellifer({
	seed: {
		size: .0035,
		colour: "#7a6a4a"
	},
	leaves: 6,
	leafLength: .25,
	pairs: 4,
	colour: "#4a7a5a",
	leaflet: {
		length: .05,
		width: .004,
		shape: thread
	},
	stalk: 1,
	stalkAt: 4.6,
	bloomAt: 6.6,
	seedAt: 8.4,
	umbel: {
		colour: "#f2d82a",
		rays: 22,
		size: .07,
		seed: "#7a5a3a"
	},
	feathery: true
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "dill",
	label: "Dill",
	latin: "Anethum graveolens · Dill",
	note: "Thread-fine blue-green leaves, a single hollow stem, big umbels of yellow flowers, then flat seeds.",
	from: "Herb · 95 days",
	stages: DILL_STAGES,
	grow: dill
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

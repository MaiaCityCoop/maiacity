		return pose;
	};
	return moves;
}

//#endregion
//#region src/lib/actors/species/chicken.ts
const CHICKEN_KINDS = [
	"red",
	"leghorn",
	"australorp",
	"barred",
	"buff",
	"speckled",
	"rooster",
	"chick"
];
const LOOK$4 = {
	red: {
		body: "#9a5a2e",
		neck: "#c98a45",
		wing: "#7e4523",
		tail: "#2c2620",
		legs: "#e3b85a",
		comb: 1,
		lobe: "#c63a2c",
		fluff: 1
	},
	leghorn: {
		body: "#f4f1ea",
		neck: "#f7f4ee",
		wing: "#ebe7de",
		tail: "#f1eee6",
		legs: "#efc34a",
		comb: 1.45,
		lobe: "#f2efe6",
		fluff: .92
	},
	australorp: {
		body: "#1b1d1b",
		neck: "#202421",
		wing: "#1a1c1a",
		tail: "#151816",
		legs: "#4a4a52",
		comb: 1.05,
		lobe: "#c63a2c",
		fluff: 1.06
	},
	barred: {
		body: "#8e9090",
		neck: "#9a9c9b",
		wing: "#888a8a",
		tail: "#7e8080",
		legs: "#e8c050",
		comb: 1,
		lobe: "#c63a2c",
		fluff: 1.05
	},
	buff: {
		body: "#d9a45a",
		neck: "#e3b469",
		wing: "#cf9a50",
		tail: "#c48c44",
		legs: "#e8d2c0",
		comb: .9,
		lobe: "#c63a2c",
		fluff: 1.16
	},
	speckled: {
		body: "#6e3a1e",
		neck: "#7a4422",
		wing: "#673620",
		tail: "#2a221c",
		legs: "#ead6c4",
		comb: .95,
		lobe: "#c63a2c",
		fluff: 1.08
	},
	rooster: {
		body: "#9a3a1a",
		neck: "#e09a3a",
		wing: "#8a3218",
		tail: "#16201c",
		legs: "#e3b85a",
		comb: 1.9,
		lobe: "#c63a2c",
		fluff: 1
	}
};
/** a hen's joints; the rooster stands taller, the chick is a third her size with a big head */
function joints(kind) {
	const j = {
		body: [

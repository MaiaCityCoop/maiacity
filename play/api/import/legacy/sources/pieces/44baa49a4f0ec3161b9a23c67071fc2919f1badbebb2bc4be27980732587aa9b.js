		});
		return pose;
	};
	return moves;
}

//#endregion
//#region src/lib/actors/species/goat.ts
const GOAT_BREEDS = [
	"saanen",
	"alpine",
	"pied",
	"nubian",
	"boer"
];
const LOOK$3 = {
	saanen: {
		coat: "#efe9dc",
		dark: "#d8cfbf",
		nose: "#d9b2a2",
		horns: false,
		ears: "up",
		beard: true,
		heavy: 0
	},
	alpine: {
		coat: "#8a5a33",
		dark: "#1f1a17",
		nose: "#2a2420",
		horns: true,
		ears: "up",
		beard: true,
		heavy: 0
	},
	pied: {
		coat: "#ece5d6",
		dark: "#5a3a24",
		nose: "#3a2c24",
		horns: true,
		ears: "up",
		beard: true,
		heavy: 0
	},
	nubian: {
		coat: "#9a6238",
		dark: "#4a2d1c",
		nose: "#3a2a22",
		horns: false,
		ears: "long",
		beard: false,
		heavy: .3
	},
	boer: {
		coat: "#f0eadf",
		dark: "#8e4a26",
		nose: "#5a3a2c",
		horns: true,
		ears: "long",
		beard: true,
		heavy: 1
	}
};
const J$3 = {
	body: [
		0,
		.66,
		-.02
	],
	chest: [
		0,
		.66,
		.27
	],
	pelvis: [
		0,
		.7,
		-.3
	],
	neck: [[
		0,
		.62,
		.39
	], [
		0,
		.8,
		.49
	]],
	head: [
		0,
		.96,
		.555
	],
	muzzle: [
		0,
		.81,
		.78
	],
	jaw: [
		0,
		.9,
		.59
	],
	ear: [[
		.045,
		.985,
		.55
	], [
		.15,
		.97,
		.52
	]],
	tail: [
		[
			0,

//#region src/lib/actors/species/sheep.ts
const SHEEP_BREEDS = [
	"whiteface",
	"suffolk",
	"merino",
	"black",
	"shorn"
];
const LOOK$1 = {
	whiteface: {
		wool: "#ece6d6",
		face: "#efe7dc",
		legs: "#e8dfd2",
		nose: "#c9a59a",
		depth: 1,
		lumps: .032,
		ears: "pricked",
		woolFace: .15,
		woolLegs: 0
	},
	suffolk: {
		wool: "#ebe4d2",
		face: "#211c19",
		legs: "#1f1a17",
		nose: "#151210",
		depth: 1,
		lumps: .032,
		ears: "long",
		woolFace: 0,
		woolLegs: 0
	},
	merino: {
		wool: "#e6dcc6",
		face: "#efe6da",
		legs: "#ebe2d6",
		nose: "#d3b3a5",
		depth: 1.25,
		lumps: .028,
		ears: "short",
		woolFace: 1,
		woolLegs: 1
	},
	black: {
		wool: "#2e2925",
		face: "#1d1916",
		legs: "#1d1916",
		nose: "#120f0d",
		depth: 1,
		lumps: .032,
		ears: "pricked",
		woolFace: .15,
		woolLegs: 0
	},
	shorn: {
		wool: "#e9e0cc",
		face: "#ece3d7",
		legs: "#e6dccf",
		nose: "#c8a194",
		depth: .25,
		lumps: .02,
		ears: "pricked",
		woolFace: 0,
		woolLegs: 0
	}
};
const J = {
	body: [
		0,
		.6,
		-.02
	],
	chest: [
		0,
		.6,
		.28
	],
	pelvis: [
		0,
		.62,
		-.3
	],
	neck: [[
		0,
		.58,
		.38
	], [
		0,
		.74,
		.5
	]],
	head: [
		0,
		.88,
		.57
	],
	muzzle: [
		0,
		.74,
		.8
	],
	jaw: [
		0,
		.81,
		.6
	],
	ear: [[
		.05,
		.905,
		.565
	], [
		.15,
		.88,
		.52
	]],
	tail: [
		[

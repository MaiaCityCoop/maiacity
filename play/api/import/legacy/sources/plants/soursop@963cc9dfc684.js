//#piece 9a056d8c18ef085a20966ca810253ebdec65470a25d4025abbeb020843586751
//#region src/lib/plants/fruittrees.js
//#piece a82999158b30fb3a0ed82921acc6a52ffefd907f320d529c20896aaa58977963
//#piece 963d49086fa6dcaa1b862ecf6e13bd03bc9ff76262f1ca6d1da996bdbc1491d9
const SOURSOP_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A glossy black seed from the pulp, a centimetre down."
	],
	[
		"Germination",
		21,
		"A root goes down, the hook comes up."
	],
	[
		"Seedling",
		45,
		"Glossy dark leaves, aromatic when crushed."
	],
	[
		"Sapling",
		365,
		"A slender, upright little tree."
	],
	[
		"Young tree",
		1100,
		"A small tree, its limbs low, dense with glossy leaves."
	],
	[
		"Flowering",
		1300,
		"Thick fleshy yellow-green flowers, three big petals over three small, straight out of the limbs."
	],
	[
		"Fruit set",
		1320,
		"Small green fruit with soft curved spines."
	],
	[
		"Green fruit",
		1400,
		"Big heart-shaped soursops hanging from the limbs, spiny all over."
	],
	[
		"Ripening",
		1460,
		"The spines spread apart, the green dulls and yellows a little."
	],
	[
		"Ripe",
		1470,
		"Soft to a thumb: white custard flesh, sweet and sour — corossol."
//#piece 2d3bbac24c7c1301788a02565439647fbc84c2a2ade09f2659616ad9e1590719
const SOURSOP = /* @__PURE__ */ (() => ({
	seed: {
		size: v3(.009, .005, .006),
		coat: "#1a1410",
		shade: "#3a2a20",
		depth: .01
	},
	hypogeal: false,
	cotyledon: {
		length: .022,
		width: .009,
		colour: "#5a8a3a"
	},
	flush: crown({
		trunk: .6,
		scaffolds: [3, 4],
		scaffoldAngle: .7,
		gens: 5,
		radius: .1,
		bark: ["#7a6a5a", "#5a4e44"]
	}),
	roots: {
		tap: 1.2,
		spread: 1.6,
		count: 14,
		radius: .04
	},
	leaf: {
		length: .14,
		width: .05,
		shape: ellipse,
		colour: "#244f22",
		young: "#7aa04a",
		style: "along",
		per: 0,
		droop: .3
	},
	flower: {
		kind: {
			petals: 3,
			length: .03,
			width: .016,
			colour: "#d8d47a",
			heart: "#c8a84a",
			sepals: 3,
			sepal: .006,
			stamens: 0,
			flat: -.3
		},
		size: 1.2,
		opens: 4.6,
		sites: "limbs",
		chance: 2.2,
		per: [1, 1]
	},
	fruit: {
		length: .24,
		width: .075,
		stalk: .05,
		keep: [1, 1],
		setFor: 2,
		ripeFrom: 3,
		ripeFor: .8,
		gloss: false,
		shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .05 + u))), .45) * (1.05 - .35 * u),
		colour: (ripe) => mix("#3f6a2a", "#8a9a4a", ripe),
		skin: {
			colour: (ripe) => ripe < .5 ? "#2f5a24" : "#5a6a34",
			count: 220,
			size: .003,
			length: 2.6
		}
	}
}))();
const soursop = /* @__PURE__ */ (() => orchard$1(SOURSOP))();
//#piece 733ca5d30663b44e498ffd51c5913b2ba3f0995f65a37826037ae038e9a02b8f
	id: "soursop",
	label: "Soursop",
	latin: "Annona muricata · Corossol",
	note: "A small glossy-leaved tree; thick yellow-green flowers straight out of its limbs, then big heart-shaped fruit covered in soft curved spines.",
	from: "Tree · 4 years",
	stages: SOURSOP_STAGES,
	grow: soursop
//#piece 35171bffb608ead070eb23e7bc8d1d229032839d59049e6db39550def1097bf9
const HISTORY = /* @__PURE__ */ (() => ({ soursop: [{
	...FIRST,
	build: orchard(SOURSOP)
//#piece 00063e65fadd36c3f6312b37de5e9d66f57a353169c6de10cf5366d2ff826801

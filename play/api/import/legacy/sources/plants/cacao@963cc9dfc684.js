//#piece 9a056d8c18ef085a20966ca810253ebdec65470a25d4025abbeb020843586751
//#region src/lib/plants/groves.js
//#piece a82999158b30fb3a0ed82921acc6a52ffefd907f320d529c20896aaa58977963
const pointed = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .72)), .6) * (u < .05 ? u / .05 : 1) * (u > .85 ? 1 - (u - .85) * 2.5 : 1);
//#piece 443d321425ba010b220366a5191c0937fa7de6a479d138eeb26bf19eea30e786
const CACAO_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Bean",
		0,
		"A fresh cacao bean from a split pod, still sticky with pulp, sown at once in the shade — it dies if it dries."
	],
	[
		"Germination",
		10,
		"The root goes down; the thick seed leaves are lifted out of the soil."
	],
	[
		"Seedling",
		35,
		"Long, soft, drooping leaves, pink-red as they unfold."
	],
	[
		"Sapling",
		365,
		"One straight stem with its leaves in a spiral, a metre and a half high."
	],
	[
		"Young tree",
		1100,
		"At the jorquette the stem fans out into four or five level branches; flush after flush of limp red leaves."
	],
	[
		"Flowering",
		1460,
		"Cushions of tiny pink-white flowers straight out of the bark of the trunk and the thick limbs, pollinated by midges."
	],
	[
		"Fruit set",
		1480,
		"A few in a hundred set: little green pods (cherelles) on the trunk."
	],
	[
		"Green pods",
		1560,
		"Big ridged pods hanging from the trunk and the limbs, growing for months."
	],
	[
		"Colouring",
		1610,
		"The furrows yellow first, then the ridges: green to yellow to orange."
	],
	[
		"Ripe",
		1640,
		"Heavy yellow-orange pods rattling with beans in their white pulp: cut, split, ferment, dry."
//#piece 2d3bbac24c7c1301788a02565439647fbc84c2a2ade09f2659616ad9e1590719
const CACAO = /* @__PURE__ */ (() => ({
	seed: {
		size: v3(.024, .012, .015),
		coat: "#9a6a5a",
		shade: "#6a3a30",
		depth: .02
	},
	hypogeal: false,
	cotyledon: {
		length: .035,
		width: .016,
		colour: "#7a9a4a"
	},
	flush: crown({
		trunk: 1.3,
		trunkFlush: 1.6,
		scaffolds: [4, 5],
		scaffoldAngle: 1,
		gens: 5,
		whorl: [2, 3],
		spread: .55,
		up: .012,
		droop: .06,
		wander: .1,
		radius: .13,
		taper: .62,
		shoot: (gen) => [
			0,
			1.5,
			1.05,
			.75,
			.55,
			.42
		][gen] ?? .4,
		bark: ["#8a7262", "#655448"]
	}),
	roots: {
		tap: 1.4,
		spread: 2.2,
		count: 16,
		radius: .045
	},
	leaf: {
		length: .3,
		width: .05,
		shape: pointed,
		colour: "#2a5424",
		young: "#b8506a",
		style: "along",
		per: 0,
		droop: .75,
		gloss: true
	},
	flower: {
		kind: {
			petals: 5,
			length: .007,
			width: .0022,
			colour: "#f6ece6",
			heart: "#c86a8a",
			sepals: 5,
			sepal: .006,
			sepalColour: "#e8bcc4",
			sepalBack: .8,
			stamens: 5,
			stamenColour: "#a8507a",
			flat: .5
		},
		size: 1,
		opens: 4.6,
		sites: "trunk",
		chance: 5,
		per: [5, 9]
	},
	fruit: {
		length: .2,
		width: .048,
		stalk: .03,
		keep: [1, 2],
		setFor: 2.2,
		ripeFrom: 3,
		ripeFor: .9,
		gloss: false,
		shape: (u, v) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .04 + u * .98))), .62) * (1 - .18 * Math.pow(u, 2)) * (1 + .075 * Math.abs(Math.cos(v * Math.PI * 5)) + .012 * Math.sin(u * 60) * Math.abs(Math.cos(v * Math.PI * 5))),
		colour: (ripe, u, v) => {
			const ridge = Math.abs(Math.cos(v * Math.PI * 5));
			const r = clamp(ripe * 1.15 - ridge * .15);
			return (r < .5 ? mix("#4a7a2a", "#d0b830", r * 2) : mix("#d0b830", "#d8702a", (r - .5) * 2)).lerp(new three.Color("#2f4a20"), ripe < .2 ? ridge * .2 : 0);
		}
	}
}))();
const cacao = /* @__PURE__ */ (() => orchard$1(CACAO))();
//#piece 733ca5d30663b44e498ffd51c5913b2ba3f0995f65a37826037ae038e9a02b8f
	id: "cacao",
	label: "Cacao",
	latin: "Theobroma cacao · Kakao",
	note: "A stem to its jorquette, then a fan of level branches hung with big limp leaves, red when new; tiny pink-white flowers and big ridged pods straight out of the trunk and thick limbs.",
	from: "Tree · 4 years",
	stages: CACAO_STAGES,
	grow: cacao
//#piece 35171bffb608ead070eb23e7bc8d1d229032839d59049e6db39550def1097bf9
const HISTORY = /* @__PURE__ */ (() => ({ cacao: [{
	...FIRST,
	build: orchard(CACAO)
}, {
	v: 2,
	date: "2026-10-06",
	note: "Pods hang against the trunk and thick limbs on short stalks"
//#piece 95a310e13553b7ae81407819aa70625e511d8f80bfa2c5053c9b0b4b6aba4ef5

//#piece a7bc7ca0671914b3638292f6a1aec01b14a5447bfe8d616d98379e8db73dd67e
//#piece 2c00b6c88c72bf150beabc3265b89d623a6f009b34e293c8cff54c9ac4d649cf
//#piece 443d321425ba010b220366a5191c0937fa7de6a479d138eeb26bf19eea30e786
const SAPODILLA_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A glossy black flattened seed with a white scar, a centimetre down."
	],
	[
		"Germination",
		30,
		"Slow: a month before the root goes down and the hook comes up."
	],
	[
		"Seedling",
		60,
		"Glossy leaves crowded at the tip of the shoot."
	],
	[
		"Sapling",
		400,
		"A slow, symmetrical little tree, its sap a milky latex (chicle)."
	],
	[
		"Young tree",
		1800,
		"A dense evergreen pyramid, its glossy leaves clustered at every shoot tip."
	],
	[
		"Flowering",
		2500,
		"Small bell-shaped whitish flowers among the leaves at the shoot tips."
	],
	[
		"Fruit set",
		2520,
		"Small rusty fruit set, a style sticking out of each tip."
	],
	[
		"Growing",
		2600,
		"Round-oval fruit with a sandy brown scurfy skin, growing slowly."
	],
	[
		"Maturing",
		2680,
		"Rub the scurf off: if the skin is no longer green beneath, it is ready to pick."
	],
	[
		"Ripe",
		2700,
		"Brown sapodillas — sapotilles — soft after picking, their flesh brown sugar and pear."
	]
]))();
const sapodilla = /* @__PURE__ */ (() => orchard({
	seed: {
		size: v3(.01, .003, .006),
		coat: "#1a1410",
		shade: "#3a2a20",
		depth: .01
	},
	hypogeal: false,
	cotyledon: {
		length: .025,
		width: .01,
		colour: "#5a8a3a"
	},
	flush: crown({
		trunk: 1.1,
		scaffolds: [4, 5],
		scaffoldAngle: .65,
		gens: 6,
		whorl: [2, 3],
		radius: .16,
		shoot: (gen) => [
			0,
			1.3,
			.95,
			.72,
			.55,
			.44,
			.36,
			.3
		][gen] ?? .3,
		bark: ["#6a5a4a", "#4a3e34"]
	}),
	roots: {
		tap: 1.8,
		spread: 2.4,
		count: 18,
		radius: .05
	},
	leaf: {
		length: .12,
		width: .04,
		shape: lance,
		colour: "#204a20",
		young: "#8aa050",
		style: "whorl",
		per: 9,
		droop: .35
	},
	flower: {
		kind: {
			petals: 6,
			length: .008,
			width: .004,
			colour: "#f2eedc",
			heart: "#c8b48a",
			sepals: 6,
			sepal: .006,
			stamens: 0
		},
		size: 1,
		opens: 4.7,
		sites: "tips",
		chance: .4,
		per: [2, 4]
	},
	fruit: {
		length: .075,
		width: .032,
		stalk: .025,
		keep: [1, 2],
		setFor: 2.2,
		ripeFrom: 3,
		ripeFor: .8,
		gloss: false,
		shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .5) * (1 + .05 * Math.sin(Math.PI * u)),
		colour: (ripe, u, v) => mix("#7a6a44", "#8a6a44", ripe).lerp(new three.Color("#5a4a34"), Math.pow(Math.abs(Math.sin(u * 60 + v * 45)), 18) * .5)
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "sapodilla",
	label: "Sapodilla",
	latin: "Manilkara zapota · Sapotille",
	note: "A dense evergreen pyramid, glossy leaves crowded in whorls at the shoot tips; small whitish bells, then round-oval fruit with a sandy brown scurfy skin.",
	from: "Tree · 7 years",
	stages: SAPODILLA_STAGES,
	grow: sapodilla
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

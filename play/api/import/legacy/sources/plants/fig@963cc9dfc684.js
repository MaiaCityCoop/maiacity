//#piece a7bc7ca0671914b3638292f6a1aec01b14a5447bfe8d616d98379e8db73dd67e
//#piece 443d321425ba010b220366a5191c0937fa7de6a479d138eeb26bf19eea30e786
const FIG_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A tiny seed from a fig — though most figs are grown from cuttings, pushed into the soil in spring."
	],
	[
		"Germination",
		21,
		"The radicle goes down, the hook comes up."
	],
	[
		"Seedling",
		45,
		"Small seed leaves, then rough, lobed leaves."
	],
	[
		"Sapling",
		365,
		"Thick grey shoots, big lobed leaves, the milky sap in every cut."
	],
	[
		"Young tree",
		1100,
		"A low, spreading, many-stemmed tree of big hand-shaped leaves, rough as sandpaper."
	],
	[
		"Breba",
		1300,
		"Early figs (brebas) swell on last year’s wood; the flowers are hidden inside them."
	],
	[
		"Fruit set",
		1340,
		"New little green figs in the leaf axils of this year’s shoots, one to each leaf."
	],
	[
		"Green figs",
		1380,
		"Pear-shaped green figs, swelling slowly, hard."
	],
	[
		"Colouring",
		1420,
		"They swell suddenly, soften and darken to purple, their eye at the tip opening."
	],
	[
		"Ripe",
		1430,
		"Soft purple figs hanging on their necks, a drop of nectar at the eye: picking time."
	]
]))();
/** a fig leaf: three to five deep lobes, a long cut in either side */
const figLeaf = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .65)), .6) * (1 - .55 * Math.exp(-Math.pow((u - .45) / .08, 2)) - .35 * Math.exp(-Math.pow((u - .75) / .06, 2)));
const fig = /* @__PURE__ */ (() => orchard({
	seed: {
		size: v3(.0015, .001, .001),
		coat: "#c8a878",
		shade: "#8a6a44",
		depth: .004
	},
	hypogeal: false,
	cotyledon: {
		length: .007,
		width: .0035,
		colour: "#6aa046"
	},
	flush: crown({
		trunk: .5,
		scaffolds: [4, 6],
		scaffoldAngle: 1,
		gens: 5,
		droop: .06,
		spread: .6,
		radius: .12,
		taper: .66,
		shoot: (gen) => [
			0,
			1.2,
			.9,
			.65,
			.48,
			.38
		][gen] ?? .32,
		bark: ["#9a9890", "#7a7a74"]
	}),
	roots: {
		tap: 1.2,
		spread: 2.6,
		count: 16,
		radius: .04
	},
	leaf: {
		length: .2,
		width: .11,
		shape: figLeaf,
		colour: "#2f5f2a",
		young: "#8ab45a",
		style: "along",
		per: 0,
		droop: .35
	},
	flower: {
		size: .6,
		opens: 4.7,
		sites: "shoots",
		chance: .6,
		axils: [2, 3],
		per: [1, 1]
	},
	fruit: {
		length: .06,
		width: .026,
		stalk: .012,
		keep: [1, 1],
		setFor: 2,
		ripeFrom: 2.9,
		ripeFor: .9,
		gloss: false,
		shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .45) * (.42 + .58 * Math.pow(clamp(u * 1.4), 1.3)) * (u > .96 ? .85 : 1),
		colour: (ripe, u, v) => mix("#7a9a4a", "#4a2a4a", clamp(ripe * 1.3 - (1 - u) * .3)).lerp(new three.Color("#9aa070"), Math.pow(Math.abs(Math.sin(v * Math.PI * 12)), 10) * .25)
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "fig",
	label: "Fig",
	latin: "Ficus carica · Feige",
	note: "A low, many-stemmed tree of big rough hand-shaped leaves; its flowers hidden inside the figs, one in each leaf axil, pear-shaped, ripening purple.",
	from: "Tree · 4 years",
	stages: FIG_STAGES,
	grow: fig
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

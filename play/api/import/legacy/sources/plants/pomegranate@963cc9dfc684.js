//#piece ed56ed177547580692adcc247624576ab7ed34277c358b39567f34bd520d79e0
const POMEGRANATE_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small angular seed from an aril, its juicy red coat washed off, a centimetre down."
	],
	[
		"Germination",
		20,
		"The radicle goes down, the hook comes up."
	],
	[
		"Seedling",
		40,
		"Two small round seed leaves, then narrow glossy leaves in pairs on a reddish stem."
	],
	[
		"Sapling",
		365,
		"Shoot after shoot from the base: a twiggy little bush, a few twigs ending in a thorn."
	],
	[
		"Young tree",
		1100,
		"A small tree of several stems, three metres high; narrow glossy leaves, bronze when new."
	],
	[
		"Flowering",
		1300,
		"Scarlet trumpets at the shoot tips: a fleshy red calyx and crumpled petals round a boss of yellow stamens."
	],
	[
		"Fruit set",
		1320,
		"The petals fall; the calyx swells into a little round fruit, still crowned with its lobes."
	],
	[
		"Green fruit",
		1380,
		"Round green fruit the size of a fist, heavy on the bending twigs."
	],
	[
		"Colouring",
		1440,
		"The skin turns yellow, then flushes red from the sunny side."
	],
	[
		"Ripe",
		1480,
		"Leathery red pomegranates under their crowns: inside, hundreds of seeds in ruby arils."
	]
]))();
/**
* A pomegranate: round, a little flattened at the stalk, faintly angled; at its blossom end a short neck flaring into
* the crown of the calyx, its lobes standing round a hollow — the tube's last rings, so the fruit and its crown are one.
* @param {number} u @param {number} v
*/
function pomegranateShape(u, v) {
	if (u < .8) return Math.pow(Math.max(0, Math.sin(Math.PI * (u / .8) * .93)), .5) * (1 + .025 * Math.cos(v * Math.PI * 12));
	const t = (u - .8) / .2;
	const lobes = Math.max(0, Math.cos(v * Math.PI * 2 * 6));
	return t < .75 ? .44 - .5 * t + .5 * t * t + lobes * t * .22 : .3 - (t - .75) * .9;
}
const pomegranate = /* @__PURE__ */ (() => orchard({
	seed: {
		size: v3(.006, .0035, .004),
		coat: "#e8dcc0",
		shade: "#b8a07a",
		depth: .01
	},
	hypogeal: false,
	cotyledon: {
		length: .012,
		width: .006,
		colour: "#6aa046"
	},
	flush: crown({
		trunk: .25,
		trunkFlush: 1,
		scaffolds: [5, 7],
		scaffoldAngle: .42,
		gens: 6,
		whorl: [2, 3],
		spread: .6,
		up: .03,
		droop: .075,
		wander: .14,
		radius: .09,
		taper: .62,
		shoot: (gen) => [
			0,
			1.15,
			.7,
			.48,
			.36,
			.28,
			.22
		][gen] ?? .22,
		bark: ["#8a7a68", "#5e5248"]
	}),
	roots: {
		tap: 1,
		spread: 1.6,
		count: 14,
		radius: .035
	},
	leaf: {
		length: .075,
		width: .012,
		shape: lance,
		colour: "#2f5a24",
		young: "#86803a",
		style: "along",
		per: 0,
		droop: .3,
		from: 4,
		gloss: true
	},
	flower: {
		kind: {
			petals: 6,
			length: .022,
			width: .015,
			colour: "#e2301e",
			heart: "#f0c040",
			sepals: 6,
			sepal: .016,
			sepalColour: "#c8402a",
			sepalBack: .05,
			stamens: 30,
			stamenColour: "#f2d24a",
			flat: -.35
		},
		size: 1.1,
		opens: 4.6,
		sites: "tips",
		chance: .55,
		per: [1, 2]
	},
	fruit: {
		length: .1,
		width: .044,
		stalk: .012,
		keep: [1, 1],
		setFor: 2,
		ripeFrom: 2.8,
		ripeFor: 1.1,
		gloss: true,
		shape: pomegranateShape,
		colour: (ripe, u, v) => {
			const ground = ripe < .45 ? mix("#86a44a", "#d8b04a", ripe / .45) : mix("#d8b04a", "#b8202a", (ripe - .45) / .55);
			const blush = clamp(ripe * 1.6 - .3) * (.5 + .5 * Math.cos(v * Math.PI * 2));
			return ground.lerp(new three.Color("#a01a24"), blush * .6).lerp(new three.Color(ripe > .5 ? "#7a2a22" : "#7a8a3a"), u > .82 ? .45 : 0);
		}
	}
}))();
//#piece d2dc349e1f1f0bd6d0a674965d7ef2507a466222eb9173b0f8849f0f0cad7122
	id: "pomegranate",
	label: "Pomegranate",
	latin: "Punica granatum · Granatapfel",
	note: "A small tree of many stems, twiggy, its narrow glossy leaves bronze when new; scarlet trumpets at the shoot tips, then round leathery fruit under a crown, yellow flushing red.",
	from: "Tree · 4 years",
	stages: POMEGRANATE_STAGES,
	grow: pomegranate
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

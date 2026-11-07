//#piece b94cdc82c5d956788d495f83eae79d211e483e6ed00f2a369d1e87f022d8e49d
//#piece a964d7e2f9c137a44dbc8857c439a8107d6658c661f20bb5df9ce70a4099e3a8
const MANGO_COLOUR = /* @__PURE__ */ (() => ripening("#5f9a3a", "#c9c24a", "#f2b632"))();
const MANGO_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Stone",
		0,
		"The flat fibrous stone, ten centimetres long, laid flat a few centimetres down, kept warm and moist."
	],
	[
		"Germination",
		14,
		"A taproot dives; a hooked shoot comes up out of the stone — its seed leaves stay inside, feeding it."
	],
	[
		"Seedling",
		40,
		"A whorl of limp bronze-red leaves at the shoot’s tip, greening as they firm: the first flush."
	],
	[
		"Sapling",
		365,
		"A clear trunk, then three or four scaffold limbs at about 45° breaking from one ring of buds."
	],
	[
		"Young tree",
		1100,
		"Flush after flush: each tip breaks into two or three new shoots, the crown filling out into a dome."
	],
	[
		"Flowering",
		2e3,
		"A dome as wide as tall; upright panicles of tiny pink-cream flowers at the shoot tips."
	],
	[
		"Fruit set",
		2030,
		"Most flowers fall; one or two small green fruit hold on each panicle."
	],
	[
		"Green fruit",
		2080,
		"Mangoes swelling on their long dangling stalks, green and hard; the next flush grows past them."
	],
	[
		"Colouring",
		2120,
		"They turn from green to gold, the sunny side blushing red."
	],
	[
		"Ripe",
		2140,
		"Ripe mangoes, golden and red, fragrant at the stalk: picking time."
	]
]))();
const mango = /* @__PURE__ */ (() => orchard({
	seed: {
		size: v3(.05, .013, .026),
		coat: "#d9c49a",
		shade: "#8a7350",
		depth: .04
	},
	hypogeal: true,
	flush: {
		trunk: .9,
		trunkBorn: 1,
		trunkFlush: 1.5,
		scaffolds: [3, 4],
		scaffoldAngle: .78,
		gens: 6,
		flush: .28,
		rest: .27,
		shoot: (gen) => [
			0,
			1.3,
			.95,
			.7,
			.55,
			.45,
			.38
		][gen] ?? .38,
		whorl: [2, 4],
		spread: .55,
		up: .03,
		droop: .05,
		wander: .07,
		radius: .17,
		taper: .64,
		thicken: 4,
		bark: ["#7a8a4a", "#4e4238"]
	},
	roots: {
		tap: 2.4,
		spread: 2.6,
		count: 18,
		radius: .06
	},
	leaf: {
		length: .3,
		width: .065,
		shape: lance,
		colour: "#24502a",
		young: "#9a3f2e",
		style: "whorl",
		per: 16,
		droop: .55
	},
	flower: {
		panicle: true,
		size: 1,
		opens: 4.8,
		sites: "tips",
		chance: .4,
		per: [1, 1]
	},
	fruit: {
		length: .13,
		width: .045,
		stalk: .22,
		keep: [1, 2],
		setFor: 1.8,
		ripeFrom: 2.9,
		ripeFor: 1,
		gloss: true,
		shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .55) * (1 - .15 * u),
		colour: (ripe, u, v) => MANGO_COLOUR(clamp(ripe * 1.4 - (1 - u) * .4)).lerp(new three.Color("#d6452e"), Math.max(0, Math.cos(v * Math.PI * 2)) * clamp(ripe * 1.2) * .8 * (1 - u * .5))
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "mango",
	label: "Mango",
	latin: "Mangifera indica",
	note: "From a flat stone to a dome as wide as it is tall: a short trunk, scaffold limbs at 45°, flush after flush breaking in whorls from each tip; bronze-red new leaves, panicles at the tips, mangoes on long stalks turning gold and red.",
	from: "Tree · 6 years",
	stages: MANGO_STAGES,
	grow: mango
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

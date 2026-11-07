//#piece ed56ed177547580692adcc247624576ab7ed34277c358b39567f34bd520d79e0
const OLIVE_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Stone",
		0,
		"A hard ridged olive stone, its flesh rotted off, two centimetres down: slow and fickle — most olives are grown from cuttings."
	],
	[
		"Germination",
		40,
		"Weeks later the stone splits; the root goes down, the hook comes up."
	],
	[
		"Seedling",
		70,
		"Two narrow seed leaves, then grey-green leaves in pairs."
	],
	[
		"Sapling",
		400,
		"A slender young tree, silvery, its bark smooth and grey."
	],
	[
		"Young tree",
		1800,
		"A round crown of narrow silvery leaves on a trunk already twisting."
	],
	[
		"Flowering",
		2200,
		"Short sprays of tiny creamy flowers in the leaf axils of last year’s shoots, smelling of honey."
	],
	[
		"Fruit set",
		2215,
		"Most flowers fall; a few little green olives hold, one to three a spray."
	],
	[
		"Green olives",
		2300,
		"Firm green olives filling out among the leaves: picked now for green olives."
	],
	[
		"Turning",
		2370,
		"They turn straw-coloured, then blush violet from the tip."
	],
	[
		"Ripe",
		2400,
		"Purple-black olives, glossy, at the crown’s edge: picked now for oil."
	]
]))();
const olive = /* @__PURE__ */ (() => orchard({
	seed: {
		size: v3(.014, .0065, .0065),
		coat: "#a8906a",
		shade: "#7a6448",
		depth: .02
	},
	hypogeal: false,
	cotyledon: {
		length: .016,
		width: .0045,
		colour: "#6a8a4a"
	},
	flush: crown({
		trunk: .9,
		trunkFlush: 1,
		flush: .25,
		rest: .2,
		scaffolds: [3, 4],
		scaffoldAngle: .65,
		gens: 6,
		whorl: [2, 3],
		spread: .6,
		up: .04,
		droop: .06,
		wander: .15,
		radius: .17,
		taper: .6,
		thicken: 3.5,
		shoot: (gen) => [
			0,
			1.1,
			.8,
			.6,
			.45,
			.35,
			.28
		][gen] ?? .26,
		bark: ["#9a988a", "#6a675e"]
	}),
	roots: {
		tap: 1.2,
		spread: 2.4,
		count: 18,
		radius: .05
	},
	leaf: {
		length: .065,
		width: .0065,
		shape: lance,
		colour: "#62735a",
		young: "#9aa88a",
		style: "along",
		per: 0,
		droop: .3,
		from: 4
	},
	flower: {
		kind: {
			petals: 4,
			length: .0035,
			width: .0022,
			colour: "#f4f0d6",
			heart: "#e2d690",
			sepals: 4,
			sepal: .0012,
			stamens: 2,
			stamenColour: "#e8c040",
			flat: .2
		},
		size: 1,
		opens: 4.6,
		sites: "shoots",
		chance: .45,
		axils: [3, 5],
		per: [6, 9]
	},
	fruit: {
		length: .024,
		width: .0085,
		stalk: .014,
		keep: [1, 3],
		setFor: 2,
		ripeFrom: 2.6,
		ripeFor: 1.3,
		gloss: true,
		shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .5) * (1 + .06 * Math.sin(Math.PI * u * 1.4)),
		colour: (ripe, u) => {
			const r = clamp(ripe + (u - .5) * .25);
			return r < .35 ? mix("#6f8f32", "#b0a84a", r / .35) : r < .7 ? mix("#b0a84a", "#6a2a48", (r - .35) / .35) : mix("#6a2a48", "#1e1420", (r - .7) / .3);
		}
	}
}))();
//#piece d2dc349e1f1f0bd6d0a674965d7ef2507a466222eb9173b0f8849f0f0cad7122
	id: "olive",
	label: "Olive",
	latin: "Olea europaea · Olive",
	note: "A gnarled grey trunk under a dome of narrow silvery leaves; sprays of tiny cream flowers in the leaf axils of last year’s shoots, olives ripening green, violet, black.",
	from: "Tree · 6 years",
	stages: OLIVE_STAGES,
	grow: olive
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

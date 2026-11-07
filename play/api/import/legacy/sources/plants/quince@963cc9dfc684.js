//#piece 93cd28e1984be87f3a80317df8b62ab43ccb177840a1424b4775c87da2645d7d
/** leaf shapes: ovate; oblong-lanceolate; elliptic and pointed; obovate (widest beyond the middle); linear */
const ovate = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .72)), .62) * (u < .04 ? u / .04 : 1);
//#piece 27f3d2c1d16a5de0924ed32e4776eb38b2db77b38997ad690541d645ba2c6c18
const QUINCE_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Pip",
		0,
		"A brown quince pip, its coat turning to slime when wet, chilled through the winter, a centimetre down."
	],
	[
		"Germination",
		25,
		"The radicle goes down; the hook comes up and lifts its seed leaves."
	],
	[
		"Seedling",
		45,
		"Two oval seed leaves, then round true leaves, woolly underneath."
	],
	[
		"Sapling",
		1100,
		"A twiggy young tree, its shoots felted grey, already leaning its own way."
	],
	[
		"Young tree",
		1460,
		"A small crooked tree of four metres, low-branched, its round felted leaves dense."
	],
	[
		"Blossom",
		1830,
		"Late in the spring, one big pale-pink flower at the tip of each short new shoot, among the leaves."
	],
	[
		"Fruit set",
		1845,
		"The petals fall; a woolly green fruit swells under the five leafy sepals."
	],
	[
		"Green quinces",
		1920,
		"Big hard grey-green fruit, still in their grey felt, weighing the shoots down."
	],
	[
		"Colouring",
		1980,
		"The felt rubs off; they turn lemon-yellow, and the tree smells of them."
	],
	[
		"Ripe",
		2e3,
		"Big golden quinces, lumpy, pear- or apple-shaped: rock hard, for jelly, paste and the cellar."
	]
]))();
/** a quince: pear- or apple-shaped by the tree, lumpy at the shoulders, a dimple of dried sepals at its end */
const quinceShape = (pearish) => (u, v) => {
	return Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(.985, u))), .42) * (pearish ? .48 + .52 * Math.pow(clamp(u * 1.35), 1.3) : .78 + .22 * clamp(u * 1.6)) * (1 + .05 * Math.cos(v * Math.PI * 10) * Math.sin(Math.PI * u) + .03 * Math.cos(v * Math.PI * 2 * 3 + u * 4));
};
const quince = /* @__PURE__ */ (() => grove({
	seed: {
		size: v3(.008, .0035, .0045),
		coat: "#6a4428",
		shade: "#3e2614",
		depth: .01
	},
	hypogeal: false,
	cotyledon: {
		length: .014,
		width: .008,
		colour: "#6aa046"
	},
	flush: crown({
		trunk: .7,
		scaffolds: [3, 5],
		scaffoldAngle: .7,
		gens: 6,
		whorl: [2, 3],
		spread: .6,
		up: .06,
		droop: .04,
		wander: .2,
		radius: .12,
		taper: .62,
		shoot: (gen) => [
			0,
			1,
			.75,
			.55,
			.42,
			.32,
			.25
		][gen] ?? .25,
		bark: ["#8a7a68", "#5a4c40"]
	}),
	roots: {
		tap: 1,
		spread: 1.8,
		count: 10,
		radius: .035
	},
	leaf: {
		length: .085,
		width: .06,
		shape: ovate,
		colour: "#5a7a44",
		dark: "#4a6a3a",
		young: "#a8b890",
		spacing: .32,
		droop: .35,
		from: 4,
		tuft: 3,
		curl: .1
	},
	bloom: {
		sites: "tips",
		opens: 4.6,
		chance: .38,
		gen: 5
	},
	site: (s) => {
		const up = s.dir.clone().lerp(UP, .65).normalize();
		if (s.phase < .55) {
			if (s.phase < 0) return void s.bag.add("body", bead(s.at.clone().addScaledVector(up, .008), v3(.006, .009, .006), mix("#c8d0a0", "#f0b8c0", s.phase + .4), 4));
			bloom(s.bag, {
				petals: 5,
				length: .017,
				width: .016,
				colour: "#f6d4da",
				heart: "#e8d06a",
				sepals: 5,
				sepal: .009,
				sepalColour: "#6a8a44",
				stamens: 20,
				stamenColour: "#e8c040"
			}, s.at.clone().addScaledVector(up, .012), up, 1.75, clamp(s.phase / .2), span(s.phase, .35, .55));
			return;
		}
		const { set, ripe } = fruiting(s.phase, 2.5, 1.3, 1.8);
		const pearish = chance(s.seed, "form")() < .5;
		const felt = (1 - ripe) * .4;
		const ground = ripening("#98a868", "#c8c050", "#e8c42e", ripe);
		const r = hangFruit(s, 0, {
			L: .105,
			W: .045,
			stalk: .014,
			set,
			gloss: false,
			out: .6,
			shape: quinceShape(pearish),
			paint: (u, v) => ground.clone().lerp(new three.Color("#d8d8c4"), felt * (.6 + .4 * Math.abs(Math.sin(v * 31 + u * 17)))).lerp(new three.Color("#a8781e"), ripe * .12 * Math.max(0, Math.cos(v * Math.PI * 2)))
		});
		s.bag.add("body", bead(v3(0, -r.L * .985, 0), v3(r.W * .22, r.W * .1, r.W * .22), ripe > .5 ? "#5a4024" : "#6a7a3a", 3), r.m);
		s.bag.fruitDone();
	}
}))();
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "quince",
	label: "Quince",
	latin: "Cydonia oblonga · Quitte",
	note: "A small crooked tree of round felted leaves; one big pale-pink flower at the tip of each short new shoot, then a big downy fruit, pear- or apple-shaped, ripening golden.",
	from: "Tree · 5 years",
	stages: QUINCE_STAGES,
	grow: quince,
//#piece 71e4477229f1395d98f77ee90e10edfab3c5cf71916285980d51209d9a3034a0

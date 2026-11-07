//#piece 93cd28e1984be87f3a80317df8b62ab43ccb177840a1424b4775c87da2645d7d
const oblong = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .85)), .45) * (u > .88 ? 1 - (u - .88) * 3 : 1);
//#piece 27f3d2c1d16a5de0924ed32e4776eb38b2db77b38997ad690541d645ba2c6c18
const MEDLAR_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Stone",
		0,
		"One of the five hard stones of a medlar, chilled through two winters, two centimetres down: slow and fickle — most are grafted."
	],
	[
		"Germination",
		60,
		"In its second spring the stone splits; the root goes down, the seed leaves come up."
	],
	[
		"Seedling",
		90,
		"Two oval seed leaves, then long narrow downy leaves."
	],
	[
		"Sapling",
		1100,
		"A slender young tree, its shoots downy, a few thorns on a wild one."
	],
	[
		"Young tree",
		1500,
		"A small tree as wide as it is high, its branches crooked and spreading level."
	],
	[
		"Blossom",
		1880,
		"In late spring, one big white flower at the tip of each short leafy shoot, its long sepals between the petals."
	],
	[
		"Fruit set",
		1895,
		"The petals fall; the sepals stay, round a green fruit already open at its end."
	],
	[
		"Green medlars",
		1960,
		"Round green-brown fruit, flattened, each with its open eye and five long sepals."
	],
	[
		"Russeting",
		2040,
		"They turn russet brown, rough and hard."
	],
	[
		"Ripe",
		2060,
		"Brown russet medlars picked hard after the first frost; laid down, they blet soft and brown, like apple sauce."
	]
]))();
/** a medlar: round, flattened, then its open eye — a rim flaring round a hollow where the sepals stand */
const medlarShape = (u, v) => {
	if (u < .76) return Math.pow(Math.max(0, Math.sin(Math.PI * (.06 + u / .76 * .84))), .5);
	const t = (u - .76) / .24;
	return t < .5 ? .56 + .3 * Math.sin(t * Math.PI) : .86 - (t - .5) * 1.1;
};
const medlar = /* @__PURE__ */ (() => grove({
	seed: {
		size: v3(.007, .004, .005),
		coat: "#a8865a",
		shade: "#7a5a3a",
		depth: .02
	},
	hypogeal: false,
	cotyledon: {
		length: .014,
		width: .007,
		colour: "#6aa046"
	},
	flush: crown({
		trunk: .8,
		scaffolds: [3, 5],
		scaffoldAngle: .85,
		gens: 6,
		whorl: [2, 3],
		spread: .62,
		up: .045,
		droop: .045,
		wander: .18,
		radius: .12,
		taper: .62,
		shoot: (gen) => [
			0,
			1.05,
			.8,
			.6,
			.44,
			.33,
			.26
		][gen] ?? .26,
		bark: ["#8a7058", "#5e4a3a"]
	}),
	roots: {
		tap: 1,
		spread: 1.9,
		count: 10,
		radius: .035
	},
	leaf: {
		length: .12,
		width: .035,
		shape: oblong,
		colour: "#4a6a32",
		dark: "#3e5e2c",
		young: "#9ab468",
		spacing: .24,
		droop: .4,
		from: 4,
		tuft: 4,
		curl: .08
	},
	bloom: {
		sites: "tips",
		opens: 4.6,
		chance: .4,
		gen: 5
	},
	site: (s) => {
		const up = s.dir.clone().lerp(UP, .65).normalize();
		const sepals = (m, L, W, grown, colour) => {
			const c = mix(colour, "#4a3420", .3);
			for (let k = 0; k < 5; k++) {
				const a = k / 5 * Math.PI * 2;
				const out = v3(Math.cos(a), 0, Math.sin(a));
				const d = out.clone().multiplyScalar(.8).add(v3(0, -.6, 0)).normalize();
				s.bag.add("sheet", sheet({
					length: .016 * grown,
					width: .0035 * grown,
					shape: (u) => Math.sin(Math.PI * Math.pow(u, .5)) * (1 - .7 * u),
					lift: (u) => .25 * u * u,
					paint: () => c,
					along: 4,
					across: 1
				}), m.clone().multiply(aim(v3(0, -L * .88, 0).addScaledVector(out, W * .7), d, 0)));
			}
		};
		if (s.phase < .55) {
			if (s.phase < 0) return void s.bag.add("body", bead(s.at.clone().addScaledVector(up, .008), v3(.006, .01, .006), "#e8ecd8", 4));
			bloom(s.bag, {
				petals: 5,
				length: .016,
				width: .014,
				colour: "#fbfaf2",
				heart: "#d8c878",
				sepals: 5,
				sepal: .018,
				sepalColour: "#6a8a3a",
				sepalBack: .05,
				stamens: 30,
				stamenColour: "#9a2a2a"
			}, s.at.clone().addScaledVector(up, .012), up, 1.6, clamp(s.phase / .2), span(s.phase, .35, .55));
			return;
		}
		const { set, ripe } = fruiting(s.phase, 2.4, 1.3, 1.8);
		const ground = ripening("#7a9048", "#8a7a44", "#7a5030", ripe);
		const r = hangFruit(s, 0, {
			L: .036,
			W: .027,
			stalk: .012,
			set,
			gloss: false,
			out: .5,
			shape: medlarShape,
			paint: (u, v) => ground.clone().lerp(new three.Color("#a88a5a"), Math.pow(Math.abs(Math.sin(u * 47 + v * 61)), 18) * .5).lerp(new three.Color("#3a2a1a"), u > .9 ? .5 : 0)
		});
		sepals(r.m, r.L, r.W, lerp(.6, 1, set), ripe > .5 ? "#5a4024" : "#5a7a34");
		s.bag.fruitDone();
	}
}))();
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "medlar",
	label: "Medlar",
	latin: "Mespilus germanica · Mispel",
	note: "A small spreading tree of long narrow leaves; big single white flowers at the shoot tips, then brown russet fruit, each with an open eye ringed by five long sepals.",
	from: "Tree · 5 years",
	stages: MEDLAR_STAGES,
	grow: medlar,
//#piece 71e4477229f1395d98f77ee90e10edfab3c5cf71916285980d51209d9a3034a0

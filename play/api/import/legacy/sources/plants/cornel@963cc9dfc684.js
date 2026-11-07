//#piece b32157144db154813bb9403218b4b63e0927ed2a19da41ad21d05188275821fa
//#piece 296bdc3bea51e88a38c97d7a27484b1be6116bbb05ef82785ecb9765ae0c3be9
*/
//#piece e36ef73d601f31ef7136c54bc92d7188a90d2ca4c9168a8ea4bfafd9bd5c336d
//#piece 4eb00de4ab747f8d432ecff07f5a71a6a8dd166a83fb7825e6e2d846c22d01e0
//#piece 27f3d2c1d16a5de0924ed32e4776eb38b2db77b38997ad690541d645ba2c6c18
const CORNEL_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Stone",
		0,
		"An oblong ribbed stone from a cornel cherry, two centimetres down: it lies two winters before it wakes."
	],
	[
		"Germination",
		540,
		"In its second spring the root goes down and the seed leaves come up."
	],
	[
		"Seedling",
		570,
		"Two oval seed leaves, then true leaves in opposite pairs, their veins curving to the tip."
	],
	[
		"Sapling",
		1500,
		"A slow, upright little tree, its twigs in pairs."
	],
	[
		"Young tree",
		2200,
		"A dense small tree of five metres, branching in pairs, leafy to the ground."
	],
	[
		"Blossom",
		2600,
		"In February, on the bare twigs: tiny yellow flowers in little umbels at every pair of buds, the whole tree a yellow haze."
	],
	[
		"Fruit set",
		2650,
		"The opposite oval leaves unfold after the flowers; a few small green fruit hold in each umbel."
	],
	[
		"Green fruit",
		2720,
		"Hard green oval fruit hanging in ones and twos all along the twigs."
	],
	[
		"Colouring",
		2780,
		"Through yellow and scarlet in August."
	],
	[
		"Ripe",
		2800,
		"Glossy oval cherries, dark red, sour until they fall: Kornelkirschen for jam, syrup and the schnapps."
	]
]))();
const cornel = /* @__PURE__ */ (() => grove({
	seed: {
		size: v3(.012, .005, .005),
		coat: "#c8b48a",
		shade: "#9a8460",
		depth: .02
	},
	hypogeal: false,
	cotyledon: {
		length: .018,
		width: .009,
		colour: "#6aa046"
	},
	flush: crown({
		trunk: .55,
		scaffolds: [4, 5],
		scaffoldAngle: .5,
		gens: 6,
		whorl: [2, 3],
		spread: .6,
		up: .07,
		droop: .035,
		wander: .12,
		radius: .1,
		taper: .62,
		shoot: (gen) => [
			0,
			1.2,
			.85,
			.6,
			.44,
			.32,
			.24
		][gen] ?? .24,
		bark: ["#8a6a50", "#5a4636"]
	}),
	roots: {
		tap: 1,
		spread: 1.6,
		count: 10,
		radius: .03
	},
	leaf: {
		length: .075,
		width: .038,
		shape: pointed,
		colour: "#3e6a2e",
		dark: "#34602a",
		young: "#8ab45a",
		opposite: true,
		spacing: .6,
		droop: .3,
		from: 4,
		tuft: 2,
		curl: .12,
		on: [
			[4.25, 1],
			[4.55, 0],
			[5.3, 0],
			[6.1, 1]
		]
	},
	bloom: {
		sites: "twigs",
		opens: 4.6,
		chance: 4,
		gen: 4,
		pairs: true
	},
	site: (s) => {
		const fr = chance(s.seed, "umbel", ...s.key);
		const up = s.dir.clone().lerp(UP, .5).normalize();
		if (s.phase < .55) {
			const open = clamp((s.phase + .4) / .5), fall = span(s.phase, .35, .55);
			for (let k = 0; k < 4; k++) s.bag.add("sheet", sheet({
				length: .005,
				width: .003,
				shape: (u) => Math.sin(Math.PI * u),
				paint: () => col("#a89048"),
				along: 2,
				across: 1
			}), aim(s.at, across(up, k * Math.PI / 2).multiplyScalar(lerp(.2, .8, open)).addScaledVector(up, 1).normalize(), 0));
			const n = 10;
			for (let k = 0; k < n; k++) {
				const d = up.clone().addScaledVector(across(up, k * 2.39996), lerp(.2, .9, open) * Math.sqrt((k + .5) / n)).normalize();
				const end = s.at.clone().addScaledVector(d, .01 * lerp(.4, 1, open));
				s.bag.add("body", tube([s.at, end], () => 4e-4, () => col("#8a8a3a"), 3));
				s.bag.add("body", bead(end, v3(.003, .0022, .003).multiplyScalar(lerp(.6, 1, open) * (1 - fall * .6)), fall > .5 ? "#9a9a4a" : mix("#c8b438", "#f0d020", open), 2));
			}
			return;
		}
		const x = fr();
		const keep = s.shoot.gen < 5 || x < .6 ? 0 : x < .9 ? 1 : 2;
		const { set, ripe } = fruiting(s.phase, 2.5, 1.3, 1.6);
		const c = ripe < .35 ? mix("#86a048", "#d8c050", ripe / .35) : ripe < .65 ? mix("#d8c050", "#d8261e", (ripe - .35) / .3) : mix("#d8261e", "#a8101c", (ripe - .65) / .35);
		for (let k = 0; k < keep; k++) {
			const r = hangFruit(s, k, {
				L: .021,
				W: .0075,
				stalk: .016,
				set,
				gloss: true,
				sides: 8,
				rings: 7,
				out: .4,
				shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .5),
				paint: () => c
			});
			s.bag.add("body", bead(v3(0, -r.L, 0), v3(r.W * .25, r.W * .12, r.W * .25), "#3a2a1a", 2), r.m);
			s.bag.fruitDone();
//#piece 90d5b61545bfa24968849ea32dd9b1924a72608a6f5f55dd5aee28c67c3ae436
	id: "cornel",
	label: "Cornelian cherry",
	latin: "Cornus mas · Kornelkirsche",
	note: "A dense small tree of opposite oval leaves with curving veins; tiny yellow umbels all over its bare twigs in late winter, glossy oval red cherries hanging along them in late summer.",
	from: "Tree · 7 years",
	stages: CORNEL_STAGES,
	grow: cornel,
//#piece 71e4477229f1395d98f77ee90e10edfab3c5cf71916285980d51209d9a3034a0

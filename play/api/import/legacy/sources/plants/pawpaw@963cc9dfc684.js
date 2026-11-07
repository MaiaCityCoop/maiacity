//#piece b32157144db154813bb9403218b4b63e0927ed2a19da41ad21d05188275821fa
//#piece 296bdc3bea51e88a38c97d7a27484b1be6116bbb05ef82785ecb9765ae0c3be9
//#piece 53fe6b7c212708dfc7729eb68a8d010ace98d828d584de688a0902491e5f94aa
const obovate = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 1.45)), .6) * (u < .05 ? u / .05 : 1);
const PAWPAW_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A big flat brown seed from a pawpaw, never dried, chilled through the winter, two centimetres down."
	],
	[
		"Germination",
		60,
		"Slow: the root goes deep first; the seed leaves stay in the seed below the soil."
	],
	[
		"Seedling",
		100,
		"A shoot with its first long leaves, wanting shade its first years."
	],
	[
		"Sapling",
		1100,
		"A slender young tree, its leaves big and drooping, its limbs in tiers."
	],
	[
		"Young tree",
		1800,
		"A narrow pyramid four metres high, its great drooping leaves hanging in layers, tropical-looking."
	],
	[
		"Flowering",
		2200,
		"In spring, as the leaves unfold: nodding maroon bells, three-petalled twice, on last year’s bare wood, smelling faintly of yeast."
	],
	[
		"Fruit set",
		2220,
		"Several fruit from each flower: little green clusters, like tiny bananas."
	],
	[
		"Green fruit",
		2300,
		"Clusters of two to four green fruit, kidney-shaped, swelling under the leaves."
	],
	[
		"Colouring",
		2360,
		"The green pales toward yellow; the fruit softens."
	],
	[
		"Ripe",
		2380,
		"Soft yellow-green pawpaws freckled brown, smelling of mango and banana: custard inside, big brown seeds."
	]
]))();
const pawpaw = /* @__PURE__ */ (() => grove({
	seed: {
		size: v3(.022, .008, .013),
		coat: "#6a4424",
		shade: "#3e2410",
		depth: .02
	},
	hypogeal: true,
	leader: {
		height: [
			[1.8, 0],
			[3, .6],
			[4, 2.6],
			[5, 3.9],
			[6, 4.5],
			[7, 4.8],
			[9, 5.1]
		],
		radius: .17,
		tiers: 36,
		clear: .7,
		spacing: .12,
		angle: 1,
		limb: (h) => 1.8 * (1 - h) + .35,
		rate: 1.4,
		crown: 4.6,
		sides: .55,
		side: .11,
		bark: ["#8a8070", "#5e564c"],
		droop: .14
	},
	roots: {
		tap: 1.3,
		spread: 1.8,
		count: 10,
		radius: .035
	},
	leaf: {
		length: .26,
		width: .11,
		shape: obovate,
		colour: "#3e6a2c",
		dark: "#34602a",
		young: "#9ab86a",
		spacing: .24,
		droop: .85,
		from: 1,
		tuft: 3,
		max: 12,
		curl: .05,
		on: [
			[4.3, 1],
			[4.6, .15],
			[5.5, 1]
		]
	},
	bloom: {
		sites: "twigs",
		opens: 4.6,
		chance: 2.4,
		gen: 1
	},
	site: (s) => {
		const out = s.dir.clone().setY(0);
		if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
		out.normalize();
		if (s.phase < .55) {
			const open = clamp((s.phase + .4) / .6), fall = span(s.phase, .38, .55);
			const face = out.clone().multiplyScalar(.4).add(v3(0, -1, 0)).normalize();
			const at = s.at.clone().addScaledVector(face, .012);
			s.bag.add("body", tube([s.at, at], () => .0012, () => col("#5a4a30"), 3));
			if (fall >= 1) return;
			const colour = mix("#6a7a3a", "#5a1424", open);
			for (let k = 0; k < 6; k++) {
				const inner = k >= 3;
				const side = across(face, k / 3 * Math.PI * 2 + (inner ? Math.PI / 3 : 0));
				const flare = inner ? .25 : lerp(.15, .75, open);
				const d = face.clone().multiplyScalar(Math.cos(flare)).addScaledVector(side, Math.sin(flare)).normalize();
				const len = (inner ? .012 : .022) * lerp(.4, 1, open) * (1 - fall * .4);
				s.bag.add("sheet", sheet({
					length: len,
					width: len * .7,
					shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .75)), .6),
					lift: (u, v) => .12 * v * v - .15 * u * u,
					paint: (u) => colour.clone().lerp(new three.Color("#2a0a12"), u * .3),
					along: 4,
					across: 2
				}), aim(at, d, 0));
			}
			return;
		}
		const fr = chance(s.seed, "cluster", ...s.key);
		const x = fr();
		const keep = x < .78 ? 0 : x < .86 ? 1 : x < .95 ? 2 : 3 + Math.floor(fr() * 2);
		const { set, ripe } = fruiting(s.phase, 2.6, 1.2, 1.9);
		const ground = ripening("#5f8a34", "#8aa040", "#c0be5a", ripe);
		for (let k = 0; k < keep; k++) {
			hangFruit(s, k, {
				L: .1,
				W: .03,
				stalk: .025,
				set,
				gloss: false,
				out: .8,
				sides: 12,
				rings: 10,
				bend: .12,
				shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .5) * (.82 + .18 * u),
				paint: (u, v) => ground.clone().lerp(new three.Color("#6a4a2a"), ripe * .6 * Math.pow(Math.abs(Math.sin(u * 53 + v * 71)), 24))
			});
			s.bag.fruitDone();
//#piece 90d5b61545bfa24968849ea32dd9b1924a72608a6f5f55dd5aee28c67c3ae436
	id: "pawpaw",
	label: "Pawpaw",
	latin: "Asimina triloba · Indianerbanane",
	note: "A small pyramidal tree of great drooping leaves; nodding maroon bells on last year’s wood, then clusters of green kidney-shaped fruit, custard inside.",
	from: "Tree · 6 years",
	stages: PAWPAW_STAGES,
	grow: pawpaw,
//#piece 71e4477229f1395d98f77ee90e10edfab3c5cf71916285980d51209d9a3034a0

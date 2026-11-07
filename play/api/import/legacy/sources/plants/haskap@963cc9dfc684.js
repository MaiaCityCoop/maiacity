//#piece 7535922d8e80492ae38b5223be16f66c41c7691f7f7aa23653b64c04bf5ac92c
//#piece 7a2ef48fd5550a313b5b9438ad11795f1b80c749b75cf5e4eb559ec9ddc68e14
//#piece dcbf96dddb66aa38fd96ad90ce7a877a27359df179de3c34334377c79d7b37fc
//#piece a97021c8bd634397ead30fb88b5aa7716e28fe31946fad463c5a442cb5b1d76f
//#piece c6ea6dccf02e948de128ca53d96180b0010a1da7346cb1b69318c250ae7edcd6
//#piece d707968045382413ea14edfc750b0aacabf2f160a3979aa1eb05f338c0d08ffc
*/
//#piece 2ac6ca1a4773a5ee74c8db3fad0536aea2bc7cc29f88f25c310c612e7f76d0f7
//#piece e7579a7a0b8e2522dc8ad33f0795e166af7ee19d3708e4279c06cf16a5b486a1
*/
//#piece ca8bd78f471208b2b3ddfec20b0f2d798db6b126155a2a88386e0d07deb99b60
}
/**
* @typedef {{
//#piece 704a992f4eb8f00b87acb0b4e52950d5a908755391e098622a343777846a14dd
//#piece bcc320abefb21ef13b2cf563e3c6816798e12bc553f68046847168cbc583fbe7
*/
//#piece a31ff25b9c3d1c6733c1b27088a8edbb820b19ea55c592cb36584f1cd8a86554
//#piece 2933a6385f86120f971d1d5086923618fef55b9951d4df6ae7362c8164b22f8a
		});
	}
}
/**
//#piece 3d266a5497afa6828c4c5f34acac2be30592c4d93758a56643724786118a2614
const HASKAP_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A tiny brown seed from a blue berry, sown in autumn."
	],
	[
		"Germination",
		30,
		"Early in spring a root goes down, a hooked shoot comes up."
	],
	[
		"Seed leaves",
		45,
		"Two small round seed leaves, then oval leaves in opposite pairs."
	],
	[
		"Young bush",
		365,
		"A little bush of thin shoots, the leaves in pairs, the bark already peeling."
	],
	[
		"Bush",
		1100,
		"A rounded bush a metre and a half high, brown peeling bark, soft oval leaves in pairs."
	],
	[
		"Flowering",
		1180,
		"The first of all to flower, in March frosts: pale yellow trumpets in pairs in the leaf axils."
	],
	[
		"Fruit set",
		1195,
		"Each pair of flowers sets a single berry, the two grown into one."
	],
	[
		"Green berries",
		1215,
		"Long green berries hanging in the leaf axils."
	],
	[
		"Turning",
		1230,
		"Green to purple to blue, under a silver bloom."
	],
	[
		"Ripe",
		1240,
		"Long blue berries under their bloom — the first fruit of the year, before the strawberries."
	]
]))();
/** @type {Hanging} */
const HASKAP = {
	L: .022,
	W: .0058,
	stalk: .006,
	stalkColour: "#7a8a4a",
	season: {
		opens: 4.6,
		setFor: 2,
		ripeFrom: 7.4,
		ripeFor: 1
	},
	bud: (bag, at, down, open, fall) => {
		const side = round(down, 0);
		for (const s of [-1, 1]) bell(bag, at.clone().addScaledVector(side, s * .0025), down.clone().addScaledVector(side, s * .35).normalize(), .014, .0032, "#e8e0a0", "#f6f0c0", open, fall);
	},
	draw: (bag, at, dir, L, W, ripe) => {
		const c = ramp([
			[0, "#9ab868"],
			[.4, "#8a6a8a"],
			[.75, "#3a3a76"],
			[1, "#3a4682"]
		], ripe);
		const bloom = new three.Color("#7884b0");
		oblong(bag, at, dir, L, W, (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .32) * (1 - .12 * u), (u, v) => c.clone().lerp(bloom, ripe * (.35 + .12 * Math.sin(v * 12 + u * 7))), "#4a3a3a", 8);
	}
};
const haskap = /* @__PURE__ */ (() => shrub({
	seed: {
		size: v3(.0011, 7e-4, 7e-4),
		coat: "#8a6a4a",
		shade: "#5a4430"
	},
	cotyledon: {
		length: .004,
		width: .0028,
		colour: "#6aa046"
	},
	stems: {
		count: 10,
		first: 2,
		every: .19,
		rate: 1.3,
		length: [.66, .84],
		lean: [.3, .75],
		crown: .14,
		radius: .012,
		up: .008,
		wander: .11,
		spread: .85,
		children: 4,
		shorten: [.45, .7],
		depth: 2,
		from0: .22,
		young: "#8a6a50",
		old: "#7a5a46",
		size: [
			[2, .2],
			[3, .4],
			[4, .8],
			[5, 1]
		]
	},
	roots: {
		length: .45,
		count: 7
	},
	leaf: {
		blade: simple((u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .85)), .6), .52, .05),
		length: .058,
		stalk: .005,
		stalkColour: "#7a8a4a",
		spacing: .045,
		opposite: true,
		from: 0,
		bare: .3,
		colour: "#5a8a4c",
		young: "#94b86a",
		vein: "#a8c08a",
		shade: "#4a7a4a",
		droop: .12
	},
	fruit: (ctx) => {
		for (const t of ctx.twigs) {
			if (t.order < 1) continue;
			const fr = chance(ctx.seed, "haskap-node", ...t.key);
			for (let k = 0; k < 4; k++) {
				const w = walk(t.pts, (k + .4) * .045);
				const picks = [fr(), fr()];
				if (!w) break;
				for (const s of [0, 1]) {
					if (picks[s] > (t.order === 2 ? .17 : .06)) continue;
					hanging(ctx, w.p, level(round(w.d, k * Math.PI / 2 + s * Math.PI), level(w.d)), [
						...t.key,
						k,
						s
					], HASKAP);
				}
			}
//#piece 90d5b61545bfa24968849ea32dd9b1924a72608a6f5f55dd5aee28c67c3ae436
	id: "haskap",
	label: "Haskap",
	latin: "Lonicera caerulea · Maibeere",
	note: "A rounded bush of peeling brown stems and soft oval leaves in pairs; pale yellow trumpets in pairs in the leaf axils in March, then long blue berries under a silver bloom — the year’s first fruit.",
	from: "Shrub · 3 years",
	stages: HASKAP_STAGES,
	grow: haskap,
//#piece 6a46d079f14d6089f79784ecf20705689a90de4d5314bb9b21fadbd5aa4987ef

//#piece 20d68b5fb896c3088eb0b9bf38a6181802d5e474a97dd618b8a46ca85c3f7c10
const REDCURRANT_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small pale seed from a berry, sown in autumn: it needs a winter’s cold before it wakes."
	],
	[
		"Germination",
		30,
		"In spring a root goes down, a hooked shoot comes up."
	],
	[
		"Seed leaves",
		45,
		"Two small oval seed leaves, then the first lobed one."
	],
	[
		"Young bush",
		365,
		"A whip of a stem and its side shoots, lobed leaves all along."
	],
	[
		"Bush",
		1100,
		"An open bush of upright stems from the crown, a metre and more, grey-brown bark, spurs on the older wood."
	],
	[
		"Flowering",
		1210,
		"From the spurs hang strigs of small greenish-yellow cups, a dozen and more to a strig."
	],
	[
		"Fruit set",
		1225,
		"The flowers fade; little green berries along each strig, the last few at its tip falling."
	],
	[
		"Green berries",
		1260,
		"Strigs of hard green berries, swelling."
	],
	[
		"Turning",
		1285,
		"The berries clear and blush, the top of each strig first."
	],
	[
		"Ripe",
		1300,
		"Strigs of translucent red currants hanging under the leaves, the seeds showing through."
	]
]))();
//#piece 9c17c385d90bfa684a6dbe599db71455d4dc64783df75889523adcc1c6d7ac07
const redcurrant = /* @__PURE__ */ (() => shrub({
	seed: {
		size: v3(.0014, 9e-4, .001),
		coat: "#d8c8a0",
		shade: "#a8946a"
	},
	cotyledon: {
		length: .005,
		width: .0028,
		colour: "#6aa046"
	},
	stems: {
		count: 10,
		first: 2,
		every: .19,
		rate: 1.3,
		length: [.6, .76],
		lean: [.12, .45],
		crown: .14,
		radius: .014,
		up: .012,
		wander: .08,
		spread: .8,
		children: 4,
		shorten: [.45, .7],
		depth: 2,
		from0: .25,
		young: "#b09272",
		old: "#6e6258",
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
	leaf: CURRANT_LEAF,
	fruit: (ctx) => {
		for (const t of ctx.twigs) {
			const sr = chance(ctx.seed, "spur", ...t.key);
			const n = Math.floor(t.length * [
				2.6,
				2.4,
				1.2
			][t.order] + sr());
			for (let k = 0; k < n; k++) {
				const s = between(sr, t.order ? .1 : .35, t.order === 2 ? .5 : .92) * t.length;
				const a = sr() * Math.PI * 2;
				const per = 1 + Math.floor(sr() * 1.6);
				const w = walk(t.pts, s);
				if (!w) continue;
				for (let m = 0; m < per; m++) {
					const side = round(w.d, a + m * 1.3);
					strig(ctx, {
						at: w.p.clone().addScaledVector(side, .008),
						dir: side,
						key: [
							...t.key,
							k,
							m
						]
					}, RED_STRIG);
				}
			}
		}
	}
}))();
/** @type {Strig} */
const RED_STRIG = {
	count: [9, 15],
	r: .0045,
	drop: 3,
	stalk: "#7a8a46",
	bud: "#b8b878",
	flower: "#c8c27a",
	heart: "#a87a58",
	bloom: .0035,
	colour: (t) => ramp([
		[0, "#9cbc5e"],
		[.35, "#dcd8a0"],
		[.62, "#ec7e70"],
		[1, "#c81428"]
	], t),
	season: {
		opens: 4.7,
		setFor: 2.1,
		ripeFrom: 7.55,
		ripeFor: .8
	},
	step: .035,
	calyx: "#5a3a2a"
};
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "redcurrant",
	label: "Redcurrant",
	latin: "Ribes rubrum · Rote Johannisbeere",
	note: "An open bush of upright stems from the crown, lobed leaves, and from spurs on the two- and three-year-old wood, strigs of small cups that ripen into hanging strings of translucent red currants.",
	from: "Shrub · 3 years",
	stages: REDCURRANT_STAGES,
	grow: redcurrant,
//#piece 6a46d079f14d6089f79784ecf20705689a90de4d5314bb9b21fadbd5aa4987ef

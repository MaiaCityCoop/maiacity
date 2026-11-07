//#piece 20d68b5fb896c3088eb0b9bf38a6181802d5e474a97dd618b8a46ca85c3f7c10
//#piece 9c17c385d90bfa684a6dbe599db71455d4dc64783df75889523adcc1c6d7ac07
const BLACKCURRANT_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small dark seed from a berry, sown in autumn to be chilled through the winter."
	],
	[
		"Germination",
		30,
		"In spring a root goes down, a hooked shoot comes up."
	],
	[
		"Seed leaves",
		45,
		"Two small seed leaves; the first true leaf already smells of blackcurrant."
	],
	[
		"Young bush",
		365,
		"A young bush, several shoots from low down, big lobed leaves."
	],
	[
		"Bush",
		1100,
		"A bushy stool of many stems straight from the ground, renewed from below year by year, the leaves aromatic."
	],
	[
		"Flowering",
		1210,
		"Short strigs of pinkish-purple bells hang from last year’s shoots."
	],
	[
		"Fruit set",
		1225,
		"Little green berries, five to ten to a strig."
	],
	[
		"Green berries",
		1260,
		"Glossy green berries swelling on the young wood."
	],
	[
		"Turning",
		1285,
		"Green to bronze and purple, the top berries first."
	],
	[
		"Ripe",
		1300,
		"Strigs of big glossy black currants, sharp and rich, along last year’s shoots."
	]
]))();
/** @type {Strig} */
const BLACK_STRIG = {
	count: [5, 9],
	r: .0062,
	drop: 2,
	stalk: "#6a7a40",
	bud: "#a88a8a",
	flower: "#b88a96",
	heart: "#7a6a3a",
	bloom: .004,
	colour: (t) => ramp([
		[0, "#8fb05a"],
		[.4, "#8a7a50"],
		[.7, "#4a2236"],
		[1, "#17111c"]
	], t),
	season: {
		opens: 4.65,
		setFor: 2.1,
		ripeFrom: 7.6,
		ripeFor: .85
	},
	step: .05,
	calyx: "#3a2a22"
};
const blackcurrant = /* @__PURE__ */ (() => shrub({
	seed: {
		size: v3(.0014, 9e-4, .001),
		coat: "#4a3424",
		shade: "#2a1c14"
	},
	cotyledon: {
		length: .005,
		width: .003,
		colour: "#5f9a42"
	},
	stems: {
		count: 13,
		first: 2,
		every: .19,
		rate: 1.3,
		length: [.66, .84],
		lean: [.15, .62],
		crown: .2,
		radius: .013,
		up: .01,
		wander: .09,
		spread: .85,
		children: 4,
		shorten: [.45, .7],
		depth: 2,
		from0: .22,
		young: "#a07a5a",
		old: "#5e4e44",
		size: [
			[2, .2],
			[3, .42],
			[4, .82],
			[5, 1]
		]
	},
	roots: {
		length: .5,
		count: 8
	},
	leaf: {
		...CURRANT_LEAF,
		blade: lobed(.86, .55, .26),
		length: .072,
		stalk: .045,
		spacing: .05,
		colour: "#3e7a30",
		shade: "#2f6428",
		young: "#7aae4e",
		bare: .25
	},
	fruit: (ctx) => {
		for (const t of ctx.twigs) {
			if (t.order < 1) continue;
			const sr = chance(ctx.seed, "node", ...t.key);
			const n = Math.floor(t.length / .06);
			for (let k = 1; k < n; k++) {
				const a = sr() * Math.PI * 2;
				if (sr() > (t.order === 2 ? .24 : .1)) continue;
				const w = walk(t.pts, k * .06);
				if (!w) break;
				const side = round(w.d, a);
				strig(ctx, {
					at: w.p.clone().addScaledVector(side, .005),
					dir: side,
					key: [...t.key, k]
				}, BLACK_STRIG);
			}
//#piece 90d5b61545bfa24968849ea32dd9b1924a72608a6f5f55dd5aee28c67c3ae436
	id: "blackcurrant",
	label: "Blackcurrant",
	latin: "Ribes nigrum · Schwarze Johannisbeere",
	note: "A bushy stool of many stems from the ground, big aromatic lobed leaves, short strigs of pinkish bells on last year’s shoots and then big glossy black currants.",
	from: "Shrub · 3 years",
	stages: BLACKCURRANT_STAGES,
	grow: blackcurrant,
//#piece 6a46d079f14d6089f79784ecf20705689a90de4d5314bb9b21fadbd5aa4987ef

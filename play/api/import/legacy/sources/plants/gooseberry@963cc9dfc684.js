//#piece cb1b96d7244aca5c0e7dbdbd4f0c988449ffa768fc8729cca42aa49ef29569e8
//#piece bf1a0388898c2de0cce9eb17a4e6442735ae59e39988d6eb80696d2af7109ed1
//#piece e7579a7a0b8e2522dc8ad33f0795e166af7ee19d3708e4279c06cf16a5b486a1
//#piece 7a59748608c9b71c6d0acd107371325b2af27d96d691012628e3e3c6518127f6
//#piece bcc320abefb21ef13b2cf563e3c6816798e12bc553f68046847168cbc583fbe7
//#piece 07c2cb2bd4ccbd1481dbdcc90feb4861d47907602781c0e6e052def745902bac
//#piece 9c17c385d90bfa684a6dbe599db71455d4dc64783df75889523adcc1c6d7ac07
const GOOSEBERRY_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small seed from a berry, sown in autumn for the winter to chill."
	],
	[
		"Germination",
		30,
		"A root down, a hooked shoot up."
	],
	[
		"Seed leaves",
		45,
		"Two small oval seed leaves; the first spines already at the first nodes."
	],
	[
		"Young bush",
		365,
		"A few spiny shoots, small lobed leaves in tufts."
	],
	[
		"Bush",
		1100,
		"A low bush of arching spiny branches a metre high, sharp spines at every node."
	],
	[
		"Flowering",
		1200,
		"Small green, purple-flushed bells hang in ones and twos under the branches."
	],
	[
		"Fruit set",
		1215,
		"Each bell leaves a little hairy berry behind it, its withered flower at its tip."
	],
	[
		"Green berries",
		1250,
		"Big green veined berries hanging under the branches, hard and sour."
	],
	[
		"Turning",
		1280,
		"The berries soften and blush, the veins showing pale."
	],
	[
		"Ripe",
		1295,
		"Plump dark red gooseberries, hairy and veined, sweet now."
	]
]))();
/** a gooseberry: an oval, faintly hairy, its pale veins running from end to end */
const gooseberryPaint = (ripe) => (u, v) => {
	const c = ramp([
		[0, "#9cc068"],
		[.45, "#b8b060"],
		[.75, "#a84a48"],
		[1, "#7a1e30"]
	], ripe);
	const vein = Math.pow(Math.abs(Math.cos(v * Math.PI * 7)), 22);
	return c.lerp(new three.Color(ripe > .6 ? "#d89a8a" : "#d8e8b0"), vein * .45);
};
const gooseberry = /* @__PURE__ */ (() => shrub({
	seed: {
		size: v3(.0016, .001, .0011),
		coat: "#b8a07a",
		shade: "#8a7450"
	},
	cotyledon: {
		length: .005,
		width: .003,
		colour: "#6aa046"
	},
	stems: {
		count: 9,
		first: 2,
		every: .19,
		rate: 1.3,
		length: [.52, .68],
		lean: [.35, .75],
		crown: .12,
		radius: .011,
		up: -.035,
		wander: .1,
		spread: .85,
		children: 4,
		shorten: [.45, .68],
		depth: 2,
		from0: .22,
		young: "#a8946a",
		old: "#6a5a48",
		size: [
			[2, .2],
			[3, .4],
			[4, .8],
			[5, 1]
		]
	},
	roots: {
		length: .4,
		count: 7
	},
	leaf: {
		...CURRANT_LEAF,
		blade: lobed(.85, .55, .36),
		length: .045,
		stalk: .02,
		spacing: .03,
		tuft: 4,
		spur: .04,
		colour: "#4a8a3a",
		shade: "#3a7432",
		young: "#8ac05a",
		bare: .2
	},
	wood: (ctx, t) => {
		const pr = chance(ctx.seed, "spines", ...t.key);
		const n = Math.floor(t.length / .045);
		for (let k = 0; k < n; k++) {
			const w = walk(t.pts, (k + .4) * .045);
			const a = pr(), many = pr();
			if (!w) break;
			const thick = t.order === 0 ? .006 : t.order === 1 ? .004 : .0025;
			if (t.order === 2 && k % 2) continue;
			for (let m = 0; m < 1 + Math.floor(many * 2.2); m++) {
				const out = round(w.d, a * 6.28 + (m - 1) * .9).addScaledVector(w.d, -.35).normalize();
				prickle(ctx.bag, w.p.clone().addScaledVector(out, thick * .6), out, .008 + many * .004, 9e-4, "#c8b890");
			}
		}
	},
	fruit: (ctx) => {
		for (const t of ctx.twigs) {
			if (t.order < 1) continue;
			const fr = chance(ctx.seed, "goose-node", ...t.key);
			const n = Math.floor(t.length / .045);
			for (let k = 1; k < n; k++) {
				const pick = fr(), two = fr(), a = fr();
				if (pick > .16) continue;
				const w = walk(t.pts, (k + .4) * .045);
				if (!w) break;
				for (let m = 0; m < (two < .35 ? 2 : 1); m++) hanging(ctx, w.p, level(round(w.d, a * 6.28 + m * 2.2), level(w.d)), [
					...t.key,
					k,
					m
				], GOOSE);
			}
		}
	}
}))();
/**
//#piece 3d266a5497afa6828c4c5f34acac2be30592c4d93758a56643724786118a2614
/** @type {Hanging} */
const GOOSE = {
	L: .024,
	W: .0098,
	stalk: .014,
	stalkColour: "#8a8a52",
	season: {
		opens: 4.6,
		setFor: 2.2,
		ripeFrom: 7.6,
		ripeFor: 1.1
	},
	bud: (bag, at, down, open, fall) => bell(bag, at, down, .009, .003, "#a8b066", "#8a4a5e", open, fall),
	draw: (bag, at, dir, L, W, ripe) => {
		oblong(bag, at, dir, L, W, ovalShape, gooseberryPaint(ripe), "#5a3a2a", 10);
		const side = round(dir, 0);
		for (let k = 0; k < 6; k++) {
			const out = side.clone().applyAxisAngle(dir, k * 1.05);
			const p = at.clone().addScaledVector(dir, L * (.3 + k % 3 * .2)).addScaledVector(out, W * .95);
			bag.add("body", tube([p, p.clone().addScaledVector(out, W * .25)], () => 12e-5, () => "#c8b898", 3));
		}
	}
};
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "gooseberry",
	label: "Gooseberry",
	latin: "Ribes uva-crispa · Stachelbeere",
	note: "Arching branches a metre high with sharp spines at every node, small lobed leaves in tufts; single hairy, veined berries hanging under the branches, green turning dark red.",
	from: "Shrub · 3 years",
	stages: GOOSEBERRY_STAGES,
	grow: gooseberry,
//#piece 6a46d079f14d6089f79784ecf20705689a90de4d5314bb9b21fadbd5aa4987ef

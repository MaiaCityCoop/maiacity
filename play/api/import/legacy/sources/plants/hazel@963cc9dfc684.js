//#piece fedc80a64c0535599bebb812bad15bc32a87d6986b4041348d11615b1730a587
const HAZEL_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Nut",
		0,
		"A hazelnut in its shell, sown in the autumn three centimetres down, chilled by the winter."
	],
	[
		"Germination",
		150,
		"The shell cracks at its tip: the root goes down; the seed leaves stay in the nut."
	],
	[
		"Seedling",
		180,
		"A downy shoot of round, toothed, soft leaves."
	],
	[
		"Sapling",
		730,
		"New stems come up from the base beside the first: the hazel is becoming a stool."
	],
	[
		"Young stool",
		1800,
		"Five to ten straight stems from the stool, four to six metres, cut every seven years or so for poles and grown again."
	],
	[
		"Flowering",
		2190,
		"In late winter, on the bare twigs: yellow lamb’s-tail catkins dangling in ones to fours, and tiny bud-like female flowers with tufts of crimson stigmas."
	],
	[
		"Nut set",
		2280,
		"The leaves come; where the red tufts were, tiny nuts form in clusters, each in a green frilly husk."
	],
	[
		"Green nuts",
		2380,
		"Clusters of green-white nuts in their ragged husks — and next year’s catkins already there, small, stiff and grey-green."
	],
	[
		"Turning",
		2440,
		"The husks dry at their edges; the shells turn from green-white to tan."
	],
	[
		"Ripe",
		2460,
		"Brown hazelnuts loose in browning husks, falling at a shake — before the squirrels and the dormice."
	]
]))();
const hazel = /* @__PURE__ */ (() => wood({
	seed: {
		size: v3(.009, .008, .008),
		coat: "#9a6a3a",
		shade: "#6a4626",
		depth: .03
	},
	hypogeal: true,
	coppice: {
		stems: [6, 9],
		from: 1.6,
		every: .35,
		lean: .3,
		stool: .22,
		leader: {
			height: [
				[2, 0],
				[2.4, .25],
				[3, 1.3],
				[4, 3.2],
				[5, 4.4],
				[6, 4.9],
				[9, 5.3]
			],
			radius: .07,
			tiers: 26,
			clear: .9,
			spacing: .22,
			angle: .85,
			limb: (h) => 1.5 * (1 - .55 * h) + .3,
			rate: 1.6,
			crown: 4.6,
			sides: .5,
			side: .16,
			bark: ["#8a6a4c", "#6a5440"],
			droop: .09
		}
	},
	roots: {
		tap: 1,
		spread: 2.2,
		count: 12,
		radius: .04
	},
	leaf: {
		blade: {
			stalk: .014,
			length: .11,
			width: .05,
			shape: (u) => u < .2 ? .55 + .45 * Math.sin(Math.PI / 2 * (u / .2)) : u < .72 ? 1 - .12 * Math.pow((u - .2) / .52, 2) : .88 * Math.pow(Math.cos(Math.PI / 2 * ((u - .72) / .28)), .7),
			back: .08,
			along: 6,
			bow: .07
		},
		colour: "#3e6e2a",
		young: "#9ac060",
		autumn: "#d0b040",
		droop: .3,
		gap: .08,
		per: 3,
		twig: .14,
		tuft: 3,
		limb: .25,
		top: 3,
		bare: true
	},
	bear(ctx) {
		const { bag, g, seed } = ctx;
		for (const sh of ctx.shoots) {
			if (sh.gen !== 2) continue;
			const sites = chance(seed, "twig", ...sh.key)() < .35 ? 1 : 0;
			for (let s = 0; s < sites; s++) {
				const fr = chance(seed, "flowering", ...sh.key, s);
				const { at, dir } = along(sh.pts, between(fr, .72, 1));
				const phase = g - (4.55 + fr() * .25);
				if (phase > -.45 && phase < .6) {
					const n = 1 + Math.floor(fr() * 4);
					for (let k = 0; k < n; k++) {
						const a = k * 2.39996 + fr();
						const len = lerp(.025, .075, span(phase, -.45, -.05)) * lerp(1, .6, span(phase, .3, .6));
						catkin(bag, at, v3(Math.cos(a) * .3, -1, Math.sin(a) * .3), len, .0048, phase < .25 ? mix("#a8a860", "#e8d050", span(phase, -.3, -.05)) : mix("#e8d050", "#7a6a40", span(phase, .25, .55)), .05);
					}
				}
				if (phase > -.3 && phase < .7) {
					const bud = at.clone().addScaledVector(dir, .006).add(v3(0, .004, 0));
					bag.add("body", bead(bud, v3(.0028, .0042, .0028), "#6a5a3a", 3));
					const tuft = span(phase, -.3, 0) * (1 - span(phase, .4, .7));
					for (let k = 0; k < 6; k++) {
						const a = k / 6 * TAU;
						bag.add("body", tube([bud.clone().add(v3(0, .003, 0)), bud.clone().add(v3(Math.cos(a) * .004, .007, Math.sin(a) * .004))], () => 7e-4 * tuft + 1e-4, () => "#d01838", 3));
					}
				}
				const set = span(phase, .6, 2.3);
				const ripe = span(phase, 2.6, 3.7);
				if (set > 0) {
					const keep = 1 + Math.floor(fr() * 3);
					for (let k = 0; k < keep; k++) {
						const kr = chance(seed, "hazelnut", ...sh.key, s, k);
						const size = ctx.vigour * about(kr, 1, .08) * lerp(.15, 1, set);
						const L = .02 * size, W = .008 * size;
						const swing = v3(Math.cos(k * 2.4 + kr()), 0, Math.sin(k * 2.4 + kr()));
						const place = hang(ctx, at.clone().addScaledVector(swing, .008), swing.clone().add(v3(0, -.8, 0)).normalize(), L * 1.1, W * 1.3, .02 + W);
						bag.fruit([
							"hazelnut",
							...sh.key,
							s,
							k
						], at, place.dir);
						bag.add("body", tube([at, place.at], () => .0016, () => "#6a7a3a", 3));
						const m = hung(place.at, place.dir, kr() * TAU);
						const nut = ripe < .4 ? mix("#d8dcb0", "#c8a868", ripe / .4) : mix("#c8a868", "#8a5a2e", (ripe - .4) / .6);
						bag.add("gloss", bead(v3(0, -L * .55, 0), v3(W, L * .5, W * .92), nut, 3), m);
						const husk = ripe < .5 ? mix("#6a9a3a", "#9aa04a", ripe * 2) : mix("#9aa04a", "#9a7a4a", (ripe - .5) * 2);
						const axis = [];
						for (let r = 0; r <= 5; r++) axis.push(v3(0, -.001 - r / 5 * L * 1.05, 0));
						bag.add("body", tube(axis, (u, v) => W * (.55 + .75 * Math.sqrt(u)) * (u > .6 ? 1 + .35 * (u - .6) * Math.abs(Math.sin(v * Math.PI * 5)) : 1) * (1 + .15 * ripe * u), (u, v) => husk.clone().multiplyScalar(u > .8 ? 1.15 : .95 + .1 * Math.sin(v * 31)), 8), m);
						bag.fruitDone();
					}
				}
				const next = span(g, 6.6, 8.6);
				if (next > .02) {
					const m = 1 + Math.floor(chance(seed, "next", ...sh.key, s)() * 2);
					for (let k = 0; k < m; k++) {
						const a = k * 2.39996 + 1.2;
						catkin(bag, at, v3(Math.cos(a), -.2, Math.sin(a)).addScaledVector(dir, .4), .022 * next, .0026, "#8a8a62", .8);
					}
				}
			}
//#piece 90d5b61545bfa24968849ea32dd9b1924a72608a6f5f55dd5aee28c67c3ae436
	id: "hazel",
	label: "Hazel",
	latin: "Corylus avellana · Haselnuss",
	note: "A coppice stool of straight stems from the base, round toothed leaves; yellow lamb’s tails and crimson-tufted female flowers on the bare twigs in late winter, then nuts in clusters in their frilly husks, ripening brown.",
	from: "Coppice · 6 years",
	stages: HAZEL_STAGES,
	grow: hazel,
//#piece 71e4477229f1395d98f77ee90e10edfab3c5cf71916285980d51209d9a3034a0

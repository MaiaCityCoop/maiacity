//#piece 0165430aff7a7b39031bd93dbfe473788d6f794698d9d9f28704cce28ac6b54f
//#piece 05b5597e4e5f80f81139f61718ff1cc3e173915cde80a391fe363409c9a8297a
//#piece 4a82d0c0d2de49164bac6d92e953e2cf899885cf87f11d98026000d30bd4f76b
const ALDER_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A tiny flat nutlet with a narrow corky wing — alder seed floats down streams — on wet soil, barely covered."
	],
	[
		"Germination",
		30,
		"A thread of a root, then a hook of a stem."
	],
	[
		"Seedling",
		50,
		"Two small round seed leaves, then round toothed leaves; Frankia from the soil already swelling the first nodules on its roots."
	],
	[
		"Sapling",
		365,
		"A slender, fast whip, a metre or more in its second year, its young leaves sticky (glutinosa)."
	],
	[
		"Young tree",
		1800,
		"A narrow cone of a tree on one straight dark trunk, its limbs level in tiers: the support tree, its nodules feeding the garden nitrogen."
	],
	[
		"Flowering",
		2550,
		"In late winter, before the leaves: long purple-brown catkins at the twig tips loosening yellow with pollen; below them, tiny dark red female catkins."
	],
	[
		"Cone set",
		2600,
		"The leaves unfold, round and notched at the tip; the female catkins swell into little green cones."
	],
	[
		"Green cones",
		2700,
		"Clusters of green cones on short stalks, and next year’s catkins already formed, small and stiff."
	],
	[
		"Turning",
		2760,
		"The cones darken and harden, olive to brown."
	],
	[
		"Ripe",
		2800,
		"Dark woody cones, their scales open, shedding seed through the winter; the leaves fall green — alder keeps no autumn colour."
	]
]))();
const alder = /* @__PURE__ */ (() => wood({
	seed: {
		size: v3(.0014, 5e-4, .0013),
		coat: "#7a5a3a",
		shade: "#5a3e26",
		depth: .003
	},
	hypogeal: false,
	cotyledon: {
		length: .005,
		width: .0028,
		colour: "#5f9a3e"
	},
	nodules: true,
	flush: {
		trunk: 1.5,
		trunkBorn: 1.6,
		trunkFlush: 1.2,
		scaffolds: [4, 6],
		scaffoldAngle: .28,
		gens: 6,
		flush: .16,
		rest: .08,
		shoot: (gen) => [
			0,
			2.8,
			1.6,
			1.05,
			.72,
			.52,
			.4
		][gen] ?? .38,
		whorl: [2, 3],
		spread: .45,
		up: .085,
		droop: .04,
		wander: .12,
		radius: .13,
		taper: .62,
		thicken: 3.5,
		bark: ["#6a5e50", "#4a423c"]
	},
	roots: {
		tap: 1.6,
		spread: 3,
		count: 9,
		radius: .06
	},
	leaf: {
		blade: {
			stalk: .025,
			length: .095,
			width: .048,
			shape: (u) => u < .62 ? Math.pow(Math.sin(Math.PI / 2 * (u / .62)), .8) : Math.sqrt(1 - .78 * Math.pow((u - .62) / .38, 2)),
			along: 4,
			bow: .05
		},
		colour: "#44703a",
		young: "#74a444",
		autumn: "#4a7232",
		droop: .15,
		gap: .09,
		per: 3,
		twig: .14,
		tuft: 4,
		from: 4,
		inner: 2,
		bare: true
	},
	bear(ctx) {
		const { bag, g, seed } = ctx;
		for (const sh of tips(ctx, .22)) {
			const fr = chance(seed, "flowering", ...sh.key);
			const phase = g - (4.55 + fr() * .25);
			if (phase < -.4) continue;
			const tip = sh.tip;
			if (phase < .6) {
				const n = 2 + Math.floor(fr() * 3);
				for (let k = 0; k < n; k++) {
					const a = k * 2.39996 + fr();
					catkin(bag, tip, sh.dir.clone().add(v3(Math.cos(a) * .6, -.2, Math.sin(a) * .6)).normalize(), lerp(.03, .09, span(phase, -.4, 0)) * lerp(1, .7, span(phase, .3, .6)), .0038, phase < .15 ? mix("#5a2e30", "#c8a040", span(phase, -.1, .12)) : mix("#c8a040", "#5a4030", span(phase, .2, .5)), .15);
				}
			}
			const set = span(phase, .2, 2);
			const ripe = span(phase, 2.4, 3.6);
			const n = 2 + Math.floor(fr() * 3);
			const { at: base } = along(sh.pts, .88);
			for (let k = 0; k < n; k++) {
				const kr = chance(seed, "cone", ...sh.key, k);
				const L = lerp(.005, .018, set) * about(kr, 1, .1), W = lerp(.0022, .0068, set) * about(kr, 1, .08);
				const a = k * 2.39996 + kr();
				const out = v3(Math.cos(a), set < .3 ? .6 : -.6, Math.sin(a));
				const place = hang(ctx, base.clone().addScaledVector(out.clone().setY(0), .008), out.clone().setY(-.8).normalize(), L, W, .012 + W);
				if (set > 0) bag.fruit([
					"cone",
					...sh.key,
					k
				], base, place.dir);
				bag.add("body", tube([base, place.at], () => .0012, () => "#4a3a2a", 3));
				const colour = set < .25 ? mix("#7a2a30", "#5a7a34", set * 4) : ripe < .5 ? mix("#5a7a34", "#6a6034", ripe * 2) : mix("#6a6034", "#3a2618", (ripe - .5) * 2);
				const open = span(ripe, .6, 1);
				const axis = [];
				for (let r = 0; r <= 6; r++) axis.push(v3(0, -(r / 6) * L, 0));
				bag.add("body", tube(axis, (u, v) => W * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .06 + u * .94))), .6) * (1 + (.12 + .25 * open) * ((Math.round(u * 6) + Math.round(v * 6)) % 2)), (u, v) => colour.clone().multiplyScalar((Math.round(u * 6) + Math.round(v * 6)) % 2 ? 1.1 : .75), 6), hung(place.at, place.dir, kr() * TAU));
				if (set > 0) bag.fruitDone();
			}
			const next = span(g, 6.6, 8.6);
			if (next > .02) {
				const m = 1 + Math.floor(chance(seed, "next", ...sh.key)() * 2);
				for (let k = 0; k < m; k++) {
					const a = k * 2.39996 + .5;
					catkin(bag, tip, sh.dir.clone().add(v3(Math.cos(a) * .5, -.1, Math.sin(a) * .5)), .03 * next, .0028, "#5a3a34", .75);
				}
			}
//#piece 90d5b61545bfa24968849ea32dd9b1924a72608a6f5f55dd5aee28c67c3ae436
	id: "alder",
	label: "Black alder",
	latin: "Alnus glutinosa · Schwarzerle",
	note: "The support tree: a narrow cone on a straight dark trunk, round notched leaves, purple-brown catkins in late winter, little woody cones — and on its roots the orange nodules where Frankia fixes nitrogen for the garden.",
	from: "Tree · 7 years",
	stages: ALDER_STAGES,
	grow: alder,
//#piece e1797c241a6f0bc0a3c1a16ce83f21c08d995da4d10a55c215193f25cdcb6014

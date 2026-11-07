//#piece c92ea29fcb17ced1c2ac4076ea116080dcb170329cf917fb6ca432da509de9c0
const PECAN_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Nut",
		0,
		"A pecan in its thin shell, soaked for two days and sown in the spring four centimetres down, after a winter in the cold."
	],
	[
		"Germination",
		25,
		"A thick white root straight down; the seed leaves stay in the shell."
	],
	[
		"Seedling",
		60,
		"A stout shoot with its first leaves, pinnate, the leaflets long and curved like a sickle."
	],
	[
		"Sapling",
		900,
		"A straight young tree with a deep taproot, slow to leaf in the spring and its leaves long and arching."
	],
	[
		"Young tree",
		2600,
		"A tall, oval crown on a straight grey trunk, the bark breaking into narrow scaly ridges — heading for thirty metres."
	],
	[
		"Flowering",
		3300,
		"In late May with the leaves: green catkins hanging in threes from last year’s wood, and at the new shoot tips small spikes of female flowers."
	],
	[
		"Nut set",
		3330,
		"The catkins drop; at the shoot tips clusters of three to six small green nuts, each with four ridges."
	],
	[
		"Green nuts",
		3420,
		"Clusters of ridged green husks the size of a walnut, hanging at the ends of the shoots."
	],
	[
		"Turning",
		3500,
		"The husks darken to brown at their seams."
	],
	[
		"Ripe",
		3530,
		"The husks split along their four ridges and open: smooth brown pecans, long and pointed, dropping in October — the best of the nuts."
	]
]))();
const pecan = /* @__PURE__ */ (() => wood({
	seed: {
		size: v3(.011, .011, .02),
		coat: "#9a6a3e",
		shade: "#6a4224",
		depth: .04
	},
	hypogeal: true,
	flush: {
		trunk: 2.1,
		trunkBorn: 1.6,
		trunkFlush: 1.2,
		scaffolds: [3, 5],
		scaffoldAngle: .48,
		gens: 6,
		flush: .16,
		rest: .08,
		shoot: (gen) => [
			0,
			1.7,
			1.25,
			.94,
			.7,
			.54,
			.42
		][gen] ?? .4,
		whorl: [2, 3],
		spread: .55,
		up: .06,
		droop: .05,
		wander: .12,
		radius: .15,
		taper: .62,
		thicken: 3.5,
		bark: ["#8a8478", "#5e5a52"]
	},
	roots: {
		tap: 3,
		spread: 3.6,
		count: 9,
		radius: .08
	},
	leaf: {
		blade: {
			stalk: 0,
			length: .42,
			width: 0,
			shape: () => 1,
			along: 3,
			pinnate: 5,
			wide: .2
		},
		colour: "#3e6a2a",
		young: "#7a9a3e",
		autumn: "#c8a83e",
		droop: .08,
		gap: .32,
		per: 1,
		twig: 0,
		tuft: 4,
		from: 4,
//#piece 69f7ad77a50e487f65c06588551d9c9143ca868add033d765351614360e1a9cb
			const phase = g - (4.75 + cr() * .25);
			if (phase < -.45 || phase > .55) continue;
			const { at, dir } = along(sh.pts, between(cr, .6, .95));
			for (let k = 0; k < 3; k++) {
				const a = k * 2.1 + cr();
				const len = .12 * lerp(.25, 1, span(phase, -.45, -.05)) * lerp(1, .6, span(phase, .25, .55));
				catkin(bag, at, dir.clone().add(v3(Math.cos(a) * .4, -.5, Math.sin(a) * .4)).normalize(), len, .0035, phase < .2 ? mix("#7a9440", "#c0c05a", span(phase, -.1, .1)) : mix("#c0c05a", "#6a5a3a", span(phase, .2, .45)), .08);
			}
		}
		for (const sh of tips(ctx, .55)) {
			const fr = chance(seed, "flowering", ...sh.key);
			const phase = g - (4.85 + fr() * .25);
			if (phase < .4) continue;
			const set = span(phase, .4, 2.3), ripe = span(phase, 2.6, 3.7);
			const keep = 3 + Math.floor(fr() * 4);
			const up = sh.dir.clone().lerp(v3(0, 1, 0), .4).normalize();
			for (let k = 0; k < keep; k++) {
				const kr = chance(seed, "pecan", ...sh.key, k);
				const size = ctx.vigour * about(kr, 1, .08) * lerp(.2, 1, set);
				const L = .048 * size, W = .016 * size;
				const swing = v3(Math.cos(k * 2.4 + kr() * 2), 0, Math.sin(k * 2.4 + kr() * 2));
				const start = sh.tip.clone().addScaledVector(up, .01 + .012 * k);
				const place = hang(ctx, start.clone().addScaledVector(swing, .015), DOWN.clone().addScaledVector(swing, .7), L, W, .02 + W);
				bag.fruit([
					"pecan",
//#piece 4745d2c03e37b2b9f97e64a198c18463bf10e60a93fbd8f7ada0ede80a2978f5
				], () => .0026 + .0014 * set, () => "#6a7040", 4));
				husked(bag, hung(place.at, place.dir, kr() * TAU), L, W, {
					shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .04 + u * .96))), .65),
					husk: (u, v) => {
						const ridge = Math.pow(Math.abs(Math.cos(v * Math.PI * 4)), 8);
						return (ripe < .5 ? mix("#6a9a3a", "#7a7a3a", ripe * 2) : mix("#7a7a3a", "#3e2e1e", (ripe - .5) * 2)).multiplyScalar(.92 + .2 * ridge + .06 * u);
					},
					split: span(ripe, .5, 1),
					valves: 4,
					rings: 8,
					sides: 12,
					nut: "#8a5a32",
					nuts: 1,
					nutSize: .9
				});
//#piece c21f1890dc0deecddd6a93c2d7d07fe8a647b373d98840251dac78ceb611cbce
	id: "pecan",
	label: "Pecan",
	latin: "Carya illinoinensis · Pekannuss",
	note: "The finest nut of the canopy: a tall oval crown on a straight trunk, long arching pinnate leaves, green catkins in threes, then clusters of four-ridged green husks splitting over smooth, long brown pecans.",
	from: "Tree · 10 years",
	stages: PECAN_STAGES,
	grow: pecan,
//#piece e1797c241a6f0bc0a3c1a16ce83f21c08d995da4d10a55c215193f25cdcb6014

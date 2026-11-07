//#piece c92ea29fcb17ced1c2ac4076ea116080dcb170329cf917fb6ca432da509de9c0
const WALNUT_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Nut",
		0,
		"A walnut in its shell, sown in the autumn five centimetres down — where a jay or a squirrel would have buried it — and chilled by the winter."
	],
	[
		"Germination",
		170,
		"In the spring the shell splits along its seam: a thick root goes straight down; the seed leaves stay in the shell."
	],
	[
		"Seedling",
		200,
		"A stout shoot with its first leaves, already pinnate, bronze as they open; the taproot is longer than the shoot."
	],
	[
		"Sapling",
		730,
		"A straight whip of smooth olive-grey bark, its big leaves in a tuft at the top; it leafs out late, after the frosts."
	],
	[
		"Young tree",
		2200,
		"A broad crown on a stout grey trunk, eight metres across in a forest garden at eight years, heading for twenty."
	],
	[
		"Flowering",
		3050,
		"In May with the bronze new leaves: green male catkins hanging from last year’s wood, and at the tips of the new shoots little green female flowers with two feathery stigmas."
	],
	[
		"Nut set",
		3075,
		"The catkins drop; at the shoot tips one to three small green fruits swell, smooth and dotted pale."
	],
	[
		"Green walnuts",
		3140,
		"Green husked walnuts the size of a hen’s egg at the shoot tips — picked now in June for nocino, before the shell hardens."
	],
	[
		"Turning",
		3210,
		"The husks yellow and spot with brown; inside, the shell has hardened and the kernel filled."
	],
	[
		"Ripe",
		3240,
		"The husks go brown-black and split; the wrinkled nuts show and drop — gather them quickly, before the squirrels."
	]
]))();
const WALNUT_GREEN = /* @__PURE__ */ (() => new three.Color("#78a83e"))();
const walnut = /* @__PURE__ */ (() => wood({
	seed: {
		size: v3(.018, .016, .016),
		coat: "#a8875a",
		shade: "#6a5236",
		depth: .05
	},
	hypogeal: true,
	flush: {
		trunk: 1.8,
//#piece b3251e00f981636a7ff157bb518d15b98a1551b05da97f2fd1f142728d9f6ee5
			1.2,
			.92,
			.7,
			.55,
			.42
		][gen] ?? .4,
		whorl: [2, 3],
		spread: .62,
		up: .045,
		droop: .05,
		wander: .12,
		radius: .15,
		taper: .62,
		thicken: 3.5,
		bark: ["#8e8a7e", "#68645c"]
	},
	roots: {
		tap: 2.4,
		spread: 3.6,
		count: 9,
		radius: .08
	},
	leaf: {
		blade: {
			stalk: 0,
			length: .38,
			width: 0,
			shape: () => 1,
			along: 4,
			pinnate: 3
		},
		colour: "#3f6a2a",
		young: "#8a6236",
		autumn: "#c8b04a",
		droop: .05,
		gap: .26,
		per: 1,
		twig: 0,
		tuft: 6,
		from: 4,
//#piece 69f7ad77a50e487f65c06588551d9c9143ca868add033d765351614360e1a9cb
			const phase = g - (4.65 + cr() * .3);
			if (phase < -.45 || phase > .55) continue;
			const n = Math.floor(cr() * 3);
			for (let k = 0; k < n; k++) {
				const { at, dir } = along(sh.pts, between(cr, .55, .95));
				catkin(bag, at, dir.clone().add(v3(cr() - .5, -.4, cr() - .5)).normalize(), .1 * lerp(.25, 1, span(phase, -.45, -.05)) * lerp(1, .6, span(phase, .25, .55)), .0045, phase < .2 ? mix("#7a9440", "#c8c45a", span(phase, -.1, .1)) : mix("#c8c45a", "#6a5a3a", span(phase, .2, .45)), .1);
			}
		}
		for (const sh of tips(ctx, .45)) {
			const fr = chance(seed, "flowering", ...sh.key);
			const phase = g - (4.75 + fr() * .4);
			if (phase < -.3) continue;
			const n = 1 + Math.floor(fr() * 3);
			const up = sh.dir.clone().lerp(v3(0, 1, 0), .5).normalize();
			if (phase < .55) {
				for (let k = 0; k < n; k++) {
					const a = k / n * TAU + fr();
					const d = up.clone().add(v3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(.5)).normalize();
					const c = sh.tip.clone().addScaledVector(d, .012);
					const open = span(phase, -.3, .1);
					bag.add("body", bead(c, v3(.004, .006, .004).multiplyScalar(lerp(.6, 1, open)), "#7a9a46", 3, new three.Quaternion().setFromUnitVectors(v3(0, 1, 0), d)));
					for (const side of [-1, 1]) {
						const s = new three.Vector3().crossVectors(d, v3(0, 0, 1)).normalize().multiplyScalar(side);
						const tip = c.clone().addScaledVector(d, .009).addScaledVector(s, .006 * open);
						bag.add("body", tube([c.clone().addScaledVector(d, .005), tip], () => .0018 * open + 4e-4, () => "#d8b07a", 3));
					}
				}
				continue;
			}
			const set = span(phase, .55, 2.4);
			const ripe = span(phase, 2.6, 3.7);
			const split = span(ripe, .55, 1);
			const keep = 1 + Math.floor(fr() * Math.min(3, n));
			for (let k = 0; k < keep; k++) {
				const kr = chance(seed, "walnut", ...sh.key, k);
				const size = ctx.vigour * about(kr, 1, .08);
				const L = .052 * size * lerp(.2, 1, set), W = .021 * size * lerp(.2, 1, set);
				const swing = v3(Math.cos(k * 2.4 + kr() * 2), 0, Math.sin(k * 2.4 + kr() * 2));
				const start = sh.tip.clone().addScaledVector(up, .012);
				const place = hang(ctx, start.clone().addScaledVector(swing, .02).add(v3(0, -.035, 0)), DOWN.clone().addScaledVector(swing, .6), L, W, .03 + W);
				bag.fruit([
					"walnut",
//#piece 4745d2c03e37b2b9f97e64a198c18463bf10e60a93fbd8f7ada0ede80a2978f5
				], (u) => .0035 * (1 - .3 * u) + .002 * set, () => "#6a7040", 4));
				const blotch = kr() * TAU;
				husked(bag, hung(place.at, place.dir, kr() * TAU), L, W, {
					shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .03 + u * .97))), .55) * (1 - .06 * u),
					husk: (u, v) => {
						const spot = Math.max(0, Math.sin(u * 23 + v * 31 + blotch) * Math.sin(v * 17 - u * 11));
						const c = ripe < .5 ? WALNUT_GREEN.clone().lerp(new three.Color("#b8b448"), ripe * 1.4).lerp(new three.Color("#6a4a2a"), spot * ripe * 1.4) : mix("#9a8a3a", "#3a2a1e", (ripe - .5) * 2).lerp(new three.Color("#1e1610"), spot * .5);
						return spot > .85 && ripe < .3 ? c.lerp(new three.Color("#c8d08a"), .5) : c;
					},
					split,
					valves: 4,
					rings: 7,
					sides: 10,
					nut: "#b8925e",
					nuts: 1,
					nutSize: .86
				});
//#piece c21f1890dc0deecddd6a93c2d7d07fe8a647b373d98840251dac78ceb611cbce
	id: "walnut",
	label: "Walnut",
	latin: "Juglans regia · Walnuss",
	note: "A broad dome on a clear grey trunk: long pinnate leaves bronze as they open, green catkins on last year’s wood, green husked walnuts in ones to threes at the shoot tips, splitting brown-black over the ripe nuts.",
	from: "Tree · 9 years",
	stages: WALNUT_STAGES,
	grow: walnut,
//#piece e1797c241a6f0bc0a3c1a16ce83f21c08d995da4d10a55c215193f25cdcb6014

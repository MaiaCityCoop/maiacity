//#piece c92ea29fcb17ced1c2ac4076ea116080dcb170329cf917fb6ca432da509de9c0
const CHESTNUT_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Nut",
		0,
		"A fresh chestnut, glossy brown, sown in the autumn before it dries out, four centimetres down."
	],
	[
		"Germination",
		150,
		"In the spring a thick root pushes out of the pointed tip and down; the seed leaves stay in the nut."
	],
	[
		"Seedling",
		180,
		"A straight shoot of long, toothed leaves, each tooth ending in a bristle."
	],
	[
		"Sapling",
		730,
		"A fast young tree, its bark smooth and olive-grey, its leaves in two rows along the shoots."
	],
	[
		"Young tree",
		2200,
		"A broad dome on a stout trunk, its bark beginning to fissure — and to twist, in a spiral, as it ages."
	],
	[
		"Flowering",
		3080,
		"Late, at midsummer, in full leaf: long cream catkins stand out from the shoot tips by the hundred, heavy-scented; small green female flowers sit at the base of the upper ones."
	],
	[
		"Burr set",
		3100,
		"The catkins brown and fall; where the female flowers were, little green burrs bristle."
	],
	[
		"Green burrs",
		3170,
		"Spiny green burrs the size of a fist at the shoot tips, one to three nuts in each."
	],
	[
		"Turning",
		3240,
		"The burrs fade yellow-brown; the nuts inside harden and darken."
	],
	[
		"Ripe",
		3270,
		"The burrs split in four and gape: two or three glossy red-brown chestnuts in each, dropping in October."
	]
]))();
const chestnut = /* @__PURE__ */ (() => wood({
	seed: {
		size: v3(.014, .011, .016),
		coat: "#6a3a20",
		shade: "#3a2010",
		depth: .04
	},
	hypogeal: true,
	flush: {
		trunk: 1.9,
//#piece b3251e00f981636a7ff157bb518d15b98a1551b05da97f2fd1f142728d9f6ee5
			1.2,
			.9,
			.7,
			.52,
			.4
		][gen] ?? .38,
		whorl: [2, 3],
		spread: .6,
		up: .055,
		droop: .045,
		wander: .12,
		radius: .16,
		taper: .62,
		thicken: 3.5,
		bark: ["#7e7462", "#5a5044"]
	},
	roots: {
		tap: 2.2,
		spread: 3.4,
		count: 9,
		radius: .08
	},
	leaf: {
		blade: {
			stalk: .02,
			length: .21,
			width: .032,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .7) * (u < .05 ? u / .05 : 1),
			along: 5,
			bow: .1
		},
		colour: "#2c5420",
		young: "#4a7a2a",
		autumn: "#c8a038",
		droop: .25,
		gap: .1,
		per: 3,
		twig: .16,
		tuft: 4,
		from: 4,
		inner: 3
	},
	bear(ctx) {
		const { bag, g, seed } = ctx;
		for (const sh of tips(ctx, .75)) {
			const fr = chance(seed, "flowering", ...sh.key);
			const phase = g - (4.8 + fr() * .3);
			if (phase < -.35) continue;
			const up = sh.dir.clone().lerp(v3(0, 1, 0), .35).normalize();
			if (phase < .95) {
				const n = 3 + Math.floor(fr() * 3);
				for (let k = 0; k < n; k++) {
					const { at, dir } = along(sh.pts, .55 + .45 * k / n);
					const a = k * 2.39996 + fr();
					catkin(bag, at, dir.clone().add(v3(Math.cos(a), .4, Math.sin(a)).multiplyScalar(.8)).normalize(), .19 * lerp(.2, 1, span(phase, -.35, .05)) * lerp(1, .55, span(phase, .4, .95)), .0062, phase < .35 ? mix("#d8dc9a", "#fbf0b8", span(phase, -.2, .05)) : mix("#fbf0b8", "#8a6a3a", span(phase, .35, .8)), .55);
				}
			}
			if (fr() > .35) continue;
			const set = span(phase, .15, 2.3);
			const ripe = span(phase, 2.5, 3.6);
			const split = span(ripe, .55, 1);
			const keep = 1 + Math.floor(fr() * 3);
			for (let k = 0; k < keep; k++) {
				const kr = chance(seed, "burr", ...sh.key, k);
				const size = ctx.vigour * about(kr, 1, .1);
				const W = .032 * size * lerp(.15, 1, set), L = .062 * size * lerp(.15, 1, set);
				const swing = v3(Math.cos(k * 2.4 + kr() * 2), 0, Math.sin(k * 2.4 + kr() * 2));
				const start = sh.tip.clone().addScaledVector(up, .01);
				const place = hang(ctx, start.clone().addScaledVector(swing, .01), swing.clone().add(v3(0, -.5, 0)), L, W * 1.35, .02 + W);
				bag.fruit([
					"burr",
//#piece 4745d2c03e37b2b9f97e64a198c18463bf10e60a93fbd8f7ada0ede80a2978f5
				], () => .0035 + .002 * set, () => "#6a7040", 4));
				const green = mix("#86b03e", "#b8b84a", ripe * 1.5);
				husked(bag, hung(place.at, place.dir, kr() * TAU), L, W, {
					shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .04 + u * .96))), .45),
					husk: (u) => (ripe < .6 ? green.clone() : mix("#b8a04a", "#8a6a38", (ripe - .6) / .4)).multiplyScalar(.9 + .2 * u),
					split,
					valves: 4,
					spines: 1.1 * lerp(.4, 1, set),
					rings: 8,
					sides: 12,
					nut: "#6a3218",
					nuts: 2 + Math.floor(kr() * 2),
					nutSize: .95
				});
//#piece c21f1890dc0deecddd6a93c2d7d07fe8a647b373d98840251dac78ceb611cbce
	id: "chestnut",
	label: "Sweet chestnut",
	latin: "Castanea sativa · Esskastanie",
	note: "A big domed tree of long, bristle-toothed leaves; at midsummer long cream catkins all over the crown, then spiny green burrs at the shoot tips, fading yellow-brown and splitting over two or three glossy chestnuts.",
	from: "Tree · 9 years",
	stages: CHESTNUT_STAGES,
	grow: chestnut,
//#piece e1797c241a6f0bc0a3c1a16ce83f21c08d995da4d10a55c215193f25cdcb6014

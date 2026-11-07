//#piece 032236ca6cdacfa471a88e050a100b50a0d26fc0d65d2c8a0b4a7aac393e9e97
//#piece 170a32a8b29eaa70bbcbf9ecf23bb290c114922b94243afc08cfa123ee0c386f
//#piece 24d96b97fe17ddba5dbd7c3548246c81e3eb65737e0f91ca9a9bac1fae0224f4
//#piece 0366b2c4740e56dcfdb59b9e7d635f7d4a32e00547544112c9cd3bc12ce16150
//#piece 48edcb33ecc24b25ed53610de749e7738fbcc1f9f6eca168663172bb6524d4c9
//#piece d4df3743b507bcf919cf22c24156209a6c9ed6e0389a9e88f75f0fe833928716
	for (const b of balls(best.at, best.dir)) ctx.clear.add(b.c, b.r);
	return best;
}
const LINDEN_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Nutlet",
		0,
		"A round grey felted nutlet, four ribs faint on it, sown in the autumn: it may lie a winter or two before it wakes."
	],
	[
		"Germination",
		180,
		"The root goes down; the hook comes up."
	],
	[
		"Seedling",
		200,
		"Two odd seed leaves, each cut into five fingers like a little hand, then the first heart-shaped leaves."
	],
	[
		"Sapling",
		730,
		"A slim young tree, its zigzag shoots red-brown, its leaves in two rows along them."
	],
	[
		"Young tree",
		2200,
		"A tall, dense, egg-shaped crown on a grey trunk, deep shade under it; its soft young leaves are good to eat in a spring salad."
	],
	[
		"Flowering",
		3300,
		"In July, after the other limes: hanging clusters of pale yellow flowers, sweetly scented and loud with bees, each on a long stalk half-joined to a pale leafy bract."
	],
	[
		"Fruit set",
		3315,
		"The flowers fade; small green nutlets set in the clusters, the bracts still pale and fresh."
	],
	[
		"Green nutlets",
		3360,
		"Clusters of little round green nutlets hanging under the leaves on their bracts."
	],
	[
		"Turning",
		3420,
		"The nutlets felt over grey-brown; the bracts go papery and tan."
	],
	[
		"Ripe",
		3460,
		"Hard round nutlets, the bract a wing: in the autumn wind the whole cluster spins away."
	]
]))();
/** a heart-shaped blade: round lobes at its foot, broadest low down, drawn out to a point */
const heart = (u) => u < .22 ? .5 + .5 * Math.sin(Math.PI / 2 * (u / .22)) : Math.pow(Math.cos(Math.PI / 2 * ((u - .22) / .78)), .85);
const linden = /* @__PURE__ */ (() => wood({
	seed: {
		size: v3(.0035, .0033, .0033),
		coat: "#8a7a5a",
		shade: "#5a4a34",
		depth: .012
	},
	hypogeal: false,
	cotyledon: {
		length: .018,
		width: .011,
		colour: "#5a9a3a"
	},
	flush: {
		trunk: 1.6,
		trunkBorn: 1.6,
		trunkFlush: 1.2,
		scaffolds: [4, 6],
		scaffoldAngle: .5,
		gens: 6,
		flush: .16,
		rest: .08,
		shoot: (gen) => [
			0,
			1.5,
			1.1,
			.85,
			.65,
			.5,
			.38
		][gen] ?? .36,
		whorl: [2, 3],
		spread: .58,
		up: .06,
		droop: .05,
		wander: .13,
		radius: .14,
		taper: .62,
		thicken: 3.5,
		bark: ["#7e7a6e", "#5c5850"]
	},
	roots: {
		tap: 2,
		spread: 3.2,
		count: 9,
		radius: .07
	},
	leaf: {
		blade: {
			stalk: .032,
			length: .07,
			width: .033,
			shape: heart,
			back: .12,
			along: 4,
			bow: .06
		},
		colour: "#2f5a24",
		young: "#5a8a34",
		autumn: "#d8c04a",
		droop: .35,
		gap: .1,
		per: 4,
		twig: .2,
		tuft: 3,
		from: 3,
		inner: 1.6
	},
	bear(ctx) {
		const { bag, g, seed } = ctx;
		for (const sh of tips(ctx, .45)) {
			const fr = chance(seed, "flowering", ...sh.key);
			const n = 1 + Math.floor(fr() * 2);
			for (let k = 0; k < n; k++) {
				const kr = chance(seed, "cyme", ...sh.key, k);
				const phase = g - (4.85 + kr() * .3);
				if (phase < -.4) continue;
				const grown = span(phase, -.4, 0);
				const { at, dir } = along(sh.pts, between(kr, .45, .95));
				const a = kr() * TAU;
				const out = dir.clone().add(v3(Math.cos(a), 0, Math.sin(a))).setY(0).normalize();
				const peduncle = .065 * lerp(.4, 1, grown);
				const place = hang(ctx, at.clone().addScaledVector(out, .01), out.clone().add(v3(0, -1.6, 0)).normalize(), .03, .022, .02);
				const end = place.at.clone().addScaledVector(place.dir, peduncle);
				const mid = at.clone().lerp(end, .5).addScaledVector(out, .012);
				const nutlets = phase >= .55;
				if (nutlets) bag.fruit([
					"cyme",
					...sh.key,
					k
				], at, place.dir);
				bag.add("body", tube([
					at,
					mid,
					end
				], () => 9e-4, () => "#a8b060", 3));
				const ripe = span(phase, 2.4, 3.6);
				const bractColour = ripe < .4 ? mix("#c8d88a", "#d8d090", ripe * 2) : mix("#d8d090", "#b89a62", (ripe - .4) / .6);
				const bractDir = mid.clone().sub(at).normalize();
				bag.add("body", sheet({
					length: .075 * lerp(.4, 1, grown),
					width: .009 * lerp(.4, 1, grown),
					shape: (u) => Math.pow(Math.sin(Math.PI * Math.min(1, .08 + u * .92)), .5),
					lift: (u, v) => .04 * v * v,
					paint: () => bractColour,
					along: 4,
					across: 1
				}), aim(at.clone().addScaledVector(bractDir, .004), bractDir.clone().add(v3(0, -.3, 0)), 1.2));
				const flowers = 5 + Math.floor(kr() * 5);
				const set = span(phase, .5, 2.2);
				const keep = phase < .55 ? flowers : 1 + Math.floor(kr() * 3);
				for (let f = 0; f < keep; f++) {
					const b = f * 2.39996 + kr();
					const d = v3(Math.cos(b), -.6 - kr() * .6, Math.sin(b)).normalize();
					const p = end.clone().addScaledVector(d, .018);
					bag.add("body", tube([end, p], () => 7e-4, () => "#a8b060", 3));
					if (phase < .55) {
						const open = span(phase, -.3, .05);
						const fade = span(phase, .3, .55);
						bag.add("body", bead(p, v3(1, .75, 1).multiplyScalar(lerp(.0028, .0085, open)), open < .5 ? "#c8d08a" : mix("#f6eca0", "#b8a868", fade), 3));
					} else {
						const r = lerp(.0015, .0038, set);
						bag.add("body", bead(p.clone().addScaledVector(d, r * .5), v3(r, r * 1.05, r), ripe < .5 ? mix("#8aa05a", "#9a9a6a", ripe * 2) : mix("#9a9a6a", "#7a6248", (ripe - .5) * 2), 3));
					}
				}
				if (nutlets) bag.fruitDone();
			}
//#piece 90d5b61545bfa24968849ea32dd9b1924a72608a6f5f55dd5aee28c67c3ae436
	id: "linden",
	label: "Small-leaved lime",
	latin: "Tilia cordata · Winterlinde",
	note: "A tall, dense crown of small heart-shaped leaves (the young ones good to eat); in July hanging clusters of pale yellow scented flowers on their leafy bracts, then little round nutlets that spin away on them.",
	from: "Tree · 9 years",
	stages: LINDEN_STAGES,
	grow: linden,
//#piece e1797c241a6f0bc0a3c1a16ce83f21c08d995da4d10a55c215193f25cdcb6014

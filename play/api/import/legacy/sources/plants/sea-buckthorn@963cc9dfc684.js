//#piece 7535922d8e80492ae38b5223be16f66c41c7691f7f7aa23653b64c04bf5ac92c
//#piece b64446af92b30d928e84d34748387a9ed7ed039c9ec770732f906239142669f5
//#piece d1c57c99a768857becf4df194055bbfbdb6a06679eb8a45f30d246cef9d29a52
}
//#piece bb7c285c7fc4ca81814c67cc5b3342ebc083a203a2e1158d6f2141a1a8b98c5a
const linear = (u) => Math.pow(Math.sin(Math.PI * u), .35);
//#piece 27f3d2c1d16a5de0924ed32e4776eb38b2db77b38997ad690541d645ba2c6c18
const SEA_BUCKTHORN_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small glossy brown seed from an orange berry, a centimetre down in sandy soil."
	],
	[
		"Germination",
		20,
		"A root goes down, two narrow seed leaves come up; soon Frankia, a soil bacterium, finds the roots."
	],
	[
		"Seedling",
		45,
		"Narrow silvery leaves; little orange-brown nodules swelling on the roots, fixing nitrogen from the air."
	],
	[
		"Young bush",
		730,
		"Thorny stems, suckering, the leaves silver beneath."
	],
	[
		"Bush",
		1100,
		"A thorny silver shrub of three metres, many-stemmed, its twigs ending in thorns."
	],
	[
		"Flowering",
		1250,
		"In April, before the leaves: tiny greenish flowers crowded along last year’s twigs (on the female bush; the wind brings the pollen from a male)."
	],
	[
		"Fruit set",
		1270,
		"The narrow silver leaves unfold; little green berries set, packed along the twigs."
	],
	[
		"Green berries",
		1330,
		"The twigs crammed with hard green berries."
	],
	[
		"Colouring",
		1400,
		"The berries turn yellow, then orange."
	],
	[
		"Ripe",
		1430,
		"Orange berries packed all along the twigs among the silver leaves: sour, oily, rich in vitamin C; the twigs are cut and frozen to shake them off."
	]
]))();
const seaBuckthorn = /* @__PURE__ */ (() => grove({
	seed: {
		size: v3(.004, .0022, .0022),
		coat: "#4a2a1a",
		shade: "#2a160c",
		depth: .008
	},
	hypogeal: false,
	cotyledon: {
		length: .008,
		width: .003,
		colour: "#7a9a5a"
	},
	flush: crown({
		trunk: .06,
		trunkFlush: .9,
		scaffolds: [5, 7],
		scaffoldAngle: .4,
		gens: 5,
		whorl: [2, 3],
		spread: .6,
		up: .04,
		droop: .04,
		wander: .14,
		radius: .04,
		taper: .64,
		rest: .15,
		flush: .22,
		shoot: (gen) => [
			0,
			1.3,
			.75,
			.5,
			.36,
			.28
		][gen] ?? .28,
		bark: ["#7a6a58", "#4a4038"]
	}),
	roots: {
		tap: .6,
		spread: 1.6,
		count: 8,
		radius: .025,
		nodules: true
	},
	leaf: {
		length: .07,
		width: .011,
		shape: linear,
		colour: "#9aa892",
		dark: "#86967e",
		young: "#c0cab0",
		spacing: .15,
		droop: .15,
		from: 3,
		start: .62,
		tuft: 6,
		max: 30,
		along: 3,
		across: 1,
		on: [
			[4.25, 1],
			[4.55, 0],
			[5.15, 0],
			[5.9, 1]
		]
	},
	thorns: 5,
	bloom: {
		sites: "wood",
		opens: 4.6,
		chance: .6,
		gen: 4
	},
	site: (s) => {
		const sh = s.shoot;
		const fr = chance(s.seed, "packed", ...s.key);
		const { set, ripe } = fruiting(s.phase, 2.5, 1.3, 1.5);
		const r = (.0012 + .0029 * set) * s.vigour;
		const step = .0068, from = .12;
		const n = Math.floor(sh.length * .5 / step);
		const t0 = fr() * Math.PI * 2;
		for (let k = 0; k < n; k++) {
			const p = along(sh.pts, from + .5 * k / Math.max(1, n));
			const side = across(p.dir, t0 + k * 2.39996);
			if (s.phase < .55) {
				if (k % 2 === 0) s.bag.add("body", bead(p.at.clone().addScaledVector(side, sh.radius + .0015), v3(.0018, .0018, .0018).multiplyScalar(clamp((s.phase + .4) / .4)), "#a8a85a", 2));
				continue;
			}
			if (fr() > .9) continue;
			const t = clamp(ripe * 1.2 - fr() * .2);
			const c = t < .5 ? mix("#8aa04a", "#e8c030", t * 2) : mix("#e8c030", "#e8741a", (t - .5) * 2);
			s.bag.fruit([...s.key, k], p.at.clone().addScaledVector(side, sh.radius), side);
			berry(s, p.at.clone().addScaledVector(side, sh.radius + r * 1.05), r, c, side.clone().negate(), {
				long: 1.2,
				detail: 2
			});
			s.bag.fruitDone();
//#piece 90d5b61545bfa24968849ea32dd9b1924a72608a6f5f55dd5aee28c67c3ae436
	id: "sea-buckthorn",
	label: "Sea buckthorn",
	latin: "Hippophae rhamnoides · Sanddorn",
	note: "A thorny silver shrub that fixes nitrogen in nodules on its roots; narrow silvery leaves, and orange berries packed all along last year’s twigs.",
	from: "Shrub · 4 years",
	stages: SEA_BUCKTHORN_STAGES,
	grow: seaBuckthorn,
//#piece 6a46d079f14d6089f79784ecf20705689a90de4d5314bb9b21fadbd5aa4987ef

//#piece b32157144db154813bb9403218b4b63e0927ed2a19da41ad21d05188275821fa
//#piece b01aec40c5d55ea0bbe021fd271746a08b4b631b9b549e0820ae31dd3add0888
}
/**
* A small cheap flower for the many-flowered ones (a raceme's, an umbel's): `petals` strap-like or round petals in a
* star and a dot of stamens. Opens, then its petals fall.
* @param {Bag} b @param {THREE.Vector3} at @param {THREE.Vector3} facing
* @param {{ petals: number, length: number, width: number, colour: string, heart: string, shape?: (u: number) => number, cup?: number }} k
* @param {number} open @param {number} fall
*/
function star(b, at, facing, k, open, fall) {
	const f = facing.clone().normalize();
	if (fall >= 1) return;
	const shape = k.shape ?? ((u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .6));
	for (let i = 0; i < k.petals; i++) {
		const side = across(f, i / k.petals * Math.PI * 2);
		const tilt = lerp(.15, 1 - (k.cup ?? .15), open) + fall * .6;
		const d = f.clone().multiplyScalar(Math.cos(tilt * Math.PI * .5)).addScaledVector(side, Math.sin(tilt * Math.PI * .5)).normalize();
		b.add("sheet", sheet({
			length: k.length * lerp(.45, 1, open) * (1 - fall * .4),
			width: k.width * lerp(.45, 1, open),
			shape,
			paint: () => col(k.colour),
			along: 3,
			across: 1
		}), aim(at, d, 0));
	}
	b.add("body", bead(at.clone().addScaledVector(f, k.length * .08), v3(k.length * .2, k.length * .12, k.length * .2), k.heart, 2));
//#piece 15a21fb1d3a5489929c64794872a7ba481b1e4b60406b1d7a401d486dc5816df
const SERVICEBERRY_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A tiny brown seed from a berry, chilled through the winter, barely covered."
	],
	[
		"Germination",
		30,
		"A root goes down, a tiny hook comes up."
	],
	[
		"Seedling",
		50,
		"Two round seed leaves, then small oval toothed leaves, bronze as they unfold."
	],
	[
		"Young bush",
		1100,
		"Thin stems from the base, grey and smooth, the tallest above your head."
	],
	[
		"Young tree",
		1460,
		"A small tree of many grey stems, four metres high, its crown light and airy."
	],
	[
		"Blossom",
		1680,
		"Early in the spring, as the bronze leaves unfold: clouds of white stars in loose racemes at every shoot tip."
	],
	[
		"Fruit set",
		1695,
		"The petals fall; little green berries along the racemes, each crowned by its sepals."
	],
	[
		"Green berries",
		1720,
		"Clusters of green berries hanging, swelling, the leaves green now."
	],
	[
		"Colouring",
		1745,
		"In June they turn red, then berry by berry purple."
	],
	[
		"Ripe",
		1760,
		"Hanging clusters of red and purple-black berries, sweet, tasting of almond: the blackbirds know. In autumn the leaves turn orange and red."
	]
]))();
const serviceberry = /* @__PURE__ */ (() => grove({
	seed: {
		size: v3(.004, .002, .0025),
		coat: "#5a3a24",
		shade: "#3a2414",
		depth: .006
	},
	hypogeal: false,
	cotyledon: {
		length: .008,
		width: .005,
		colour: "#6aa046"
	},
	flush: crown({
		trunk: .08,
		trunkFlush: .9,
		scaffolds: [5, 7],
		scaffoldAngle: .32,
		gens: 6,
		whorl: [2, 3],
		spread: .55,
		up: .04,
		droop: .05,
		wander: .12,
		radius: .07,
		taper: .66,
		shoot: (gen) => [
			0,
			1.5,
			.95,
			.65,
			.45,
			.32,
			.24
		][gen] ?? .24,
		bark: ["#8a8680", "#5e5a56"]
	}),
	roots: {
		tap: .8,
		spread: 1.5,
		count: 10,
		radius: .025
	},
	leaf: {
		length: .07,
		width: .045,
		shape: toothed,
		colour: "#4a7234",
		dark: "#3a6230",
		young: "#9a5a3e",
		spacing: .6,
		droop: .35,
		from: 5,
		tuft: 3,
		on: [
			[4.3, 1],
			[4.55, .35],
			[5.4, 1]
		]
	},
	bloom: {
		sites: "tips",
		opens: 4.6,
		chance: .45,
		gen: 5
	},
	site: (s) => {
		const out = s.dir.clone().setY(0);
		if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
		out.normalize();
		const fr = chance(s.seed, "raceme", ...s.key);
		const n = 6 + Math.floor(fr() * 5);
		const { set, ripe } = fruiting(s.phase, 2.6, 1.2, 1.4);
		const tilt = span(s.phase, .4, 1.6);
		const axisDir = out.clone().multiplyScalar(.7).add(v3(0, lerp(.75, -.9, tilt), 0)).normalize();
		const len = .055 * lerp(.5, 1, clamp((s.phase + .4) / .5));
		const tip = s.at.clone().addScaledVector(axisDir, len);
		const bearing = s.phase >= .55;
		if (bearing) s.bag.fruit(s.key, s.at, axisDir);
		s.bag.add("body", tube([
			s.at,
			s.at.clone().lerp(tip, .5).add(v3(0, .004 * (1 - tilt), 0)),
			tip
		], (u) => .0012 * (1 - .5 * u), () => col(ripe > .3 ? "#8a3a3a" : "#6a7a3a"), 3));
		for (let k = 0; k < n; k++) {
			const u = .2 + .8 * k / (n - 1);
			const p = s.at.clone().lerp(tip, u);
			const pd = across(axisDir, k * 2.39996 + fr()).clone().add(v3(0, s.phase < .55 ? .6 : -.8, 0)).normalize();
			const pl = (.012 + .012 * (1 - u)) * lerp(.6, 1, clamp(s.phase + .4));
			const end = p.clone().addScaledVector(pd, pl);
			s.bag.add("body", tube([p, end], () => 6e-4, () => col(ripe > .4 ? "#8a3a3a" : "#7a8a3a"), 3));
			if (s.phase < .55) {
				if (s.phase < 0) s.bag.add("body", bead(end, v3(.0025, .004, .0025), "#f0eee0", 2));
				else star(s.bag, end, pd.clone().lerp(UP, .3), {
					petals: 5,
					length: .015,
					width: .0032,
					colour: "#fcfcf6",
					heart: "#e0d890",
					shape: (uu) => Math.pow(Math.sin(Math.PI * Math.pow(uu, .6)), .5)
				}, clamp(s.phase / .2), span(s.phase, .35, .55));
				continue;
			}
			if (fr() > .75) continue;
			const t = clamp(ripe * 1.3 - u * .45 - fr() * .15);
			const c = t < .45 ? mix("#8aa04a", "#c83038", t / .45) : mix("#c83038", "#3a1834", (t - .45) / .55);
			const r = (.0018 + .0037 * set) * s.vigour * about(fr, 1, .08);
			berry(s, end.clone().add(v3(0, -r, 0)), r, c.lerp(new three.Color("#7a6a8a"), t * .15), DOWN, { crown: "#3a2a2a" });
		}
		if (bearing) s.bag.fruitDone();
	}
}))();
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "serviceberry",
	label: "Serviceberry",
	latin: "Amelanchier lamarckii · Felsenbirne",
	note: "A small tree of many grey stems: clouds of white starry flowers in racemes as its bronze leaves unfold, then hanging clusters of berries, red, then purple-black.",
	from: "Tree · 4 years",
	stages: SERVICEBERRY_STAGES,
	grow: serviceberry,
//#piece 71e4477229f1395d98f77ee90e10edfab3c5cf71916285980d51209d9a3034a0

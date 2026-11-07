//#piece 257c41a393167d25b0ab34563388c270249ab48a6157ba52e040955edf133b72
//#piece 7a065cbb747806be22ecd610efd159d4733f880727c9435083c5d8f0836fdae5
//#piece b6ef2ce50708891b5fc6551bd99957da123395110f6ad44a5d4a0ce9e7c47b66
*/
//#piece 089670bef0592ba63818d307efe99f8192634737d8973bde272804f4c11cef86
const RHUBARB_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Crown",
		0,
		"A division of an old crown — a fat red bud or two on a piece of knobbly rootstock — set level with the soil in late winter."
	],
	[
		"Bud break",
		14,
		"Red knobbly buds push through the soil, the crumpled leaves packed tight inside them."
	],
	[
		"Unfurling",
		30,
		"The first leaves unfurl, crinkled and bronze-green, on short red stalks."
	],
	[
		"First summer",
		90,
		"A clump of big leaves; none pulled in the first year, so the crown can build."
	],
	[
		"Second spring",
		400,
		"Back from the winter with more buds, broader leaves and thicker stalks."
	],
	[
		"Full clump",
		430,
		"Leaves half a metre across on stalks thick as a thumb, the clump a metre and more wide."
	],
	[
		"First pull",
		450,
		"The first stalks pulled — held low and twisted off the crown, never cut — a few only."
	],
	[
		"Pulling",
		480,
		"Pulled from the outside week by week, the leaves cut off onto the compost (they are poisonous); never more than a third, and no more after midsummer."
	],
	[
		"Flower spike",
		500,
		"A thick hollow stem shoots up two metres from the crown, papery sheaths at its nodes, a great plume of tiny cream flowers."
	],
	[
		"Seed",
		530,
		"The plume turns rusty red with winged seeds; the old leaves yellow at their edges. (Cut the spike early and the crown keeps its strength.)"
	]
]))();
//#piece 26cc096b8c6ed241b97858f346135b6f6c00f9a1532fc07c2c9beb70c59c8724
};
/**
* Rhubarb at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function rhubarb(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const crown = v3(0, -.025, 0);
	const build = span(g, 0, 5.5);
	const cr = chance(seed, "rhubarb-crown");
	for (let k = 0; k < 5; k++) {
		const a = k * 2.39996 + cr();
		const d = k ? .025 + .035 * build : 0;
		bag.add("body", bead(crown.clone().add(v3(Math.cos(a) * d, -.01 - cr() * .015, Math.sin(a) * d)), v3(1, .7, 1).multiplyScalar((.03 + .02 * build) * vigour), mix("#5a3e2c", "#7a5440", cr()), 5));
	}
	for (let k = 0; k < 2; k++) {
		const swell = 1 - span(g, .7 + k * .3, 1.2 + k * .3);
		if (swell > 0) bag.add("gloss", bead(crown.clone().add(v3(k * .035 - .015, .03 + .01 * (1 - swell), k * .01)), v3(.018, .024, .018).multiplyScalar(lerp(.6, 1, swell)), "#b02238", 6));
	}
	for (let i = 0; i < 6; i++) {
		const rr = chance(seed, "rhubarb-root", i);
		const a = i * 2.39996 + rr();
		root(bag, {
			seed,
			key: ["root", i],
			from: crown.clone().add(v3(Math.cos(a) * .03, -.03, Math.sin(a) * .03)),
			dir: v3(Math.cos(a) * .6, -1, Math.sin(a) * .6),
			length: between(rr, .5, .9) * vigour,
			grown: table(g, [
				[0, .3],
				[2, .5],
				[4, .8],
				[6, 1]
			]),
			radius: .007 + .008 * build,
			down: .05,
			wander: .2,
			laterals: 4,
			lateral: .35,
			depth: 1,
			age: .6 + .4 * build,
			young: "#e8c890",
			old: "#6a4a30"
		});
	}
	/** @type {{ key: number, born: number, size: number, wither: number, pulled: number, old: number }[]} */
	const leaves = [];
	for (let i = 0; i < 8; i++) leaves.push({
		key: i,
		born: .7 + i * .27,
		size: .42 + .06 * i,
		wither: span(g, 3.2 + i * .03, 3.85),
		pulled: Infinity,
		old: 0
	});
	for (let j = 0; j < 18; j++) leaves.push({
		key: 8 + j,
		born: 3.6 + j * .15,
		size: j < 3 ? .8 : .95,
		wither: 0,
		pulled: j % 2 === 0 && j < 10 ? 5.9 + j * .15 : Infinity,
		old: span(g, 8.3, 9.4) * (j < 9 ? .55 : .25)
	});
	for (const L of leaves) {
		if (g <= L.born || L.wither >= 1 || g > L.pulled) continue;
		const lr = chance(seed, "rhubarb-leaf", L.key);
		const grown = clamp((g - L.born) / 1.1);
		const bear = L.key * 2.39996 + about(lr, 0, .2);
		const out = level(bear);
		const S = L.size * vigour * about(lr, 1, .08);
		if (grown < .25) bag.add("body", bead(crown.clone().addScaledVector(out, .02).add(v3(0, .025, 0)), v3(.014, .022, .014).multiplyScalar(lerp(.6, 1, S) * (1 - grown * 2)), "#b0283a", 4));
		const P = (.08 + .32 * S) * lerp(.15, 1, grown);
		const tilt = lerp(.06, between(lr, .45, .85), grown) + L.wither * .7;
		const pts = arch(crown.clone().addScaledVector(out, .02).add(v3(0, .02, 0)), tilted(out, tilt), P, .25 * grown + L.wither * .6, 6);
		const pr = (.004 + .011 * S) * lerp(.35, 1, grown);
		const fleck = lr() * 10;
		bag.add("gloss", tube(pts, (u) => pr * (1 - .35 * u), (u, v) => mix(mix("#a8182e", "#c0384a", Math.abs(Math.sin(v * 9 + fleck)) > .9 ? .6 : 0), "#7a8a3a", clamp(u * .9 - .3 + L.wither)).lerp(tint("#8a7a4a"), L.wither), 6));
		bag.space.rod(pts, pr);
		const R = (.12 + .4 * S) * lerp(.15, 1, grown);
		const fold = (1 - grown) * .9;
		const top = pts[pts.length - 1];
		const lift = lerp(1.1, -.05 + lr() * .2, grown) - L.wither * .8;
		const dir = out.clone().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0));
		const crinkle = lerp(1.6, 1, grown);
		bag.add("sheet", fan({
			size: R,
			from: -Math.PI,
			to: Math.PI,
			edge: (a) => rhubarbEdge(a) * (1 - .45 * fold * Math.abs(Math.sin(a))),
			lift: (s, a) => fold * Math.abs(Math.sin(a)) * s * .8 - (.1 + L.wither * .3) * s * s + crinkle * (.045 * Math.sin(a * 8 + s * 5) * s * s + .014 * Math.sin(s * 22) * Math.cos(a * 11) * s),
			paint: (s, a) => {
				const m = Math.abs(a) % .95, vein = Math.min(m, .95 - m) < .03 + .03 * (1 - s);
				const base = leafColour("#3d6a28", "#7a6a2a", grown, Math.max(L.wither, L.old * clamp((s - .6) * 3)), s);
				return vein ? base.lerp(tint(s < .3 ? "#b04050" : "#b8c48a"), .5) : base;
			},
			rings: 10,
			rays: 30
		}), face(top, dir, UP));
	}
	const rise = span(g, 7.3, 8.1);
	if (rise > 0) {
		const fr = chance(seed, "rhubarb-spike");
		const H = (1.5 + .4 * fr()) * vigour * rise;
		const lean = v3(fr() - .5, 0, fr() - .5).multiplyScalar(.12);
		const stem = [];
		for (let k = 0; k <= 10; k++) {
			const h = k / 10 * H;
			stem.push(crown.clone().add(v3(lean.x * h * h, .02 + h, lean.z * h * h)));
		}
		bag.add("body", tube(stem, (u) => .02 * (1 - .65 * u) * lerp(.6, 1, rise), (u, v) => mix("#6a8a3a", "#a83040", Math.abs(Math.sin(u * 40 + v * 13)) > .92 ? .7 : .15), 8));
		bag.space.rod(stem, .02);
		const bloom = span(g, 7.8, 8.3), seeding = span(g, 8.6, 9.3);
		for (let k = 1; k <= 4; k++) {
			const u = .1 * k;
			const p = point(stem, u);
			bag.add("body", bead(p, v3(.03, .014, .03).multiplyScalar(1 - u), mix("#d8c8a0", "#a8865a", seeding), 4));
			if (k > 3) continue;
			const a = k * 2.4 + fr();
			const leafAt = p.clone().addScaledVector(level(a), .02);
			bag.add("sheet", fan({
				size: .12 * (1 - k * .2) * rise,
				from: -Math.PI,
				to: Math.PI,
				edge: rhubarbEdge,
				lift: (s, aa) => -.12 * s * s + .03 * Math.sin(aa * 8) * s,
				paint: (s) => leafColour("#3d6a28", "#6a8a3a", 1, seeding * .6, s),
				rings: 5,
				rays: 16
			}), face(leafAt, tilted(level(a), 1.2), UP));
		}
		if (bloom <= .05) bag.add("body", bead(stem[10], v3(.035, .05, .035).multiplyScalar(lerp(.6, 1, rise)), "#d8c8a8", 6));
		else {
			const flower = seeding > 0 ? mix("#efe6c8", "#a8402c", seeding) : mix("#d8d0a8", "#f2ecd2", bloom);
			if (seeding > 0) bag.fruit(["rhubarb-spike"], point(stem, .45), towards(stem, .45));
			const branches = 22;
			for (let b = 0; b < branches; b++) {
				const t = b / 21;
				const from = point(stem, .45 + .52 * t);
				const len = (.3 - .2 * t) * bloom;
				const twig = arch(from, level(b * 2.39996 + fr()).multiplyScalar(.6).add(v3(0, .8, 0)), len, -.15, 3);
				bag.add("body", tube(twig, () => .003 * (1 - .5 * t), () => tint("#8a9a5a"), 3));
				for (let m = 1; m <= 6; m++) {
					const p = point(twig, m / 6);
					for (let q = 0; q < 3; q++) {
						const side = level(m * 2.39996 + b + q * 2.1).multiplyScalar(.012 + .006 * q).add(v3(0, .006 * q, 0));
						bag.add("body", bead(p.clone().add(side), v3(.011, .009, .011).multiplyScalar(lerp(.5, 1, bloom) * (1 - .35 * t)), flower, 2));
					}
				}
			}
			for (let m = 0; m < 6; m++) bag.add("body", bead(point(stem, .94 + m * .012).add(level(m * 2.4).multiplyScalar(.008)), v3(.008, .008, .008), flower, 2));
			if (seeding > 0) bag.fruitDone();
		}
	}
	return bag.build();
}
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "rhubarb",
	label: "Rhubarb",
	latin: "Rheum rhabarbarum · Rhabarber",
	note: "From a knobbly crown, red buds and huge crinkled leaves on thick red stalks — pulled from the outside in its second spring — then a hollow stem two metres high with a cream plume.",
	from: "Perennial · 2 years",
	stages: RHUBARB_STAGES,
	grow: rhubarb,
//#piece feef0e8121e2feb0d65027316063df20b3e6bc2baf1ef0d05b1b48087cb64841

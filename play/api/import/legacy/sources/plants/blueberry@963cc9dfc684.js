//#piece 693245eec24e4da3790df47da8269873aa7f5742253bfa856c596ae3a92c8344
//#piece a97021c8bd634397ead30fb88b5aa7716e28fe31946fad463c5a442cb5b1d76f
//#piece 71f23d73adda5ba143ef4e14b0986abbffc8e5172ab601e0bb143158ed9a726e
const BLUEBERRY_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A tiny seed from a berry, on acid peaty soil, barely covered, kept moist and cool."
	],
	[
		"Germination",
		30,
		"After a month a root goes down, a tiny hook comes up."
	],
	[
		"Seedling",
		60,
		"Two tiny round seed leaves and the first small leaves."
	],
	[
		"Young bush",
		365,
		"A twiggy little bush, its new stems red."
	],
	[
		"Bush",
		1100,
		"Canes from the crown, grey-barked below, fine twigs above, small elliptic leaves."
	],
	[
		"Flowering",
		1300,
		"Clusters of small white bells hang from last year’s twigs, the bees at them."
	],
	[
		"Fruit set",
		1315,
		"The bells drop; little green berries, each with a five-pointed crown."
	],
	[
		"Green berries",
		1345,
		"Clusters of hard green berries swelling."
	],
	[
		"Colouring",
		1370,
		"Berry by berry they turn pink, then purple-blue."
	],
	[
		"Ripe",
		1385,
		"Blue berries under a pale silvery bloom, picked over weeks."
	]
]))();
/** @param {number} g @param {string} seed */
function blueberry(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .1);
	const at = v3(0, -.002, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(8e-4, 5e-4, 5e-4),
		coat: "#8a5a3a",
		coatShade: "#5a3a24",
		stem: table(g, [
			[0, 0],
			[.4, 5e-4],
			[1, .004],
			[2, .01],
			[9, .01]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.5, 0]
		]),
		radius: 5e-4 + .002 * span(g, 1, 4),
		stemColor: "#9a5a4a",
		leaf: {
			length: .004,
			width: .0022,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .6),
			color: "#6aa046",
			vein: "#a6c47e"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.6),
		wither: span(g, 3, 3.8)
	});
	for (let i = 0; i < 26; i++) {
		const rr = chance(seed, "bb-root", i);
		const a = i * 2.39996;
		root(bag, {
			seed,
			key: ["r", i],
			from: at.clone().add(v3(0, -.01, 0)),
			dir: v3(Math.cos(a), -between(rr, .15, .5), Math.sin(a)),
			length: between(rr, .25, .5) * vigour,
			grown: (g - .4 - i * .15) / 3,
			radius: .0015,
			down: .01,
			wander: .25,
			laterals: 7,
			lateral: .3,
			depth: 2,
			age: (g - 2 - i * .15) / 3,
			young: "#f1e4cc",
			old: "#8a6a4a"
		});
	}
	/** @type {import('./tree.js').Limb[]} */
	const twigs = [];
	for (let c = 0; c < 7; c++) {
		const cr = chance(seed, "cane", c);
		const born = 2 + c * .55;
		if (g <= born) break;
		const bear = c * 2.39996 + cr() * .4;
		const lean = c === 0 ? .05 : between(cr, .2, .45);
		limb(bag, {
			seed,
			key: ["cane", c],
			from: s.top.clone().add(v3(Math.cos(bear) * .01 * c, 0, Math.sin(bear) * .01 * c)),
			dir: v3(Math.cos(bear) * Math.sin(lean), Math.cos(lean), Math.sin(bear) * Math.sin(lean)),
			length: (.6 + .4 * cr()) * vigour,
			grown: Math.min(2.8, (g - born) * .9),
			radius: .012,
			up: .04,
			wander: .12,
			spread: .7,
			children: 3,
			shorten: [.4, .65],
			depth: 3,
			from0: .4,
			young: "#a8503a",
			old: "#6a5a50",
			age: clamp((g - born) / 4),
			out: twigs
		});
	}
	for (const t of twigs) {
		const tr = chance(seed, "bb-twig", ...t.key);
		if (t.order >= 1 || g < 4) {
			const n = Math.min(10, Math.floor(t.length / .035));
			for (let k = 0; k < n; k++) {
				const { p, d } = along(t.pts, (k + .5) / Math.max(1, n));
				const sideV = new three.Vector3().crossVectors(d, v3(0, 1, 0));
				if (sideV.lengthSq() < 1e-6) sideV.set(1, 0, 0);
				sideV.normalize().multiplyScalar(k % 2 ? 1 : -1);
				const dir = sideV.addScaledVector(d, .5).add(v3(0, .1, 0)).normalize();
				bag.add("sheet", sheet({
					length: .05 * vigour,
					width: .022 * vigour,
					shape: (u) => Math.pow(Math.sin(Math.PI * u), .6),
					lift: (u, v) => .04 * v * v - .04 * u * u,
					paint: (u, v) => mix("#4f8a3a", "#2f6a2e", tr()).lerp(new three.Color("#a6c47e"), Math.abs(v) < .1 ? .3 : 0),
					along: 6,
					across: 2
				}), aim(p, dir, 0));
			}
		}
		if (!t.end || t.order < 2) continue;
		const opens = 4.7 + tr() * .4;
		if (g < opens - .3) continue;
		const set = span(g, opens + .35, opens + 2.2);
		const count = 5 + Math.floor(tr() * 5);
		for (let k = 0; k < count; k++) {
			const a = k * 2.39996;
			const hang = t.tip.clone().add(v3(Math.cos(a) * .012 * (1 + k * .15), -.012 - k * .006, Math.sin(a) * .012 * (1 + k * .15)));
			if (set >= .03) bag.fruit([...t.key, k], t.tip, v3(0, -1, 0));
			bag.add("body", tube([t.tip, hang], () => 6e-4, () => "#8a6a4a", 3));
			if (set < .03) {
				const open = clamp((g - opens + .3) / .3);
				if (span(g, opens + .25, opens + .4) < 1) bag.add("body", bead(hang.clone().add(v3(0, -.005, 0)), v3(.0035, .005, .0035).multiplyScalar(lerp(.5, 1, open)), mix("#e9eccf", "#f4ecec", open), 5));
				continue;
			}
			const br = chance(seed, "berry", ...t.key, k);
			const turn = span(g, 7.2 + br() * .9, 8.2 + br() * .7);
			const r = (.002 + .0058 * set) * vigour * about(br, 1, .1);
			const c = turn < .4 ? mix("#9ab86a", "#c87a8a", turn / .4) : mix("#c87a8a", "#3a4a8a", (turn - .4) / .6);
			const p = hang.clone().add(v3(0, -r, 0));
			bag.add("gloss", bead(p, v3(r, r * .9, r), c.lerp(new three.Color("#8a9ac0"), turn * .3), 5));
			bag.add("body", bead(p.clone().add(v3(0, -r * .85, 0)), v3(r * .35, r * .15, r * .35), "#3a2a3a", 3));
			bag.fruitDone();
		}
	}
//#piece 0de60e52e7e5ff10ad2b8179ce04e16ede6cf8f56e3a1e095aa50324494751b6
	id: "blueberry",
	label: "Blueberry",
	latin: "Vaccinium corymbosum · Blaubeere",
	note: "A twiggy shrub of many canes, small elliptic leaves, hanging clusters of white urn-shaped bells, berries turning pink, then blue under a silvery bloom.",
	from: "Shrub · 4 years",
	stages: BLUEBERRY_STAGES,
	grow: blueberry
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

//#piece 82c289f4677bd89ddfb809031a767aa467da3de102b77b2ba9f969b1c2f25209
//#piece 0a88dac9b03b48f473ec2bc8f327ac82f99d824b55f2ec63ad2168aeafaee726
//#piece cd921e8c0b61c7d4eb528df9cf1327e6499df6e22def111f22927f03715e9d00
const WOODRUFF_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Division",
		0,
		"A clump of thin pale rhizomes with a few shoots, planted in the shade under trees in autumn."
	],
	[
		"Rooting",
		20,
		"New roots run through the leaf litter."
	],
	[
		"First shoots",
		150,
		"In early spring, slender square stems push up, their leaves folded in tight stars."
	],
	[
		"Whorls",
		170,
		"Stems a hand high, a whorl of six to nine narrow glossy leaves at every node, like little ruffs."
	],
	[
		"Creeping",
		220,
		"Thin rhizomes creep out under the leaf litter and send up new stems."
	],
	[
		"Carpet",
		400,
		"A year on: a bright green carpet in the deep shade, keeping the soil covered where little else grows."
	],
	[
		"Buds",
		420,
		"Spring: buds at the stem tips. Now, before it flowers, it is picked and wilted for the Maibowle — the scent of coumarin, of new hay, comes as it dries."
	],
	[
		"Flowering",
		435,
		"Loose sprays of tiny white four-pointed stars above the whorls."
	],
	[
		"Burs",
		470,
		"Little round fruits covered in hooked bristles, that catch in fur and socks and are carried off."
	],
	[
		"Summer carpet",
		520,
		"The burs ripen dark; the carpet stays green until the autumn."
	]
]))();
/**
* Sweet woodruff at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function woodruff(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	/** @type {{ key: (string | number)[], at: THREE.Vector3, born: number }[]} */
	const stems = [];
	for (let k = 0; k < 4; k++) {
		const kr = chance(seed, "woodruff-first", k);
		stems.push({
			key: ["first", k],
			at: level(k * 2.39996).multiplyScalar(.012 + kr() * .015),
			born: 1.7 + k * .15
		});
	}
	for (let k = 0; k < 6; k++) {
		const kr = chance(seed, "woodruff-rhizome", k);
		const born = k < 3 ? .6 + k * .2 : 3.4 + k * .3;
		const run = Math.min(.26, Math.max(0, g - born) * .07) * vigour * between(kr, .8, 1.1);
		if (run < .005) continue;
		let a = k * 2.39996 + kr() * .5;
		const pts = [v3(0, -.01, 0)];
		for (let m = 1; m <= 6; m++) {
			a += (kr() - .5) * .5;
			pts.push(pts[m - 1].clone().add(v3(Math.cos(a) * run / 6, 0, Math.sin(a) * run / 6)));
		}
		bag.add("body", tube(pts, () => .0012, () => tint("#e8dcc0"), 3));
		root(bag, {
			seed,
			key: ["rhiz", k],
			from: pts[3].clone(),
			dir: v3(0, -1, 0),
			length: .06,
			grown: span(g, born, born + 1.5),
			radius: 6e-4,
			laterals: 3,
			depth: 1,
			young: "#f6efdc",
			old: "#d8c49a"
		});
		for (let j = 0; j < 5; j++) {
			const d = .05 + j * .05;
			if (run < d) break;
			const sborn = Math.max(1.7, born + d / .07 + .2);
			stems.push({
				key: [k, j],
				at: point(pts, d / run).setY(0),
				born: sborn
			});
		}
	}
	root(bag, {
		seed,
		key: ["clump"],
		from: v3(0, -.01, 0),
		dir: v3(0, -1, 0),
		length: .1,
		grown: span(g, 0, 2),
		radius: .001,
		laterals: 6,
		depth: 1,
		young: "#f6efdc",
		old: "#d8c49a"
	});
	const buds = span(g, 5.6, 6), bloom = span(g, 6.6, 7), burs = span(g, 7.6, 8.2), ripe = span(g, 8.7, 9.3);
	const slivers = new Slivers();
	for (const st of stems) {
		if (g <= st.born) continue;
		const sr = chance(seed, "woodruff-stem", ...st.key);
		const grown = span(g, st.born, st.born + 1.4);
		const H = .2 * between(sr, .8, 1.15) * vigour * grown;
		if (H < .004) continue;
		const lean = level(sr() * Math.PI * 2).multiplyScalar(between(sr, .05, .25));
		const stem = arch(st.at, v3(lean.x, 1, lean.z), H, .1, 4);
		bag.add("body", tube(stem, () => .0011, () => tint("#6a9a4a"), 4));
		for (let w = 0; w < 6; w++) {
			if (DETAIL.level < 1 && (w === 1 || w === 3)) continue;
			const u = .18 + w * .15;
			const p = point(stem, u);
			const age = clamp((1 - u) * 1.2 + grown * 1.2 - .6);
			const n = 7 + (w + Math.floor(sr() * 3)) % 3;
			const len = (.022 + .018 * (w / 5)) * lerp(.35, 1, age);
			for (let m = 0; m < n; m++) {
				const out = level(m / n * Math.PI * 2 + w * .4);
				slivers.add(p, tilted(out, lerp(.3, 1.4, age)), len, len * .13, mix("#3a7a2e", "#7ab04a", (1 - age) * .8 + m % 2 * .08), .12);
			}
		}
		if (buds <= 0 || grown < .9 || sr() < .2) continue;
		const top = stem[4];
		for (let f = 0; f < 9; f++) {
			const a = f * 2.39996 + sr();
			const d = f ? .006 + .007 * Math.sqrt(f / 8) : 0;
			const fp = top.clone().add(v3(Math.cos(a) * d, .012 + .005 * (f % 3) - d * .4, Math.sin(a) * d));
			if (burs > .3) bag.fruit([
				"woodruff-bur",
				...st.key,
				f
			], top, fp.clone().sub(top));
			bag.add("body", tube([top, fp], () => 4e-4, () => tint("#7aa04a"), 2));
			if (burs > .3) {
				bag.add("body", bead(fp, v3(.0018, .0016, .0018), mix("#7a9a4a", "#3a3a24", ripe), 2));
				bag.fruitDone();
			} else if (bloom < .2) bag.add("body", bead(fp, v3(.0017, .002, .0017), "#e8eedc", 2));
			else {
				bag.add("body", bead(fp, v3(.0012, 8e-4, .0012), "#f4f0d8", 2));
				for (let q = 0; q < 4; q++) slivers.add(fp, level(q * Math.PI / 2 + a).add(v3(0, .35, 0)), .0042 * bloom, .002, "#fbfbf4");
			}
		}
	}
	slivers.into(bag);
	return bag.build();
}
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "woodruff",
	label: "Sweet woodruff",
	latin: "Galium odoratum · Waldmeister",
	note: "A low carpet for the deep shade: slender stems of starry leaf whorls, tiny white four-pointed flowers in May, then bristly burs; it smells of new hay as it dries.",
	from: "Perennial · 2 years",
	stages: WOODRUFF_STAGES,
	grow: woodruff,
	layer: "ground"
//#piece 4b1b0d87ac174e41c3ba4bfa76099d5b0338dfa9582e7a65fd739d1ff6327ce5

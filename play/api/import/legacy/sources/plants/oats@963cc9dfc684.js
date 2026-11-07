//#piece 60b115c1032affb89ead40a66eba1124b7674e8f67e70731db79c58db9e06fc1
//#piece a90e8078ce813b4914a250b8fba97b6d1dc95df728311d4c883e50bc198e4669
//#piece 5bab9eba67b13d9752ddd4cd446cf49af14ab94549952131ce7b5ca0e836c713
//#piece ba40edf81615360631028fd5cc7061728fd54f35d346c04671c2a15d815b4672
//#piece 0a2dd55ee68dbbac64cc6fce777a9d50b353ef88e673bd0362b949dbc6e84e03
//#piece bb181f084165c06e34a1464010ca5d68e8bf9b2cb033c9895d6b258872c997b6
/** leaf shapes: lanceolate, ovate, oval, a grass blade, a hemp leaflet (toothed, at full detail) */
const lance = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .6)), .8);
const grass = (u) => Math.min(1, .55 + u * 6) * Math.pow(1 - u, .75);
const OATS_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A slim, pale, hulled oat grain, three centimetres down in early spring."
	],
	[
		"Germination",
		7,
		"Three seminal roots go down; the coleoptile, a pale sheath, pushes up to the light."
	],
	[
		"First leaf",
		14,
		"The first blade unrolls out of the coleoptile, then the next out of the first."
	],
	[
		"Tillering",
		30,
		"Side shoots from the crown at the soil: a tuft of blades, crown roots below."
	],
	[
		"Stem extension",
		48,
		"The stems shoot up, a node at a time, each wrapped in its leaf’s sheath."
	],
	[
		"Booting",
		58,
		"The panicle swells inside the sheath of the flag leaf, the last and broadest."
	],
	[
		"Heading",
		66,
		"The panicle breaks out and opens: whorls of fine branches, the spikelets dangling from their tips, flowering within."
	],
	[
		"Grain fill",
		80,
		"The grain milky, then doughy; the panicles heavier, nodding, still green."
	],
	[
		"Turning",
		95,
		"Yellowing from the bottom up, the panicles golden-green."
	],
	[
		"Harvest",
		108,
		"Golden straw, the spikelets papery and pale, the grain hard: cut and threshed."
	]
]))();
/**
* Oats at a stage (0 … 9, between them on the way) from the seed id: one plant, tillered into a tuft of stems.
* @param {number} g @param {string} seed
*/
function oats(g, seed) {
	const bag = new Bag(), blades = new Blades();
	const vigour = about(chance(seed, "plant"), 1, .07);
	const r = chance(seed, "oats");
	const grain = v3(0, -.03, 0);
	const spent = span(g, 2.2, 4);
	if (spent < 1) bag.add("body", bead(grain, v3(.0055, .0017, .0019).multiplyScalar(1 - .35 * spent), mix("#dcc890", "#8a7a58", spent), 5, alongX(level(r() * Math.PI * 2).add(v3(0, .3, 0)))));
	if (DETAIL.roots) {
		for (let i = 0; i < 3; i++) root(bag, {
			seed,
			key: ["seminal", i],
			from: grain.clone(),
			dir: v3(Math.cos(i * 2.1) * .4, -1, Math.sin(i * 2.1) * .4),
			length: .4,
			grown: table(g, [
				[0, 0],
				[.5, .05],
				[1, .2],
				[3, .6],
				[5, 1]
			]),
			radius: 6e-4,
			laterals: 1,
			lateral: .3,
			depth: 1,
			age: span(g, 3, 8),
			young: "#f4ecd8",
			old: "#c8b088"
		});
		for (let i = 0; i < 3; i++) root(bag, {
			seed,
			key: ["crown", i],
			from: v3(0, -.014, 0),
			dir: v3(Math.cos(i * 2.1 + 1), -.8, Math.sin(i * 2.1 + 1)),
			length: .35,
			grown: span(g, 2.6 + i * .12, 6),
			radius: 8e-4,
			laterals: 2,
			lateral: .3,
			depth: 1,
			age: span(g, 4, 8),
			young: "#f4ecd8",
			old: "#c8b088"
		});
	}
	const cole = table(g, [
		[0, 0],
		[.4, .004],
		[1, .034],
		[9, .034]
	]);
	if (cole > .001 && g < 3.2) bag.add("body", tube([grain.clone(), grain.clone().add(v3(0, cole, 0))], (u) => .0011 * (1 - .4 * u), (u) => mix("#f0ecd0", "#b8cc88", u), 4));
	const tillers = 6 + Math.floor(r() * 3);
	const ripe = span(g, 7.4, 8.9), straw = span(g, 8.5, 9.2);
	for (let i = 0; i < tillers; i++) {
		const born = i ? 2.5 + i * .2 : 1.2;
		if (g <= born) break;
		const tr = chance(seed, "tiller", i);
		const a = i * 2.39996 + tr() * .5;
		const base = v3(0, -.012, 0).addScaledVector(level(a), i ? .004 + .014 * Math.sqrt(i / tillers) : 0);
		tiller(bag, blades, seed, i, base, level(a), i ? between(tr, .1, .28) : between(tr, .02, .07), born, g, vigour * (i ? between(tr, .85, .98) : 1.03), i ? .12 + i * .05 : 0, ripe, straw);
	}
	blades.into(bag);
	return bag.build();
}
/**
* One oat tiller: its leaves from the crown, then its stem with four nodes, a blade at each, and the panicle at its top.
* @param {Bag} bag @param {Blades} blades @param {string} seed @param {number} i @param {THREE.Vector3} base
* @param {THREE.Vector3} out @param {number} lean @param {number} born @param {number} g @param {number} H its full height
* @param {number} late how far behind the main stem @param {number} ripe @param {number} straw
*/
function tiller(bag, blades, seed, i, base, out, lean, born, g, H, late, ripe, straw) {
	const r = chance(seed, "oat-tiller", i);
	const Hc = H * table(g - late, [
		[3.6, 0],
		[4, .08],
		[4.5, .3],
		[5, .55],
		[5.5, .74],
		[6, .88],
		[6.5, .96],
		[7, 1]
	]);
	const leaves = clamp((g - born - .15) / .6 + 1, 0, 5);
	const ps = .012 + .012 * leaves;
	const top = Math.max(Hc, ps);
	const jointed = Hc > ps;
	const fill = span(g, 6.6, 7.8);
	const nod = .04 + .05 * fill;
	/** the stem at height h: leaning out, the panicle nodding further */
	const at = (h) => base.clone().addScaledVector(out, Math.sin(lean) * h + nod * top * Math.pow(h / top, 4)).add(v3(0, Math.cos(lean) * h, 0));
	const nodesAt = [
		.05,
		.18,
		.36,
		.58
	];
	const pts = [
		0,
		.05,
		.18,
		.36,
		.58,
		.7,
		.78,
		.86,
		.93,
		1
	].map((f) => at(f * top));
	const green = (u) => mix(mix("#5f8f3c", "#7aa452", u), "#dcc27a", ripe * 1.2 - (1 - u) * .2).lerp(tint("#e6d29a"), straw * .6);
	const r0 = (jointed ? .0022 : .0028) * H;
	bag.add("body", tube(pts, (u) => {
		const knee = jointed && nodesAt.some((n) => Math.abs(u - n) < .008) ? 1.3 : 1;
		return r0 * knee * (u < .78 ? 1 - .3 * u : .75 * (1 - (u - .78) / .22 * .6));
	}, (u) => jointed && nodesAt.some((n) => Math.abs(u - n) < .008) ? mix(green(u), "#5a6a30", .45) : green(u), 5));
	const rank = r() * Math.PI * 2;
	const lengths = [
		.13,
		.2,
		.24,
		.26,
		.21
	], widths = [
		.0048,
		.006,
		.0072,
		.008,
		.009
	];
	const collars = [
		.04,
		.13,
		.28,
		.48,
		.7
	];
	for (let k = 0; k < 5; k++) {
		const grown = clamp(leaves - k);
		if (grown <= .02) break;
		const p = at(Math.max(Math.min(ps, .014 + .012 * k), jointed ? Hc * collars[k] : 0));
		const o = level(rank + k * Math.PI + about(r, 0, .3));
		const tilt = lerp(.12, between(r, .55, .9), grown);
		const dead = k < 3 ? span(g, 6.2 + k * .4, 7.4 + k * .35) : 0;
		const L = lengths[k] * H * lerp(.3, 1, grown);
		const col = mix(mix(mix("#88b45a", "#4f7f34", grown), "#c8b070", dead), "#dcc27a", ripe);
		blades.add({
			at: p.addScaledVector(o, r0),
			dir: tilted(o, tilt + dead * .4),
			length: L,
			width: widths[k] * lerp(.5, 1, grown),
			shape: grass,
			segs: 6,
			fold: .25,
			droop: .3 * grown + dead * .3,
			paint: (u) => mix(col, "#8ab060", (1 - u) * .15 * (1 - ripe))
		});
	}
	const emerge = span(g - late, 5.4, 6.3);
	if (!jointed || emerge <= 0) return;
	const spike = mix(mix("#a2c472", "#b0c47e", fill), "#e2c880", ripe).lerp(tint("#efe2b4"), straw);
	const twig = (u) => mix(mix("#7aa452", "#dcc27a", ripe), "#e6d29a", straw * u);
	const spread = lerp(.1, .8, emerge);
	const counts = [
		3,
		3,
		2,
		2,
		1
	];
	const branchLen = [
		.5,
		.42,
		.34,
		.25,
		.15
	];
	const P = top * .22;
	for (let w = 0; w < 5; w++) {
		const u = .78 + .22 * (.04 + w * .19);
		const out_ = span(emerge, .8 - w * .18, 1 - w * .15);
		if (out_ <= 0) continue;
		const p = at(u * top);
		for (let b = 0; b < counts[w]; b++) {
			const br = chance(seed, "oat-branch", i, w, b);
			const bear = w * 1.3 + b * Math.PI * 2 / counts[w] + about(br, 0, .3);
			const ob = level(bear);
			const bp = arch(p, ob.clone().multiplyScalar(Math.sin(spread * out_)).add(v3(0, Math.cos(spread * out_), 0)).normalize(), P * branchLen[w] * lerp(.5, 1, out_), .35 + .5 * fill, 2);
			wire(bag, blades, bp, 45e-5, twig, 3, ob);
			for (const f of w < 2 ? [1, .55] : [1]) {
				const sp = point(bp, f);
				const hang = ob.clone().multiplyScalar(lerp(.6, .3, fill)).add(v3(0, lerp(-.2, -1, out_), 0)).normalize();
				if (fill > 0) bag.fruit([
					i,
					w,
					b,
					f
				], sp, hang);
				const from = blades.mark();
				blades.add({
					at: sp,
					dir: hang,
					up: ob,
					length: .022 * lerp(.5, 1, out_),
					width: .004,
					shape: lance,
					segs: 2,
					twin: .7,
					paint: spike,
					round: true
				});
				if (fill > 0) blades.pick(bag, from);
				bag.fruitDone();
			}
		}
	}
	if (emerge > .1) {
		const hang = out.clone().multiplyScalar(.5).add(v3(0, -1, 0)).normalize();
		if (fill > 0) bag.fruit([i, "top"], at(top), hang);
		const from = blades.mark();
		blades.add({
			at: at(top),
			dir: hang,
			up: out,
			length: .022,
			width: .004,
			shape: lance,
			segs: 2,
			twin: .7,
			paint: spike,
			round: true
		});
		if (fill > 0) blades.pick(bag, from);
		bag.fruitDone();
	}
}
/** the fields' plants, as ./index.js lists them */
const FIELDS = [{
	id: "oats",
	label: "Oats",
	latin: "Avena sativa · Hafer",
	note: "A tuft of tillers, long blades, stems a metre high with their nodes, and open nodding panicles of dangling spikelets, green and then golden over golden straw.",
	from: "Annual · 108 days",
	stages: OATS_STAGES,
	grow: oats,
//#piece 321da8178e3fcd3936e38b431f8e7656e24efbf273bc90ad3fda83d92835fb46

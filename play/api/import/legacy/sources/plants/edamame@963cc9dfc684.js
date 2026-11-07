//#piece 3831ac809705757c25669dc0832186c948f776e306d779532bb127ef71274fae
//#piece 9816561f441fa7f1f072fb1a11c15200d7b14576f48a98e8fcd027a0484bec3c
}

//#endregion
//#piece a90e8078ce813b4914a250b8fba97b6d1dc95df728311d4c883e50bc198e4669
//#piece 5bab9eba67b13d9752ddd4cd446cf49af14ab94549952131ce7b5ca0e836c713
//#piece f60ea08781755162df4c0308b4a8992731997623d48b68413d7eaee61d2dd7c7
//#piece 0f0c63e8359009b99732158dd4d7a76a7af3b4f3eb108912f4dd120bfb8a2522
//#piece aba62e4a4d197fa01bf9dab0431f65bee4af995e369057018b7cbba03b37b989
*/
//#piece 233142b30516032aeddf3225ce96fdc9fb126af4d87b1799bf19858b0d1f26c3
	});
}
const EDAMAME_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A round soybean, green for edamame, three centimetres down in warm soil after the last frost."
	],
	[
		"Germination",
		6,
		"The root goes down; a hooked stem pulls the bean up and out of the soil."
	],
	[
		"Seed leaves",
		10,
		"The bean splits into two fat yellow-green seed leaves, held up in the light."
	],
	[
		"First leaves",
		18,
		"A pair of simple oval leaves, opposite, above the seed leaves."
	],
	[
		"Trifoliates",
		32,
		"Leaves of three on long stalks, one at a node, everything soft with tawny hairs; side stems from the lower nodes."
	],
	[
		"Flowering",
		50,
		"Small purple (or white) flowers tucked in clusters in the leaf axils, all the way up."
	],
	[
		"Pods set",
		58,
		"Flat little pods, two to four at a node."
	],
	[
		"Filling",
		70,
		"The pods fattening, fuzzy and green, two or three beans showing in each."
	],
	[
		"Picking",
		85,
		"Edamame: the pods plump and bright green — the whole plant pulled, or picked over, and the pods boiled in salt water."
	],
	[
		"Dry beans",
		115,
		"Left on, the leaves yellow and fall, the pods turn tan and hard: soybeans for drying."
	]
]))();
/**
* Edamame (the soybean picked green) at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function edamame(g, seed) {
//#piece 1165ad2654fba6b3f48ca4c077710a3e9051b5eaba69f899526d1f7844e1dcb3
	const r = chance(seed, "edamame");
	const white = r() < .3;
	const at = v3(0, -.028, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.0045, .0038, .004),
		coat: "#a8b868",
		coatShade: "#6a7a40",
		stem: table(g, [
			[0, 0],
			[.3, .002],
			[1, .038],
			[2, .058],
			[9, .062]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.6, 0]
		]),
		radius: .0016 + .0014 * span(g, 2, 5),
		stemColor: "#7a9a4a",
		leaf: {
			length: .017,
			width: .0105,
			shape: oval,
			color: "#b0b850",
			vein: "#c8cc78"
		},
		open: span(g, 1.2, 2),
		shed: span(g, 1.1, 1.6),
		wither: span(g, 3.6, 4.6)
	});
	legumeRoots(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(0, -1, 0),
		length: .45,
		grown: table(g, [
			[0, 0],
			[.3, .04],
			[1, .14],
			[3, .5],
			[5, .9],
			[6, 1]
		]),
		radius: .0022,
		nodules: 14,
		laterals: 3,
		age: span(g, 3, 6)
	});
	const ctx = {
		bag,
		blades,
		seed,
		g,
		vigour,
		white,
		old: span(g, 8.5, 9.3)
	};
	const max = .7 * vigour;
	const reach = max * table(g, [
		[1.8, 0],
		[2.2, .03],
		[3, .12],
		[4, .36],
		[5, .7],
		[6, .92],
		[7, 1]
	]);
	soyStem(ctx, [0], s.top.clone(), v3(r() * .1 - .05, 1, r() * .1 - .05), max, reach, 0);
	blades.into(bag);
	return bag.build();
}
/**
* A soy stem: hairy, upright, a pair of simple leaves at its first node (the main stem's), then a leaf of three at each
* node; the flowers and then the pods in clusters in the axils; side stems from its lower nodes.
* @param {{ bag: Bag, blades: Blades, seed: string, g: number, vigour: number, white: boolean, old: number }} ctx
//#piece 1716b2bed7c8e5f4f3202d02c3c360f05ae950beb5536b47cb257b396b285240
function soyStem(ctx, key, from, dir, max, reach, order) {
	const { bag, blades, seed, g, white, old } = ctx;
	if (reach < .004) return;
	const r = chance(seed, "soy-stem", ...key);
	const d = dir.clone().normalize();
	const full = [from.clone()];
	for (let k = 0; k < 10; k++) {
		d.lerp(UP, order ? .12 : .05).add(v3((r() - .5) * .06, 0, (r() - .5) * .06)).normalize();
		full.push(full[k].clone().addScaledVector(d, max / 10));
	}
	const pts = upto(full, reach / max);
	const stalk = (u) => mix(mix("#7a9448", "#8aa858", u), "#b89a62", old);
	const R = (order ? .0022 : .0042) * ctx.vigour * lerp(.4, 1, span(g, 2, 6));
	if (DETAIL.level >= 1 || R >= DETAIL.finest) bag.add("body", tube(pts, (u) => R * (1 - .6 * u), stalk, 5));
	else wire(bag, blades, pts, R, stalk, 5, UP);
	const nodes = Math.floor(max / .055);
	const b0 = r() * Math.PI * 2;
	for (let n = 0; n < nodes; n++) {
		const f = (n + (order ? .6 : .15)) / nodes;
		const h = f * max;
		if (h > reach - .004) break;
		const nr = chance(seed, "soy-node", ...key, n);
		const p = point(full, f);
		const bear = b0 + n * Math.PI + about(nr, 0, .35);
		const grown = clamp((reach - h) / .08);
		const yellow = clamp(old * 1.6 - f * .6);
		const fallen = old > 0 && nr() < old * 1.3 - f * .4;
		if (!order && n === 0) {
			for (const side of [0, Math.PI]) if (!fallen) soyLeaflet(blades, nr, p, level(bear + side), .055 * ctx.vigour, grown, yellow, .025);
			continue;
		}
		if (!fallen) {
			const size = (order ? .075 : .095) * ctx.vigour * (f > .8 ? .75 : 1);
			const pet = arch(p, tilted(level(bear), lerp(.25, .75, grown) + yellow * .5), (.05 + .07 * clamp(1 - f * .6)) * lerp(.3, 1, grown) * (order ? .7 : 1), .1 + yellow * .3, 3);
			wire(bag, blades, pet, .0012, stalk, 3, UP);
			const end = pet[pet.length - 1];
			const out = level(bear);
			soyLeaflet(blades, nr, end.clone().addScaledVector(out, .012), out, size, grown, yellow, .035);
			for (const side of [-1, 1]) soyLeaflet(blades, nr, end, level(bear + side * 1.25), size * .85, grown, yellow, .03);
		}
		if (!order && n >= 1 && n <= 3 && g > 3.6) soyStem(ctx, [...key, n], p, tilted(level(bear + Math.PI / 2), .55), max * .45, max * .45 * span(g, 3.6 + n * .1, 5.8), 1);
		if (n < 1) continue;
		const opens = 4.6 + f * .6 + nr() * .2;
		if (g < opens - .3) continue;
		const open = span(g, opens - .3, opens), fall = span(g, opens + .5, opens + .7);
		const fill = span(g, opens + .5, 7.6), plump = span(g, 6.8, 8);
		const pods = 2 + Math.floor(nr() * 3);
		level(bear + Math.PI * .35);
		for (let m = 0; m < pods; m++) {
			const a = bear + Math.PI * .35 + (m - (pods - 1) / 2) * .8;
			const fa = p.clone().addScaledVector(level(a), .004).add(v3(0, .002 * m, 0));
			if (fill < .04) {
				peaFlower(blades, fa, level(a), .0065, white ? "#f4f0f6" : "#a070c8", white ? "#ece8f0" : "#8a58b0", open, fall);
				continue;
			}
			const pd = level(a).multiplyScalar(.5).add(v3(0, -.85 + .3 * (m % 2), 0)).normalize();
			const beans = 2 + (nr() < .6 ? 1 : 0);
			const len = .05 * lerp(.3, 1, fill) * about(nr, 1, .08);
			bag.fruit([
				...key,
				n,
				m
			], fa, pd);
			const from = blades.mark();
			blades.add({
				at: fa,
				dir: pd,
				up: level(a + Math.PI / 2),
				length: len,
				width: .0066 * lerp(.5, 1, fill),
				shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .9)), .4) * (1 - .18 * plump * Math.pow(Math.cos(u * Math.PI * beans), 2)),
				segs: 6,
				twin: lerp(.3, 1.2, plump),
				droop: .25,
				paint: (u, v) => mix(mix("#a8c470", "#90b85a", fill), "#a8885a", old * 1.2).lerp(tint("#d8dcb0"), Math.abs(v) > .9 ? .45 : 0),
				round: true
			});
			blades.pick(bag, from);
			bag.fruitDone();
		}
	}
}
/** a soy leaflet (or a first simple leaf), ovate and pointed, soft with hairs, yellowing at the end */
function soyLeaflet(blades, r, at, out, size, grown, yellow, half) {
	if (grown <= .02) return;
	const len = size * lerp(.3, 1, grown) * about(r, 1, .06);
	const lift = lerp(1, .05, grown) - yellow * .7;
	const d = out.clone().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0)).normalize();
	const green = mix(mix("#8ab456", "#40702e", grown), "#d0b840", yellow);
	const rib = mix(green, "#a8c08a", .35);
	blades.add({
		at,
		dir: d,
		length: len,
		width: len * (half / .085),
		shape: ovate,
		segs: 5,
		fold: .3 * (1 - grown) + .1,
		droop: .12 + yellow * .2,
		paint: (u, v) => Math.abs(v) < .1 ? rib : green
	});
}
/** the fields' plants, as ./index.js lists them */
const FIELDS = [{
	id: "edamame",
	label: "Edamame",
	latin: "Glycine max · Sojabohne",
	note: "An upright, hairy bush of leaves of three; small purple flowers in the axils, then clusters of fuzzy green pods all along the stem, picked plump as edamame — or left to yellow for dry soybeans.",
	from: "Annual · 85 days",
	stages: EDAMAME_STAGES,
	grow: edamame,
//#piece 321da8178e3fcd3936e38b431f8e7656e24efbf273bc90ad3fda83d92835fb46

//#piece 967a0b64303b2ddeeb2bc8abd748732422b708fd7423dc74e534955369e0ce0e
//#piece 0a2dd55ee68dbbac64cc6fce777a9d50b353ef88e673bd0362b949dbc6e84e03
//#piece aba62e4a4d197fa01bf9dab0431f65bee4af995e369057018b7cbba03b37b989
//#piece 4277701e50b57029de01eea6290ea81d28735819acc70c038daa46e2ea5afc38
const CHICKPEA_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A beige, wrinkled seed like a ram’s head (the dark desi ones smaller and angular), five centimetres down in warm spring soil."
	],
	[
		"Germination",
		8,
		"The root goes down deep; the seed stays below, and a hooked shoot pushes up from it."
	],
	[
		"First leaves",
		16,
		"Above two scale leaves, the first small pinnate leaves, grey-green and hairy."
	],
	[
		"Seedling",
		26,
		"Several stems from the base, every part covered in fine glandular hairs, sour to the tongue."
	],
	[
		"Branching",
		42,
		"A bushy upright plant half a metre high, leaves of small toothed leaflets, no tendrils."
	],
	[
		"Flowering",
		58,
		"Small white or pink-purple flowers, one on each long stalk from the axils."
	],
	[
		"Pods set",
		66,
		"Short, puffed-up pods like little balloons behind the flowers."
	],
	[
		"Filling",
		80,
		"Pods full, hairy and pale green, a chickpea or two rattling inside each; picked green, they are eaten fresh."
	],
	[
		"Drying",
		95,
		"The leaves yellow, the pods turn golden-tan."
	],
	[
		"Harvest",
		110,
		"The plant dry and golden, the pods papery: pulled and threshed."
	]
]))();
/**
* The chickpea at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function chickpea(g, seed) {
//#piece 1165ad2654fba6b3f48ca4c077710a3e9051b5eaba69f899526d1f7844e1dcb3
	const r = chance(seed, "chickpea");
	const desi = r() < .3;
	const at = v3(0, -.045, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: desi ? v3(.0034, .003, .003) : v3(.0045, .004, .004),
		coat: desi ? "#6a4a2a" : "#dcc092",
		coatShade: desi ? "#3a2818" : "#a88a5a",
		stem: table(g, [
			[0, 0],
			[.4, .003],
			[1, .042],
			[1.6, .05],
			[9, .05]
		]),
		hook: table(g, [
			[0, 1],
			[1.1, 1],
			[1.6, 0]
		]),
		radius: 9e-4,
		stemColor: "#6a8a4a",
//#piece b1e51ea978f75f0a11c99f1934b7563f650001587da51b54c6b7c8b678046bb9
		length: .5,
		grown: table(g, [
			[0, 0],
			[.4, .04],
			[1, .12],
			[3, .45],
			[5, .85],
			[6, 1]
		]),
		radius: .0018,
		nodules: 10,
		laterals: 3,
		age: span(g, 3, 6)
	});
	const ctx = {
		bag,
		blades,
		seed,
		g,
		vigour,
		desi,
		dry: span(g, 7.5, 8.7),
		straw: span(g, 8.4, 9.2)
	};
	const stems = 3;
	for (let j = 0; j < stems; j++) {
		if (g <= (j ? 2.8 + j * .25 : 1.3)) break;
		const max = .5 * vigour * (j ? between(r, .75, .92) : 1);
		const reach = max * table(g - (j ? .3 : 0), [
			[1.3, 0],
			[2, .06],
			[3, .2],
			[4, .5],
			[5, .82],
			[6, .96],
			[7, 1]
		]);
		chickpeaStem(ctx, [j], s.top.clone(), tilted(level(j * 2.39996 + r()), j ? between(r, .55, .85) : between(r, .08, .2)), max, reach, 0);
	}
	blades.into(bag);
	return bag.build();
}
/**
* A chickpea stem: upright, hairy, a leaf at each node, a long-stalked flower and then a pod from the upper axils, side
* stems from its lower nodes.
* @param {{ bag: Bag, blades: Blades, seed: string, g: number, vigour: number, desi: boolean, dry: number, straw: number }} ctx
//#piece 1716b2bed7c8e5f4f3202d02c3c360f05ae950beb5536b47cb257b396b285240
function chickpeaStem(ctx, key, from, dir, max, reach, order) {
	const { bag, blades, seed, g, desi, dry, straw } = ctx;
	if (reach < .004) return;
	const r = chance(seed, "chickpea-stem", ...key);
	const d = dir.clone().normalize();
	const full = [from.clone()];
	for (let k = 0; k < 10; k++) {
		d.lerp(UP, .1).add(v3((r() - .5) * .1, 0, (r() - .5) * .1)).normalize();
		full.push(full[k].clone().addScaledVector(d, max / 10));
	}
	const pts = upto(full, reach / max);
	const stalk = (u) => mix(mix("#6a8a4c", "#88a868", u), "#c8a868", dry * .6 + straw * .4);
	wire(bag, blades, pts, order ? .0013 : .0021, stalk, 4, UP);
	const nodes = Math.floor(max / .042);
	const b0 = r() * Math.PI * 2;
	for (let n = 1; n < nodes; n++) {
		const f = n / nodes;
		const h = f * max;
		if (h > reach - .004) break;
		const nr = chance(seed, "chickpea-node", ...key, n);
		const p = point(full, f);
		const bear = b0 + n * Math.PI * .8 + about(nr, 0, .3);
		const grown = clamp((reach - h) / .06);
		const old = clamp(dry * 1.5 - f * .5) * (1 - straw * .3) + straw * .3;
		pinnateLeaf(bag, blades, {
			r: nr,
			at: p,
			out: level(bear),
			lift: .7,
			length: (.025 + .028 * clamp(n / 4)) * ctx.vigour,
			pairs: order ? 3 : n < 2 ? 2 : 5,
			leaflet: {
				length: .013,
				width: .005,
				shape: (u) => ovate(u) * (1 + .14 * Math.cos(u * Math.PI * 4)),
				segs: 2
			},
			paint: (u, v) => mix(mix(mix("#94b07a", "#58804a", grown), "#88a878", Math.abs(v) < .1 ? .3 : 0), mix("#d8b868", "#c8a060", u), old),
			stalk: mix("#6a8a4c", "#c8a868", old),
			radius: 6e-4,
			grown,
			old,
			terminal: true,
			drop: straw * .5
		});
		if (!order && (n === 2 || n === 4) && g > 3.4) chickpeaStem(ctx, [...key, n], p, tilted(level(bear + Math.PI * .5), .85), max * .55, max * .55 * span(g, 3.4 + n * .08, 5.6), 1);
		if (f < .35 || n < 2) continue;
		const opens = 4.6 + f * .9 + nr() * .3;
		if (g < opens - .3) continue;
		const fout = level(bear + Math.PI * .5);
		const open = span(g, opens - .3, opens), fall = span(g, opens + .5, opens + .7);
		const set = nr() < .8 ? span(g, opens + .5, opens + 1.7) : 0;
		const ped = arch(p, tilted(fout, .7), .022, .3 + set * .9, 2);
		const end = ped[ped.length - 1];
		const pd = fout.clone().multiplyScalar(.5).add(v3(0, -.85, 0)).normalize();
		const pod = set >= .05;
		if (pod) bag.fruit([...key, n], p, pd);
		const from = blades.mark();
		wire(bag, blades, ped, 5e-4, stalk, 3, UP);
		if (pod) blades.pick(bag, from);
		if (set < .05) {
			peaFlower(blades, end, fout, .009, desi ? "#c87ab0" : "#f6f4ee", desi ? "#a85a98" : "#f0ece4", open, fall);
			continue;
		}
		const size = lerp(.35, 1, set) * about(nr, 1, .1);
		const c = end.clone().addScaledVector(pd, .011 * size);
		bag.add("body", bead(c, v3(.012, .0075, .0068).multiplyScalar(size), mix(mix("#a8c47a", "#8cb064", set), "#d4ae6c", dry * 1.2), 3, alongX(pd)));
		bag.fruitDone();
	}
}
/** the fields' plants, as ./index.js lists them */
const FIELDS = [{
	id: "chickpea",
	label: "Chickpea",
	latin: "Cicer arietinum · Kichererbse",
	note: "A grey-green, glandular-hairy bush of small toothed leaflets; white or pink flowers one to a stalk, then puffed-up pods with a chickpea or two, drying golden-tan.",
	from: "Annual · 110 days",
	stages: CHICKPEA_STAGES,
	grow: chickpea,
//#piece 321da8178e3fcd3936e38b431f8e7656e24efbf273bc90ad3fda83d92835fb46

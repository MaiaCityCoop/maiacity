//#piece 967a0b64303b2ddeeb2bc8abd748732422b708fd7423dc74e534955369e0ce0e
//#piece 0f0c63e8359009b99732158dd4d7a76a7af3b4f3eb108912f4dd120bfb8a2522
//#piece 32958285cf3f6d0a22eb555cb08908ed2366053c617dc4d381f8102affbbe271
//#piece 62c57d34f91b6412e64f02a180987cfb5113e7db6996f84144f99963acdff225
//#piece 4277701e50b57029de01eea6290ea81d28735819acc70c038daa46e2ea5afc38
const LENTIL_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small flat lens of a seed, green-brown, two or three centimetres down in early spring — it does not mind the cold."
	],
	[
		"Germination",
		7,
		"The root goes down; the seed itself stays below, and a hooked shoot pushes up from it."
	],
	[
		"First leaves",
		14,
		"Above two scale leaves, the first leaf: a pair of small oval leaflets and a bristle."
	],
	[
		"Seedling",
		24,
		"Leaves of more leaflet pairs, side stems from the base."
	],
	[
		"Branching",
		38,
		"A low, fine, bushy plant, feathery pinnate leaves ending in little tendrils that catch on its neighbours."
	],
	[
		"Flowering",
		52,
		"Tiny white flowers veined with lilac, one or two on a short stalk from the upper axils."
	],
	[
		"Pods set",
		60,
		"Behind the flowers, small flat pods."
	],
	[
		"Green pods",
		72,
		"Pods full, one or two lentils in each; on the roots, the pink nodules have been fixing nitrogen all along."
	],
	[
		"Drying",
		88,
		"Leaves yellowing from the bottom up, the pods turning tan."
	],
	[
		"Harvest",
		100,
		"The whole plant dry and straw-coloured, the lentils rattling in their pods: pulled or cut, and threshed."
	]
]))();
/**
* The lentil at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function lentil(g, seed) {
//#piece 1165ad2654fba6b3f48ca4c077710a3e9051b5eaba69f899526d1f7844e1dcb3
	const at = v3(0, -.025, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.0026, .0011, .0026),
		coat: "#8a7a48",
		coatShade: "#5a4a2a",
		stem: table(g, [
			[0, 0],
			[.4, .002],
			[1, .022],
			[1.6, .03],
			[9, .03]
		]),
		hook: table(g, [
			[0, 1],
			[1.1, 1],
			[1.6, 0]
		]),
		radius: 6e-4,
		stemColor: "#6a8a3a",
//#piece b1e51ea978f75f0a11c99f1934b7563f650001587da51b54c6b7c8b678046bb9
		length: .3,
		grown: table(g, [
			[0, 0],
			[.4, .04],
			[1, .15],
			[3, .5],
			[5, .9],
			[6, 1]
		]),
		radius: .0012,
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
		dry: span(g, 7.4, 8.8),
		straw: span(g, 8.4, 9.2)
	};
	const r = chance(seed, "lentil");
	const stems = 3 + Math.floor(r() * 2);
	for (let j = 0; j < stems; j++) {
		const born = j ? 2.7 + j * .25 : 1.3;
		const max = .42 * vigour * (j ? between(r, .7, .9) : 1);
		const reach = max * table(g - (j ? .3 : 0), [
			[1.3, 0],
			[2, .05],
			[3, .2],
			[4, .5],
			[5, .8],
			[6, .95],
			[7, 1]
		]);
		if (g <= born) break;
		lentilStem(ctx, [j], s.top.clone(), tilted(level(j * 2.39996 + r()), j ? between(r, .7, 1.05) : between(r, .15, .35)), max, reach, 0);
	}
	blades.into(bag);
	return bag.build();
}
/**
* A lentil stem: fine, zigzag at its nodes, a leaf at each node, the flowers and pods from the upper axils; a side
* stem or two from its lower nodes.
* @param {{ bag: Bag, blades: Blades, seed: string, g: number, vigour: number, dry: number, straw: number }} ctx
//#piece 1716b2bed7c8e5f4f3202d02c3c360f05ae950beb5536b47cb257b396b285240
function lentilStem(ctx, key, from, dir, max, reach, order) {
	const { bag, blades, seed, g, dry, straw } = ctx;
	if (reach < .004) return;
	const r = chance(seed, "lentil-stem", ...key);
	const d = dir.clone().normalize();
	const full = [from.clone()];
	for (let k = 0; k < 10; k++) {
		d.lerp(UP, .07).add(v3((r() - .5) * .15, 0, (r() - .5) * .15)).normalize();
		full.push(full[k].clone().addScaledVector(d, max / 10));
	}
	const pts = upto(full, reach / max);
	const stalk = (u) => mix(mix("#5a8a38", "#7aa04a", u), "#cdb47c", dry + straw);
	wire(bag, blades, pts, order ? .0011 : .0016, stalk, 4, UP);
	const nodes = Math.floor(max / .036);
	const b0 = r() * Math.PI * 2;
	for (let n = 1; n < nodes; n++) {
		const f = n / nodes;
		const h = f * max;
		if (h > reach - .004) break;
		const nr = chance(seed, "lentil-node", ...key, n);
		const p = point(full, f);
		const bear = b0 + n * Math.PI + about(nr, 0, .3);
		const grown = clamp((reach - h) / .05);
		const old = clamp(dry * 1.6 - f * .6) * (1 - straw * .3) + straw * .3;
		const pairs = order ? 3 : n < 2 ? 1 : n < 4 ? 3 : 3 + Math.floor(nr() * 2);
		pinnateLeaf(bag, blades, {
			r: nr,
			at: p,
			out: level(bear),
			lift: .55,
			length: (.018 + .026 * clamp(n / 5)) * ctx.vigour,
			pairs,
			leaflet: {
				length: .013,
				width: .0038,
				shape: oval,
				segs: 2
			},
			paint: (u, v) => mix(mix(mix("#8ab860", "#4f8436", grown), "#7aa85a", Math.abs(v) < .1 ? .3 : 0), mix("#d2c070", "#c8b080", u), old),
			stalk: mix("#6a9a42", "#cdb47c", old),
			radius: 5e-4,
			grown,
			old,
			tendril: n >= 3 ? .012 : 0,
			drop: straw * .5
		});
		if (!order && (n === 2 || n === 4) && g > 3.4) lentilStem(ctx, [...key, n], p, tilted(level(bear + Math.PI * .5), .95), max * .5, max * .45 * span(g, 3.4 + n * .1, 5.4), 1);
		if (f < .4 || n < 3) continue;
		const opens = 4.5 + f * .9 + nr() * .3;
		if (g < opens - .3) continue;
		const fout = level(bear + Math.PI * .4);
		const ped = arch(p, tilted(fout, .6), .014, .1, 1);
		const end = ped[ped.length - 1];
		wire(bag, blades, ped, 4e-4, stalk, 3, UP);
		const count = 1 + (nr() < .4 ? 1 : 0);
		for (let m = 0; m < count; m++) {
			const o = opens + m * .15;
			const open = span(g, o - .3, o), fall = span(g, o + .5, o + .7);
			const set = nr() < .75 ? span(g, o + .5, o + 1.6) : 0;
			const fa = end.clone().addScaledVector(level(bear + m * 2), .003);
			if (set < .05) peaFlower(blades, fa, fout, .006, "#f4f0f4", "#c8b0e0", open, fall);
			else {
				const len = .014 * lerp(.4, 1, set);
				const pd = level(bear + m * 1.4 - .3).multiplyScalar(.6).add(v3(0, -.4, 0)).normalize();
				const seeds = 1 + (nr() < .5 ? 1 : 0);
				bag.fruit([
					...key,
					n,
					m
				], fa, pd);
				const from = blades.mark();
				blades.add({
					at: fa,
					dir: pd,
					up: level(bear + m * 1.4 - .3 + Math.PI / 2),
					length: len,
					width: .0045 * lerp(.5, 1, set),
					shape: (u) => oval(u) * (seeds > 1 ? 1 - .12 * Math.cos(u * Math.PI * 4) : 1),
					segs: 4,
					twin: .35 * set,
					paint: (u) => mix(mix("#9ac464", "#72a048", set), "#c8a868", dry * 1.2 - u * .1),
					round: true
				});
				blades.pick(bag, from);
				bag.fruitDone();
			}
		}
	}
}
/** the fields' plants, as ./index.js lists them */
const FIELDS = [{
	id: "lentil",
	label: "Lentil",
	latin: "Lens culinaris · Linse",
	note: "A low, fine, bushy annual of feathery leaves ending in little tendrils; tiny white-lilac flowers, small flat pods of one or two lentils, the whole plant drying to straw.",
	from: "Annual · 100 days",
	stages: LENTIL_STAGES,
	grow: lentil,
//#piece 321da8178e3fcd3936e38b431f8e7656e24efbf273bc90ad3fda83d92835fb46

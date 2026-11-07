//#piece 518aa236fe590e7deb62c53542badea4c01124d32176b4af875d2063d6576e7a
const CHARD_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A corky, knobbly seed cluster (several seeds in one), two centimetres down."
	],
	[
		"Germination",
		7,
		"One cluster, two or three seedlings: the radicles go down, the hooks come up."
	],
	[
		"Seed leaves",
		12,
		"Two long narrow seed leaves on a stem already red, yellow or white."
	],
	[
		"True leaves",
		25,
		"The first true leaves, glossy, on coloured stalks."
	],
	[
		"Rosette",
		40,
		"A rosette of glossy, blistered leaves on broad stalks."
	],
	[
		"Baby leaf",
		50,
		"Leaves a hand long: picked young for salads."
	],
	[
		"First picking",
		60,
		"The outer leaves full-sized: twist them off at the base."
	],
	[
		"Cut and come again",
		75,
		"Picked from the outside, new leaves keep coming from the middle."
	],
	[
		"Full",
		90,
		"Big crinkled leaves, half a metre tall on thick bright stalks."
	],
	[
		"Harvest",
		110,
		"Picked all summer and into the autumn; it stands the first frosts."
	]
]))();
/** the stalk colours: red, yellow, white, orange, pink — one colour a plant, by its seed */
const CHARD = [
	{
		stalk: "#c41e34",
		vein: "#b01a30",
		leaf: "#2a4a24"
	},
	{
		stalk: "#e8be22",
		vein: "#d8b030",
		leaf: "#356a28"
	},
	{
		stalk: "#f0ede0",
		vein: "#d8dcc0",
		leaf: "#2f6428"
	},
	{
		stalk: "#e8782a",
		vein: "#d8702a",
		leaf: "#2f5a26"
	},
	{
		stalk: "#e0508a",
		vein: "#c84a7a",
		leaf: "#2c5226"
	}
];
/** a chard leaf: a broad oval, the base running into the stalk */
const chardLeaf = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .75)), .6) * (u < .08 ? .35 + u * 8 : 1);
/**
* Swiss chard at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function chard(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const pick = chance(seed, "chard-colour")();
	const sort = CHARD[pick < .32 ? 0 : pick < .6 ? 1 : pick < .8 ? 2 : pick < .92 ? 3 : 4];
	const at = v3(0, -.012, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.004, .0035, .004),
		coat: "#9a8058",
		coatShade: "#6a5438",
		stem: table(g, [
			[0, 0],
			[.3, .001],
			[1, .014],
			[2, .026],
			[9, .026]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.5, 0]
		]),
		radius: .001 + .006 * span(g, 2, 6),
		stemColor: sort.stalk,
		leaf: {
			length: .022,
			width: .0035,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .6),
			color: "#4f8a35",
			vein: "#9cc277"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.5),
		wither: span(g, 3.5, 4.5)
	});
	root(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(0, -1, 0),
		length: .45,
		grown: table(g, [
			[0, 0],
			[.3, .02],
			[1, .08],
			[3, .4],
			[5, .8],
			[7, 1]
		]),
		radius: .003 + .007 * span(g, 3, 8),
		down: .05,
		wander: .12,
		laterals: 14,
		lateral: .4,
		depth: 2,
		age: span(g, 3, 8),
		young: "#f6efdc",
		old: mix("#d8c49a", sort.stalk, .25).getStyle()
	});
	const crown = s.top.clone();
	const space = bag.space;
	const leaves = 30;
	for (let i = 0; i < leaves; i++) {
		const born = 2 + i * .27;
		if (g <= born) break;
		if (g > 6.3 + i * .3) continue;
		const lr = chance(seed, "chard-leaf", i);
		const grown = clamp((g - born) / 1.5);
		const len = (.07 + .5 * clamp(i / 9)) * vigour * about(lr, 1, .07) * lerp(.25, 1, grown);
		const bear = i * 2.39996 + about(lr, 0, .15);
		const out = v3(Math.cos(bear), 0, Math.sin(bear));
		const lean = lerp(.12, between(lr, .45, .8), grown);
		const stalkLen = len * .42;
		const from = crown.clone().addScaledVector(out, .004 + .008 * clamp(i / 10));
		const dir = out.clone().multiplyScalar(Math.sin(lean)).add(v3(0, Math.cos(lean), 0)).normalize();
		const mid = from.clone().addScaledVector(dir, stalkLen * .5);
		const top = mid.clone().addScaledVector(dir.clone().addScaledVector(out, .15).normalize(), stalkLen * .5);
		const w = (.0035 + .007 * clamp(i / 9)) * vigour * lerp(.4, 1, grown);
		bag.add("gloss", tube([
			from,
			mid,
			top
		], (u, v) => w * (1 - .45 * u) * (.75 + .35 * Math.abs(Math.cos(v * Math.PI * 2 + bear))), (u, v) => mix(sort.stalk, "#fffaf0", .12 * Math.abs(Math.sin(v * Math.PI * 6))), 7));
		space.rod([from, top], w);
		const bladeDir = dir.clone().addScaledVector(out, .35).add(v3(0, -.1, 0)).normalize();
		const blade = len * .6;
		const crinkle = lerp(.3, 1, grown);
		bag.add("sheet", sheet({
			length: blade,
			width: blade * .36,
			shape: chardLeaf,
			lift: (u, v) => .1 * v * v - .1 * u * u + .018 * crinkle * Math.sin(u * 26 + v * 3) * Math.sin(v * 9) * (.4 + Math.abs(v)),
			paint: (u, v) => {
				const base = mix(mix(sort.leaf, "#6aa848", (1 - grown) * .6), "#a8c070", .06);
				if (Math.abs(v) < .06 * (1 - u * .6)) return mix(sort.stalk, base, u * .5);
				return base.lerp(new three.Color(sort.vein), Math.abs(Math.sin(u * 13 - Math.abs(v) * 4.5)) > .94 ? .5 * (1 - u * .5) : 0);
			},
			along: 16,
			across: 8
		}), aim(top, bladeDir, 0));
	}
	for (let i = 0; i < leaves; i++) {
		if (!(g > 6.3 + i * .3) || i > 18) continue;
		const bear = i * 2.39996;
		bag.add("body", bead(crown.clone().add(v3(Math.cos(bear) * .016, -.002, Math.sin(bear) * .016)), v3(.006, .004, .006), mix(sort.stalk, "#8a7a5a", .6), 4));
	}
//#piece 0de60e52e7e5ff10ad2b8179ce04e16ede6cf8f56e3a1e095aa50324494751b6
	id: "chard",
	label: "Swiss chard",
	latin: "Beta vulgaris var. cicla · Mangold",
	note: "A rosette of big glossy, blistered leaves on thick stalks — red, yellow, orange, pink or white by the seed — picked from the outside all summer.",
	from: "Leaves · 110 days",
	stages: CHARD_STAGES,
	grow: chard
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

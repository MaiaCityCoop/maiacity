//#piece a4b00dedf01ce385ddb2af68f1e0dfa88b67384fb73e668e321169e61d0b758d
//#piece 749b45e82ae91e3db04830db380916a1cefdafe9d7a8f01612173e436ca3fb4d
const GARLIC_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Clove",
		0,
		"A clove planted in autumn, pointed end up, five centimetres down."
	],
	[
		"Rooting",
		10,
		"White roots break from the flat base plate."
	],
	[
		"Shoot",
		25,
		"A green shoot pushes up out of the clove’s tip."
	],
	[
		"First leaves",
		45,
		"Flat blue-green leaves in two ranks, before the frost."
	],
	[
		"Winter",
		120,
		"It rests through the cold, roots growing on."
	],
	[
		"Spring growth",
		180,
		"New leaves fast in the lengthening days; the old clove is used up."
	],
	[
		"Bulbing",
		210,
		"The base swells: a bulb is forming, splitting inside into cloves."
	],
	[
		"Scape",
		225,
		"The flower stalk shoots up from the middle and curls in a loop."
	],
	[
		"Swelling",
		245,
		"The bulb fattens, its papery skins streaked purple; the lower leaves brown."
	],
	[
		"Harvest",
		265,
		"Half the leaves brown: lift the bulb and dry it."
	]
]))();
/** @param {number} g @param {string} seed */
function garlic(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const plate = v3(0, -.05, 0);
	const used = span(g, 4.6, 6.2);
	if (used < 1) {
		const c = [];
		for (let k = 0; k <= 10; k++) c.push(plate.clone().add(v3(0, k / 10 * .028 * (1 - used * .4), 0)));
		bag.add("body", tube(c, (u) => .008 * (1 - used * .5) * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .1 + u * .95))), .6) * (1 - .4 * u), () => mix("#efe2cc", "#a8906a", used), 10));
	}
	const roots = Math.round(table(g, [
		[.3, 0],
		[1, 8],
		[3, 18],
		[5, 26],
		[9, 32]
	]));
	for (let i = 0; i < roots; i++) {
		const rr = chance(seed, "garlic-root", i);
		const a = i * 2.39996;
		root(bag, {
			seed,
			key: ["g", i],
			from: plate.clone().add(v3(Math.cos(a) * .006, 0, Math.sin(a) * .006)),
			dir: v3(Math.cos(a) * .6, -1, Math.sin(a) * .6),
			length: between(rr, .12, .25),
			grown: (g - .3 - i * .12) / 2.5,
			radius: .001,
			down: .04,
			wander: .18,
			laterals: 3,
			lateral: .2,
			depth: 1,
			young: "#f7f2e4",
			old: "#e2d2b4"
		});
	}
	const bulb = span(g, 5.5, 9);
	if (bulb > 0) {
		const R = (.008 + .024 * bulb) * vigour;
		const cloves = 6 + Math.floor(chance(seed, "cloves")() * 4);
		const b = [];
		for (let k = 0; k <= 16; k++) b.push(plate.clone().add(v3(0, k / 16 * R * 1.8, 0)));
		bag.add("body", tube(b, (u, v) => R * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .08 + u * .92))), .55) * (1 - .55 * Math.pow(u, 1.5)) * (1 + .07 * bulb * Math.abs(Math.cos(v * Math.PI * cloves))), (u, v) => mix("#f2ebe0", "#9a6a8a", Math.pow(Math.abs(Math.sin(v * Math.PI * cloves * 2 + u * 3)), 14) * .7 * bulb), 24));
	}
	const top = plate.clone().add(v3(0, .03, 0));
	for (let i = 0; i < 9; i++) {
		const born = i < 4 ? 1.6 + i * .6 : 4.6 + (i - 4) * .35;
		if (g <= born) break;
		const lr = chance(seed, "garlic-leaf", i);
		const grown = clamp((g - born) / 1.2);
		const brown = span(g, 7.6 + i * .25, 8.6 + i * .25);
		const side = i % 2 ? 1 : -1;
		const len = (.18 + .3 * clamp(i / 5)) * vigour * lerp(.2, 1, grown);
		const sheath = .04 + .12 * span(g, 3, 6);
		const base = top.clone().add(v3(0, sheath * (.5 + .08 * i), 0));
		bag.add("body", tube([top, base], () => .005 + .004 * bulb, () => "#7f9e6a", 8));
		const dir = v3(side * Math.sin(lerp(.1, between(lr, .4, .75), grown)), Math.cos(lerp(.1, .6, grown)), (lr() - .5) * .3).normalize();
		bag.add("sheet", sheet({
			length: len,
			width: .009 * vigour,
			shape: (u) => Math.pow(1 - u, .6) * Math.min(1, u * 8 + .4),
			lift: (u, v) => .25 * Math.abs(v) * .06 - (.35 + brown * .4) * u * u,
			paint: (u) => mix(mix("#5f8a5a", "#7fa070", 1 - grown), "#b0925a", clamp(brown * 1.4 - (1 - u) * .4)),
			along: 14,
			across: 2
		}), aim(base, dir, 0));
	}
	const scape = span(g, 6.3, 7.4);
	if (scape > 0) {
		const pts = [];
		const h = .25 + .2 * scape;
		for (let k = 0; k <= 30; k++) {
			const u = k / 30;
			const s = u * h * scape;
			const curl = Math.max(0, (u - .55) / .45) * Math.PI * 2 * scape;
			pts.push(top.clone().add(v3(Math.sin(curl) * .04, Math.min(s, h * .6) + Math.cos(curl) * 0 + (u > .55 ? (1 - Math.cos(curl)) * .02 : 0), 0)).add(v3(0, sheathTop(g), 0)));
		}
		bag.add("body", tube(pts, () => .002, () => "#7fa05a", 5));
		bag.add("body", bead(pts[30], v3(.004, .012, .004), "#a8c47a", 5));
	}
	return bag.build();
}
const sheathTop = (g) => .04 + .12 * span(g, 3, 6);
//#piece d2dc349e1f1f0bd6d0a674965d7ef2507a466222eb9173b0f8849f0f0cad7122
	id: "garlic",
	label: "Garlic",
	latin: "Allium sativum · Knoblauch",
	note: "A clove planted in autumn: roots from its base, flat blue-green leaves in two ranks, a winter’s rest, then a bulb of new cloves under purple-streaked skins and a curling scape.",
	from: "Bulb · 9 months",
	stages: GARLIC_STAGES,
	grow: garlic
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

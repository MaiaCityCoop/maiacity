//#piece 693245eec24e4da3790df47da8269873aa7f5742253bfa856c596ae3a92c8344
//#piece 749b45e82ae91e3db04830db380916a1cefdafe9d7a8f01612173e436ca3fb4d
const RADISH_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A round brown seed three millimetres across, a centimetre down."
	],
	[
		"Germination",
		2,
		"Within two days the radicle is out and the hook breaks the soil."
	],
	[
		"Seed leaves",
		4,
		"Two heart-shaped seed leaves, notched at their tips."
	],
	[
		"True leaves",
		9,
		"The first rough, lobed true leaves."
	],
	[
		"Rosette",
		14,
		"A small rosette; below, the stem between root and leaves begins to thicken."
	],
	[
		"Swelling",
		17,
		"The hypocotyl turns red and swells at the soil’s surface."
	],
	[
		"Rounding",
		20,
		"A red ball forming, its white tail root going down."
	],
	[
		"Filling",
		23,
		"The ball fills out, its red shoulders pushing up out of the soil."
	],
	[
		"Full",
		26,
		"Round and firm, two and a half centimetres across."
	],
	[
		"Harvest",
		28,
		"Pull it now, crisp and hot — a week more and it goes woolly."
	]
]))();
/** @param {number} g @param {string} seed */
function radish(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .1);
	const at = v3(0, -.01, 0);
	sprout(bag, {
		seed,
		at,
		size: v3(.0016, .0014, .0014),
		coat: "#8a5a3a",
		coatShade: "#5a3a24",
		stem: table(g, [
			[0, 0],
			[.3, .001],
			[1, .012],
			[2, .022],
			[4, .024]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.5, 0]
		]),
		radius: 8e-4 + .0012 * span(g, 1, 4),
		stemColor: "#b04a5a",
//#piece 313913a130a113f0936214b8b9b91e3c97dd1aaf60589b0b5ae12ccab3f2f520
			color: "#5a9a3c",
			vein: "#9cc46e"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.5),
		wither: span(g, 5, 6.5)
	});
	const R = (.002 + .012 * span(g, 3.5, 9)) * vigour;
	const top = .004 + R * .7;
	const ball = [];
	for (let k = 0; k <= 16; k++) ball.push(v3(0, top - k / 16 * R * 2.3, 0));
	bag.add("gloss", tube(ball, (u) => R * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .04 + u))), .6) * (1 - .25 * u), (u) => mix("#c8233a", "#f2ede4", clamp((u - .82) * 6)).lerp(new three.Color("#e04a5a"), .15 * (1 - u)), 18));
	root(bag, {
		seed,
		key: ["tail"],
		from: v3(0, top - R * 2.2, 0),
		dir: v3(0, -1, 0),
		length: .16,
		grown: table(g, [
			[0, 0],
			[.4, .04],
			[1, .12],
			[2, .3],
			[4, .7],
			[6, 1]
		]),
		radius: .0012,
		down: .05,
		wander: .15,
		laterals: 8,
		lateral: .3,
		depth: 1,
		young: "#f6f0de",
		old: "#e9dccb"
	});
	for (let i = 0; i < 9; i++) {
		const born = 2 + i * .5;
		if (g <= born) break;
		const lr = chance(seed, "leaf", i);
		const grown = clamp((g - born) / 1.6);
		const bear = i * 2.39996;
		const len = (.05 + .1 * clamp(i / 5)) * vigour * lerp(.3, 1, grown);
		const tilt = lerp(.2, between(lr, .6, 1.1), grown) + span(g, 8, 9.5) * .4 * (i < 3 ? 1 : 0);
		const out = v3(Math.cos(bear), 0, Math.sin(bear));
//#piece 0067898aa7e9aef54cfbd3b0a0426870894d3cfe1c9ddb7c65cccca811455bf2
		const base = v3(0, top, 0);
		const stalk = base.clone().addScaledVector(dir, len * .35);
		bag.add("body", tube([base, stalk], () => .0012, () => "#9a4a5a", 4));
		bag.add("sheet", sheet({
			length: len * .75,
			width: len * .22,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .7) * (u < .55 ? .45 + .4 * Math.abs(Math.sin(u * Math.PI * 4)) : 1),
			lift: (u, v) => .06 * v * v - .12 * u * u,
			paint: (u, v) => mix("#4f8a3a", "#6aa84a", 1 - grown).lerp(new three.Color("#a8c88a"), Math.abs(v) < .1 ? .4 : 0),
			along: 18,
			across: 4
		}), aim(stalk, dir.clone().lerp(out, .3).normalize()));
	}
//#piece 0de60e52e7e5ff10ad2b8179ce04e16ede6cf8f56e3a1e095aa50324494751b6
	id: "radish",
	label: "Radish",
	latin: "Raphanus sativus · Radieschen",
	note: "Four weeks from seed: heart-shaped seed leaves, rough lobed leaves, the stem below them swelling into a red ball half out of the soil.",
	from: "Root · 28 days",
	stages: RADISH_STAGES,
	grow: radish
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

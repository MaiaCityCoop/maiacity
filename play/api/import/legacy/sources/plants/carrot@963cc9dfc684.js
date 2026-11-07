//#piece 33fe4182ea0125d6b2ed8b5e3c60bd8c34055cf04eb8f9fbdb7376acf34978db
//#piece 4d12d73cd20a9bdb628df4e69438f52baee3d4d3a9b132b0adceb15258ae3747
//#piece 749b45e82ae91e3db04830db380916a1cefdafe9d7a8f01612173e436ca3fb4d
const CARROT_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A tiny ridged, bristly seed, a centimetre down; carrots are slow to come up."
	],
	[
		"Germination",
		10,
		"The radicle goes down long before anything shows above."
	],
	[
		"Seed leaves",
		16,
		"Two long, grass-like seed leaves."
	],
	[
		"True leaves",
		25,
		"The first finely divided, ferny true leaf."
	],
	[
		"Ferny tops",
		40,
		"A fountain of ferny leaves; below, the taproot starts to thicken."
	],
	[
		"Thickening",
		55,
		"The taproot fills out at the top and turns orange."
	],
	[
		"Lengthening",
		65,
		"It thickens down its length, fine roots in rows along it."
	],
	[
		"Colouring",
		75,
		"Deep orange through, its shoulders at the soil’s surface."
	],
	[
		"Filling out",
		85,
		"Full, blunt-ended, sweet."
	],
	[
		"Harvest",
		95,
		"Lift it now: twenty centimetres of carrot under the ferny top."
	]
]))();
/** a carrot's leaflet: finely cut, like a fern's */
const ferny = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .8) * (.25 + .75 * Math.abs(Math.sin(u * Math.PI * 4.5)));
/** @param {number} g @param {string} seed */
function carrot(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .1);
	const at = v3(0, -.01, 0);
	sprout(bag, {
		seed,
		at,
		size: v3(.0016, 7e-4, 9e-4),
		coat: "#8a7a5a",
		coatShade: "#6a5a3a",
		stem: table(g, [
			[0, 0],
			[.5, .001],
			[1.2, .014],
			[2, .025],
			[4, .025]
		]),
		hook: table(g, [
			[0, 1],
			[1.2, 1],
			[1.7, 0]
		]),
		radius: 6e-4 + .001 * span(g, 1, 4),
		stemColor: "#7a9a4a",
		leaf: {
			length: .025,
			width: .0018,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .9)), .6),
			color: "#5a9a3c",
			vein: "#9cc46e"
		},
		open: span(g, 1.2, 2),
		shed: span(g, 1.2, 1.7),
		wither: span(g, 4.5, 6)
	});
	const fill = span(g, 3.5, 9);
	const L = (.06 + .15 * span(g, 2, 7.5)) * vigour;
	const R = (.0015 + .0165 * fill) * vigour;
	const top = .006 * fill;
	const axis = [];
	for (let k = 0; k <= 24; k++) axis.push(v3(Math.sin(k * .4) * .001, top - k / 24 * L, 0));
	bag.add("body", tube(axis, (u, v) => R * Math.pow(1 - u, .75 + .6 * (1 - fill)) * Math.min(1, (u + .02) / .06) * (1 - .03 * Math.pow(Math.abs(Math.sin(u * 140)), 8)), (u) => mix(mix("#f2e8d0", "#e8781e", clamp(fill * 1.6 - u * .4)), "#7a9a4a", clamp((.04 - u) * 25) * .5), 14));
	root(bag, {
		seed,
		key: ["tail"],
		from: v3(0, top - L, 0),
		dir: v3(0, -1, 0),
		length: .12,
		grown: table(g, [
			[0, 0],
			[.5, .04],
			[1.2, .15],
			[3, .6],
			[5, 1]
		]),
		radius: 8e-4,
		down: .05,
		wander: .12,
		laterals: 5,
		depth: 1,
		young: "#f6f0de",
		old: "#e9dccb"
	});
	for (let k = 0; k < 10; k++) {
		const u = .15 + k * .08;
		if (u * L > L * fill + .02) break;
		const a = k * 2.39996;
		root(bag, {
			seed,
			key: ["hair", k],
			from: v3(0, top - u * L, 0),
			dir: v3(Math.cos(a), -.3, Math.sin(a)),
			length: .05,
			grown: span(g, 2 + k * .3, 5 + k * .3),
			radius: 5e-4,
			laterals: 2,
			depth: 1,
			young: "#f6efdc",
			old: "#e5d6bd"
		});
	}
	for (let i = 0; i < 11; i++) {
		const born = 2.4 + i * .5;
		if (g <= born) break;
		const lr = chance(seed, "leaf", i);
		const grown = clamp((g - born) / 1.6);
		const size = (.4 + .6 * clamp(i / 4)) * vigour;
		pinnate(bag, {
			seed,
			key: ["carrot", i],
			at: v3(0, top, 0),
			out: v3(Math.cos(i * 2.39996), 0, Math.sin(i * 2.39996)),
			lift: between(lr, .9, 1.25),
			length: .3 * size,
			pairs: 4,
			leaflet: {
				length: .07 * size,
				width: .035 * size,
				shape: ferny,
				colour: "#3f7a2e",
				young: "#6aa84a",
				vein: "#3f7a2e"
			},
			grown,
			stalk: "#6f9a45",
			radius: .0012,
			terminal: .9,
			between: true
		});
	}
//#piece 0de60e52e7e5ff10ad2b8179ce04e16ede6cf8f56e3a1e095aa50324494751b6
	id: "carrot",
	label: "Carrot",
	latin: "Daucus carota · Karotte",
	note: "Grass-like seed leaves, then a fountain of ferny leaves over a taproot thickening down its length into a long orange cone.",
	from: "Root · 95 days",
	stages: CARROT_STAGES,
	grow: carrot
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

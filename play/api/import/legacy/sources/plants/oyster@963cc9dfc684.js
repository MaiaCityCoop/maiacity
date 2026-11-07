//#piece 91978df5b1e5b5ee00fdd034d32a78ae4652433e39c9ee2ea3fcc854f6c3dc47
//#piece 248d0768fb8bc0a68c9764820d61b9d6b8ba8a994b429ecab6367e7290e6890d
*/
//#piece 889aa2c1b6d472af4fc46f3c4b047f365dcfcf80c29e3a93592cd280fbe9bab7
//#piece d53b60c8b67edd0307c663231cf95185635898a84af5be6bd66af0a7128e313f
//#piece 107cb02ac37e0323b6b46462dda0946decb22419b271377e7ae09e4b4d19dc7c
//#piece 231d0ceacb98ad1088fc294c3c1b5abc96e2dc8d48b468bd535070f22e1b1a9d
//#piece 362bb7292e339f0af56d964b1d17a6276db55505f2c73e1f477f9df2204b4106
//#piece f08d08c537213e06dc73ed72bb76957b6015a20339bffafed9f802b52128ddcd
const OYSTER_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Plugging",
		0,
		"A beech log, drilled and plugged with oyster spawn, stood on end in the shade."
	],
	[
		"Running",
		30,
		"The mycelium runs through the wood."
	],
	[
		"Colonising",
		70,
		"White mycelium shows on the cut top."
	],
	[
		"Colonised",
		110,
		"Colonised through: it fruits when the autumn turns cool and wet."
	],
	[
		"Cold snap",
		130,
		"The first cold rains: the trigger."
	],
	[
		"Pinning",
		134,
		"Clusters of tiny grey knobs burst from the bark."
	],
	[
		"Clusters",
		137,
		"Tight clusters of little grey-blue fans."
	],
	[
		"Shelves",
		140,
		"The fans spread into overlapping shelves, white gills running down their short stems."
	],
	[
		"Mature",
		143,
		"Shelves of grey caps a hand across: cut the whole cluster."
	],
	[
		"Spent",
		150,
		"Old caps curl and pale; the log rests until the next cold spell."
	]
]))();
/**
* Oyster mushrooms on a standing log.
* @param {number} g
* @param {string} seed
*/
function oyster(g, seed) {
	const bag = new Bag();
	const R = .09;
	log(bag, v3(0, -.12, 0), v3(0, .55, 0), R, span(g, 1, 2.8), "#8a8478");
	const cr = chance(seed, "clusters");
	for (let c = 0; c < 5; c++) {
		const ang = c * 1.7 + cr() * .5, h = between(cr, .12, .45);
		const out = v3(Math.cos(ang), 0, Math.sin(ang));
		const pins = 4.7 + cr() * .4;
		const grow = span(g, pins, pins + 3);
		const spent = span(g, 8.4, 9.3);
		if (grow <= .01) continue;
		const n = 7 + Math.floor(cr() * 5);
		for (let k = 0; k < n; k++) {
			const fr = chance(seed, "shelf", c, k);
			const base = v3(0, h + (fr() - .5) * .08, 0).addScaledVector(out.clone().applyAxisAngle(v3(0, 1, 0), (fr() - .5) * .9), R * .98);
			const size = about(fr, 1, .25) * lerp(.15, 1, grow);
			const dir = base.clone().setY(0).normalize().add(v3(0, .25 - spent * .4, 0)).normalize();
			const stem = base.clone().addScaledVector(dir, .015 * size);
			bag.fruit([
				"shelf",
				c,
				k
			], base, dir);
			bag.add("body", tube([base, stem], () => .006 * size, () => "#e8e4dc", 5));
			const capColour = mix(mix("#4a5a6a", "#8a8a8a", grow), "#d8d0c0", spent);
			const capR = .085 * size;
			const m = aim(stem, dir);
			bag.add("body", fan({
				size: capR * .98,
				from: -1.5,
				to: 1.5,
				edge: (a2) => 1 + .06 * Math.sin(a2 * 7),
				lift: (s, a2) => .12 * s * (1 - s) + (spent * .3 - .08) * s * s + .02 * Math.sin(a2 * 7) * s + .09 * (1 - s) * (1 - s),
				paint: () => capColour,
				rings: 6,
				rays: 28
			}), m);
			bag.add("body", fan({
				size: capR,
				from: -1.5,
				to: 1.5,
				edge: (a2) => 1 + .06 * Math.sin(a2 * 7),
				lift: (s, a2) => .12 * s * (1 - s) + (spent * .3 - .08) * s * s + .02 * Math.sin(a2 * 7) * s,
				paint: (s) => capColour.clone().lerp(new three.Color("#2a3a4a"), (1 - s) * .15 * (1 - spent)),
				rings: 6,
				rays: 28
			}), m);
			bag.add("sheet", fan({
				size: capR * .97,
				from: -1.5,
				to: 1.5,
				edge: (a2) => 1 + .06 * Math.sin(a2 * 7),
				lift: (s, a2) => .12 * s * (1 - s) + (spent * .3 - .08) * s * s + .02 * Math.sin(a2 * 7) * s - .006,
				paint: (s, a2) => mix("#f2eee4", "#c8c0b0", Math.abs(Math.sin(a2 * 45)) > .8 ? .5 : 0),
				rings: 4,
				rays: 40
			}), m);
			bag.fruitDone();
		}
	}
//#piece 0de60e52e7e5ff10ad2b8179ce04e16ede6cf8f56e3a1e095aa50324494751b6
	id: "oyster",
	label: "Oyster mushroom",
	latin: "Pleurotus ostreatus · Austernpilz",
	note: "A standing beech log; after the first cold rains, clusters of grey-blue fans that spread into overlapping shelves, their white gills running down the stem.",
	from: "Fungus · 5 months",
	stages: OYSTER_STAGES,
	grow: oyster
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

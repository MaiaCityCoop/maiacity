//#piece 60b115c1032affb89ead40a66eba1124b7674e8f67e70731db79c58db9e06fc1
//#piece a90e8078ce813b4914a250b8fba97b6d1dc95df728311d4c883e50bc198e4669
//#piece c2d4ee9cfcf857ad82919a39e34d001c475e668c1850ecc78af525989c3207b8
//#piece f60ea08781755162df4c0308b4a8992731997623d48b68413d7eaee61d2dd7c7
//#piece 8daed36f426eaf3310c71cbccd25e03dd1ab2d7fa6396ce46cdd432421561db2
//#piece ce4a2d587498db36e38e0cfc795a99e1f34b2e256c6da86fa7c195b3a5e4f326
	}
};
const BAMBOO_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Rhizome",
		0,
		"A piece of running rhizome, jointed and yellowish with fat buds at its nodes, laid a hand deep in spring."
	],
	[
		"First shoot",
		30,
		"A bud wakes: a thin shoot in papery sheaths pushes up and telescopes into a culm."
	],
	[
		"First culms",
		120,
		"A few thin culms a metre or two high, ringed at every node, two branches at a node and fans of narrow leaves."
	],
	[
		"Second year",
		400,
		"The rhizomes run out under the soil; new culms come up taller and thicker than the last."
	],
	[
		"Spring shoots",
		730,
		"Its third spring: fat conical shoots in brown spotted sheaths break the soil all round — dug at a hand high, they are eaten."
	],
	[
		"Culm extension",
		760,
		"Each shoot telescopes up, metres in a few weeks, its sheaths loosening and dropping as the nodes part."
	],
	[
		"Leafing out",
		800,
		"The new culms branch at their nodes and leaf out in fans; under the soil the rhizomes run again."
	],
	[
		"Grove",
		1100,
		"Its fourth spring: the tallest culms yet shoot up through the clump, five to six metres of them."
	],
	[
		"Mature grove",
		1500,
		"A grove six to eight metres high, the tops arching under their leaves; the older culms dull and yellowing."
	],
	[
		"Harvest",
		1900,
		"The oldest culms cut at the ground for canes, the stand thinned; some leaves yellow in the spring leaf change."
	]
]))();
/**
* The clump's culms, each born in its spring, as tall and thick as that year's: a few thin ones the first summer, then
* taller each year, further out from where the rhizome was planted.
* @param {string} seed
*/
function bambooCulms(seed) {
	const r = chance(seed, "bamboo-clump");
	/** @type {[number, number, [number, number], number, [number, number], number][]} born, how many, height, diameter, how far out, how long it extends */
	const years = [
		[
			.6,
			3,
			[1.2, 2],
			.009,
			[.02, .14],
			.9
		],
		[
			2.3,
			4,
			[2.6, 3.6],
			.016,
			[.12, .38],
			1.2
		],
		[
			3.8,
			4,
			[5, 6.4],
			.027,
			[.2, .62],
			1.5
		],
		[
			6.1,
			3,
			[6.3, 7.6],
			.034,
			[.38, .74],
			1.3
		]
	];
	const list = [];
	let k = 0;
	for (let y = 0; y < years.length; y++) {
		const [b, count, [h0, h1], d, [r0, r1], dur] = years[y];
		for (let i = 0; i < count; i++, k++) {
			const H = between(r, h0, h1);
			const a = k * 2.39996 + r() * .8;
			const out = between(r, r0, r1);
			list.push({
				key: k,
				year: y,
				born: b + i * .16 + r() * .14,
				H,
				D: d * (H / ((h0 + h1) / 2)) * about(r, 1, .08),
				at: v3(Math.cos(a) * out, 0, Math.sin(a) * out),
				dur,
				lean: between(r, .02, .1),
				turn: r() * Math.PI * 2
			});
		}
	}
	return list;
}
/** a bamboo leaf: broadest a third of the way, drawn out to a long fine tip */
const bambooLeaf = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .55)), .8);
/**
* Bamboo at a stage (0 … 9, between them on the way) from the seed id: one running clump.
* @param {number} g @param {string} seed
*/
function bamboo(g, seed) {
	const bag = new Bag(), blades = new Blades();
	const culms = bambooCulms(seed);
	if (DETAIL.roots) {
		const piece = [
			v3(-.14, -.11, .02),
			v3(0, -.12, 0),
			v3(.14, -.11, -.02)
		];
		bag.add("body", tube(piece, () => .007, (u) => mix("#d8c48a", "#b8a060", Math.abs(Math.sin(u * 22)) > .92 ? 1 : 0), 6));
		for (const x of [-.07, .07]) if (g < 1.5) bag.add("body", bead(v3(x, -.105, 0), v3(.008, .01, .008), "#c8a868", 4));
		for (let i = 0; i < 3; i++) root(bag, {
			seed,
			key: ["piece", i],
			from: point(piece, i / 2),
			dir: v3(.3 - i * .3, -1, .2),
			length: .25,
			grown: table(g, [
				[0, .05],
				[1, .4],
				[3, 1]
			]),
			radius: .0016,
			laterals: 3,
			depth: 1,
			young: "#f0e8d0",
			old: "#a88a5a"
		});
		for (const c of culms) {
			const grown = span(g, c.born - 1.1, c.born);
			if (grown <= 0 || c.at.length() < .03) continue;
			const from = c.year === 0 ? v3(0, -.12, 0) : culms[Math.max(0, c.key - 4)].at.clone().setY(-.14);
			const to = c.at.clone().setY(-.13);
			const mid = from.clone().lerp(to, .5).add(v3(0, -.04, 0));
			const pts = upto([
				from,
				from.clone().lerp(mid, .5),
				mid,
				mid.clone().lerp(to, .5),
				to,
				c.at.clone().setY(-.02)
			], grown);
			bag.add("body", tube(pts, () => Math.max(.004, c.D * .3), (u) => mix("#e0cc90", "#b8a060", Math.abs(Math.sin(u * 30)) > .93 ? 1 : 0), 4));
			if (grown >= 1) root(bag, {
				seed,
				key: ["rhizome", c.key],
				from: point(pts, .7),
				dir: v3(0, -1, 0),
				length: .2,
				grown: span(g, c.born, c.born + 1.5),
				radius: .0012,
				laterals: 1,
				depth: 1,
				young: "#f0e8d0",
				old: "#a88a5a"
			});
		}
	}
	for (const c of culms) bambooCulm(bag, blades, seed, c, g);
	blades.into(bag);
	return bag.build();
}
/**
* One culm: a shoot in its sheaths, telescoping up, then a ringed pole with two branches at a node and fans of leaves.
* @param {Bag} bag @param {Blades} blades @param {string} seed @param {ReturnType<typeof bambooCulms>[number]} c @param {number} g
*/
function bambooCulm(bag, blades, seed, c, g) {
	if (g <= c.born) return;
	const r = chance(seed, "bamboo-culm", c.key);
	const grow = span(g, c.born, c.born + c.dur);
	const cut = c.year === 0 && g > 8.5;
	const age = g - c.born - c.dur;
	const h = cut ? .12 : Math.max(.02, c.H * grow);
	const branched = cut ? 0 : span(g, c.born + c.dur * .85, c.born + c.dur + .3);
	const leafy = cut ? 0 : span(g, c.born + c.dur + .05, c.born + c.dur + .6);
	const N = Math.max(8, Math.round(c.H / .22) + 4);
	const lens = [];
	for (let k = 0; k < N; k++) lens.push((k < 3 ? .35 + k * .2 : 1) * (.35 + Math.pow(Math.sin(Math.PI * Math.min(1, (k + .5) / N * 1.2)), .6)));
	const sum = lens.reduce((a, b) => a + b, 0);
	const nodes = [0];
	for (let k = 0; k < N; k++) nodes.push(nodes[k] + lens[k] / sum * c.H);
	const out = c.at.length() > .02 ? c.at.clone().setY(0).normalize() : level(c.turn);
	const bend = (.03 + r() * .04) * leafy;
	const P = (z) => c.at.clone().add(v3(0, z - .03, 0)).addScaledVector(out, Math.sin(c.lean) * z + bend * c.H * Math.pow(z / c.H, 3));
	const R = (z) => c.D / 2 * (1 - .6 * (z / c.H));
	const cone = grow < 1 && !cut ? Math.min(h, .12 + c.D * 6) : 0;
	const pole = h - cone * .8;
	const colour = mix(mix("#3f7a2a", "#5f8a34", age / 2.5), "#9a9a46", (age - 2.5) / 3);
	if (pole > .01) {
		/** @type {THREE.Vector3[]} */
		const pts = [];
		/** @type {number[]} */
		const zs = [];
		for (let k = 0; k <= N; k++) {
			const z = nodes[k];
			if (z >= pole) break;
			if (k && z - .015 > (zs[zs.length - 1] ?? -1)) zs.push(z - .015), pts.push(P(z - .015));
			zs.push(z), pts.push(P(z));
		}
		zs.push(pole), pts.push(P(pole));
		const ring = (z) => {
			for (let k = 1; k <= N; k++) {
				const d = z - nodes[k];
				if (Math.abs(d) < .002) return 2;
				if (d < 0 && d > -.02) return 1;
			}
			return 0;
		};
		const ends = zs[zs.length - 1];
		bag.add("body", tube(pts, (u) => R(u * ends) * (ring(u * ends) === 2 ? 1.1 : 1), (u) => {
			const k = ring(u * ends);
			return k === 2 ? mix(colour, "#6a6a2a", .4) : k === 1 ? mix(colour, "#c8d0b8", .45 * clamp(1.5 - age / 3)) : colour;
		}, 5));
		if (cut) bag.add("body", bead(P(.12), v3(R(.12), .002, R(.12)), "#e8d8a8", 5));
	}
	if (cone > 0) {
		const z0 = h - cone;
		const spots = r() * 10;
		bag.add("body", tube([
			P(z0),
			P(z0 + cone * .5),
			P(h)
		], (u) => R(z0) * 1.25 * Math.pow(1 - u, .7) + 8e-4, (u, v) => mix(Math.sin(u * 37 + v * 23 + spots) > .75 ? "#3a2a1a" : "#8a6a42", "#6a8a3a", (u - .75) * 4), 6));
	}
	if (cut) return;
	const leafSize = (c.year === 0 ? .75 : c.year === 1 ? .88 : 1) * lerp(.3, 1, leafy);
	const yellow = g > 8.5 ? .22 : 0;
	const zone = c.H * (c.year < 2 ? .25 : .32);
	const side0 = r() * Math.PI * 2;
	for (let k = 1; k < N; k++) {
		const z = nodes[k];
		if (z > pole - .02) break;
		const nr = chance(seed, "bamboo-node", c.key, k);
		const shed = span(g, c.born + c.dur * (.5 + .5 * (z / c.H)), c.born + c.dur * (.5 + .5 * (z / c.H)) + .35);
		if (shed < 1) {
			const sl = Math.min(nodes[k + 1] - z, .06 + c.D * 5) * .85;
			bag.add("body", tube([
				P(z),
				P(z + sl * .5),
				P(z + sl)
			], (u) => R(z) * (1.18 + shed * .5 * u) * (1 - .15 * u), (u, v) => mix(Math.sin(u * 29 + v * 17 + k) > .8 ? "#5a3a24" : "#c0a070", "#d8c8a0", shed), 5));
		}
		if (z < zone || branched <= 0) continue;
		const t = (z - zone) / Math.max(.01, c.H - zone);
		const reach = c.H * .16 * lerp(1, .4, t) * (c.year === 0 ? 1.3 : 1) * branched;
		for (const [m, part] of [[0, 1], [1, .62]]) {
			const bear = side0 + k * Math.PI + (m ? .5 : -.5) + about(nr, 0, .2);
			const d = tilted(level(bear), between(nr, .8, 1.05));
			const pts = arch(P(z).addScaledVector(level(bear), R(z)), d, reach * part, .25 + .2 * leafy, 3);
			const rb = Math.max(.0012, c.D * .08 * part);
			if (DETAIL.level >= 1) bag.add("body", tube(pts, (u) => rb * (1 - .6 * u), () => mix(colour, "#7a8a3a", .3), 3));
			else if (rb >= DETAIL.finest) blades.strip(pts, rb * 2.4, () => colour, UP);
			if (leafy <= 0) continue;
			const long = reach * part > .25;
			const fans = DETAIL.thin < 1 ? long ? [
				.45,
				.75,
				1
			] : [.6, 1] : long ? [
				.35,
				.6,
				.8,
				1
			] : [
				.4,
				.7,
				1
			];
			for (const f of fans) {
				const p = point(pts, f), td = towards(pts, f);
				const count = 2 + Math.floor(nr() * 3);
				for (let j = 0; j < count; j++) {
					const dir = level(bear + (j - (count - 1) / 2) * .7 + about(nr, 0, .15)).multiplyScalar(.85).addScaledVector(td, .4).add(v3(0, lerp(.6, -.45, leafy), 0)).normalize();
					const Ll = .145 * leafSize * about(nr, 1, .15);
					const old = nr() < yellow ? 1 : 0;
					blades.add({
						at: p,
						dir,
						length: Ll,
						width: Ll * .085,
						shape: bambooLeaf,
						segs: 2,
						fold: .15,
						droop: .25,
						paint: (u, v) => mix(mix(mix("#8ab84a", "#3f7a2e", leafy), "#5a9040", Math.abs(v) < .1 ? .3 : 0), "#d0b450", old)
					});
				}
			}
		}
	}
}
/** the fields' plants, as ./index.js lists them */
const FIELDS = [{
	id: "bamboo",
	label: "Bamboo",
	latin: "Phyllostachys · Bambus",
	note: "A running clump from a piece of rhizome: every spring fat spotted shoots telescope up into ringed green culms, taller each year to six or eight metres, two branches at a node and fans of narrow leaves.",
	from: "Grove · 5 years",
	stages: BAMBOO_STAGES,
	grow: bamboo,
	layer: "sub-canopy"
//#piece e563c7b1e0ace026e55be957113f87b37b8b20e04cba99e05b40156840a2e4e4
//#piece 2085cbffe0d0b60c97245b1bdfbfa3ebd6b2bb55ff78dfb89b526329ee830e09

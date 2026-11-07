//#piece 928128b72cddd82a3a389d635f0df238a24b91a0c40f5631b3c941f8b231cb2c
//#piece c29515fea7642cf7d919cf41a7e4fec9b7563cce1a65eff8cea8264aa7b64054
//#piece 7b988a09e1e6ee85929b578205d24e994221fa879d1e2b39268131e48bc5b113
//#piece 6acce047391c4b175730e21a43e82c0b486ad997939b49a8dd807d29baa021a1
	}
//#piece 9eb4767ed50ad1997e91fe0bd34530a0799e07cd83b8c00a15bf29dc733e9a42
//#piece a82999158b30fb3a0ed82921acc6a52ffefd907f320d529c20896aaa58977963
//#piece e9c76c20f8b1f20f2fe53a43b813f23126d35e4b3646a06b5572adc6a8816513
//#piece e44013e90e65992350953e79cb230c376374a87a7974d0602bc4c36ac3a73de6
//#piece 089670bef0592ba63818d307efe99f8192634737d8973bde272804f4c11cef86
const NETTLE_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A tiny flat oval seed, one of the thousands a female plant shed last autumn, on bare rich soil."
	],
	[
		"Germination",
		8,
		"The radicle goes down, the hook comes up."
	],
	[
		"Seed leaves",
		14,
		"Two small round seed leaves."
	],
	[
		"True leaves",
		25,
		"The first pair of toothed leaves, already bristling with stinging hairs."
	],
	[
		"Young plant",
		50,
		"A square stem with heart-shaped, toothed leaves in pairs, each pair turned a quarter from the last."
	],
	[
		"Spreading",
		110,
		"Yellow rhizomes creep out under the soil and send up new stems: a patch."
	],
	[
		"Picking tops",
		380,
		"Its second spring: the top four leaves of every stem picked, with gloves, for soup, tea and pesto; the patch grows back thicker."
	],
	[
		"Flowering",
		430,
		"Stems a metre high and more; green tassels of tiny flowers hang in pairs from the upper leaf axils, male and female on separate plants."
	],
	[
		"Seeding",
		470,
		"The female tassels heavy and drooping with seed; the caterpillars of peacock and small tortoiseshell butterflies on the leaves."
	],
	[
		"Seed harvest",
		500,
		"Seed for picking, the tassels brown-green; cut down, the stems are the best compost activator and a liquid feed."
	]
]))();
/** a nettle leaf: heart-shaped at the base, drawn out to a point, coarsely toothed */
const nettleLeaf = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .62)), .65) * (1 + (u > .08 && u < .92 ? u * 13 % 1 * .22 : 0));
/**
* The stinging nettle at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function nettle(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const female = chance(seed, "nettle-sex")() < .5;
	const at = v3(0, -.003, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.0011, 5e-4, 8e-4),
		coat: "#8a7a5a",
		coatShade: "#5a4a34",
//#piece 4534a19c2051c957dd45bd39d08f4140599de57f4843fa2f5f256d24f772eb6b
		radius: 5e-4 + .001 * span(g, 1, 4),
		stemColor: "#6a8a3a",
		leaf: {
			length: .005,
			width: .0028,
			shape: (u) => Math.pow(Math.sin(Math.PI * u), .5),
			color: "#5a9a3c",
			vein: "#9cc46e"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.5),
		wither: span(g, 3.2, 4)
	});
	root(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(0, -1, 0),
		length: .22,
		grown: table(g, [
			[0, 0],
			[.3, .03],
			[1, .12],
			[3, .5],
			[5, 1]
		]),
		radius: .0012 + .002 * span(g, 3, 6),
		down: .05,
		wander: .25,
		laterals: 6,
		lateral: .4,
		depth: 1,
		age: span(g, 3, 7),
		young: "#f4ead6",
		old: "#c8a050"
	});
	const flowering = span(g, 6.6, 7.2);
	nettleStem(bag, seed, [0], s.top.clone(), table(g, [
		[2, 0],
		[3, .02],
		[4, .25],
		[5, .7],
		[6, .95],
		[7, 1.2],
		[9, 1.3]
	]) * vigour, g, flowering, female);
	for (let k = 0; k < 4; k++) {
		const kr = chance(seed, "nettle-rhizome", k);
		const born = 4.1 + k * .25 + kr() * .2;
		if (g <= born) break;
		const run = Math.min(.5, (g - born) * .22) * vigour;
		let a = k * (Math.PI / 2) + kr() * .8;
		const pts = [v3(0, -.02, 0)];
		const n = 10;
		for (let m = 1; m <= n; m++) {
			a += (kr() - .5) * .4;
			pts.push(pts[m - 1].clone().add(v3(Math.cos(a) * (run / n), (kr() - .5) * .004 - (m < 3 ? .005 : 0), Math.sin(a) * (run / n))));
		}
		bag.add("body", tube(pts, (u) => .003 * (1 - .3 * u), (u) => mix("#c8a03a", "#e8c860", u), 4));
		for (let j = 0; j < 3; j++) {
			const d = .12 + j * .14;
			if (run < d) break;
			const sr = chance(seed, "nettle-shoot", k, j);
			const sborn = born + d / .22 + .1;
			const base = point(pts, d / run).setY(0);
			root(bag, {
				seed,
				key: [
					"node",
					k,
					j
				],
				from: base.clone().setY(-.03),
				dir: v3(0, -1, 0),
				length: .14,
				grown: span(g, sborn - .2, sborn + 1),
				radius: .0012,
				laterals: 3,
				depth: 1,
				young: "#f4ead6",
				old: "#c8a050"
			});
			nettleStem(bag, seed, [k + 1, j], base, 1.15 * between(sr, .75, 1.05) * vigour * span(g, sborn, sborn + 2.2), g, flowering * span(g, sborn + 1.4, sborn + 1.8), female);
		}
	}
	return bag.build();
}
/**
* A nettle stem: square, its leaves in pairs a quarter-turn apart, the tassels hanging from the upper axils.
* @param {Bag} bag @param {string} seed @param {number[]} key @param {THREE.Vector3} base @param {number} H
* @param {number} g @param {number} flowering @param {boolean} female
*/
function nettleStem(bag, seed, key, base, H, g, flowering, female) {
	if (H < .004) return;
	const r = chance(seed, "nettle-stem", ...key);
	const lean = v3(r() - .5, 0, r() - .5).multiplyScalar(.18);
	const pts = [];
	for (let m = 0; m <= 8; m++) {
		const h = m / 8 * H;
		pts.push(base.clone().add(v3(lean.x * h * (.5 + h), h, lean.z * h * (.5 + h))));
	}
	const R = .0012 + .0035 * clamp(H / 1.2);
	bag.add("body", tube(pts, (u) => R * (1 - .5 * u), (u) => mix("#6a5a3a", "#6a8a3a", clamp(u * 3)), 4));
	const nodes = Math.max(1, Math.floor(H / .075));
	const turn0 = r() * Math.PI;
	const seeding = span(g, 7.8, 8.8), brown = span(g, 8.6, 9.6);
	for (let n = 0; n < nodes; n++) {
		const u = (n + .6) / nodes;
		const p = point(pts, u);
		const t = towards(pts, u);
		const turn = turn0 + n * (Math.PI / 2) + r() * .15;
		const age = clamp((1 - u) * H / .18);
		const size = lerp(.3, 1, age) * (u < .15 && H > .6 ? .75 : 1);
		for (const side of [-1, 1]) {
			const out = level(turn + (side < 0 ? Math.PI : 0));
			const tilt = lerp(.3, 1.45, age) + .15 * age * age;
			const len = .125 * size * Math.min(1, .35 + H);
			const stalk = p.clone().addScaledVector(tilted(out, tilt), len * .25);
			bag.add("body", tube([p, stalk], () => 9e-4, () => tint("#6a8a3a"), 3));
			bag.add("sheet", sheet({
				length: len,
				width: len * .34,
				shape: nettleLeaf,
				lift: (uu, v) => .08 * v * v - .12 * uu * uu * age + .01 * Math.sin(uu * 30) * Math.abs(v),
				paint: (uu, v) => leafColour("#2f5a26", "#5f8a3a", age, 0, uu).lerp(tint("#7a9a5a"), Math.abs(v) < .08 ? .4 : Math.abs(Math.sin(uu * 11 - Math.abs(v) * 3)) > .94 ? .2 : 0),
				along: 7,
				across: 2
			}), aim(stalk, tilted(out, tilt + .15).lerp(t, .1).normalize(), 0));
			if (flowering <= 0 || u < .3 || u > .92) continue;
			for (const s of [-.5, .5]) {
				const d = level(turn + (side < 0 ? Math.PI : 0) + s).multiplyScalar(female ? .5 : .9).add(v3(0, female ? -.5 - seeding * .5 : -.15, 0)).normalize();
				const L = (female ? .07 : .055) * flowering * lerp(.6, 1, age);
				const tp = arch(p.clone().addScaledVector(out, .004), d, L, female ? .4 : .6, 4);
				bag.add("body", tube(tp, (uu) => .0024 * (1 + .6 * Math.abs(Math.sin(uu * 26))) * (1 - .3 * uu), () => mix(female ? "#7a9a50" : "#b0b878", "#8a7a4a", brown), 3));
			}
		}
	}
}
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "nettle",
	label: "Stinging nettle",
	latin: "Urtica dioica · Brennnessel",
	note: "From a tiny seed to a patch on creeping yellow rhizomes: square stems a metre high, toothed heart leaves in pairs, green flower tassels hanging from the upper axils.",
	from: "Perennial · 2 years",
	stages: NETTLE_STAGES,
	grow: nettle,
//#piece feef0e8121e2feb0d65027316063df20b3e6bc2baf1ef0d05b1b48087cb64841

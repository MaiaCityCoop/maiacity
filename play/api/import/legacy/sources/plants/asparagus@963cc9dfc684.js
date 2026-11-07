//#piece 82c289f4677bd89ddfb809031a767aa467da3de102b77b2ba9f969b1c2f25209
//#piece e44013e90e65992350953e79cb230c376374a87a7974d0602bc4c36ac3a73de6
//#piece cd921e8c0b61c7d4eb528df9cf1327e6499df6e22def111f22927f03715e9d00
const ASPARAGUS_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Crown",
		0,
		"A one-year crown like a big pale spider, its fleshy roots spread over a ridge in a trench, twenty centimetres down, in spring."
	],
	[
		"First spears",
		20,
		"Thin spears push up through the soil; none are cut for two years, so the crown can build."
	],
	[
		"First fern",
		60,
		"The spears open into airy fern half a metre high: not leaves but needle-fine little stems."
	],
	[
		"Golden fern",
		200,
		"In the autumn the fern turns gold, feeding the crown below; then it is cut down."
	],
	[
		"Second spring",
		380,
		"More spears and thicker, still left to grow."
	],
	[
		"Second summer",
		430,
		"Fern a metre high, a little thicket of feathers."
	],
	[
		"Spears",
		730,
		"Its third spring: fat spears, cut a little under the soil when twenty centimetres tall, every day or two."
	],
	[
		"Cutting",
		760,
		"Six weeks of cutting; then the spears are left to grow, to feed the crown for next year."
	],
	[
		"Fern and flowers",
		810,
		"Fern a metre and a half high; tiny green-white bells hang along it."
	],
	[
		"Berries",
		860,
		"On the female plants, red berries among the feathers; the fern goes gold in the autumn."
	]
]))();
/**
* Asparagus at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function asparagus(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const female = chance(seed, "asparagus-sex")() < .5;
	const crown = v3(0, -.17, 0);
	const build = span(g, 0, 7);
	bag.add("body", bead(crown, v3(.025, .018, .025).multiplyScalar(lerp(1, 2, build)), "#b89a70", 5));
	for (let i = 0; i < 12; i++) {
		const rr = chance(seed, "asparagus-root", i);
		const a = i / 12 * Math.PI * 2 + rr() * .3;
		root(bag, {
			seed,
			key: ["r", i],
			from: crown.clone().addScaledVector(level(a), .02),
			dir: v3(Math.cos(a), -.25, Math.sin(a)),
			length: between(rr, .3, .45) * lerp(.7, 1.4, build) * vigour,
			grown: 1,
			radius: .0045,
			down: .02,
			wander: .12,
			laterals: 2,
			lateral: .3,
			depth: 1,
			age: build,
			young: "#f0e6cc",
			old: "#a8865a"
		});
	}
	/** @type {{ key: number, born: number, H: number, r: number, cut: number, gone: number, gold: number, year: number }[]} */
	const shoots = [];
	for (let k = 0; k < 3; k++) shoots.push({
		key: k,
		born: .6 + k * .25,
		H: .5,
		r: .0028,
		cut: Infinity,
		gone: 3.45,
		gold: span(g, 2.5, 3),
		year: 1
	});
	for (let k = 0; k < 5; k++) shoots.push({
		key: 10 + k,
		born: 3.55 + k * .18,
		H: 1,
		r: .005,
		cut: Infinity,
		gone: 5.62,
		gold: span(g, 5.3, 5.6),
		year: 2
	});
	for (let k = 0; k < 13; k++) {
		const harvest = k < 7;
		shoots.push({
			key: 20 + k,
			born: harvest ? 5.6 + k * .16 : 6.75 + (k - 7) * .12,
			H: 1.5,
			r: .008,
			cut: harvest ? 5.6 + k * .16 + .5 : Infinity,
			gone: Infinity,
			gold: span(g, 9.2, 9.8),
			year: 3
		});
	}
	for (const sh of shoots) {
		if (g <= sh.born || g > sh.gone) continue;
		const sr = chance(seed, "asparagus-shoot", sh.key);
		const a = sh.key * 2.39996;
		const base = crown.clone().add(v3(Math.cos(a) * .03 * lerp(.5, 1.5, build), .01, Math.sin(a) * .03 * lerp(.5, 1.5, build)));
		const r = sh.r * vigour * about(sr, 1, .12);
		if (g > sh.cut) {
			bag.add("body", tube([base, base.clone().add(v3(0, -base.y - .03, 0))], () => r * .8, () => tint("#c8b48a"), 5));
			continue;
		}
		const spear = .25 * span(g, sh.born, sh.born + .45);
		const fern = sh.cut < Infinity ? 0 : span(g, sh.born + .4, sh.born + 1.4);
		const h = Math.max(spear - base.y, (sh.H - base.y) * fern) * vigour;
		const lean = v3(sr() - .5, 0, sr() - .5).multiplyScalar(.12);
		/** @type {THREE.Vector3[]} */
		const stem = [];
		for (let m = 0; m <= 8; m++) {
			const t = m / 8 * h;
			stem.push(base.clone().add(v3(lean.x * t * t, t, lean.z * t * t)));
		}
		const gold = sh.gold;
		bag.add("body", tube(stem, (u) => r * (1 - .6 * u * fern) * (u > .96 && fern < .1 ? .6 : 1), (u) => stem[0].y + u * h < 0 ? tint("#ece4c8") : mix(mix("#6a9a3a", "#7a6a8a", clamp((u - .85) * 6) * (1 - fern)), "#c8a848", gold), 6));
		bag.space.rod(stem, r);
		if (fern < .05) {
			bag.add("body", bead(stem[8], v3(r * 1.05, r * 2, r * 1.05), "#6a6a4a", 4));
			for (let q = 0; q < 6; q++) {
				const p = point(stem, .96 - q * .05 * (.2 / Math.max(.2, h)));
				if (p.y < 0) continue;
				bag.add("body", bead(p.addScaledVector(level(q * 2.39996), r * .9), v3(r * .4, r * .9, r * .4), "#7a6a6a", 2));
			}
			continue;
		}
		fernBranches(bag, seed, sh.key, stem, h, fern, gold, sh.year === 3 ? span(g, 7.6, 8.1) : 0, sh.year === 3 && female ? span(g, 8.5, 9.1) : 0, female);
	}
	return bag.build();
}
/**
* The fern on an asparagus stem: side branches up its upper part, each with its branchlets, each branchlet with its
* tufts of needle-fine cladodes; the tiny bells hanging at the branchlets' feet, then (on a female plant) the berries.
* @param {Bag} bag @param {string} seed @param {number} key @param {THREE.Vector3[]} stem @param {number} h
* @param {number} open @param {number} gold @param {number} bells @param {number} berries @param {boolean} female
*/
function fernBranches(bag, seed, key, stem, h, open, gold, bells, berries, female) {
	const fr = chance(seed, "asparagus-fern", key);
	const needle = mix("#4f8a3a", "#d8b84a", gold);
	const wood = mix("#5a8a3a", "#c8a848", gold);
	const needles = new Slivers();
	const tuft = Math.max(2, Math.round(5 * Math.min(1, DETAIL.level)));
	const wide = 5 / tuft;
	const branches = 20;
	for (let b = 0; b < branches; b++) {
		const t = .28 + .68 * (b / branches);
		const from = point(stem, t);
		if (from.y < .04) continue;
		const len = h * .3 * (1 - .65 * ((t - .3) / .66)) * span(open, b / branches * .5, b / branches * .5 + .5);
		if (len < .01) continue;
		const out = level(b * 2.39996 + fr() * .4);
		const twig = arch(from, tilted(out, .9 + .3 * (1 - t)), len, .15, 3);
		bag.add("body", tube(twig, () => .0012, () => wood, 3));
		for (let l = 0; l < 4; l++) {
			const u = .25 + l * .22;
			const p = point(twig, u);
			const d = level(b * 2.39996 + (l % 2 ? 1.2 : -1.2)).clone().add(towards(twig, u)).add(v3(0, .3, 0)).normalize();
			const ll = len * .35 * (1 - l * .15) + .02;
			const end = p.clone().addScaledVector(d, ll);
			bag.add("body", tube([p, end], () => 7e-4, () => wood, 3));
			for (let q = 0; q < 4; q++) {
				const np = p.clone().lerp(end, .3 + q * .23);
				for (let w = 0; w < tuft; w++) {
					const nd = v3(fr() - .5, between(fr, .05, .7), fr() - .5).normalize();
					needles.add(np, nd, .022, .0011 * wide, needle, 0, true);
				}
			}
			if (bells > 0 && fr() < .5) {
				const hang = p.clone().add(v3(0, -.012, 0));
				const berry = berries > 0 && female;
				if (berry) bag.fruit([
					"asparagus-berry",
					key,
					b,
					l
				], p, v3(0, -1, 0));
				bag.add("body", tube([p, hang], () => 4e-4, () => tint("#8aa860"), 3));
				if (berry) {
					const R = .0035 * lerp(.5, 1, berries);
					bag.add("gloss", bead(hang.clone().add(v3(0, -R, 0)), v3(R, R, R), mix("#5a8a3a", "#c81e1e", berries), 4));
					bag.fruitDone();
				} else if (berries <= 0) bag.add("body", bead(hang.clone().add(v3(0, -.002, 0)), v3(.0016, .0028, .0016).multiplyScalar(bells), "#dcdca0", 2));
			}
		}
	}
	needles.into(bag);
}
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "asparagus",
	label: "Asparagus",
	latin: "Asparagus officinalis · Spargel",
	note: "From a spidery crown, spears every spring — left for two years, then cut for six weeks — and feathery fern a metre and a half high, red berries on the female plants.",
	from: "Perennial · 3 years",
	stages: ASPARAGUS_STAGES,
	grow: asparagus,
//#piece feef0e8121e2feb0d65027316063df20b3e6bc2baf1ef0d05b1b48087cb64841

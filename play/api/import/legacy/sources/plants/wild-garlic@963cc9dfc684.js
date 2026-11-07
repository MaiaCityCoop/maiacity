//#piece f2600ac316edfee61d72990fbd47fccda6979019a8d75f09e9cd2bbb7522d1c4
//#region src/lib/plants/herbs.js
//#piece a82999158b30fb3a0ed82921acc6a52ffefd907f320d529c20896aaa58977963
const lance = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .65);
const WILD_GARLIC_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small black seed dropped in the leaf litter of a damp beech wood in early summer."
	],
	[
		"Winter cold",
		180,
		"It needs a winter’s cold before it will wake."
	],
	[
		"Germination",
		270,
		"In early spring a root, and a single thread-like leaf."
	],
	[
		"First bulb",
		330,
		"A tiny bulb forms; the leaf yellows and is gone by summer."
	],
	[
		"Young plant",
		640,
		"Its second spring: one narrow leaf on a stalk, the bulb a little bigger."
	],
	[
		"Spring leaves",
		1e3,
		"In its third or fourth spring, two or three broad bright-green leaves: Bärlauch, smelling strongly of garlic."
	],
	[
		"Bud",
		1030,
		"A bud rises on a three-sided stalk, wrapped in a papery spathe."
	],
	[
		"Flowering",
		1045,
		"The spathe splits: a loose ball of white six-pointed stars. The wood floor goes white."
	],
	[
		"Seeds",
		1070,
		"Green three-lobed capsules swell where the stars were; the leaves begin to yellow."
	],
	[
		"Dieback",
		1090,
		"The leaves die back to the bulb; the seeds drop; above ground, nothing until next March."
	]
]))();
/**
* Wild garlic: a patch of bulbs in the leaf litter, broad leaves, white star umbels, gone by summer.
* @param {number} g @param {string} seed
*/
function wildGarlic(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .1);
	const plants = g < 5 ? 1 : 5;
	for (let p = 0; p < plants; p++) {
		const pr = chance(seed, "bulb", p);
		const d = p === 0 ? 0 : between(pr, .07, .14), a = p * 2.39996;
		const base = v3(Math.cos(a) * d, -.05, Math.sin(a) * d);
		const age = p === 0 ? 1 : .6 + pr() * .3;
		const bulb = span(g, 2.6, 5.5) * age;
		if (g < 2) {
			if (p === 0) bag.add("body", bead(v3(0, -.005, 0), v3(.0015, .0012, .0012), "#1a1a1a", 4));
			if (g < 1.8) continue;
		}
		bag.add("body", bead(base, v3(.003 + .007 * bulb, .005 + .016 * bulb, .003 + .007 * bulb), "#f4f0e6", 6));
		root(bag, {
			seed,
			key: ["r", p],
			from: base.clone().add(v3(0, -.01, 0)),
			dir: v3(0, -1, 0),
			length: .12,
			grown: span(g, 1.8, 5),
			radius: 8e-4,
			laterals: 8,
			lateral: .3,
			depth: 1,
			young: "#f6f0e4",
			old: "#e0d4bc"
		});
		const die = span(g, 8.4, 9.5);
		const thread = g < 4.5;
		const n = thread ? 1 : g < 5 ? 1 : 2 + Math.floor(pr() * 2);
		const up = g < 3 ? span(g, 2, 2.6) * (1 - span(g, 2.9, 3.4)) : thread ? span(g, 3.6, 4.2) : span(g, 4.6, 5.2);
		if (up <= .01) continue;
		for (let k = 0; k < n; k++) {
			const lr = chance(seed, "garlic-leaf", p, k);
			const b = k * 2.6 + pr() * 6;
			const out = v3(Math.cos(b), 0, Math.sin(b));
			const len = (thread ? .06 : g < 5 ? .12 : between(lr, .18, .25)) * vigour * up * age;
			const stalk = len * .45;
			const s0 = base.clone().add(v3(0, .05, 0));
			const s1 = s0.clone().addScaledVector(out, stalk * .25).add(v3(0, stalk, 0));
			bag.add("body", tube([
				base,
				s0,
				s1
			], () => .002, () => mix("#8ab05a", "#c8b05a", die), 4));
			const tilt = lerp(.3, .9 + lr() * .3, up) + die * .6;
			const dir = out.clone().multiplyScalar(Math.sin(tilt)).add(v3(0, Math.cos(tilt), 0)).normalize();
			bag.add("sheet", sheet({
				length: len,
				width: thread ? .002 : len * .2,
				shape: lance,
				lift: (u, v) => .05 * v * v - (.08 + die * .2) * u * u,
				paint: (u, v) => mix("#3f8a2e", "#d8c050", clamp(die * 1.3 - (1 - u) * .3)).lerp(new three.Color("#8ac06a"), Math.abs(v) < .08 ? .3 : 0),
				along: 8,
				across: 3
			}), aim(s1, dir, 0));
		}
		if (age < .8 && p !== 0) continue;
		if (g < 5.6) continue;
		const rise = span(g, 5.6, 6.3), bloom = span(g, 6.6, 7.1), seeds = span(g, 7.6, 8.4), drop = span(g, 9, 9.6);
		const top = base.clone().add(v3(.01, .05 + .24 * rise * vigour, 0));
		bag.add("body", tube([base, top], () => .0018, () => mix("#7aa04a", "#c8b05a", die), 3));
		if (bloom <= 0) {
			bag.add("body", bead(top, v3(.006, .012, .006), "#e8ecd8", 4));
			continue;
		}
		const stars = 16;
		for (let m = 0; m < stars; m++) {
			const phi = Math.acos(1 - m / stars * 1.1), th = m * 2.39996;
			const pedicel = top.clone().add(v3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)).multiplyScalar(.025));
			bag.add("body", tube([top, pedicel], () => 5e-4, () => "#8ab05a", 3));
			if (drop > .5) continue;
			if (seeds > .4) bag.add("body", bead(pedicel, v3(.003, .003, .003), mix("#7aa04a", "#a89a5a", die), 3));
			else for (let q = 0; q < 6; q++) {
				const t = q / 6 * Math.PI * 2;
				bag.add("sheet", sheet({
					length: .007 * bloom,
					width: .002,
					shape: lance,
					paint: () => "#fbfbf6",
					along: 2,
					across: 1
				}), aim(pedicel, v3(Math.cos(t), .6, Math.sin(t)).normalize(), 0));
			}
		}
	}
	const lr = chance(seed, "litter");
	for (let k = 0; k < 60; k++) {
		const d = Math.sqrt(lr()) * .22, a = lr() * Math.PI * 2;
		bag.add("sheet", sheet({
			length: .04,
			width: .012,
			shape: lance,
			paint: () => mix("#8a5a2a", "#b88a4a", lr()),
			along: 3,
			across: 1
		}), aim(v3(Math.cos(a) * d, .002 + lr() * .004, Math.sin(a) * d), v3(Math.cos(lr() * 6.28), .05, Math.sin(lr() * 6.28)).normalize(), 0));
	}
//#piece 0de60e52e7e5ff10ad2b8179ce04e16ede6cf8f56e3a1e095aa50324494751b6
	id: "wild-garlic",
	label: "Wild garlic",
	latin: "Allium ursinum · Bärlauch",
	note: "A woodland bulb from a seed that needs a winter’s cold: years later, two or three broad garlicky leaves, a ball of white stars, then gone till next spring.",
	from: "Bulb · 3 years",
	stages: WILD_GARLIC_STAGES,
	grow: wildGarlic
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

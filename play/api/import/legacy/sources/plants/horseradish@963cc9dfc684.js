//#piece ed6e4c06215d93d5a52db30e7fb963e365e57d8c10ef33434ea3edd6dc7b71b4
//#piece e4f347d8fdceb9c328acd7cf4796d29cf88e69a798ed990b16ecf10ef2284626
//#piece 7b988a09e1e6ee85929b578205d24e994221fa879d1e2b39268131e48bc5b113
//#piece 6acce047391c4b175730e21a43e82c0b486ad997939b49a8dd807d29baa021a1
//#piece e316668d49b976378114024d8ab650eacc4bff315fe214c2cc683325d6f25a1f
//#piece 0a88dac9b03b48f473ec2bc8f327ac82f99d824b55f2ec63ad2168aeafaee726
//#piece 089670bef0592ba63818d307efe99f8192634737d8973bde272804f4c11cef86
const HORSERADISH_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Root cutting",
		0,
		"A pencil-thick piece of side root (a thong), planted slanting in spring, its top end up."
	],
	[
		"Sprouting",
		14,
		"Buds break at its top; white roots from all along it."
	],
	[
		"First leaves",
		30,
		"A tuft of narrow leaves, the earliest deeply cut like combs."
	],
	[
		"Rosette",
		60,
		"Long-stalked oblong leaves, glossy, their edges wavy and crinkled."
	],
	[
		"Clump",
		110,
		"Leaves sixty centimetres and more, standing up in a dark clump; gone back to the crown in winter."
	],
	[
		"Second spring",
		380,
		"Back from the crown, bigger: a clump near a metre high."
	],
	[
		"Flowering",
		420,
		"Branched stems rise a metre with clouds of small white four-petalled flowers, honey-scented."
	],
	[
		"Summer",
		470,
		"The flowers fall (it hardly ever sets seed); the leaves at their biggest."
	],
	[
		"Root thickening",
		560,
		"In autumn the taproot fills out, white as a parsnip and thick as a wrist."
	],
	[
		"Lifting",
		600,
		"Lifted after the frosts: grated, it brings the tears. The side roots are kept to replant — and any piece left in the soil grows again."
	]
]))();
/**
* Horseradish at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function horseradish(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const crown = v3(0, .003, 0);
	const fat = span(g, 2.5, 9);
	const Lr = (.18 + .2 * span(g, 2, 9)) * vigour;
	const Rr = (.005 + .019 * fat) * vigour;
	const lean = level(chance(seed, "horseradish-lean")() * Math.PI * 2);
	const tap = [];
	for (let k = 0; k <= 10; k++) {
		const t = k / 10;
		tap.push(crown.clone().addScaledVector(lean, Lr * .35 * Math.sin(t * 1.5) * (1 - fat * .6)).add(v3(0, -t * Lr, 0)));
	}
	bag.add("body", tube(tap, (u) => Rr * (u < .06 ? .75 + u * 4 : 1) * (1 - .7 * u * u), (u, v) => mix("#d4c098", "#a8905e", Math.abs(Math.sin(u * 60 + v)) > .9 ? .6 : .15), 10));
	for (let i = 0; i < 7; i++) {
		const rr = chance(seed, "horseradish-root", i);
		const t = .25 + i * .1;
		const a = i * 2.39996;
		root(bag, {
			seed,
			key: ["side", i],
			from: point(tap, t),
			dir: v3(Math.cos(a), -.6, Math.sin(a)),
			length: between(rr, .15, .3) * vigour,
			grown: span(g, 1 + i * .2, 4 + i * .2),
			radius: .002 + .003 * fat,
			down: .08,
			wander: .2,
			laterals: 3,
			lateral: .3,
			depth: 1,
			age: fat,
			young: "#f4ead6",
			old: "#b8a070"
		});
	}
	if (g < 1.5) bag.add("body", bead(crown.clone().add(v3(0, .004, 0)), v3(.006, .008, .006).multiplyScalar(span(g, .3, 1.2)), "#d8d8a8", 4));
	/** @type {{ key: number, born: number, size: number, wither: number, comb: boolean }[]} */
	const leaves = [];
	for (let i = 0; i < 11; i++) leaves.push({
		key: i,
		born: .9 + i * .3,
		size: .32 + .055 * i,
		wither: span(g, 4.3 + i * .02, 4.8),
		comb: i < 3
	});
	for (let j = 0; j < 22; j++) leaves.push({
		key: 11 + j,
		born: 4.5 + j * .09,
		size: .85 + .15 * clamp(j / 4),
		wither: span(g, 8.8 + j % 4 * .15, 9.8) * (j < 6 ? .6 : .2),
		comb: false
	});
	const top = v3(0, .005, 0);
	for (const L of leaves) {
		if (g <= L.born || L.wither >= 1) continue;
		const lr = chance(seed, "horseradish-leaf", L.key);
		const grown = clamp((g - L.born) / 1.1);
		const out = level(L.key * 2.39996 + about(lr, 0, .2));
		const S = L.size * vigour * about(lr, 1, .08);
		const tilt = lerp(.05, between(lr, .25, .7), grown) + L.wither * .8;
		const P = (.06 + .22 * S) * lerp(.3, 1, grown);
		const stalk = arch(top.clone().addScaledVector(out, .008), tilted(out, tilt), P, .04, 4);
		bag.add("body", tube(stalk, (u) => .004 * lerp(.4, 1, grown) * (1 - .3 * u), () => mix("#a8c088", "#c8b060", L.wither), 4));
		const len = (.1 + .42 * S) * lerp(.25, 1, grown);
		const comb = L.comb;
		bag.add("sheet", sheet({
			length: len,
			width: len * (comb ? .2 : .15),
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .85)), .5) * (comb ? .2 + .8 * Math.abs(Math.sin(u * Math.PI * 6)) : 1 + .03 * Math.abs(Math.sin(u * 45))),
			lift: (u, v) => .05 * v * v + .018 * Math.sin(u * 24 + v) * Math.pow(Math.abs(v), 2) * grown - (.12 + L.wither * .3) * u * u,
			paint: (u, v) => leafColour("#2f6a2a", "#6aa040", grown, L.wither, u).lerp(tint("#b8d098"), Math.abs(v) < .07 ? .5 : Math.abs(Math.sin(u * 14 - Math.abs(v) * 3)) > .95 ? .18 : 0),
			along: 18,
			across: 4
		}), aim(stalk[4], tilted(out, tilt + .1), (lr() - .5) * .4));
	}
	const stems = 2 + Math.floor(chance(seed, "horseradish-stems")() * 2);
	const bloom = span(g, 5.8, 6.2), over = span(g, 6.8, 7.4), brown = span(g, 8.2, 9);
	for (let k = 0; k < stems; k++) {
		const fr = chance(seed, "horseradish-stem", k);
		const born = 5.2 + k * .15;
		if (g <= born) break;
		const rise = span(g, born, born + .7);
		const H = (.7 + .25 * fr()) * vigour * rise;
		const a = k * 2.39996 + fr();
		const stem = arch(top.clone().addScaledVector(level(a), .01), tilted(level(a), between(fr, .05, .2)), H, -.05, 8);
		bag.add("body", tube(stem, (u) => .004 * (1 - .6 * u), () => mix("#7a9a5a", "#8a7a4a", brown), 4));
		for (let j = 0; j < 2; j++) bag.add("sheet", sheet({
			length: .09 * rise,
			width: .012,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .6),
			lift: (u) => -.1 * u * u,
			paint: (u) => leafColour("#2f6a2a", "#6aa040", 1, brown, u),
			along: 5,
			across: 1
		}), aim(point(stem, .25 + j * .15), tilted(level(a + 2.4 + j * 2.4), 1), 0));
		for (let b = 0; b < 6; b++) {
			const twig = arch(point(stem, .5 + b * .09), tilted(level(a + b * 2.39996), .6), (.18 - b * .02) * rise, -.1, 3);
			bag.add("body", tube(twig, () => .0012, () => mix("#7a9a5a", "#8a7a4a", brown), 3));
			for (let m = 0; m < 14; m++) {
				const p = point(twig, .15 + m * .062);
				const side = level(m * 2.39996 + b).multiplyScalar(.008);
				const fp = p.clone().add(side).add(v3(0, .002, 0));
				if (over >= 1) continue;
				if (bloom <= 0) bag.add("body", bead(fp, v3(.0016, .0016, .0016), "#d8e0b8", 2));
				else bag.add("body", bead(fp, v3(.006, .0035, .006).multiplyScalar(lerp(.6, 1, bloom) * (1 - over * .5)), mix("#fafaf2", "#c8c8a0", over), 2));
			}
		}
	}
	return bag.build();
}
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "horseradish",
	label: "Horseradish",
	latin: "Armoracia rusticana · Meerrettich",
	note: "From a root cutting, a clump of big wavy, long-stalked leaves and white flower sprays; below, a white taproot thick as a wrist that brings the tears.",
	from: "Root · 2 years",
	stages: HORSERADISH_STAGES,
	grow: horseradish,
	layer: "root"
//#piece 4b1b0d87ac174e41c3ba4bfa76099d5b0338dfa9582e7a65fd739d1ff6327ce5

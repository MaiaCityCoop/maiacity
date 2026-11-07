//#piece 043e1ab6a9c5729f2b4ae4012747d5ca81eda156ed52f414630287d4d7b5862f
//#piece 442fc7c66385fd384534fd4e80767a9cf0e45a8924c268f21176041d057b9bfa
//#piece 7a59748608c9b71c6d0acd107371325b2af27d96d691012628e3e3c6518127f6
*/
//#piece 5005d5d4aa56cb0fe06df732f64f19dcb6cf56da72915a2385ceed381caea9ae
}
/**
//#piece ddf7fb903df75d94ffaaf76d5fb7932002f9851df9194fefe6de8c65f5210a96
*/
//#piece 70800341da83776310eb4b033ea7bb914fb1e6a98e315d805ea2ed751cb1a204
const KIWIBERRY_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A tiny dark seed from a kiwiberry, chilled through the winter, sown on the surface."
	],
	[
		"Germination",
		25,
		"A root goes down, a thread of a shoot comes up."
	],
	[
		"Seed leaves",
		35,
		"Two small oval seed leaves, then rounded hairy ones."
	],
	[
		"First shoots",
		365,
		"A young vine finds its post and twines up it, anticlockwise."
	],
	[
		"On the bar",
		1100,
		"Over the top and along the bar both ways, a woody trunk twisted round the post, shoots hanging down."
	],
	[
		"Flowering",
		1650,
		"Nodding white flowers with dark anthers in the axils of the new shoots’ lowest leaves, scented of lily of the valley."
	],
	[
		"Fruit set",
		1665,
		"The petals drop; little hairless green fruit hang in the leaf axils."
	],
	[
		"Green fruit",
		1720,
		"Clusters of grape-sized, smooth green fruit along the base of every shoot."
	],
	[
		"Swelling",
		1770,
		"The fruit fill out and soften, a bronze blush on the sunny side."
	],
	[
		"Ripe",
		1790,
		"Soft, smooth, sweet kiwiberries to eat skin and all, hanging under a curtain of leaves."
	]
]))();
const POST = /* @__PURE__ */ (() => v3(.02, 0, -.1))();
const POST_R = .045;
const BAR_Y = 2.2;
const BAR = 1.1;
/** the vine's turn round the post, a turn every 45 cm */
const TWIST = /* @__PURE__ */ (() => Math.PI * 2 / .45)();
/** @type {Hanging} */
const KIWI = {
	L: .027,
	W: .0105,
	stalk: .03,
	stalkColour: "#8a6a48",
	season: {
		opens: 4.7,
		setFor: 2.4,
		ripeFrom: 7.8,
		ripeFor: 1.1
	},
	bud: (bag, at, down, open, fall) => {
		if (fall < 1) floret(bag, at, down.clone().lerp(UP, .25).normalize(), .0095 * (1 - fall * .4), "#f8f4e6", "#3a2a30", open, 5, .35);
	},
	draw: (bag, at, dir, L, W, ripe) => {
		const c = ramp([
			[0, "#6a9a3a"],
			[.6, "#7aa642"],
			[1, "#8aa846"]
		], ripe);
		oblong(bag, at, dir, L, W, ovalShape, (u, v) => c.clone().lerp(new three.Color("#8a5a3a"), ripe * .35 * Math.max(0, Math.cos(v * Math.PI * 2))), "#4a3a2a", 9);
	}
};
/**
* The hardy kiwi at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g
* @param {string} seed
*/
function kiwiberry(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .07);
	const at = v3(0, -.003, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.0012, 6e-4, 8e-4),
		coat: "#3a2a20",
		coatShade: "#1e1610",
		stem: table(g, [
			[0, 0],
			[.35, 5e-4],
			[1, .005],
			[2, .012],
			[9, .012]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.6, 0]
		]),
		radius: 6e-4 + .0025 * span(g, 1.5, 4),
		stemColor: "#8a7a4a",
		leaf: {
			length: .005,
			width: .0032,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .75)), .6),
//#piece 49b20a489be3332830db3dc10ebafddf8a68e0d1c64107aae9202ada3c05738f
		length: .7,
		count: 11
	}, vigour);
	if (g >= 2.4) {
		bag.add("prop", tube([POST.clone().add(v3(0, -.4, 0)), POST.clone().add(v3(0, 2.2600000000000002, 0))], () => POST_R, (u) => mix("#8a7058", "#9a8064", Math.abs(Math.sin(u * 40)) * .5), 8));
		bag.add("prop", tube([POST.clone().add(v3(-1.1, BAR_Y, 0)), POST.clone().add(v3(BAR, BAR_Y, 0))], () => .032, () => "#94785c", 6));
	}
	bag.space.rod([POST.clone(), POST.clone().add(v3(0, BAR_Y, 0))], .055);
	bag.space.rod([POST.clone().add(v3(-1.1, BAR_Y, 0)), POST.clone().add(v3(BAR, BAR_Y, 0))], .045);
	const H = Math.min(BAR_Y, table(g, [
		[2, 0],
		[2.6, .06],
		[3, .5],
		[3.5, 1.4],
		[4, BAR_Y]
	]) * vigour);
	const phase = chance(seed, "kiwi-vine")() * Math.PI * 2;
	const start = s.top.clone();
	const trunkAt = (h) => {
		const t = clamp((h - .04) / .22);
		const e = t * t * (3 - 2 * t);
		const a = phase + h * TWIST;
		const ring = .056999999999999995;
		return v3(lerp(start.x, POST.x + Math.cos(a) * ring, e), start.y + h, lerp(start.z, POST.z - Math.sin(a) * ring, e));
	};
//#piece 258ffe442a20534b52d8c954dedf8938f8b3d467b0892310c3d62ea0dea3637d
	if (H > .003) {
		const steps = Math.max(2, Math.ceil(H / .025));
		const pts = [];
		for (let k = 0; k <= steps; k++) pts.push(trunkAt(k / steps * H));
		const thick = .0025 + .013 * span(g, 3.6, 8.5);
		bag.add("body", tube(pts, (u) => thick * (1 - .45 * u), (u) => mix("#6a5040", "#8a7a4a", clamp(u * 2 - span(g, 3.5, 6))), 6));
		bag.space.rod(pts, thick + .004);
		leafy.push({
			pts,
			length: H * 1,
			order: 1,
			key: ["trunk"],
			fade: span(g, 4.3, 4.9)
		});
	}
	const A = table(g, [
		[3.9, 0],
		[4.4, .5],
		[5, BAR * .92],
		[9, BAR * .97]
	]) * vigour;
	/** @type {Limb[]} */
	const shoots = [];
	for (const side of [-1, 1]) {
		if (A < .01) break;
		const armAt = (x) => {
			const a = phase + side * x * TWIST * .6;
			const ring = .042 * clamp(x / .08);
			return v3(POST.x + side * x, BAR_Y + Math.cos(a) * ring + .01, POST.z + Math.sin(a) * ring);
		};
		const steps = Math.max(2, Math.ceil(A / .03));
		const pts = [trunkAt(BAR_Y)];
		for (let k = 1; k <= steps; k++) pts.push(armAt(k / steps * A));
		bag.add("body", tube(pts, (u) => (.003 + .007 * span(g, 4.4, 8.5)) * (1 - .5 * u), () => "#7a6048", 5));
		bag.space.rod(pts, .012);
		leafy.push({
			pts,
			length: A,
			order: 1,
			key: ["arm", side]
		});
		for (let k = 0; k < 11; k++) {
			const x = .06 + k * .1;
			const kr = chance(seed, "kiwi-shoot", side, k);
			const born = 4.35 + x * .6 + kr() * .1;
			const over = k % 2 ? 1 : -1;
			const length = between(kr, .8, 1.15) * vigour;
			const sway = (kr() - .5) * .6;
			if (x > A - .04 || g <= born) continue;
			limb(bag, {
				seed,
				key: [
					"shoot",
					side,
					k
				],
				from: armAt(x),
				dir: v3(side * .2 + sway, .45, over * .9).normalize(),
				length,
				grown: Math.min(2, (g - born) * 1.4),
				radius: .0065,
				up: -.17,
				wander: .08,
				spread: .7,
				children: 2,
				shorten: [.4, .65],
				depth: 1,
				from0: .35,
				young: "#9a8058",
				old: "#7a6048",
				age: clamp((g - born) / 4),
				out: shoots,
				sides: 5
			});
		}
	}
	for (const t of shoots) {
		if (t.order > 0) continue;
		const fr = chance(seed, "kiwi-node", ...t.key);
		for (let k = 1; k < 5; k++) {
			const w = walk(t.pts, (k + .4) * .07);
			const pick = fr(), two = fr(), a = fr();
			if (!w) break;
			if (pick > .75) continue;
			for (let m = 0; m < (two < .4 ? 2 : 1); m++) hanging(ctx, w.p, level(round(w.d, a * 6.28 + m * 2.4), level(w.d)), [
				...t.key,
				k,
				m
			], KIWI);
		}
	}
	leafOut(ctx, KIWI_LEAF, [...leafy, ...shoots]);
	return bag.build();
}
/** @type {Leafing} */
const KIWI_LEAF = /* @__PURE__ */ (() => ({
	blade: simple((u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .72)), .5) * (u > .88 ? 1 - (u - .88) * 4 : 1) * (u < .06 ? .55 + u * 7 : 1), .82, .05),
	length: .115,
	stalk: .055,
	stalkColour: "#a83e36",
	spacing: .065,
	from: 0,
	bare: 0,
	colour: "#2e6a2a",
	young: "#7aac4a",
	vein: "#a8c08a",
	shade: "#2a5e28",
	droop: .45
}))();
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "kiwiberry",
	label: "Hardy kiwi",
	latin: "Actinidia arguta · Kiwibeere",
	note: "A vigorous vine twining up its post and along the bar, rounded leaves on red stalks hanging in a curtain, nodding white flowers, and clusters of smooth green kiwiberries the size of grapes.",
	from: "Vine · 5 years",
	stages: KIWIBERRY_STAGES,
	grow: kiwiberry,
	layer: "climber"
//#piece 4b1b0d87ac174e41c3ba4bfa76099d5b0338dfa9582e7a65fd739d1ff6327ce5

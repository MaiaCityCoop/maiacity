//#piece 1aa5d3ebfb8594874fd056075b49ae59b4af8380d4e816a0357f4988a1d9bdd9
//#piece 7a065cbb747806be22ecd610efd159d4733f880727c9435083c5d8f0836fdae5
//#piece b6ef2ce50708891b5fc6551bd99957da123395110f6ad44a5d4a0ce9e7c47b66
//#piece d9fbf1bcb3dd12603d17bb06379710dcb6bfd795862c2b4b6ffa14f65e685549
const JERUSALEM_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Tuber",
		0,
		"A knobbly tuber the size of a hen’s egg, ten centimetres down in early spring."
	],
	[
		"Sprouting",
		21,
		"White shoots from its eyes, roots below."
	],
	[
		"Shoots",
		40,
		"Stout hairy shoots break the soil, rough leaves in pairs."
	],
	[
		"Leafy",
		60,
		"Stems knee-high, broad, rough, dark green leaves."
	],
	[
		"Tall",
		100,
		"Stems two metres, the leaves alternate higher up; under the soil, white stolons run out."
	],
	[
		"Towering",
		140,
		"A thicket nearly three metres tall — a windbreak and a screen; the stolon tips start to swell."
	],
	[
		"Flowering",
		180,
		"Small yellow sunflowers at the tops in September, the bees and hoverflies at them."
	],
	[
		"Tubers",
		210,
		"Under the soil, a nest of knobbly tubers filling out."
	],
	[
		"Frosted",
		240,
		"The first frosts blacken the leaves; the stems stand brown and the tubers grow sweet."
	],
	[
		"Digging",
		260,
		"Dug as needed all winter; any tuber missed comes up again next spring."
	]
]))();
/**
* The Jerusalem artichoke at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function jerusalemArtichoke(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const skin = chance(seed, "topinambur-skin")() < .65 ? "#d8b896" : "#b0645a";
	const T = v3(0, -.1, 0);
	const frost = span(g, 7.8, 8.5);
	const spent = span(g, 1, 5);
	if (spent < 1) tuber(bag, seed, ["mother"], T.clone().add(v3(-.03, 0, 0)), v3(1, .1, .2), .065, .022 * (1 - .6 * spent), mix(skin, "#6a5040", spent));
	for (let i = 0; i < 6; i++) {
		const rr = chance(seed, "topinambur-root", i);
		const a = i * 2.39996;
		root(bag, {
			seed,
			key: ["r", i],
			from: T.clone(),
			dir: v3(Math.cos(a) * .5, -1, Math.sin(a) * .5),
			length: between(rr, .4, .7) * vigour,
			grown: table(g, [
				[.5, 0],
				[1.5, .2],
				[3, .6],
				[5, 1]
			]),
			radius: .0025,
			down: .04,
			wander: .25,
			laterals: 5,
			lateral: .35,
			depth: 1,
			age: span(g, 2, 6),
			young: "#f4ead6",
			old: "#b8986a"
		});
	}
	const space = bag.space;
	/** @type {(() => void)[]} */
	const later = [];
	const stems = 3 + Math.floor(chance(seed, "topinambur-stems")() * 2);
	/** where the stems come up, for the stolons */
	const feet = [];
	for (let k = 0; k < stems; k++) {
		const sr = chance(seed, "topinambur-stem", k);
		const H = table(g - k * .15, [
			[1.3, 0],
			[2, .06],
			[3, .5],
			[4, 1.8],
			[5, 2.6],
			[6, 2.8]
		]) * between(sr, .82, 1.05) * vigour;
		const a = k * 2.39996 + sr();
		const foot = T.clone().add(v3(Math.cos(a) * .03, .02, Math.sin(a) * .03));
		feet.push(foot);
		const under = [
			foot,
			v3(foot.x + Math.cos(a) * .03, -.04, foot.z + Math.sin(a) * .03),
			v3(foot.x + Math.cos(a) * .05, 0, foot.z + Math.sin(a) * .05)
		];
		if (H <= 0) {
			const grow = span(g, .6, 1.3);
			if (grow > 0) bag.add("body", tube([foot, foot.clone().lerp(under[1], grow)], () => .003, () => tint("#f0e8d8"), 4));
			continue;
		}
		const lean = level(a).multiplyScalar(between(sr, .05, .13));
		const stem = [...under];
		for (let m = 1; m <= 12; m++) {
			const h = m / 12 * H;
			stem.push(under[2].clone().add(v3(lean.x * h, h, lean.z * h)));
		}
		const R = (.004 + .011 * span(g, 2, 5.5)) * vigour;
		bag.add("body", tube(stem, (u) => R * (1 - .6 * u), (u) => mix(mix("#4a6a2e", "#6a4a4a", .3 * (1 - u)), "#7a6648", frost), 6));
		space.rod(stem, R);
		const above = stem.slice(2);
		const bud = span(g, 5, 5.5), open = span(g, 5.5, 6), fade = span(g, 7.2, 8.2);
		if (bud > 0) {
			const heads = [{
				at: above[12],
				dir: towards(above, 1)
			}];
			for (let b = 0; b < 6; b++) {
				const br = chance(seed, "topinambur-branch", k, b);
				const from = point(above, .62 + b * .06);
				const len = between(br, .15, .35) * bud;
				const twig = arch(from, tilted(level(a + b * 2.39996), .6), len, -.3, 4);
				bag.add("body", tube(twig, (u) => R * .35 * (1 - .4 * u), () => mix("#4a6a2e", "#7a6648", frost), 4));
				space.rod(twig, R * .35);
				heads.push({
					at: twig[4],
					dir: towards(twig, 1)
				});
			}
			for (const h of heads) {
				const facing = h.dir.clone().lerp(UP, .3).normalize();
				space.ball(h.at.clone().addScaledVector(facing, .01), .04 * open + .012);
				sunflower(bag, h.at, facing, bud, open, fade);
			}
		}
		let n = 0;
		for (let h = .08; h < H - .02; h += .09, n++) {
			const lr = chance(seed, "topinambur-leaf", k, n);
			const p = point(above, h / H);
			const grown = clamp((H - h) / .4);
			if (h < .5 * clamp((g - 3.5) / 2) || lr() < span(g, 8.3, 9.3) * .8) continue;
			const L = (.28 - .14 * clamp((h - 1.4) / 1.4)) * lerp(.3, 1, grown) * vigour * about(lr, 1, .08);
			const pair = h < 1;
			for (const side of pair ? [0, Math.PI] : [0]) {
				const bear = a + n * (pair ? Math.PI / 2 : 2.39996) + side;
				later.push(() => {
					const out = space.steer(p, level(bear), .2, L, .03);
					const tilt = lerp(.2, between(lr, 1, 1.35), grown) + frost * .6;
					const dir = tilted(out, tilt);
					const st = p.clone().addScaledVector(dir, L * .18);
					bag.add("body", tube([p, st], () => .0018, () => mix("#5a7a3a", "#5a4a30", frost), 3));
					bag.add("sheet", sheet({
						length: L,
						width: L * .34,
						shape: (uu) => Math.pow(Math.sin(Math.PI * Math.pow(uu, .68)), .7) * (1 + (uu > .15 && uu < .9 ? uu * 16 % 1 * .08 : 0)),
						lift: (uu, v) => .06 * v * v - (.12 + frost * .4) * uu * uu,
						paint: (uu, v) => mix(leafColour("#3a682c", "#5a8a3a", grown, 0, uu), "#2e2a1e", frost * 1.1).lerp(tint("#7a9a5a"), Math.abs(v) < .07 ? .35 * (1 - frost) : 0),
						along: 8,
						across: 3
					}), aim(st, dir.clone().add(v3(0, -.25, 0)).normalize(), (lr() - .5) * .8));
				});
			}
		}
	}
	for (let m = 0; m < 14; m++) {
		const tr = chance(seed, "topinambur-tuber", m);
		const born = 4 + m * .08;
		const run = span(g, born, born + 1);
		if (run <= 0) continue;
		const foot = feet[m % feet.length];
		const a = m * 2.39996 + tr();
		const reach = between(tr, .06, .28);
		const end = foot.clone().add(v3(Math.cos(a) * reach * run, -between(tr, 0, .08) * run, Math.sin(a) * reach * run));
		bag.add("body", tube([
			foot,
			foot.clone().lerp(end, .5).add(v3(0, -.01, 0)),
			end
		], () => .0018, () => tint("#f0e6d4"), 3));
		const swell = span(g, 5, 7.6) * between(tr, .6, 1.1);
		if (swell > .02) tuber(bag, seed, [m], end, level(a).add(v3(0, -.3 + tr() * .6, 0)), .04 + .05 * swell, .006 + .018 * swell, skin);
	}
	for (const f of later) f();
	return bag.build();
}
/**
* A knobbly tuber from `at` along `dir`: lumpy, its eyes swollen into knobs, one or two knobs grown out to the side.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} at @param {THREE.Vector3} dir
* @param {number} length @param {number} R @param {THREE.ColorRepresentation} skin
*/
function tuber(bag, seed, key, at, dir, length, R, skin) {
	const tr = chance(seed, "tuber", ...key);
	const d = dir.clone().normalize();
	const side = new three.Vector3().crossVectors(d, UP);
	if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
	side.normalize();
	const pts = [];
	for (let k = 0; k <= 8; k++) pts.push(at.clone().addScaledVector(d, k / 8 * length).addScaledVector(side, Math.sin(k * .9 + tr() * 3) * R * .25));
	const ph = tr() * 6;
	bag.add("body", tube(pts, (u, v) => R * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .04 + u * .96))), .55) * (1 + .22 * Math.sin(u * 17 + v * 11 + ph) * Math.sin(v * 7)), (u, v) => mix(skin, "#f2e6d0", Math.abs(Math.sin(u * 19 + v * 5)) > .95 ? .4 : 0), 8));
	for (let k = 0; k < 2; k++) {
		const p = point(pts, .35 + k * .3);
		const a = tr() * Math.PI * 2;
		const o = side.clone().applyAxisAngle(d, a);
		bag.add("body", bead(p.addScaledVector(o, R * .7), v3(R * .55, R * .5, R * .55), skin, 4));
	}
}
/**
* A little sunflower: green bracts behind, a ring of yellow rays round a yellow-brown disc; a bud first, the rays
* drooping and falling as it fades.
* @param {Bag} bag @param {THREE.Vector3} at @param {THREE.Vector3} facing @param {number} bud @param {number} open @param {number} fade
*/
function sunflower(bag, at, facing, bud, open, fade) {
	const f = facing.clone().normalize();
	const turn = upTo(f);
	bag.add("body", bead(at, v3(.012, .008, .012).multiplyScalar(lerp(.4, 1, bud)), mix("#5a7a3a", "#5a4a30", fade), 4, turn));
	for (let k = 0; k < 10; k++) {
		const a = k / 10 * Math.PI * 2;
		const d = v3(Math.cos(a), lerp(1.2, .2, open), Math.sin(a)).normalize().applyQuaternion(turn);
		bag.add("sheet", sheet({
			length: .016 * lerp(.5, 1, bud),
			width: .004,
			shape: (u) => Math.sin(Math.PI * Math.pow(u, .6)),
			paint: () => mix("#4a6a2e", "#5a4a30", fade),
			along: 2,
			across: 1
		}), face(at, d, f));
	}
	if (open <= 0) return;
	const disc = at.clone().addScaledVector(f, .005);
	bag.add("sheet", fan({
		size: .011 * lerp(.6, 1, open),
		from: -Math.PI,
		to: Math.PI,
		edge: () => 1,
		lift: (s) => .2 * s * (1 - s),
		paint: (s) => mix(mix("#c89a2a", "#8a5a2a", s < .6 ? .6 : 0), "#4a3424", fade),
		rings: 2,
		rays: 10
	}), face(disc, new three.Vector3().crossVectors(f, v3(.3, .1, 1)).normalize(), f));
	if (fade >= 1) return;
	for (let k = 0; k < 12; k++) {
		const a = k / 12 * Math.PI * 2 + .1;
		const radial = v3(Math.cos(a), 0, Math.sin(a)).applyQuaternion(turn);
		const d = radial.clone().addScaledVector(f, lerp(.9, .05, open) - fade * 1.2).normalize();
		bag.add("sheet", sheet({
			length: .032 * lerp(.4, 1, open) * (1 - fade * .3),
			width: .0055,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .5),
			lift: (u, v) => -.06 * v * v,
			paint: (u) => mix(mix("#f4c41e", "#f8d848", u * .4), "#a88a3a", fade),
			along: 3,
			across: 1
		}), face(disc.clone().addScaledVector(radial, .009), d, f));
	}
}
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "jerusalem-artichoke",
	label: "Jerusalem artichoke",
	latin: "Helianthus tuberosus · Topinambur",
	note: "From a knobbly tuber, hairy stems nearly three metres tall with rough leaves and little yellow sunflowers; below, a nest of new tubers, dug all winter.",
	from: "Tuber · 260 days",
	stages: JERUSALEM_STAGES,
	grow: jerusalemArtichoke,
	layer: "root"
//#piece 4b1b0d87ac174e41c3ba4bfa76099d5b0338dfa9582e7a65fd739d1ff6327ce5

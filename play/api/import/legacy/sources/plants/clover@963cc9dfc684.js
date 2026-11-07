//#piece 693245eec24e4da3790df47da8269873aa7f5742253bfa856c596ae3a92c8344
//#region src/lib/plants/allies.js
//#piece a82999158b30fb3a0ed82921acc6a52ffefd907f320d529c20896aaa58977963
//#piece 7a25f2109e096e20f06a334a7773102f06cf92bed7a8ee956d0be8dbbb58bf4e
//#piece 127d531099cd5093908afe56662cb19703f9e02b0a641dce94c49e6e7544a213
	}
}
const CLOVER_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A tiny yellow, heart-shaped seed, pressed onto the soil’s surface."
	],
	[
		"Germination",
		4,
		"The radicle goes down, the hook comes up."
	],
	[
		"Seed leaves",
		8,
		"Two small round seed leaves on a short stem."
	],
	[
		"First leaf",
		16,
		"A single round first leaf on its stalk, then the first leaf of three."
	],
	[
		"Creeping",
		40,
		"Stolons run out over the soil, rooting at every node, a leaf of three at each."
	],
	[
		"Mat",
		70,
		"A mat of leaves on long stalks, every leaflet with a pale chevron; pink nodules on the roots fixing nitrogen."
	],
	[
		"Flowering",
		90,
		"Round white flower heads on stalks taller than the leaves, the bees at them all day."
	],
	[
		"Full flower",
		105,
		"Heads everywhere over the mat, the oldest florets folding down."
	],
	[
		"Setting seed",
		120,
		"The florets brown and hang, tiny pods inside them."
	],
	[
		"Seed",
		140,
		"Brown, dry heads full of seed; the mat creeps on, feeding the soil with its nitrogen."
	]
]))();
/** a clover leaflet: broadest beyond its middle, rounded at the tip */
const obovate = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 1.25)), .55) * (u > .94 ? .8 : 1);
/**
* White clover at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function clover(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const at = v3(0, -.003, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.0013, 7e-4, .001),
		coat: "#d8b84a",
		coatShade: "#a8883a",
//#piece 4534a19c2051c957dd45bd39d08f4140599de57f4843fa2f5f256d24f772eb6b
		radius: 5e-4 + 6e-4 * span(g, 1, 4),
		stemColor: "#8aa05a",
		leaf: {
			length: .005,
			width: .0028,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .6),
			color: "#6aa046",
			vein: "#a6c47e"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.5),
		wither: span(g, 4, 5)
	});
	noduled(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(0, -1, 0),
		length: .16,
		grown: table(g, [
			[0, 0],
			[.3, .03],
			[1, .15],
			[2, .3],
			[4, .7],
			[6, 1]
		]),
		radius: .0012,
		nodules: 14,
		laterals: 6,
		age: span(g, 3, 6)
	});
	/** @type {(() => void)[]} */
	const later = [];
	if (g > 2.3) later.push(() => trefoil(bag, seed, ["first"], s.top, .035, .6, clamp((g - 2.3) / .6), true, g));
	for (let i = 0; i < 5; i++) {
		const born = 2.8 + i * .35;
		if (g <= born) break;
		const lr = chance(seed, "crown-leaf", i);
		const top = s.top.clone().add(v3(Math.cos(i * 2.4) * .006, 0, Math.sin(i * 2.4) * .006));
		later.push(() => trefoil(bag, seed, ["crown", i], top, between(lr, .05, .08) * vigour, i * 2.39996, clamp((g - born) / .7), false, g));
	}
	for (let k = 0; k < 6; k++) {
		const kr = chance(seed, "stolon", k);
		const born = 3.6 + k * .25 + kr() * .2;
		if (g <= born) break;
		const run = Math.min(.42, (g - born) * .11) * vigour * between(kr, .8, 1.1);
		stolon(bag, seed, ["s", k], s.top.clone().setY(.003), k * 2.39996 + kr() * .5, run, g, born, vigour, 0, later);
	}
	for (const f of later) f();
	return bag.build();
}
/**
* A stolon creeping over the soil from `from`: a node every few centimetres, rooting into the soil, a leaf up on its
* stalk, now and then a flower head, now and then a branch.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} from @param {number} head
* @param {number} run @param {number} g @param {number} born @param {number} vigour @param {number} order @param {(() => void)[]} later
*/
function stolon(bag, seed, key, from, head, run, g, born, vigour, order, later) {
	if (run < .01) return;
	const sr = chance(seed, "stolon-path", ...key);
	const step = .035;
	const pts = [from.clone()];
	let a = head;
	for (let s = step; s <= run + 1e-9; s += step) {
		a += (sr() - .5) * .5;
		const last = pts[pts.length - 1];
		pts.push(v3(last.x + Math.cos(a) * step, .0025, last.z + Math.sin(a) * step));
	}
	const rest = run - (pts.length - 1) * step;
	if (rest > .001) {
		const last = pts[pts.length - 1];
		a += (sr() - .5) * .5;
		pts.push(v3(last.x + Math.cos(a) * rest, .0025, last.z + Math.sin(a) * rest));
	}
	if (pts.length < 2) return;
	bag.add("body", tube(pts, (u) => .0014 * (1 - .3 * u), (u) => mix("#8a9a5a", "#b0c07a", u), 4));
	bag.space.rod(pts, .003);
	for (let i = 1; i < pts.length; i++) {
		const nr = chance(seed, "clover-node", ...key, i);
		const p = pts[i];
		const age = (run - i * step) / (.11 * vigour);
		const grown = clamp(age / .6);
		root(bag, {
			seed,
			key: [
				...key,
				"node",
				i
			],
			from: p.clone().add(v3(0, -.003, 0)),
			dir: v3(nr() - .5, -1, nr() - .5),
			length: between(nr, .05, .09),
			grown: age / 1.2,
			radius: 7e-4,
			down: .05,
			wander: .3,
			laterals: 3,
			lateral: .3,
			depth: 1,
			young: "#f6efdc",
			old: "#d8c49a"
		});
		const b = a + (i % 2 ? 1.2 : -1.2) + nr();
		later.push(() => trefoil(bag, seed, [...key, i], p, between(nr, .05, .1) * vigour, b, grown, false, g));
		if (order === 0 && i >= 2 && nr() < .3) {
			const bborn = born + i * step / (.11 * vigour) + .5;
			if (g > bborn) stolon(bag, seed, [
				...key,
				"b",
				i
			], p, b + (nr() - .5), Math.min(.2, (g - bborn) * .1) * vigour, g, bborn, vigour, 1, later);
		}
		if (i >= 2 && nr() < .4) {
			const opens = Math.max(5.5, born + i * step / (.11 * vigour) + 1.4) + nr() * .5;
			if (g > opens - .6) later.push(() => flowerHead(bag, seed, [
				...key,
				"head",
				i
			], p, b + .8, between(nr, .11, .16) * vigour, g, opens));
		}
	}
}
/**
* A clover leaf on its stalk: three leaflets spread level at its top (or one round one, the first leaf), each marked
* with a pale chevron; folded together while young.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} at @param {number} height
* @param {number} bear @param {number} grown @param {boolean} single @param {number} g
*/
function trefoil(bag, seed, key, at, height, bear, grown, single, g) {
	if (grown <= .02) return;
	const lr = chance(seed, "trefoil", ...key);
	const h = height * lerp(.3, 1, grown);
	const lean = v3(Math.cos(bear), 0, Math.sin(bear)).multiplyScalar(h * .25);
	const top = at.clone().add(v3(lean.x, h, lean.z));
	bag.add("body", tube([
		at,
		at.clone().add(v3(lean.x * .3, h * .6, lean.z * .3)),
		top
	], () => 7e-4, () => "#8aa860", 3));
	const fold = (1 - grown) * .9;
	const old = span(g, 8.4, 9.6) * lr() * .6;
	const size = (single ? .008 : .0135) * about(lr, 1, .12) * lerp(.4, 1, grown);
	const mark = lr() < .85;
	const n = single ? 1 : 3;
	for (let k = 0; k < n; k++) {
		const a = bear + k / 3 * Math.PI * 2 + about(lr, 0, .1);
		const dir = v3(Math.cos(a), lerp(1.4, .12, grown), Math.sin(a)).normalize();
		bag.add("sheet", sheet({
			length: size,
			width: size * (single ? .6 : .45),
			shape: single ? (u) => Math.pow(Math.sin(Math.PI * u), .5) : obovate,
			lift: (u, v) => fold * Math.abs(v) * .4 + .04 * v * v,
			paint: (u, v) => mix("#3f7a32", "#b8a84a", old).lerp(new three.Color("#d0e0c0"), mark && !single && Math.abs(u - (.4 + .3 * Math.abs(v))) < .07 ? .55 : 0),
			along: 5,
			across: 3
		}), aim(top, dir, 0));
	}
}
/**
* A white clover head: a ball of little florets on a long stalk, opening from the outside in, then folding down and
* browning as the seed sets.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} at @param {number} bear
* @param {number} height @param {number} g @param {number} opens
*/
function flowerHead(bag, seed, key, at, bear, height, g, opens) {
	const hr = chance(seed, "clover-head", ...key);
	const rise = span(g, opens - .6, opens);
	const h = height * lerp(.3, 1, rise);
	const lean = v3(Math.cos(bear), 0, Math.sin(bear)).multiplyScalar(h * .2);
	const top = at.clone().add(v3(lean.x, h, lean.z));
	bag.add("body", tube([
		at,
		at.clone().add(v3(lean.x * .2, h * .5, lean.z * .2)),
		top
	], () => 8e-4, () => "#8aa860", 3));
	const R = .0085 * lerp(.5, 1, rise);
	const florets = 34;
	for (let m = 0; m < florets; m++) {
		const t = m / florets;
		const phi = Math.acos(1 - 2 * t * .95), th = m * 2.39996;
		const out = v3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th));
		const open = span(g, opens + (1 - t) * .1 - .1, opens + .3 + (1 - t) * .3);
		const over = span(g, opens + 1.2 + t * 1.2, opens + 1.6 + t * 1.2);
		const d = out.clone().lerp(v3(out.x * .4, -1, out.z * .4), over).normalize();
		const c = over > .2 ? mix("#e8dcc8", "#8a6a4a", over) : open < .3 ? mix("#c8d8b0", "#f0f2e8", open) : mix("#f6f6ee", "#f0d8dc", hr() * .4);
		bag.add("body", bead(top.clone().addScaledVector(d, R * .75), v3(.001, .0034, .001).multiplyScalar(lerp(.6, 1, open)), c, 2, new three.Quaternion().setFromUnitVectors(v3(0, 1, 0), d)));
	}
//#piece 69f1d3d6a1a9ba606895e988f6b2d3bf22c7c85e9e9f4295855e80951be3b7da
	id: "clover",
	label: "White clover",
	latin: "Trifolium repens · Weißklee",
	note: "Stolons creeping over the soil and rooting at every node; leaves of three with a pale chevron, round white flower heads, pink nodules on the roots fixing nitrogen.",
	from: "Ground · perennial",
	stages: CLOVER_STAGES,
	grow: clover
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

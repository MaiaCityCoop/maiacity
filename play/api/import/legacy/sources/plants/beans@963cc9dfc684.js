//#piece 693245eec24e4da3790df47da8269873aa7f5742253bfa856c596ae3a92c8344
//#region src/lib/plants/allies.js
//#piece 7a25f2109e096e20f06a334a7773102f06cf92bed7a8ee956d0be8dbbb58bf4e
//#piece 127d531099cd5093908afe56662cb19703f9e02b0a641dce94c49e6e7544a213
	}
}

//#endregion
//#region src/lib/plants/beans.js
const BEAN_STAGES = [
	{
		name: "Bean",
		day: 0,
		note: "A big kidney-shaped bean, mottled purple and black, five centimetres down in warm soil after the last frost."
	},
	{
		name: "Germination",
		day: 7,
		note: "The root goes down; a hooked shoot pushes up — the bean itself, its two halves full of food, stays below."
	},
	{
		name: "First leaves",
		day: 12,
		note: "A pair of simple, heart-shaped leaves, opposite each other, at the top of the shoot."
	},
	{
		name: "Trifoliate",
		day: 20,
		note: "The first leaf of three leaflets; the tip already circling, feeling for something to climb."
	},
	{
		name: "Climbing",
		day: 35,
		note: "Winding anticlockwise up its cane, a leaf of three at every node."
	},
	{
		name: "Flowering",
		day: 60,
		note: "Long sprays of pea-like flowers from the leaf axils, opening from the bottom up, bumblebees at them."
	},
	{
		name: "Pods set",
		day: 67,
		note: "Most flowers drop; behind a few, thin green pods."
	},
	{
		name: "Young pods",
		day: 75,
		note: "Slender pods a hand long — the best for picking, before the beans show."
	},
	{
		name: "Long pods",
		day: 85,
		note: "Rough green pods twenty and thirty centimetres long, hanging in bunches: pick them and more come."
	},
	{
		name: "Picking",
		day: 95,
		note: "Picking every few days; a pod left on swells lumpy with its beans and yellows, to keep for seed."
	}
];
const SEED_AT = /* @__PURE__ */ (() => v3(0, -.05, 0))();
const CANE = /* @__PURE__ */ (() => v3(.07, 0, .02))();
const CANE_TOP = 2.2;
/** the twining: round the cane, so many radians a metre up, anticlockwise from above */
const TWIST = /* @__PURE__ */ (() => Math.PI * 2 / .17)();
/** a bean leaflet: broad at the base, drawn out to a point */
const leafletShape = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .62)), .7) * (u > .8 ? 1 - (u - .8) * 2.2 : 1) * (u < .05 ? .3 + u * 14 : 1);
/** the first leaves: heart-shaped */
const heartShape = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .55)), .65);
/**
* The runner bean at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g
* @param {string} seed
*/
function beans(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .07);
	const white = chance(seed, "bean-flower")() < .25;
	const s = sprout(bag, {
		seed,
		at: SEED_AT,
		size: v3(.012, .007, .0085),
		coat: "#5a2a4a",
		coatShade: "#2a1424",
		stem: table(g, [
			[0, 0],
			[.4, .003],
			[1, .06],
			[1.6, .085],
			[9, .09]
		]),
		hook: table(g, [
			[0, 1],
			[1.1, 1],
			[1.6, 0]
		]),
		radius: .0018 + .0018 * span(g, 1.5, 5),
		stemColor: "#6a8a3a",
//#piece a7d54288d49ea41d5b8e967ba42770c1c0661f72df133404fcf9e3877d7f3282
	if (g < 5.5) {
		const mr = chance(seed, "mottle");
		for (let k = 0; k < 6; k++) bag.add("body", bead(SEED_AT.clone().add(v3(between(mr, -.009, .009), between(mr, -.003, .004), between(mr, -.006, .006))), v3(.003, .0025, .003).multiplyScalar(1 - span(g, 4, 5.5) * .4), "#c8a0c0", 3));
	}
	noduled(bag, {
		seed,
		key: ["tap"],
		from: SEED_AT.clone(),
		dir: v3(0, -1, 0),
		length: .5,
		grown: table(g, [
			[0, 0],
			[.4, .03],
			[1, .12],
			[2, .3],
			[4, .7],
			[6, 1]
		]),
		radius: .0025,
		nodules: 18,
		laterals: 10,
		age: span(g, 3, 6)
	});
	if (g >= 2.5) bag.add("prop", tube([CANE.clone().add(v3(0, -.25, 0)), CANE.clone().add(v3(0, CANE_TOP, 0))], (u) => .0075 * (1 - .3 * u), (u) => mix("#c8a865", "#d9c08a", Math.abs(Math.sin(u * 50)) < .07 ? 0 : 1), 8));
	const space = bag.space;
	space.rod([CANE.clone(), CANE.clone().add(v3(0, CANE_TOP, 0))], .012);
	const H = table(g, [
		[1.4, 0],
		[2, .03],
		[3, .2],
		[4, .75],
		[5, 1.65],
		[6, 2.15],
		[7, 2.32],
		[9, 2.4]
	]) * vigour;
	const phase = chance(seed, "bean-vine")() * Math.PI * 2;
	const start = s.top.clone();
	/** the vine at height h: from the seedling over to the cane, then round and round it; over the top, leaning off */
	const vineAt = (h) => {
		const to = clamp((h - .08) / .25);
		const e = to * to * (3 - 2 * to);
		const a = phase + h * TWIST;
		const ring = .0115 + .003 * Math.sin(h * 9 + phase);
		const over = Math.max(0, h - CANE_TOP + .02);
		return v3(lerp(start.x, CANE.x + Math.cos(a) * ring, e) + over * .6, start.y + Math.min(h, 2.18) + over * .4 - over * over * 2, lerp(start.z, CANE.z - Math.sin(a) * ring, e));
	};
	if (H < .002) return bag.build();
	const steps = Math.max(2, Math.ceil(H / .012));
	const pts = [];
	for (let k = 0; k <= steps; k++) pts.push(vineAt(k / steps * H));
	bag.add("body", tube(pts, (u) => (.0026 + .0018 * span(g, 3, 7)) * (1 - .6 * u) * vigour, (u) => mix("#5a7a34", "#8ab05a", u), 5));
	space.rod(pts, .004);
	/** @type {(() => void)[]} */
	const leaves = [];
	const first = span(g, 1.6, 2.4);
	if (first > 0) {
		const p = vineAt(.012);
		for (const side of [-1, 1]) {
			const out = v3(side, 0, .3).normalize();
			leaves.push(() => {
				const o = space.steer(p, out, .1, .09, .02);
				leaflet(bag, p, o, .085 * vigour * lerp(.35, 1, first), lerp(.25, 1.15, first), heartShape, .75, span(g, 6, 8) * .8);
			});
		}
	}
	const nodes = 15;
	for (let n = 1; n < nodes; n++) {
		const h = .04 + n * .155;
		if (H < h + .01) break;
		const nr = chance(seed, "bean-node", n);
		const p = vineAt(h);
		const radial = p.clone().sub(CANE).setY(0);
		if (radial.lengthSq() < 1e-8) radial.set(1, 0, 0);
		radial.normalize();
		const out = radial.clone().applyAxisAngle(v3(0, 1, 0), (n % 2 ? .6 : -.6) + about(nr, 0, .25));
		const grown = clamp((H - h) / .3);
		const old = n < 4 ? span(g, 7.5 + n * .3, 9.6) : 0;
		leaves.push(() => trifoliate(bag, seed, ["leaf", n], p, out, .26 * vigour * about(nr, 1, .08), grown, old));
		if (n >= 3) raceme(bag, seed, n, p, out.clone().applyAxisAngle(v3(0, 1, 0), n % 2 ? -1.1 : 1.1), g, white, vigour, H - h);
	}
	for (const leaf of leaves) leaf();
	return bag.build();
}
/**
* One leaflet (or a first simple leaf) from `at`, reaching out along `out` (level) at `tilt` from upright.
* @param {Bag} bag @param {THREE.Vector3} at @param {THREE.Vector3} out @param {number} len @param {number} tilt
* @param {(u: number) => number} shape @param {number} wide @param {number} old
*/
function leaflet(bag, at, out, len, tilt, shape, wide, old) {
	const dir = out.clone().setY(0).normalize().multiplyScalar(Math.sin(tilt)).add(v3(0, Math.cos(tilt), 0)).normalize();
	bag.add("sheet", sheet({
		length: len,
		width: len * wide * .5,
		shape,
		lift: (u, v) => .05 * v * v - (.1 + old * .15) * u * u,
		paint: (u, v) => mix("#3a7230", "#c8b84a", clamp(old * 1.2 - (1 - u) * .3)).lerp(new three.Color("#8ab868"), Math.abs(v) < .07 ? .35 : Math.abs(Math.sin(u * 9 - Math.abs(v) * 3)) > .95 ? .2 : 0),
		along: 9,
		across: 4
	}), aim(at, dir, 0));
}
/**
* A leaf of three on its long stalk from the node at `at`: the stalk out and up, the two side leaflets at its end, the
* end one a little further on its own short stalk; folded and upright while young.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} at @param {THREE.Vector3} out
* @param {number} size @param {number} grown @param {number} old
*/
function trifoliate(bag, seed, key, at, out, size, grown, old) {
	if (grown <= .02) return;
	const lr = chance(seed, "trifoliate", ...key);
	const reach = size * lerp(.3, 1, grown);
	const o = bag.space.steer(at, out, .45, reach, .03);
	const stalk = reach * .45;
	const d = o.clone().multiplyScalar(.8).add(v3(0, lerp(1.6, .45, grown) - old * .4, 0)).normalize();
	const mid = at.clone().addScaledVector(d, stalk * .55).add(v3(0, stalk * .08, 0));
	const end = at.clone().addScaledVector(d, stalk);
	const tip = end.clone().addScaledVector(o, reach * .12).add(v3(0, reach * .02, 0));
	bag.add("body", tube([
		at,
		mid,
		end,
		tip
	], (u) => .0016 * (1 - .4 * u), () => mix("#6a9a42", "#b8a84a", old), 4));
	const len = .13 * size / .26 * lerp(.3, 1, grown);
	const tilt = lerp(.35, between(lr, 1.35, 1.6), grown) + old * .3;
	leaflet(bag, tip, o, len, tilt, leafletShape, .68, old);
	const across = v3(-o.z, 0, o.x);
	for (const side of [-1, 1]) leaflet(bag, end, across.clone().multiplyScalar(side).addScaledVector(o, .5), len * .85, tilt + .1, leafletShape, .62, old);
}
/**
* A flower spray from the axil at `at`: its long stalk out from the vine, flowers along its end opening from the
* bottom up, and a pod hanging behind each of the few that set.
* @param {Bag} bag @param {string} seed @param {number} n @param {THREE.Vector3} at @param {THREE.Vector3} out
* @param {number} g @param {boolean} white @param {number} vigour @param {number} above how far the tip has grown past the node
*/
function raceme(bag, seed, n, at, out, g, white, vigour, above) {
	const rr = chance(seed, "raceme", n);
	const opens = 4.6 + n * .12 + rr() * .2;
	if (g < opens - .5 || above < .35) return;
	const rise = span(g, opens - .5, opens);
	const len = .14 * vigour * lerp(.3, 1, rise);
	const d = out.clone().setY(0).normalize().add(v3(0, .35, 0)).normalize();
	const pts = [
		at.clone(),
		at.clone().addScaledVector(d, len * .5),
		at.clone().addScaledVector(d, len).add(v3(0, -len * .08, 0))
	];
	bag.add("body", tube(pts, (u) => .0014 * (1 - .3 * u), () => "#6a9a42", 4));
	const flowers = 7;
	const keep = 1 + Math.floor(rr() * 3);
	for (let k = 0; k < flowers; k++) {
		const fr = chance(seed, "bean-flower", n, k);
		const t = .55 + .45 * (k / 6);
		const p = pts[1].clone().lerp(pts[2], (t - .5) * 2);
		const a = k * 2.39996;
		const side = v3(Math.cos(a), 0, Math.sin(a));
		const open = span(g, opens + k * .16, opens + k * .16 + .15);
		const fall = span(g, opens + k * .16 + .45, opens + k * .16 + .6);
		const set = k < keep ? span(g, opens + k * .16 + .5, opens + k * .16 + 2.4) : 0;
		const ped = p.clone().addScaledVector(side, .008).add(v3(0, -.004, 0));
		if (set < .02 && fall >= 1) continue;
		bag.add("body", tube([p, ped], () => 7e-4, () => "#6a9a42", 3));
		if (set < .02) {
			flower(bag, ped, side.clone().addScaledVector(d, .4).normalize(), white, open, fall);
			continue;
		}
		const L = (.03 + .25 * set) * vigour * about(fr, 1, .08);
		const W = (.002 + .0075 * set) * vigour;
		const left = n < 6 && k === 0 ? span(g, 8.3, 9.4) : 0;
		const place = bag.space.settle(ped, v3(side.x * .2, -1, side.z * .2), (c, dd) => [
			.15,
			.4,
			.65,
			.9
		].map((f) => ({
			c: c.clone().addScaledVector(dd, L * f),
			r: W * 1.3
		})), .03);
		bag.fruit([n, k], p, place.dir);
		bag.add("body", tube([
			p,
			ped,
			place.at
		], () => .0012, () => "#6a9a42", 3));
		const m = new three.Matrix4().compose(place.at, new three.Quaternion().setFromUnitVectors(v3(0, -1, 0), place.dir), v3(1, 1, 1));
		const bend = fr() < .5 ? -1 : 1;
		const axis = [];
		for (let q = 0; q <= 20; q++) {
			const u = q / 20;
			axis.push(v3(bend * L * .12 * u * u, -.002 - u * L, 0));
		}
		const lumps = 5 + Math.floor(fr() * 3);
		bag.add("body", tube(axis, (u, v) => W * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .03 + u * .99))), .3) * (u > .92 ? 1 - (u - .92) * 6 : 1) * (.5 + .5 * Math.abs(Math.cos(v * Math.PI * 2))) * (1 + left * .35 * Math.pow(Math.abs(Math.sin(u * Math.PI * lumps)), 2)), (u, v) => mix(mix("#7ab04a", "#4a8a30", set), "#c8b860", left).lerp(new three.Color("#2f6a24"), Math.pow(Math.abs(Math.sin(u * 90 + v * 30)), 30) * .4), 8), m);
		bag.fruitDone();
	}
}
/**
* A pea-like flower: the broad standard petal up behind, two wings either side, the keel curled between them, in a
* little green calyx; opening, then dropping.
* @param {Bag} bag @param {THREE.Vector3} at @param {THREE.Vector3} facing @param {boolean} white @param {number} open @param {number} fall
*/
function flower(bag, at, facing, white, open, fall) {
	const f = facing.clone().setY(0).normalize();
	bag.add("body", bead(at, v3(.003, .003, .003), "#5f8a3a", 3));
	if (fall >= 1) return;
	const size = lerp(.45, 1, open) * (1 - fall * .3);
	const colour = white ? "#f6f4ea" : mix("#e8403a", "#d82018", open);
	const keel = white ? "#ecece0" : "#c81e1e";
	if (open < .05) {
		bag.add("body", bead(at.clone().addScaledVector(f, .004), v3(.003, .004, .003).multiplyScalar(size), mix(colour, "#8aa860", .4), 3));
		return;
	}
	const up = f.clone().multiplyScalar(-.3).add(v3(0, 1, 0)).normalize().lerp(v3(0, -1, 0), fall * .5);
	bag.add("sheet", sheet({
		length: .013 * size,
		width: .008 * size,
		shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .6),
		lift: (u, v) => -.15 * v * v + .08 * u,
		paint: (u) => mix(colour, white ? "#fffff8" : "#f05a3a", u * .3),
		along: 4,
		across: 3
	}), aim(at.clone().add(v3(0, .002, 0)), up, Math.PI / 2));
	const across = v3(-f.z, 0, f.x);
	for (const s of [-1, 1]) bag.add("sheet", sheet({
		length: .01 * size,
		width: .0035 * size,
		shape: (u) => Math.sin(Math.PI * Math.pow(u, .7)),
		paint: () => colour,
		along: 3,
		across: 2
	}), aim(at, f.clone().addScaledVector(across, s * .5).add(v3(0, -.15 - fall, 0)).normalize(), s * .6));
	bag.add("body", bead(at.clone().addScaledVector(f, .006 * size).add(v3(0, -.001, 0)), v3(.0055, .0025, .0025).multiplyScalar(size), keel, 3, new three.Quaternion().setFromUnitVectors(v3(1, 0, 0), f)));
//#piece 69f1d3d6a1a9ba606895e988f6b2d3bf22c7c85e9e9f4295855e80951be3b7da
	id: "beans",
	label: "Runner bean",
	latin: "Phaseolus coccineus · Feuerbohne",
	note: "The bean stays below; the shoot winds anticlockwise up its cane, leaves of three, sprays of scarlet (or white) flowers, long green pods hanging in bunches.",
	from: "Vine · 95 days",
	stages: BEAN_STAGES,
	grow: beans
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

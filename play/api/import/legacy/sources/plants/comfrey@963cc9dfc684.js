//#piece a4b00dedf01ce385ddb2af68f1e0dfa88b67384fb73e668e321169e61d0b758d
//#region src/lib/plants/allies.js
//#piece a82999158b30fb3a0ed82921acc6a52ffefd907f320d529c20896aaa58977963
const COMFREY_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Root cutting",
		0,
		"A finger of comfrey root, black outside and white inside, laid five centimetres down in spring."
	],
	[
		"Sprouting",
		14,
		"Buds break from its top; white roots from all along it."
	],
	[
		"First leaves",
		30,
		"A few bristly, pointed leaves, rough to touch."
	],
	[
		"Rosette",
		70,
		"Big lance leaves on winged stalks, spreading from the crown; the root turning black and going down."
	],
	[
		"Clump",
		365,
		"Its second spring: a dense clump of leaves half a metre long; the taproot a metre down."
	],
	[
		"Flowering stems",
		400,
		"Winged, bristly stems rise a metre from the clump, branching at the top."
	],
	[
		"Buds",
		415,
		"At every tip a curled cyme like a scorpion’s tail, packed with buds."
	],
	[
		"Flowering",
		430,
		"The cymes uncurl as their bells open one by one, nodding, a bumblebee at each."
	],
	[
		"Full bloom",
		450,
		"Bells all along the uncurled cymes; the lowest leaves yellowing."
	],
	[
		"Chop and drop",
		460,
		"Cut to a hand high and laid round it as mulch, feeding the soil; new leaves are up within days."
	]
]))();
/** a comfrey leaf: long, broad at the middle, drawn out to a point, running down its stalk as a wing */
const comfreyLeaf = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .8) * (u < .1 ? .25 + u * 7.5 : 1);
/** the bells: purple most often, pink-violet, or cream */
const BELLS = [
	["#6a2f7a", "#9a5aa8"],
	["#b0609a", "#d898c0"],
	["#e8e0b8", "#f4f0d8"]
];
/**
* Comfrey at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function comfrey(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const crown = v3(0, -.012, 0);
	const cut = [];
	for (let k = 0; k <= 6; k++) cut.push(v3(-.03 + k * .01, -.05 - Math.sin(k * .5) * .004, .005 * Math.sin(k)));
	bag.add("body", tube(cut, (u) => .0065 * (.7 + .3 * Math.sin(Math.PI * (.1 + .8 * u))), () => "#2a2420", 6));
	for (let i = 0; i < 4; i++) {
		const rr = chance(seed, "comfrey-tap", i);
		const a = i * 2.39996;
		root(bag, {
			seed,
			key: ["tap", i],
			from: v3(-.02 + i * .012, -.05, 0),
			dir: v3(Math.cos(a) * .25, -1, Math.sin(a) * .25),
			length: (i === 0 ? 1.1 : between(rr, .45, .8)) * vigour,
			grown: table(g, [
				[.4, 0],
				[1, .06],
				[2, .15],
				[3, .35],
				[4, .75],
				[5, .9],
				[7, 1]
			]) - i * .08,
			radius: i === 0 ? .004 + .012 * span(g, 2, 6) : .003 + .006 * span(g, 3, 7),
			down: .05,
			wander: .15,
			laterals: 8,
			lateral: .3,
			depth: 2,
			age: span(g, 1.5, 5),
			young: "#f2ece0",
			old: "#1e1a18"
		});
	}
	const cutDown = g >= 8.6;
	const space = bag.space;
	const colours = BELLS[(() => {
		const c = chance(seed, "bells")();
		return c < .6 ? 0 : c < .82 ? 1 : 2;
	})()];
	/** @type {(() => void)[]} */
	const later = [];
	const stems = 4 + Math.floor(chance(seed, "stems")() * 3);
	for (let s = 0; s < stems; s++) {
		const sr = chance(seed, "comfrey-stem", s);
		const born = 4.3 + s * .12 + sr() * .2;
		if (g <= born) break;
		const rise = span(g, born, born + 1.1);
		const H = (.85 + .25 * sr()) * vigour * rise;
		const a = s * 2.39996 + sr() * .5;
		const lean = between(sr, .08, .3);
		const out = v3(Math.cos(a), 0, Math.sin(a));
		if (cutDown) {
			const lie = out.clone().applyAxisAngle(v3(0, 1, 0), .4);
			const from = out.clone().multiplyScalar(.12).setY(.004);
			bag.add("body", tube([from, from.clone().addScaledVector(lie, H * .95)], () => .0045, () => "#5a6a3a", 5));
			bag.add("body", tube([v3(out.x * .02, 0, out.z * .02), v3(out.x * .025, .06, out.z * .025)], () => .005, () => "#5f7a3a", 5));
			continue;
		}
		const pts = [];
		for (let m = 0; m <= 10; m++) {
			const t = m / 10;
			pts.push(v3(out.x * (.02 + Math.sin(lean) * H * t * (.6 + .4 * t)), H * t, out.z * (.02 + Math.sin(lean) * H * t * (.6 + .4 * t))));
		}
		bag.add("body", tube(pts, (u) => .0055 * (1 - .5 * u) * lerp(.5, 1, rise), () => "#5f8a3a", 5));
		space.rod(pts, .008);
		for (let j = 0; j < 6; j++) {
			const t = .18 + j * .11;
			const lg = clamp((rise - t) / .3);
			if (lg <= 0) continue;
			const p = pts[Math.round(t * 10)];
			const b = a + (j % 2 ? 2.2 : -2.2) + sr() * .3;
			const size = (.22 - .022 * j) * vigour;
			later.push(() => {
				const o = space.steer(p, v3(Math.cos(b), 0, Math.sin(b)), .3, size, .02);
				leaf(bag, p, o, size * lerp(.4, 1, lg), lerp(.25, .95, lg), span(g, 8, 8.6) * (j < 2 ? 1 : 0), 0);
			});
		}
		const forks = 2 + Math.floor(sr() * 2);
		for (let f = 0; f < forks; f++) {
			const fr = chance(seed, "comfrey-fork", s, f);
			const from = pts[f === 0 ? 10 : 8];
			const fa = a + (f - 1) * 1.6 + fr() * .4;
			const end = from.clone().add(v3(Math.cos(fa) * .06 * rise, .04 * rise, Math.sin(fa) * .06 * rise));
			if (f > 0) bag.add("body", tube([from, end], () => .0025, () => "#5f8a3a", 4));
			cyme(bag, seed, [s, f], f === 0 ? from : end, v3(Math.cos(fa), 0, Math.sin(fa)), g, born, colours);
		}
	}
	const basal = 16;
	for (let i = 0; i < basal; i++) {
		const born = 1.6 + i * (i < 6 ? .35 : .22);
		if (g <= born) break;
		const lr = chance(seed, "comfrey-leaf", i);
		const grown = clamp((g - born) / 1.3);
		const bear = i * 2.39996 + about(lr, 0, .2);
		const out = v3(Math.cos(bear), 0, Math.sin(bear));
		const size = (.14 + .32 * clamp(i / 7)) * vigour * about(lr, 1, .08) * (g < 4 ? lerp(.6, 1, clamp((g - 2) / 2)) : 1);
		if (cutDown) {
			const d = .12 + i % 4 * .06 + lr() * .05;
			const lay = out.clone().applyAxisAngle(v3(0, 1, 0), about(lr, 0, .5));
			bag.add("sheet", sheet({
				length: size,
				width: size * .17,
				shape: comfreyLeaf,
				lift: (u, v) => .01 * v * v + .004 * Math.sin(u * 30 + v * 5),
				paint: (u) => mix("#4a5a2e", "#6a5a30", lr() * .6 + u * .2),
				along: 10,
				across: 4
			}), aim(out.clone().multiplyScalar(d).setY(.003 + i % 5 * .0012), lay, 0));
			continue;
		}
		const old = span(g, 7.6 + i * .12, 8.6) * (i < 5 ? 1 : 0);
		const tilt = lerp(.2, between(lr, .75, 1.05), grown) + old * .35;
		const at = crown.clone().addScaledVector(out, .01);
		later.push(() => {
			const o = space.steer(at.clone().add(v3(0, .05, 0)), out, Math.PI / 2 - tilt, size, .03);
			leaf(bag, at, o, size * lerp(.3, 1, grown), tilt, old, .28 * size);
		});
	}
	if (cutDown) for (let i = 0; i < 7; i++) {
		const lr = chance(seed, "comfrey-regrowth", i);
		const grown = clamp((g - 8.6 - i * .03) / .4);
		const bear = i * 2.39996;
		leaf(bag, crown.clone().add(v3(Math.cos(bear) * .012, 0, Math.sin(bear) * .012)), v3(Math.cos(bear), 0, Math.sin(bear)), (.06 + .08 * grown) * about(lr, 1, .1) * vigour, lerp(.15, .55, grown), 0, .03);
	}
	for (const f of later) f();
	return bag.build();
}
/**
* A comfrey leaf: on its winged stalk (`stalk` long, none for a stem leaf) from `at`, reaching out along `out`
* (level) at `tilt` from upright, bristly and net-veined, yellowing as it gets `old`.
* @param {Bag} bag @param {THREE.Vector3} at @param {THREE.Vector3} out @param {number} size @param {number} tilt @param {number} old @param {number} stalk
*/
function leaf(bag, at, out, size, tilt, old, stalk) {
	const dir = out.clone().setY(0).normalize().multiplyScalar(Math.sin(tilt)).add(v3(0, Math.cos(tilt), 0)).normalize();
	let base = at;
	if (stalk > 0) {
		base = at.clone().addScaledVector(dir, stalk);
		bag.add("body", tube([
			at,
			at.clone().addScaledVector(dir, stalk * .5).add(v3(0, stalk * .08, 0)),
			base
		], (u) => .004 * (1 - .3 * u), () => mix("#6a9a46", "#b8a04a", old), 4));
	}
	const blade = dir.clone().add(v3(0, -.15, 0)).normalize();
	bag.add("sheet", sheet({
		length: size,
		width: size * .17,
		shape: comfreyLeaf,
		lift: (u, v) => .06 * v * v - (.16 + old * .2) * u * u + .006 * Math.sin(u * 34) * Math.sin(v * 7),
		paint: (u, v) => mix("#3f6a2e", "#c8b04a", clamp(old * 1.3 - (1 - u) * .2)).lerp(new three.Color("#8aa86a"), Math.abs(v) < .07 ? .45 : Math.abs(Math.sin(u * 16 - Math.abs(v) * 4)) > .93 ? .25 : 0).lerp(new three.Color("#a8b098"), .08),
		along: 14,
		across: 4
	}), aim(base, blade, 0));
}
/**
* A curled cyme: a coiled stalk, its bells hanging from the outside of the coil, opening from its base toward the
* curled tip as it uncurls.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} from @param {THREE.Vector3} out
* @param {number} g @param {number} born @param {string[]} colours
*/
function cyme(bag, seed, key, from, out, g, born, colours) {
	const cr = chance(seed, "cyme", ...key);
	const buds = span(g, born + .7, born + 1.4);
	if (buds <= 0) return;
	const uncurl = span(g, 6, 8.3);
	const len = .075 * lerp(.35, 1, buds) * lerp(.7, 1.1, uncurl);
	const curl = lerp(4.2, 1.6, uncurl);
	const n = 12;
	const pts = [from.clone()];
	const side = out.clone();
	for (let k = 1; k <= n; k++) {
		const t = k / n;
		const a = Math.pow(t, 1.6) * curl;
		const step = len / n;
		const prev = pts[k - 1];
		pts.push(prev.clone().addScaledVector(side, Math.cos(a) * step * (1 + .3 * cr())).add(v3(0, Math.sin(a + .6) * step, 0)));
	}
	bag.add("body", tube(pts, (u) => .0018 * (1 - .5 * u), () => "#6a8a3a", 4));
	const bells = 11;
	for (let k = 0; k < bells; k++) {
		const t = (k + .5) / bells;
		const f = t * n, i = Math.min(11, Math.floor(f));
		const p = pts[i].clone().lerp(pts[i + 1], f - i);
		const open = span(g, 6.1 + t * 2.2, 6.4 + t * 2.2);
		const drop = span(g, 7.8 + t * 1.6, 8.1 + t * 1.6);
		const hang = v3((cr() - .5) * .5, -1, (cr() - .5) * .5).addScaledVector(out, .35).normalize();
		const calyx = p.clone().addScaledVector(hang, .004);
		bag.add("body", tube([p, calyx], () => 7e-4, () => "#6a8a3a", 3));
		bag.add("body", bead(calyx, v3(.0025, .0022, .0025), "#5f7a3a", 3));
		if (drop >= 1) continue;
		const L = lerp(.006, .016, open);
		const end = calyx.clone().addScaledVector(hang, L);
		const [deep, pale] = colours;
		bag.add("body", tube([
			calyx,
			calyx.clone().lerp(end, .5),
			end
		], (u) => lerp(.0022, lerp(.0028, .0042, open), u) * (1 - drop * .5), (u) => mix(open < .3 ? "#d890b0" : deep, pale, u * .6 * open), 6));
	}
//#piece 69f1d3d6a1a9ba606895e988f6b2d3bf22c7c85e9e9f4295855e80951be3b7da
	id: "comfrey",
	label: "Comfrey",
	latin: "Symphytum officinale · Beinwell",
	note: "A clump of big bristly leaves over a deep black taproot; stems of curled cymes uncurling as their nodding purple bells open; cut and laid down as mulch, again and again.",
	from: "Herb · perennial",
	stages: COMFREY_STAGES,
	grow: comfrey
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

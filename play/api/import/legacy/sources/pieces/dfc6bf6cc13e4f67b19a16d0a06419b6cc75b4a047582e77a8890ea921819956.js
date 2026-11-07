/**
* @param {Sort} sort
* @param {number} g
* @param {string} seed
*/
function grow(sort, g, seed) {
//#piece a92fb2fed60fdca61956e261dede4951505a72726283bd34b7169f5cd55d1ad7
		size: v3(.0016, 5e-4, .0014),
		coat: "#d8c39a",
		coatShade: "#b39a6a",
		stem: table(g, [
			[0, 0],
			[.3, 8e-4],
			[1, .011],
			[2, .034],
			[3, .04],
			[9, .042]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.5, 0]
		]),
		radius: 9e-4 + .0035 * span(g, 2, 6),
		stemColor: "#6f8f45",
		leaf: {
			length: .026,
			width: .0038,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .9)), .8),
			color: "#4f8a35",
			vein: "#9cc277"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.6),
		wither: span(g, 4.6, 5.6)
	});
	root(bag, {
		seed,
		key: ["taproot"],
		from: SEED_AT.clone(),
		dir: v3(.03, -1, 0),
		length: .45,
		grown: table(g, [
			[0, 0],
			[.35, .006],
			[1, .05],
			[2, .14],
			[3, .3],
			[4, .6],
			[5, .85],
			[7, 1]
		]),
		radius: .0022,
		down: .04,
		wander: .15,
		laterals: 0,
		depth: 0,
		age: span(g, 2, 6),
		young: "#f7f1e0",
		old: "#c9ab82"
	});
	const lr = chance(seed, "laterals");
	for (let i = 0; i < 30; i++) {
		const at = .005 + i * .011 + lr() * .005;
		const born = 1.3 + i * .13;
		const bear = i * 2.39996 + lr() * .5;
		root(bag, {
			seed,
			key: ["lateral", i],
			from: SEED_AT.clone().add(v3(0, -at, 0)),
			dir: v3(Math.cos(bear), -.45, Math.sin(bear)),
			length: between(lr, .12, .26) * vigour,
			grown: (g - born) / 2.5,
			radius: .0011,
			down: .05,
			wander: .32,
			laterals: 7,
			lateral: .3,
			depth: 2,
			age: (g - born - 1) / 3,
			young: "#f6efdc",
			old: "#c4a37a"
		});
	}
	for (let i = 0; i < 10; i++) {
		const ar = chance(seed, "adventitious", i);
		const born = 4 + i * .12;
		const bear = ar() * Math.PI * 2;
		root(bag, {
			seed,
			key: ["stem", i],
			from: v3(0, -.004 - ar() * .02, 0),
			dir: v3(Math.cos(bear), -.3, Math.sin(bear)),
			length: between(ar, .1, .2),
			grown: (g - born) / 2,
			radius: .001,
			down: .06,
			wander: .3,
			laterals: 5,
			depth: 1,
			age: (g - born - 1) / 3,
			young: "#f6efdc",
			old: "#c8a77c"
		});
	}
	const space = bag.space;
	if (g >= 3.6) space.rod([STAKE.clone(), STAKE.clone().add(v3(0, sort.stake, 0))], .008);
	if (g >= 3.6) bag.add("prop", tube([STAKE.clone().add(v3(0, -.25, 0)), STAKE.clone().add(v3(0, sort.stake, 0))], (u) => .0055 * (1 - .3 * u), (u) => mix("#c8a865", "#d9c08a", Math.abs(Math.sin(u * 60)) < .06 ? 0 : 1), 8));
	const L = table(g, sort.height) * vigour;
	if (L > .002) stem(bag, sort, seed, s.top, L, g, vigour, space);
	return bag.build();
}
/**
* The stem: up the cane in a slight zigzag (node to node), its leaves, its trusses.
* @param {Bag} bag @param {Sort} sort @param {string} seed @param {THREE.Vector3} start @param {number} L @param {number} g @param {number} vigour
* @param {Space} space
*/
function stem(bag, sort, seed, start, L, g, vigour, space) {
	const vr = chance(seed, "stem");
	const step = .02;
	const pts = [start.clone()];
	for (let s = step; s <= 2.1; s += step) {
		const toStake = clamp(s / .2);
		const zig = Math.sin(s * 40 + vr() * .4) * .006;
		pts.push(v3(lerp(start.x, STAKE.x - .012, toStake) + zig, start.y + s * .985, lerp(start.z, STAKE.z + .006, toStake) + zig * .5));
	}
//#piece abd66e2b14c0816ee5ea03f5234a04e7a2b6857d1d435f9eb5e08da5a425b76d
	const thick = .0022 + .0042 * span(g, 3, 7);
	bag.add("body", tube(now, (u) => thick * (1 - .6 * Math.pow(u, 2)), (u) => mix("#5f7f3a", "#86ae55", u), 7));
	space.rod(now, thick + .004);
	/** the leaves wait until the fruit hang, then turn away from them @type {(() => void)[]} */
	const leaves = [];
	const at = (s) => {
		const f = Math.min(pts.length - 1.001, s / step), k = Math.floor(f);
		return pts[k].clone().lerp(pts[k + 1], f - k);
	};
	let s = .025;
	let truss = 0;
	for (let i = 0; i < NODES; i++) {
		const nr = chance(seed, "node", i);
		s += i === 0 ? 0 : between(nr, .055, .075);
		const past = L - s;
		if (past <= 0) break;
		const p = at(s);
		const bear = i * 2.4 + about(nr, 0, .25);
		const out = v3(Math.cos(bear), 0, Math.sin(bear));
		const size = lerp(.35, 1, clamp(i / 6)) * about(nr, 1, .1) * vigour;
		const old = i < 4 ? span(g, 6.8 + i * .25, 8.2 + i * .25) : 0;
		const lift = between(nr, sort.lift[0], sort.lift[1]);
		if (old < 1) leaves.push(() => pinnate(bag, {
			seed,
			key: ["leaf", i],
			at: p,
			out: space.steer(p, out, lift - sort.droop, .34 * size, sort.leaflet.width * size * .7),
			lift,
			length: .34 * size,
			pairs: i < 2 ? 1 : i < 4 ? 2 : i < 7 ? 3 : 4,
			between: i >= 3,
			leaflet: {
				length: sort.leaflet.length * size,
				width: sort.leaflet.width * size,
				shape: sort.leaflet.shape,
				colour: "#3c7230",
				young: "#6aa84a",
				vein: "#8fbf6e"
			},
			droop: sort.droop,
			curl: sort.curl,
			grown: clamp(past / .2),
			old,
			stalk: "#6f9a45",
			radius: .0016 * size + 6e-4,
			terminal: 1.15
		}));
		if (i >= 6 && (i - 6) % 3 === 0) {
			trussAt(bag, sort, seed, truss, p, out.clone().applyAxisAngle(v3(0, 1, 0), Math.PI * .8), g, past, vigour, space);
			truss++;
		}
	}
	for (const leaf of leaves) leaf();
	bag.add("body", bead(now[now.length - 1], v3(1, 1.3, 1).multiplyScalar(.004), "#86b85a"));
}
/** a tomato flower: six yellow petals bent back into a star, the anthers a yellow cone */
const FLOWER = {
	petals: 6,
	length: .011,
	width: .0028,
	colour: "#f2d22a",
	heart: "#e6bf1a",
	cone: true,
	flat: .55,
	sepals: 6,
	sepal: .008,
	sepalBack: .4,
	sepalColour: "#5a8a35",
	shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .5)), .6) * (1 - .4 * u)
};
/**
* A truss: a stalk out and down from the stem, its flowers along it on jointed pedicels, nodding; then its fruit,
* growing heavy, the whole truss hanging.
* @param {Bag} bag @param {Sort} sort @param {string} seed @param {number} t which truss, from the bottom @param {THREE.Vector3} at
* @param {THREE.Vector3} out @param {number} g @param {number} past how far the stem has grown past it @param {number} vigour
* @param {Space} space
*/
function trussAt(bag, sort, seed, t, at, out, g, past, vigour, space) {
	const tr = chance(seed, "truss", t);
	const born = 4.3 + t * .55 + tr() * .1;
	if (g <= born || past < .04) return;
	const grown = clamp((g - born) / .5);
	const heavy = span(g, born + 1.2, born + 2.4);
	const len = sort.truss * lerp(.3, 1, grown) * about(tr, 1, .15);
	/** @type {THREE.Vector3[]} */
	const pts = [];
	let d = out.clone().multiplyScalar(.8).add(v3(0, .45 - heavy * .7, 0)).normalize();
	let p = at.clone();
	for (let k = 0; k <= 10; k++) {
		pts.push(p.clone());
		d = d.clone().add(v3(0, -.06 - heavy * .06, 0)).normalize();
		p = p.clone().addScaledVector(d, len / 10);
	}
	bag.add("body", tube(pts, (u) => .0018 * (1 - .4 * u), () => "#6c9442", 5));
	const flowers = sort.fruits[0] + Math.floor(tr() * (sort.fruits[1] + 1));
	for (let k = 0; k < flowers; k++) {
		const fr = chance(seed, "tomato-flower", t, k);
		const opens = born + .35 + k * .1 + fr() * .05;
		const f = lerp(.25, 1, k / Math.max(1, flowers - 1)) * 10, kk = Math.min(9, Math.floor(f));
		const base = pts[kk].clone().lerp(pts[kk + 1], f - kk);
		const side = new three.Vector3().crossVectors(d, v3(0, 1, 0)).normalize().multiplyScalar(k % 2 ? 1 : -1);
		const set = span(g, opens + .5, opens + .5 + sort.setFor);
		const double = sort.double && t === 0 && k === 0;
		const pd = side.multiplyScalar(.5).add(v3(0, -.6 - set * .4, 0)).addScaledVector(d, .2).normalize();
		const end = base.clone().addScaledVector(pd, .018 * lerp(.4, 1, clamp((g - born) / .4)));
		if (g < opens || set < .03) bag.add("body", tube([base, end], () => 8e-4, () => "#6c9442", 4));
		if (g < opens) {
			const b = clamp((g - born) / Math.max(.05, opens - born));
			bag.add("body", bead(end.clone().addScaledVector(pd, .003), v3(.0018, .004, .0018).multiplyScalar(.5 + b * .5), mix("#7fae4a", "#d8d05a", b * .6)));
		} else if (set < .03) bloom(bag, FLOWER, end, pd, double ? 1.9 : 1.35, clamp((g - opens) / .2), span(g, opens + .3, opens + .5));
		else {
			const size = vigour * (double ? 1.3 : k < 4 ? 1 : .8) * about(fr, 1, .1);
			const place = space.settle(end, v3(0, -1, 0).lerp(pd, .25), (a, d) => sort.balls(a, d, size, set), .04);
			bag.fruit([t, k], base, place.dir);
			bag.add("body", tube([
				base,
				end,
				place.at
			], () => 8e-4 + 8e-4 * set, () => "#6c9442", 4));
			sort.fruit({
				bag,
				seed,
				key: [t, k],
				at: place.at,
				dir: place.dir,
				size,
				set,
				ripe: span(g, opens + sort.ripeFrom, opens + sort.ripeFrom + sort.ripeFor)
			});
			bag.fruitDone();
		}
	}
}
/**

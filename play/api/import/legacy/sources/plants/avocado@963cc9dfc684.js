//#piece e2273cb9ac978e8f68d22acf6d3a11d5c4d6c9802eacc29c10ae8848d0a454d7
//#piece df665bccd53464841fffc45b7cf3b2ddc7fb169fc8245692b7227496de1d9407
//#piece dcbf96dddb66aa38fd96ad90ce7a877a27359df179de3c34334377c79d7b37fc
//#region src/lib/plants/avocado.js
const UP = /* @__PURE__ */ (() => v3(0, 1, 0))();
/** the tree's age in years at g (its stages: the stone … day 60, 365, 1500, 2200 … 2650) */
const YEARS = [
	[1.2, 0],
	[2, .16],
	[3, 1],
	[4, 4.1],
	[5, 6],
	[6, 6.05],
	[7, 6.4],
	[8, 6.85],
	[9, 7.1]
];
/** the stem's height through the years: a leggy first year, then slower as it spreads */
const LEADER = [
	[0, 0],
	[.16, .3],
	[1, .95],
	[2, 1.75],
	[3, 2.45],
	[4, 3.05],
	[5, 3.55],
	[6, 3.95],
	[7.2, 4.25]
];
//#piece 541eb5c6850df86a529a627dfe16859adcca90891d5865f8ed551bc58742d230
/** when (in years) the stem had reached the height h */
//#piece 0e44c9e8f40a4161fed6e4a61bc07d0363751d1266bff3524431861d6717e9da
}
//#piece 0bd6b64895d91649a40e95f87369b25e6569e23a0d012b57a6e97faa0f43169c
	const pr = chance(seed, "avo-tree");
	const vigour = about(pr, 1, .07);
	const env = {
		c: v3(about(pr, 0, .2), 2.35 * vigour, about(pr, 0, .2)),
		rx: 2.45 * vigour * about(pr, 1, .07),
		rz: 2.45 * vigour * about(pr, 1, .07),
		up: 2.35 * vigour,
		down: 2.1 * vigour
//#piece 91ca1a5dd69cfea6a9923617546f923afb26dc4923464e6e6ab262b84d9538ad
	};
	/** a branch's way, step by step: rising at first, then arching out and over, wandering a little @param {Chance} r */
//#piece 321140f51b4cb4601a6be393224b0c3a2649929a85f62114f574fb85e0eab730
//#piece 3caf9b13e85d8d5b548fcb87d01c8a602f44ec24e4f264da0a7e712348c6cc2b
	const tr = chance(seed, "avo-trunk");
//#piece f51601e16d88e6baa5068aee4f715c54935f51a70270f9a2ab1102845ddda13d
		born: 0,
		rate: 1,
		kids: [],
		panicle: null
	};
	trunk.dirs = way(tr, v3(about(tr, 0, .03), 1, about(tr, 0, .03)), 24, .01, 0, .035);
//#piece 07cfc464127c1a8d846226cd15fb1ab7f00acb462e2a5e1ed3093abbc2a10966
	/** a branch off `parent`; `shape` how it rises, arches over and wanders */
	const branch = (parent, key, s, d, order, full, born, shape) => {
		const r = chance(seed, "avo-branch", ...key);
		const n = order === 1 ? 12 : order === 2 ? 7 : 3;
//#piece 0db24018cb693dd03f4fb03515a4d395db7a21ad5ba5fac515fcfa4ad3d7a434
			rate: order === 1 ? .95 : order === 2 ? .75 : order === 3 ? .55 : .6,
			kids: [],
			panicle: null
		};
		parent.kids.push(b);
		starts.set(b, point(parent, s));
		return b;
	};
	let s = .5 + tr() * .2;
	let turn = tr() * Math.PI * 2;
	let k = 0;
	while (s < top - .4) {
		turn += 2.4 + about(tr, 0, .3);
		const h = s / top;
		const d = leave(dirAt(trunk, s), lerp(1.3, .5, Math.sqrt(h)) * about(tr, 1, .1), turn);
		const p = point(trunk, s);
		const full = clamp(edge(p, d) * about(tr, .95, .05) + (h < .4 ? .5 : 0), .5, 3.4);
		branch(trunk, ["limb", k], s, d, 1, full, madeAt(trunk, s) + .2, [
			.03 * h,
			.14 + (1 - h) * .3,
			.07
		]);
		s += (h < .35 ? .2 : .33) * about(tr, 1, .3);
		k++;
	}
	/** @param {Branch} b */
	const furnish = (b) => {
		const r = chance(seed, "avo-laterals", ...b.key);
		const kidOrder = b.order + 1;
		const spacing = kidOrder === 2 ? .2 : .11;
		let s = kidOrder === 2 ? Math.max(.35, b.full * .22) : .08;
		let k = 0;
		let phyl = r() * Math.PI * 2;
		while (s < b.full - .08) {
			phyl += 2.4 + about(r, 0, .4);
			const d0 = leave(dirAt(b, s), between(r, .7, 1.1), phyl);
			d0.y = kidOrder === 2 ? d0.y * .4 : d0.y * .5 + .25;
//#piece 6ad5a21e356f6b15d3f88eb3829cf31a30f4dd16c6d739344ebf1d2364ae828d
			if (!(inward && r() < .7)) {
				const room = edge(p, d0) * between(r, kidOrder === 2 ? .55 : .4, kidOrder === 2 ? .95 : .8) * (inward ? .5 : 1);
				const full = clamp(room, kidOrder === 2 ? .25 : .1, kidOrder === 2 ? 1.6 : .45);
				const low = clamp(1 - p.y / 1.8);
				const shape = kidOrder === 2 ? [
					.02,
					.16 + low * .45,
					.12
				] : [
					.06,
					.1 + low * .2,
					.18
				];
				const kid = branch(b, [...b.key, k], s, d0, kidOrder, full, madeAt(b, s) + .3 + r() * .4, shape);
				if (kidOrder === 2) furnish(kid);
			}
			k++;
			s += spacing * about(r, 1, .25);
		}
		if (b.order === 1) {
			let s2 = b.full * .5 + r() * .1;
			let j = 0;
			while (s2 < b.full - .1) {
				phyl += 2.4 + about(r, 0, .4);
				const d0 = leave(dirAt(b, s2), between(r, .6, 1), phyl);
				d0.y = d0.y * .5 + .25;
				d0.normalize();
				branch(b, [
					...b.key,
					"shoot",
					j
				], s2, d0, 3, clamp(edge(point(b, s2), d0) * .6, .1, .4), madeAt(b, s2) + .3 + r() * .3, [
					.06,
					.1,
					.18
				]);
				j++;
				s2 += .15 * about(r, 1, .3);
			}
		}
	};
	for (const b of [...trunk.kids]) furnish(b);
	const tips = [];
	const gather = (b) => {
		if (b.order >= 2 && !b.kids.some((kid) => kid.at > b.full - .1)) tips.push(b);
		for (const kid of b.kids) gather(kid);
	};
	gather(trunk);
	for (const b of tips) {
		const reached = Math.min(b.full, (5.9 - b.born) * b.rate);
		if (reached < .08) continue;
		const p = point(b, reached);
		const o = v3((p.x - env.c.x) / env.rx, (p.y - env.c.y) / (p.y > env.c.y ? env.up : env.down), (p.z - env.c.z) / env.rz).length();
		if (o < .6) continue;
		const r = chance(seed, "avo-panicle", ...b.key);
		if (r() > .8) continue;
		const k = r();
		b.panicle = {
			keep: k < .2 + .12 * clamp((o - .8) / .2) ? 1 : k < .27 + .12 * clamp((o - .8) / .2) ? 2 : 0,
			key: [...b.key, "panicle"]
		};
		b.full = reached;
		b.kids = b.kids.filter((kid) => kid.at < reached - .02);
		const d = dirAt(b, b.full).clone().setY(dirAt(b, b.full).y * .4 + .3).normalize();
		const flush = branch(b, [...b.key, "flush"], b.full, d, 4, between(r, .12, .22), 6.05, [
			.05,
			.08,
			.12
		]);
		flush.rate = .5;
	}
	if (TREES.size > 24) TREES.delete(TREES.keys().next().value);
	TREES.set(seed, trunk);
	return trunk;
}
/** a leaf: a stalk of 2–4 cm, then an elliptic to obovate blade, broadest beyond its middle, drawn out to a point */
const LEAF = (u) => {
	if (u < .13) return .05;
	const t = (u - .13) / .87;
	return Math.max(.03, Math.pow(Math.sin(Math.PI * Math.pow(t, .92)), .72) * (1 - .3 * span(t, .72, 1)));
};
/** the colours, made once */
const C = /* @__PURE__ */ (() => ({
	dark: new three.Color("#1c4419"),
	mid: new three.Color("#264f22"),
	light: new three.Color("#36612b"),
	under: new three.Color("#8ea486"),
	bronze: new three.Color("#8f4a2a"),
	flushGreen: new three.Color("#8fa24a"),
	rib: new three.Color("#cfc684"),
	scale: new three.Color("#7a7046"),
	barkYoung: new three.Color("#5f7c3a"),
	barkMid: new three.Color("#6f6f4e"),
	barkOld: new three.Color("#77695a"),
	ridge: new three.Color("#8e8270"),
	furrow: new three.Color("#3b322a"),
	lenticel: new three.Color("#a49a7c"),
	axis: new three.Color("#a3a650"),
	bud: new three.Color("#bdb860"),
	flower: new three.Color("#e3dc8e"),
	spent: new three.Color("#8a7a44"),
	stalk: new three.Color("#6c7a34"),
	button: new three.Color("#58662e"),
	fruitSet: new three.Color("#5f8c33"),
	fruitGreen: new three.Color("#33521f"),
	pebbleGreen: new three.Color("#4d6b2c"),
	fruitDark: new three.Color("#2b1b25"),
	pebbleDark: new three.Color("#3e2a34"),
	c: new three.Color()
}))();
/**
* The avocado tree, v2.
* @param {number} g @param {string} seed
*/
function avocado$1(g, seed) {
	const bag = new Bag();
	const space = bag.space;
	const at = v3(0, -.025, 0);
	const Y = linear(g, YEARS);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.021, .027, .021),
		coat: "#9a6a44",
		coatShade: "#5e3c24",
		stem: linear(g, [
			[0, 0],
			[.3, .0035000000000000005],
			[1, .055],
			[2, .095],
			[9, .095]
		]),
		hook: linear(g, [
			[0, 1],
			[1, 1],
			[1.6, 0]
		]),
		radius: .003 + .005 * span(g, 1, 3),
		stemColor: "#6e6a34",
//#piece 580fb6fa1acbd20d25e5df0c0f280055646ab76a1e545c0ee71e4e59b1cfe749
		length: 1.1,
		grown: linear(g, [
			[0, 0],
			[.3, .008],
			[1, .06],
			[2, .16],
			[3, .4],
			[4, .75],
			[5, .9],
			[8, 1]
		]),
		radius: .004 + .045 * span(g, 2, 8),
		down: .03,
		wander: .14,
		laterals: 8,
		lateral: .3,
		depth: 2,
		age: span(g, 1.5, 6),
		young: "#f0dcc0",
		old: "#6a4a30"
	});
	for (let i = 0; i < 22; i++) {
		const rr = chance(seed, "avo-feeder", i);
		const born = 2.4 + i * (4 / 22);
		const bear = i * 2.39996 + rr() * .4;
		root(bag, {
			seed,
			key: ["feeder", i],
			from: at.clone().add(v3(0, -.03 - rr() * .08, 0)),
			dir: v3(Math.cos(bear), -.06, Math.sin(bear)),
			length: between(rr, .6, 1) * 2.6,
			grown: (g - born) / 2.6,
			radius: .003 + .02 * span(g, 3, 8),
			down: .006,
			wander: .16,
			laterals: 7,
			lateral: .22,
			depth: 2,
			age: (g - born - .6) / 2.5,
			young: "#ecd8b6",
			old: "#6a4a30"
		});
	}
	if (Y <= 0) return bag.build();
	const tree = design(seed);
	const base = s.top.clone();
	const bloom = span(g, 4.5, 4.75) * (1 - span(g, 5.25, 5.7));
	const set = span(g, 5.6, 8);
	const late = span(g, 8.2, 9);
	/** @type {{ pts: THREE.Vector3[], key: (string | number)[], made: (s: number) => number, order: number, seedling: boolean }[]} */
	const leafy = [];
	/** @type {{ at: THREE.Vector3, dir: THREE.Vector3, panicle: Panicle }[]} */
	const panicles = [];
//#piece 3f4f6da43ea16020a648250ad7171179daa5d3d0b9dacbd1ed37128bdab6a5dc
		const R = b.order === 0 ? .006 + .115 * Math.pow(clamp(Y / 7), 1.25) : b.order === 1 ? .004 + .055 * Math.sqrt(length / 3) * clamp(age / 4.5) : b.order === 2 ? .0035 + .015 * Math.sqrt(length / 1.4) * clamp(age / 3) : .003 + .0025 * clamp(length / .3);
//#piece 6b066ee91178897b86c56e4441d9a37ec7736eae567335a3764786db1fe73874
		const taper = b.order === 0 ? .72 : .62;
		const furrows = (u, v) => Math.sin(v * Math.PI * 2 * 8 + Math.sin(u * L * 2.3 + v * 9) * 1.3 + Math.sin(u * L * 9) * .25);
		const paint = (u, v) => {
			const wood = Y - made(u);
			const c = wood < 1.5 ? C.c.lerpColors(C.barkYoung, C.barkMid, clamp(wood / 1.5)) : C.c.lerpColors(C.barkMid, C.barkOld, clamp((wood - 1.5) / 2));
			if (wood < 2.5 && Math.sin(u * L * 140 + v * 17) * Math.sin(v * Math.PI * 2 * 5 + u * L * 31) > .93) c.lerp(C.lenticel, .6);
			if (b.order <= 1 && wood > 2.5) {
				const old = clamp((wood - 2.5) / 2.5) * (b.order === 0 ? 1 : .6);
				const f = furrows(u, v);
				c.lerp(f < -.55 ? C.furrow : f > .5 ? C.ridge : C.barkOld, old * (f < -.55 ? .8 : .45));
			}
			return c.clone();
		};
		const radius = (u, v) => {
			let r = Math.max(.0025, R * (1 - taper * u));
			if (b.order === 0) {
				const foot = Math.pow(1 - Math.min(1, u * L / .4), 2.5);
				r *= 1 + foot * (.25 + .12 * Math.cos(v * Math.PI * 2 * 4));
				if (Y > 3) r *= 1 + .025 * clamp((Y - 3) / 2) * furrows(u, v);
			}
			return r;
		};
		const sides = b.order === 0 ? 28 : b.order === 1 ? 8 : b.order === 2 ? 5 : 4;
		bag.add("body", tube(b.order === 0 ? fine(pts) : pts, radius, paint, sides));
		if (b.order <= 2) for (let i = 0; i + 1 < pts.length; i++) space.rods.push({
//#piece c483e4726cb16a375c9cc5c0e72bab7b43c9abcc10f8ce96549792b8a9595cb0
		leafy.push({
			pts,
			key: b.key,
			made: (s) => made(s / L),
			order: b.order,
			seedling: b.order === 0 && Y < 1.6
		});
		for (const kid of b.kids) {
			if (kid.at > length + 1e-6) continue;
			const w = where(Math.min(kid.at, L));
			draw(kid, w.p.clone().addScaledVector(kid.dirs[0], kid.order === 4 ? 0 : w.r * .6));
		}
		if (b.panicle && L >= b.full - 1e-4) panicles.push({
			at: pts[pts.length - 1].clone(),
			dir: pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize(),
			panicle: b.panicle
		});
	};
	draw(tree, base);
	const crowd = new Space();
	crowd.rods = space.rods;
	for (const pn of panicles) {
		const r = chance(seed, "avo-flowers", ...pn.panicle.key);
		if (bloom > .01) {
			const n = 3 + Math.floor(r() * 3);
			const open = clamp((g - 4.6) / .25);
			for (let k = 0; k < n; k++) {
				const a = k / n * Math.PI * 2 + r();
				const side = new three.Vector3().crossVectors(pn.dir, Math.abs(pn.dir.y) > .95 ? v3(1, 0, 0) : UP).normalize().applyAxisAngle(pn.dir, a);
				const d = pn.dir.clone().multiplyScalar(.5).addScaledVector(side, .85).add(v3(0, .25, 0)).normalize();
				const len = between(r, .07, .13) * lerp(.4, 1, clamp((g - 4.45) / .3)) * bloom;
				const end = pn.at.clone().addScaledVector(d, len).add(v3(0, -len * len * 2, 0));
				bag.add("body", tube([
					pn.at,
					pn.at.clone().lerp(end, .5).add(v3(0, len * .08, 0)),
					end
				], (u) => .0022 * (1 - .6 * u), () => C.axis, 3));
				for (let m = 0; m < 5; m++) {
					const u = .25 + m * .17;
					const t = new three.Vector3().crossVectors(d, UP).normalize().applyAxisAngle(d, m * 2.4 + a);
					const q = pn.at.clone().lerp(end, u).addScaledVector(t, .008 * (1 - u * .5));
					bag.add("body", bead(q, v3(.009, .006, .009).multiplyScalar(lerp(.6, 1, open) * (1 - u * .35)), open > .4 ? C.flower : C.bud, 2));
				}
			}
		}
		if (g < 5.55 || pn.panicle.keep === 0) continue;
		for (let k = 0; k < pn.panicle.keep; k++) {
			const kr = chance(seed, "avo-fruit", ...pn.panicle.key, k);
			const size = about(kr, 1, .1) * (pn.panicle.keep > 1 ? .93 : 1);
			const grow = lerp(.12, 1, set);
			const neck = between(kr, .62, .86);
			const stout = between(kr, .9, 1.12);
			const Lf = .095 * size * grow / Math.sqrt(stout), Wf = .034 * size * grow * Math.sqrt(stout);
			const fullL = .095 * size / Math.sqrt(stout), fullW = .034 * size * Math.sqrt(stout);
			const stalk = between(kr, .04, .07);
			const flat = pn.dir.clone().setY(0);
			if (flat.lengthSq() < 1e-4) flat.set(1, 0, 0);
			flat.normalize().applyAxisAngle(UP, (k - (pn.panicle.keep - 1) / 2) * 1.4 + about(kr, 0, .5));
			const from = pn.at.clone().addScaledVector(pn.dir, -.02);
			const shape = (a, d) => [.35, .7].map((t) => ({
				c: a.clone().addScaledVector(d, fullL * t),
				r: fullW * .95
			}));
			/** @type {{ balls: { c: THREE.Vector3, r: number }[], cost: number, data: { at: THREE.Vector3, dir: THREE.Vector3, out: THREE.Vector3 } }[]} */
			const options = [];
			for (const [turn, lean, cost] of [
				[
					0,
					.15,
					0
				],
				[
					.6,
					.15,
					.004
				],
				[
					-.6,
					.15,
					.004
				],
				[
					1.2,
					.2,
					.008
				],
				[
					-1.2,
					.2,
					.008
				],
				[
					0,
					.4,
					.01
				],
				[
					2,
					.2,
					.014
				],
				[
					-2,
					.2,
					.014
				],
				[
					Math.PI,
					.25,
					.02
				]
			]) {
				const out = flat.clone().applyAxisAngle(UP, turn);
				const end = from.clone().addScaledVector(out, stalk * .45).add(v3(0, -stalk * .85, 0));
				const dir = v3(0, -1, 0).addScaledVector(out, lean).normalize();
				options.push({
					balls: shape(end, dir),
					cost,
					data: {
						at: end,
						dir,
						out
					}
				});
			}
			const place = crowd.best(options);
			const at = place.at.clone().add(v3(0, stalk * .85 * (1 - lerp(.6, 1, set)), 0));
			bag.fruit([...pn.panicle.key, k], from, place.dir);
			const bow = from.clone().addScaledVector(place.out, stalk * .45);
			const curve = [
				0,
				.2,
				.4,
				.6,
				.8,
				1
			].map((t) => from.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(bow, 2 * t * (1 - t)).addScaledVector(at, t * t));
			bag.add("body", tube(curve, (u) => (.0018 + .0035 * set) * (.75 + .5 * u * u), () => C.stalk, 5));
			bag.add("body", bead(at, v3(1, .8, 1).multiplyScalar(.003 + .0045 * set), C.button, 4));
			hass(bag, {
				at: at.clone().add(v3(0, -.002, 0)),
				dir: place.dir,
				L: Lf,
				W: Wf,
				neck,
				set,
				late: late * between(kr, .5, 1),
				r: kr,
				near: DETAIL.fruit === [...pn.panicle.key, k].join("|")
			});
			bag.fruitDone();
		}
	}
	const ageSize = lerp(.6, 1, clamp(Y / 2));
	for (const sh of leafy) {
		const lr = chance(seed, "avo-leaves", ...sh.key);
//#piece 0988be1ab7ee2b53e8d300045052b36bda76ad579505e46fb6213e15c0d35ef1
		let s = sh.order === 0 ? .03 : .02;
//#piece 7040c88410d4993b5ee11a2427f1989a7646698c62ae526d21cfaf1ec255c35e
			const leafAge = Y - sh.made(s);
			const toTip = (total - s) / .12;
			if (sh.seedling && s < total * .55) {
				if (s > .02) bag.add("sheet", sheet({
					length: .012,
					width: .004,
					shape: (u) => Math.sin(Math.PI * u),
					paint: () => C.scale,
					along: 2,
					across: 1
				}), aim(p, d.clone().add(new three.Vector3().crossVectors(d, UP).normalize().applyAxisAngle(d, phyl).multiplyScalar(.5)).normalize()));
				s += .035;
				continue;
			}
			if (toTip > 2.5 && (leafAge > 2.4 + lr() * .5 || sh.order <= 1 && Y > 2.5 && toTip > 6)) {
				s += .03;
				continue;
			}
			const young = clamp(1 - leafAge / .3);
			const size = ageSize * lerp(.5, 1, clamp(toTip * 1.2)) * between(lr, .75, 1.2) * lerp(1, .75, young * young);
			const out = new three.Vector3().crossVectors(d, Math.abs(d.y) > .95 ? v3(1, 0, 0) : UP).normalize().applyAxisAngle(d, phyl).clone().addScaledVector(d, .5).setY(0);
			if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
			out.normalize();
			const lift = lerp(between(lr, -.25, .25), -.95, young) + (toTip < 1 ? .25 * (1 - toTip) : 0);
			const dir = out.multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0));
			const len = .19 * size;
			bag.add("sheet", sheet({
				length: len,
				width: len * between(lr, .3, .42),
				shape: LEAF,
				lift: (u, v) => .045 * Math.abs(v) - (.06 + .1 * young) * u * u,
				paint: leafPaint(lr, young),
				along: 4,
				across: 2
			}), aim(p.clone().addScaledVector(dir, .004), dir, (lr() - .5) * .6));
			s += (sh.seedling ? .025 : .024) * about(lr, 1, .25);
		}
	}
	return bag.build();
}
/** the stem's path in more points, so its flare and its bark read */
function fine(pts) {
	const out = [pts[0]];
	for (let i = 1; i < pts.length; i++) {
		const n = i === 1 ? 10 : 5;
		for (let k = 1; k <= n; k++) out.push(pts[i - 1].clone().lerp(pts[i], k / n));
	}
	return out;
}
/** a leaf's colours: glossy dark green, a few turned to show their pale bluish undersides, the young flush bronze @param {Chance} r */
function leafPaint(r, young) {
	const tone = r();
	const ground = r() < .12 ? C.under.clone() : tone < .5 ? new three.Color().lerpColors(C.dark, C.mid, tone / .5) : new three.Color().lerpColors(C.mid, C.light, (tone - .5) / .5);
	const flush = young > .5 ? C.c.lerpColors(C.flushGreen, C.bronze, (young - .5) * 2) : C.c.copy(C.flushGreen);
	const c = ground.lerp(flush, clamp(young * 1.6));
	const rib = c.clone().lerp(C.rib, .4 * (1 - young));
	return (u, v) => u < .13 || Math.abs(v) < .08 ? rib : Math.abs((u * 9 - Math.abs(v) * 1.6) % 1) < .08 ? c.clone().lerp(C.rib, .15) : c;
}
/**
* A Hass avocado hanging from `at` along `dir`: pear- to egg-shaped, narrowest at the stalk, a little lopsided, its thick
* skin pebbly; bright green when it sets, then a dull dark green, and late in the season its sunny side purple-black.
* @param {Bag} bag
* @param {{ at: THREE.Vector3, dir: THREE.Vector3, L: number, W: number, neck: number, set: number, late: number, r: Chance, near: boolean }} o
*/
function hass(bag, o) {
//#piece 5197cb1b1a375fe872f6cec2ddaa83000d0ec1926cc031a0f0d7bdd9e73f6ea5
	const near = o.near;
	const rings = near ? 48 : 14, sides = near ? 44 : 12;
	const bend = about(r, 0, .05), lop = between(r, .02, .07), lopAt = r() * Math.PI * 2, sun = r() * Math.PI * 2;
	const axis = [];
	for (let k = 0; k <= rings; k++) {
		const u = k / rings;
		axis.push(v3(bend * Math.sin(Math.PI * u) * o.L, -u * o.L, 0));
	}
	const shoulder = lerp(.62, .42, (o.neck - .62) / .24);
	const profile = (u) => Math.pow(Math.max(0, Math.sin(Math.PI * clamp(u))), u > .5 ? .38 : .5) * lerp(o.neck, 1, span(u, .05, shoulder));
	/** the pebbles of the skin: small rounded bumps on a staggered grid, each its own size, set a little off its place */
	const N = 26, M = 22, salt = Math.floor(r() * 1e6);
	const jitter = (i, j, k) => {
		let h = Math.imul(salt ^ Math.imul(i + 7, 668265261) ^ Math.imul(j + 13, 374761393) ^ Math.imul(k + 3, 2654435761), 2246822507);
		h ^= h >>> 13;
		h = Math.imul(h, 3266489909);
		return ((h ^ h >>> 16) >>> 0) / 4294967296;
	};
	const pebble = (u, v) => {
		const y = u * M, row = Math.floor(y);
		let best = 0;
		for (const dr of [
			-1,
			0,
			1
		]) {
			const rr = row + dr;
			const x = v * N + (rr % 2 ? .5 : 0);
			const col = Math.floor(x);
			for (const dc of [
				-1,
				0,
				1
			]) {
				const cc = ((col + dc) % N + N) % N;
				const cx = col + dc + .5 + (jitter(rr, cc, 0) - .5) * .5, cy = rr + .5 + (jitter(rr, cc, 1) - .5) * .5;
				const big = .55 + .5 * jitter(rr, cc, 2);
				const d = Math.hypot(x - cx, y - cy) / big;
				best = Math.max(best, clamp(1 - d * 1.6));
			}
		}
		return Math.sqrt(best);
	};
	const height = .03 * o.W * lerp(.25, 1, o.set);
	const radius = (u, v) => {
		const side = 1 + lop * Math.cos(v * Math.PI * 2 - lopAt) * Math.sin(Math.PI * u);
		return Math.max(8e-4, o.W * profile(u) * side + (near && u > .04 && u < .97 ? (pebble(u, v) - .4) * height * Math.min(1, profile(u) * 2) : 0));
	};
	const paint = (u, v) => {
		const pb = near ? pebble(u, v) : .35 + .3 * Math.sin(u * 23 + v * 31) * Math.sin(v * 47 - u * 11);
		const sunny = clamp(o.late * (1.15 + .6 * Math.cos(v * Math.PI * 2 - sun)) - .15);
		const c = C.c.lerpColors(C.fruitSet, C.fruitGreen, span(o.set, .2, .8)).lerp(C.fruitDark, sunny);
		const tip = new three.Color().lerpColors(C.pebbleGreen, C.pebbleDark, sunny);
		return c.lerp(tip, pb * pb * .75).clone();
	};
	const geo = tube(axis, radius, paint, sides);
	if (near) smoothNormals(geo);
	bag.add("body", geo, m);
}

//#endregion
//#region src/lib/plants/bloom.js
//#piece a7ebf5d822b6a7838626a6419e1cfb02f4b384c1383e2faab2caf32a8d51eebe
*/
//#piece 86a3e0a862328e8f9189d41f45073f4a8b6d5f2a5b7bd3d4aad579c71aa0607a
*/
//#piece 3aa8a3325cba89450627ed12b870ff6fc0f7a8313c7005be60f3122b12eee86f
//#piece 053de1f973e12c149ed835d9d42437e7aea1e98579489ac332f3a68e58ba8f84
//#piece 963d49086fa6dcaa1b862ecf6e13bd03bc9ff76262f1ca6d1da996bdbc1491d9
const AVOCADO_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Stone",
		0,
		"The big avocado stone, five centimetres, set broad end down with its tip at the surface."
	],
	[
		"Germination",
		30,
		"The stone splits from its base; a thick root goes down, a shoot comes up between the halves — the seed leaves stay inside the stone."
	],
	[
		"Seedling",
		60,
		"A bare stem with little scale leaves, a tuft of big leaves at its top, bronze as they unfold."
	],
	[
		"Sapling",
		365,
		"A leggy young tree, a cluster of leaves at the tip of each flush, its first limbs breaking."
	],
	[
		"Young tree",
		1500,
		"A spreading young tree on a short trunk, strong limbs arching out and over, leaves crowded at the shoot tips."
	],
	[
		"Flowering",
		2200,
		"Clusters of panicles at the shoot tips, hundreds of small yellow-green flowers each."
	],
	[
		"Fruit set",
		2220,
		"Of all those flowers a panicle keeps one, rarely two; the shoot grows on out of it in a bronze flush."
	],
	[
		"Green fruit",
		2350,
		"Pear-shaped avocados hanging under the new leaves on long stalks that thicken toward the fruit."
	],
	[
		"Mature",
		2550,
		"Full-sized, 8–10 cm, the pebbly Hass skin dull dark green; they keep on the tree and ripen only once picked."
	],
	[
		"Late season",
		2650,
		"Left on the tree, the sunny side of the skin turns purple-black; picked, they soften within a week."
	]
]))();
/** its v1 (./orchard.js), kept for its versions; ./avocado.js grows its v2 */
const avocado = /* @__PURE__ */ (() => orchard({
	seed: {
		size: v3(.026, .03, .026),
		coat: "#8a5a3a",
		shade: "#5a3a24",
		depth: .02
	},
	hypogeal: true,
	flush: crown({
		trunk: 1,
		scaffolds: [3, 5],
		scaffoldAngle: .85,
		gens: 6,
		whorl: [2, 3],
		radius: .17,
		droop: .055,
		shoot: (gen) => [
			0,
			1.5,
			1.1,
			.8,
			.6,
			.48,
			.38
		][gen] ?? .35,
		bark: ["#7a8a5a", "#5a5044"]
	}),
	roots: {
		tap: 1.4,
		spread: 2.6,
		count: 18,
		radius: .05
	},
	leaf: {
		length: .2,
		width: .07,
		shape: ellipse,
		colour: "#2a5424",
		young: "#a04a3a",
		style: "whorl",
		per: 11,
		droop: .45
	},
	flower: {
		panicle: true,
		size: .8,
		opens: 4.7,
		sites: "tips",
		chance: .45,
		per: [1, 1]
	},
	fruit: {
		length: .11,
		width: .036,
		stalk: .09,
		keep: [1, 2],
		setFor: 2.2,
		ripeFrom: 3.4,
		ripeFor: .6,
		gloss: false,
		shape: (u, v) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .45) * (.5 + .5 * Math.pow(clamp(u * 1.35), 1.4)) * (1 + .03 * Math.sin(u * 70 + v * 50) * Math.sin(v * 41)),
		colour: (ripe, u, v) => mix("#3f6a2a", "#2a1a2a", ripe).lerp(new three.Color(ripe > .5 ? "#4a2a3a" : "#5a7a3a"), Math.pow(Math.abs(Math.sin(u * 70 + v * 50)), 8) * .35)
	}
//#piece 5e3be1cfe4b5fdf22613d25216f3609ab21a58fcb08af02e96d2ef3a94302ba5
	id: "avocado",
	label: "Avocado",
	latin: "Persea americana 'Hass' · Avocado",
	note: "From a big stone that splits open: a leggy stem, then strong limbs arching into a broad dome skirted to the ground; leaves crowded at the shoot tips, each flush bronze; panicles of tiny yellow-green flowers, and pear-shaped pebbly fruit hanging under the new leaves on long stalks.",
	from: "Tree · 7 years",
	stages: AVOCADO_STAGES,
	grow: avocado$1
//#piece 35171bffb608ead070eb23e7bc8d1d229032839d59049e6db39550def1097bf9
const HISTORY = /* @__PURE__ */ (() => ({ avocado: [{
	...FIRST,
	build: avocado
}, {
	v: 2,
	date: "2026-10-07",
	note: "Grown as an avocado grows: limbs arching into a skirted dome, bronze flushes, fruit hanging on long stalks under the new leaves"
//#piece 95a310e13553b7ae81407819aa70625e511d8f80bfa2c5053c9b0b4b6aba4ef5

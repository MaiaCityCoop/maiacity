//#piece e2273cb9ac978e8f68d22acf6d3a11d5c4d6c9802eacc29c10ae8848d0a454d7
//#piece 64f55215c6a55d5b9b7cd924998f878b3d3d74240133472701fa152a29fb36a1
*/
//#piece 86a3e0a862328e8f9189d41f45073f4a8b6d5f2a5b7bd3d4aad579c71aa0607a
*/
//#piece fc6e5bc6089dd1855f2d38761e09b28165bc0e528ef2fac7cfff31ce98f2d26a
//#piece fbe1b90fef0ccbd8d32714068626ec44c65ed525d45ea2f7fcf00a6e8db1dcb8
//#piece 70516de8070100c0b0cd2bce66b9510eff89c6dcd0818230b1e64c4f29bb9641
//#piece a960e8135ec7d62aee7bfd438c7445c32ec581bf7ca91ec744a95302aaa79e7d
//#piece 645eef4ac7037b985cd08a03bd958ba2337f8585f68007f6c53782c748a4c17e
//#piece 9b384ad759eb18fb556835bc58106c3d9ae808841aa36c25467d499082b1098b
const JACK_COLOUR = /* @__PURE__ */ (() => ripening("#6c9a3c", "#9fae46", "#c9b244"))();
const JACKFRUIT_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A pale brown seed three centimetres long, its slimy coat washed off, sown fresh."
	],
	[
		"Germination",
		15,
		"A root goes down, the shoot comes up; the fleshy seed leaves stay inside the seed below."
	],
	[
		"Seedling",
		45,
		"A slender green stem, its first leaves glossy and often two- or three-lobed; its sap white and sticky."
	],
	[
		"Sapling",
		365,
		"A straight leader a metre tall, its leaves now whole, its first side limbs breaking."
	],
	[
		"Young tree",
		1300,
		"A cone of near-level limbs round one straight trunk, big glossy leaves crowded at the shoot tips."
	],
	[
		"Flowering",
		2200,
		"A dense dome over a clear trunk; short leafy footstalks burst from the bark with club-shaped green flower heads."
	],
	[
		"Fruit set",
		2220,
		"The male heads blacken and drop; the female heads swell into small knobbly green fruit, right on the bark."
	],
	[
		"Green fruit",
		2300,
		"Huge oblong fruit hanging straight down against the trunk, knobbly with short blunt spines."
	],
	[
		"Ripening",
		2360,
		"The skin yellows, the spines flatten; it smells sweet."
	],
	[
		"Ripe",
		2380,
		"Ripe jackfruit, up to half a metre long and tens of kilograms, in clusters all up the trunk and along the limbs."
//#piece 2d3bbac24c7c1301788a02565439647fbc84c2a2ade09f2659616ad9e1590719
const JACKFRUIT = /* @__PURE__ */ (() => ({
	seed: {
		size: v3(.016, .009, .01),
		coat: "#c9a678",
		shade: "#8a6a44",
		depth: .03
	},
	hypogeal: true,
	flush: {
		trunk: 2,
		trunkBorn: 1.2,
		trunkFlush: 2.2,
		scaffolds: [4, 5],
		scaffoldAngle: .8,
		gens: 6,
		flush: .28,
		rest: .25,
		shoot: (gen) => [
			0,
			1.6,
			1.15,
			.85,
			.62,
			.48,
			.38
		][gen] ?? .35,
		whorl: [2, 3],
		spread: .6,
		up: .03,
		droop: .05,
		wander: .08,
		radius: .24,
		taper: .62,
		thicken: 4,
		bark: ["#857462", "#6a5a48"]
	},
	roots: {
		tap: 2,
		spread: 2.8,
		count: 18,
		radius: .07
	},
	leaf: {
		length: .16,
		width: .075,
		shape: ellipse,
		colour: "#2a4f22",
		young: "#7aa04a",
		style: "along",
		per: 0,
		droop: .25
	},
	flower: {
		catkin: true,
		size: 1,
		opens: 4.9,
		sites: "trunk",
		chance: 3,
		per: [1, 3]
	},
	fruit: {
		length: .45,
		width: .14,
		stalk: .06,
		keep: [1, 1],
		setFor: 2.3,
		ripeFrom: 3.1,
		ripeFor: .8,
		gloss: false,
		shape: (u, v) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .42) * (1 + .03 * Math.sin(v * Math.PI * 2 * 26) * Math.sin(u * 70)),
		colour: (ripe) => JACK_COLOUR(ripe),
		skin: {
			colour: (ripe) => ripe < .5 ? "#5f8a34" : "#a89a3a",
			count: 240,
			size: .006,
			length: 1.3
		}
	}
}))();
const jackfruit$1 = /* @__PURE__ */ (() => orchard$1(JACKFRUIT))();

//#endregion
//#region src/lib/plants/jackfruit.js
const UP = /* @__PURE__ */ (() => v3(0, 1, 0))();
/** the tree's age in years at g (its stages: the seed … day 45, 365, 1300, 2200 … 2380) */
const YEARS = [
	[1.2, 0],
	[2, .12],
	[3, 1],
	[4, 3.6],
	[5, 6],
	[6, 6.05],
	[7, 6.25],
	[8, 6.4],
	[9, 6.45]
];
/** the leader's height through the years: about a metre a year, slowing once it bears */
const LEADER = [
	[0, 0],
	[.12, .18],
	[1, 1.15],
	[2, 2.45],
	[3, 3.6],
	[4, 4.75],
	[5, 5.85],
	[6, 6.8],
	[6.5, 7.2]
];
/** the clear trunk: limbs set below it die off in the shade and fall, a couple of years after the crown closes over them */
const CLEAR = 2;
//#piece 860e94666d93a6d98381f2f31f939d69799e0c91c11e9ba997934ac21f78ba63
}
/** @typedef {() => number} Chance */
/**
* @typedef {{ s: number, out: THREE.Vector3, key: (string | number)[], female: boolean, keep: number, len: number }} Site
*   a footstalk `s` metres along its trunk or limb, breaking out of the bark along `out`; a female head (and the
*   fruit it keeps, 0 … 2) or a male one
* @typedef {{
*   key: (string | number)[], order: number, at: number, dirs: THREE.Vector3[], step: number, full: number, born: number,
*   rate: number, dies: number, kids: Branch[], sites: Site[], male: boolean
* }} Branch one branch as it will be when grown: `at` how far along its parent it starts, `dirs` the way each of its
*   steps goes, its full length, the year it breaks, how fast it grows (m a year) and the year it dies off
*/
//#piece 0bd6b64895d91649a40e95f87369b25e6569e23a0d012b57a6e97faa0f43169c
	const pr = chance(seed, "jack-tree");
	const vigour = about(pr, 1, .06);
	const env = {
		c: v3(about(pr, 0, .2), 4.5 * vigour, about(pr, 0, .2)),
		rx: 3.35 * vigour * about(pr, 1, .06),
		rz: 3.35 * vigour * about(pr, 1, .06),
		up: 3 * vigour,
		down: 2.75 * vigour
//#piece 91ca1a5dd69cfea6a9923617546f923afb26dc4923464e6e6ab262b84d9538ad
	};
	/** a branch's way, step by step: rising at first, then bowing out under its leaves, wandering a little @param {Chance} r */
//#piece 321140f51b4cb4601a6be393224b0c3a2649929a85f62114f574fb85e0eab730
//#piece 3caf9b13e85d8d5b548fcb87d01c8a602f44ec24e4f264da0a7e712348c6cc2b
	const tr = chance(seed, "jack-trunk");
//#piece f51601e16d88e6baa5068aee4f715c54935f51a70270f9a2ab1102845ddda13d
		born: 0,
		rate: 1,
		dies: Infinity,
		kids: [],
		sites: [],
		male: false
	};
	trunk.dirs = way(tr, v3(about(tr, 0, .02), 1, about(tr, 0, .02)), 24, .01, 0, .025);
//#piece 07cfc464127c1a8d846226cd15fb1ab7f00acb462e2a5e1ed3093abbc2a10966
	const branch = (parent, key, s, d, order, full, born) => {
		const r = chance(seed, "jack-branch", ...key);
		const n = order === 1 ? 10 : order === 2 ? 6 : 3;
		const shape = order === 1 ? [
			.05,
			.12,
			.07
		] : order === 2 ? [
			.02,
			.14,
			.14
		] : [
			.05,
			.08,
			.2
		];
//#piece 0db24018cb693dd03f4fb03515a4d395db7a21ad5ba5fac515fcfa4ad3d7a434
			rate: order === 1 ? 1.3 : order === 2 ? .8 : .6,
			dies: Infinity,
			kids: [],
			sites: [],
			male: false
		};
		parent.kids.push(b);
		starts.set(b, point(parent, s));
		return b;
	};
	let s = .55 + tr() * .15;
	let turn = tr() * Math.PI * 2;
	let k = 0;
	while (s < top - .45) {
		turn += 2.4 + about(tr, 0, .25);
		const h = s / top;
		const d = leave(dirAt(trunk, s), lerp(1.2, .9, h) * about(tr, 1, .08), turn);
		const p = point(trunk, s);
		const full = clamp(edge(p, d) * about(tr, .9, .06), .5, 3.6);
		const b = branch(trunk, ["limb", k], s, d, 1, full, madeAt(trunk, s) + .1);
		if (s < CLEAR) b.dies = madeAt(trunk, s) + 3.6 + tr() * .8;
		s += .22 * about(tr, 1, .3);
		k++;
	}
	/** @param {Branch} b */
	const furnish = (b) => {
		const r = chance(seed, "jack-laterals", ...b.key);
		const kidOrder = b.order + 1;
		const spacing = kidOrder === 2 ? .2 : .11;
		let s = kidOrder === 2 ? Math.max(.3, b.full * .25) : .1;
		let k = 0;
		let phyl = r() * Math.PI * 2;
		while (s < b.full - .08) {
			phyl += 2.4 + about(r, 0, .4);
			const d0 = leave(dirAt(b, s), between(r, .8, 1.15), phyl);
			d0.y = kidOrder === 2 ? d0.y * .5 : d0.y * .6 + .18;
//#piece 6ad5a21e356f6b15d3f88eb3829cf31a30f4dd16c6d739344ebf1d2364ae828d
			if (!(inward && r() < .65)) {
				const room = edge(p, d0) * between(r, kidOrder === 2 ? .55 : .4, kidOrder === 2 ? .9 : .75) * (inward ? .5 : 1);
				const full = clamp(room, kidOrder === 2 ? .25 : .1, kidOrder === 2 ? 1.5 : .42);
				const kid = branch(b, [...b.key, k], s, d0, kidOrder, full, madeAt(b, s) + .3 + r() * .3);
				kid.dies = b.dies;
				kid.male = kidOrder === 3 && r() < .3;
				if (kidOrder === 2) furnish(kid);
			}
			k++;
			s += spacing * about(r, 1, .25);
		}
		if (b.order === 1) {
			let s2 = b.full * .45 + r() * .1;
			let j = 0;
			while (s2 < b.full - .1) {
				phyl += 2.4 + about(r, 0, .4);
				const d0 = leave(dirAt(b, s2), between(r, .7, 1.1), phyl);
				d0.y = d0.y * .6 + .2;
				d0.normalize();
				const kid = branch(b, [
					...b.key,
					"shoot",
					j
				], s2, d0, 3, clamp(edge(point(b, s2), d0) * .6, .1, .38), madeAt(b, s2) + .3 + r() * .3);
				kid.dies = b.dies;
				kid.male = r() < .2;
				j++;
				s2 += .14 * about(r, 1, .3);
			}
		}
	};
	for (const b of [...trunk.kids]) furnish(b);
	const fr = chance(seed, "jack-sites");
	const high = top * .72;
	const sites = Math.round((high - .4) * 6);
	for (let i = 0; i < sites; i++) {
		const a = fr() * Math.PI * 2;
		trunk.sites.push(site(fr, lerp(.4, high, (i + fr()) / sites), v3(Math.cos(a), 0, Math.sin(a)), ["trunk", i]));
	}
	for (const b of trunk.kids) {
		if (b.dies < 99 || b.full < .9) continue;
		const lr = chance(seed, "jack-limb-sites", ...b.key);
		const n = Math.floor(b.full * 1.7 + lr());
		for (let i = 0; i < n; i++) {
			const at = lerp(.12, .75, (i + lr()) / n) * b.full;
			const d = dirAt(b, at);
			const side = new three.Vector3().crossVectors(d, UP).normalize().applyAxisAngle(d, between(lr, -1.2, 1.2) + Math.PI / 2);
			if (side.y > .1) side.y = -side.y;
			b.sites.push(site(lr, at, side.normalize(), [
				...b.key,
				"site",
				i
			]));
		}
	}
	if (TREES.size > 24) TREES.delete(TREES.keys().next().value);
	TREES.set(seed, trunk);
	return trunk;
}
/** a footstalk: male or female, and how many fruit a female head keeps @param {Chance} r */
function site(r, s, out, key) {
	const female = r() < .68;
	const k = r();
	return {
		s,
		out,
		key,
		female,
		keep: female ? k < .14 ? 0 : k < .5 ? 1 : k < .76 ? 2 : k < .92 ? 3 : 4 : 0,
		len: between(r, .035, .07)
	};
}
/** a leaf: a short stout stalk, then a blade broadest a little beyond its middle (obovate), with a short blunt tip */
const LEAF = (u) => u < .12 ? .06 : Math.max(.06, Math.pow(Math.sin(Math.PI * Math.pow((u - .12) / .88, .85)), .7));
/** a seedling's lobed leaf: two side lobes at its middle, a long middle lobe beyond them */
const LOBED = (u) => {
	if (u < .12) return .06;
	const t = (u - .12) / .88;
	const lobe = Math.pow(Math.max(0, Math.sin(Math.PI * clamp(t / .62))), .7);
	const middle = .42 * Math.pow(Math.max(0, Math.sin(Math.PI * clamp((t - .3) / .7))), .6);
	return Math.max(.06, t < .62 ? Math.max(lobe, middle) : middle);
};
/** the colours, made once */
const C = /* @__PURE__ */ (() => ({
	dark: new three.Color("#173a16"),
	mid: new three.Color("#1f4a1b"),
	light: new three.Color("#2c5a24"),
	under: new three.Color("#6f8c5c"),
	young: new three.Color("#9dbb52"),
	rib: new three.Color("#b9c48a"),
	barkOld: new three.Color("#6d6255"),
	barkYoung: new three.Color("#6b6e44"),
	scar: new three.Color("#a59a7c"),
	plate: new three.Color("#5b5045"),
	lichen: new three.Color("#9a9888"),
	flake: new three.Color("#8b8070"),
	crack: new three.Color("#362e27"),
	footstalk: new three.Color("#6a6a42"),
	stalk: new three.Color("#5e6a34"),
	ring: new three.Color("#7e8a46"),
	green: new three.Color("#5a8a2c"),
	greenTip: new three.Color("#3b6220"),
	ripe: new three.Color("#bcb244"),
	ripeTip: new three.Color("#7c7a2c"),
	male: new three.Color("#5f7d34"),
	pollen: new three.Color("#c9c060"),
	spent: new three.Color("#2b2a20"),
	c: new three.Color()
}))();
/**
* The jackfruit tree, v3.
* @param {number} g @param {string} seed
*/
function jackfruit(g, seed) {
	const bag = new Bag();
	const space = bag.space;
	const at = v3(0, -.03, 0);
	const Y = linear(g, YEARS);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.016, .009, .01),
		coat: "#c9a678",
		coatShade: "#8a6a44",
		stem: linear(g, [
			[0, 0],
			[.3, .004],
			[1, .06],
			[2, .1],
			[9, .1]
		]),
		hook: linear(g, [
			[0, 1],
			[1, 1],
			[1.6, 0]
		]),
		radius: .0018 + .004 * span(g, 1, 3),
		stemColor: "#7a7a42",
//#piece 580fb6fa1acbd20d25e5df0c0f280055646ab76a1e545c0ee71e4e59b1cfe749
		length: 2,
		grown: linear(g, [
			[0, 0],
			[.3, .004],
			[1, .03],
			[2, .07],
			[3, .2],
			[4, .45],
			[5, .75],
			[6, .9],
			[8, 1]
		]),
		radius: .002 + .07 * span(g, 2, 8),
		down: .03,
		wander: .1,
		laterals: 10,
		lateral: .3,
		depth: 2,
		age: span(g, 1.5, 6),
		young: "#f3e6cc",
		old: "#6e5032"
	});
	for (let i = 0; i < 18; i++) {
		const rr = chance(seed, "feeder", i);
		const born = 2.6 + i * (4 / 18);
//#piece aa5da6ca1b4c8559517add7d344c5063b665749c337e65f4b5603426ea82a815
			length: between(rr, .6, 1) * 2.8,
			grown: (g - born) / 2.8,
			radius: .003 + .028 * span(g, 3, 8),
//#piece e80016485eebd7c96562b4f82807ab2d5f0e737e8d353eefe5f447633e78092f
	const base = s.top.clone();
	const flushing = span(g, 4.4, 4.9) * (1 - span(g, 5.4, 6.4));
	const set = span(g, 5.15, 7.4);
	const ripe = span(g, 7.4, 8.95);
	/** @type {{ pts: THREE.Vector3[], from: number, zone: number, key: (string | number)[], made: (u: number) => number, young: boolean }[]} */
	const leafy = [];
	/** @type {{ at: THREE.Vector3, out: THREE.Vector3, along: THREE.Vector3, site: Site, wood: number, limb: boolean }[]} */
	const footstalks = [];
	/** @type {{ at: THREE.Vector3, dir: THREE.Vector3, key: (string | number)[] }[]} */
	const males = [];
//#piece 3f4f6da43ea16020a648250ad7171179daa5d3d0b9dacbd1ed37128bdab6a5dc
		if (Y > b.dies) {
			if (b.order === 1) bag.add("body", bead(from.clone().addScaledVector(b.dirs[0], .01), v3(.022, .022, .022), C.plate, 3));
			return;
		}
		const R = b.order === 0 ? .005 + .13 * Math.pow(clamp(Y / 6.4), 1.3) : b.order === 1 ? .004 + .05 * Math.sqrt(length / 3) * clamp(age / 4.5) : b.order === 2 ? .0035 + .014 * Math.sqrt(length / 1.3) * clamp(age / 3) : .0035 + .0025 * clamp(length / .3);
//#piece 6b066ee91178897b86c56e4441d9a37ec7736eae567335a3764786db1fe73874
		const taper = b.order === 0 ? .7 : .62;
		const scales = (u, v) => Math.sin(v * Math.PI * 2 * 9 + Math.sin(u * L * 7) * 2.4) * Math.sin(u * L * 19 + v * Math.PI * 2 * 4);
		const paint = (u, v) => {
			const wood = Y - made(u);
			const c = C.c.lerpColors(C.barkYoung, C.barkOld, clamp((wood - .5) / 1.5));
			if (wood < 1.5 && u * L * 30 % 1 < .12) c.lerp(C.scar, .55 * (1 - wood / 1.5));
			if (b.order <= 1 && wood > 2) {
				const sc = scales(u, v);
				const old = clamp((wood - 2) / 2.5) * (b.order === 0 ? 1 : .55);
				c.lerp(sc > .45 ? C.flake : sc < -.5 ? C.crack : C.plate, old * (sc > .45 || sc < -.5 ? .85 : .4));
				if (Math.sin(u * L * 3.1 + v * Math.PI * 2 * 3) * Math.sin(v * Math.PI * 2 * 2 + u * L * 1.7) > .55) c.lerp(C.lichen, old * .45);
			}
			return c.clone();
		};
		const radius = (u, v) => {
			let r = Math.max(.0025, R * (1 - taper * u));
			if (b.order === 0) {
				const foot = Math.pow(1 - Math.min(1, u * L / .6), 2.5);
				r *= 1 + foot * (.35 + .18 * Math.cos(v * Math.PI * 2 * 5));
				if (Y > 2.5) r *= 1 + .03 * clamp((Y - 2.5) / 2) * scales(u, v);
			}
			return r;
		};
		const sides = b.order === 0 ? 30 : b.order === 1 ? 8 : b.order === 2 ? 5 : 4;
		bag.add("body", tube(b.order === 0 ? fine(pts) : pts, radius, paint, sides));
		if (b.order <= 1) for (let i = 0; i + 1 < pts.length; i++) space.rods.push({
//#piece c483e4726cb16a375c9cc5c0e72bab7b43c9abcc10f8ce96549792b8a9595cb0
		const zone = b.order === 0 ? .9 : b.order === 1 ? .6 : b.order === 2 ? .55 : .5;
		leafy.push({
			pts,
			from: .03,
			zone: L - zone,
			key: b.key,
			made: (s) => made(s / L),
			young: Y < 1.6
		});
		for (const kid of b.kids) {
			if (kid.at > length) continue;
			const w = where(kid.at);
			draw(kid, w.p.clone().addScaledVector(kid.dirs[0], w.r * .6));
		}
		for (const st of b.sites) {
			if (st.s > length - .2) continue;
			const w = where(st.s);
			footstalks.push({
				at: w.p.clone().addScaledVector(st.out, w.r * .92),
				out: st.out,
				along: w.d,
				site: st,
				wood: Y - made(st.s / L),
				limb: b.order === 1
			});
		}
		if (b.male && b.order === 3 && L > .08) {
			const w = where(L * .55);
			males.push({
				at: w.p,
				dir: w.d,
				key: b.key
			});
		}
	};
	draw(tree, base);
	const blooming = g > 4.55;
	const crowd = new Space();
	crowd.rods = space.rods;
	for (const f of footstalks) {
		if (!blooming || f.wood < 1.2) continue;
		const st = f.site;
		const r = chance(seed, "jack-flower", ...st.key);
		const grownStalk = clamp((g - 4.55) / .3);
		const tip = f.at.clone().addScaledVector(f.out, st.len * grownStalk).add(v3(0, -st.len * .25 * grownStalk, 0));
		bag.add("body", tube([f.at.clone().addScaledVector(f.out, -.01), tip], (u) => .011 * (1 - .3 * u) + .002 * Math.max(0, Math.sin(u * 11)), () => C.footstalk, 5));
		if (g < 7) for (let k = 0; k < 2; k++) {
			const a = (k ? 1 : -1) * between(r, .7, 1.3);
			const out = f.out.clone().applyAxisAngle(UP, a).setY(between(r, -.1, .35)).normalize();
			bag.add("sheet", sheet({
				length: .09 * grownStalk * (1 - span(g, 6.3, 7)),
				width: .04 * grownStalk,
				shape: LEAF,
				lift: (u, v) => .05 * v * v - .08 * u * u,
				paint: leafPaint(r, 0),
				along: 4,
				across: 1
			}), aim(tip, out, (r() - .5) * .8));
		}
		if (!st.female) {
			const fall = span(g, 5.6, 6.1);
			if (fall >= 1) continue;
			const size = lerp(.4, 1, clamp((g - 4.55) / .4)) * about(r, 1, .15);
			const d = f.out.clone().add(v3(0, -.9, 0)).normalize();
			const colour = g < 5.05 ? C.male : g < 5.45 ? C.pollen : C.spent;
			bag.add("body", tube([tip, tip.clone().addScaledVector(d, .025)], () => .004, () => C.stalk, 4));
			bag.add("body", bead(tip.clone().addScaledVector(d, .025 + .03 * size), v3(.013, .034, .013).multiplyScalar(size * (1 - .4 * fall)), colour, 6, new three.Quaternion().setFromUnitVectors(UP, d)));
			continue;
		}
		const n = Math.max(1, st.keep);
		for (let k = 0; k < n; k++) {
			const kept = k < st.keep;
			const drop = kept ? 0 : span(g, 5.4, 6.2);
			if (drop >= 1) continue;
			const kr = chance(seed, "jack-fruit", ...st.key, k);
			const size = about(kr, 1, .14) * (n > 2 ? .82 : n > 1 ? .9 : 1);
			const stout = between(kr, .95, 1.45);
			const grow = kept ? set : 0;
			const Lf = lerp(.1, .46 * size / Math.sqrt(stout), grow) * lerp(.6, 1, clamp((g - 4.55) / .4));
			const Wf = lerp(.026, .12 * size * Math.sqrt(stout), grow) * lerp(.6, 1, clamp((g - 4.55) / .4));
			const flat = f.out.clone().setY(0);
			if (flat.lengthSq() < .01) flat.copy(f.along).setY(0);
			if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
			const out = flat.normalize().applyAxisAngle(UP, (k - (n - 1) / 2) * .75 + about(kr, 0, .2));
			const lower = k % 2 ? .35 : 0;
			const lean = f.limb ? .12 : .3 + kr() * .12;
			const shape = (a, d, L = Lf, W = Wf) => [
				.18,
				.4,
				.62,
				.84
			].map((t) => ({
				c: a.clone().addScaledVector(d, L * t),
				r: W * PROFILE(t) * .86
			}));
			const fullL = kept ? .46 * size / Math.sqrt(stout) : Lf, fullW = kept ? .12 * size * Math.sqrt(stout) : Wf;
			/** @type {{ balls: { c: THREE.Vector3, r: number }[], cost: number, data: { at: THREE.Vector3, dir: THREE.Vector3 } }[]} */
			const options = [];
			for (const [more, turn, cost, drop] of [
				[
					0,
					0,
					0,
					lower
				],
				[
					.15,
					0,
					.004,
					lower
				],
				[
					0,
					.4,
					.006,
					lower
				],
				[
					0,
					-.4,
					.006,
					lower
				],
				[
					0,
					0,
					.008,
					lower + .4
				],
				[
					.3,
					.35,
					.01,
					lower
				],
				[
					.3,
					-.35,
					.01,
					lower
				],
				[
					0,
					.8,
					.014,
					lower + .3
				],
				[
					0,
					-.8,
					.014,
					lower + .3
				],
				[
					.45,
					0,
					.016,
					lower + .6
				],
				[
					0,
					1.3,
					.02,
					lower
				],
				[
					0,
					-1.3,
					.02,
					lower
				]
			]) {
				const o = out.clone().applyAxisAngle(UP, turn);
				const dir = v3(0, -1, 0).addScaledVector(o, lean + more * .5).normalize();
				const at = tip.clone().addScaledVector(o, Wf * (.3 + more)).add(v3(0, -.012 - Wf * .15 - drop * Lf * .3, 0));
				const full = tip.clone().addScaledVector(o, fullW * (.3 + more)).add(v3(0, -.012 - fullW * .15 - drop * fullL * .3, 0));
				options.push({
					balls: shape(full, dir, fullL, fullW),
					cost,
					data: {
						at,
						dir
					}
				});
			}
			if (kept && Math.min(...options.map((o) => crowd.overlap(o.balls))) > fullW * .45) continue;
			const place = crowd.best(options);
			const stalkR = .005 + .012 * grow;
			bag.fruit([...st.key, k], tip, place.dir);
			bag.add("body", tube([
				tip.clone().addScaledVector(f.out, -.01),
				tip,
				place.at.clone().add(v3(0, .004, 0))
			], (u) => stalkR * (1 - .15 * u), () => C.stalk, 6));
			bag.add("body", bead(place.at, v3(Wf * .32, Wf * .12, Wf * .32), C.ring, 5, new three.Quaternion().setFromUnitVectors(UP, place.dir.clone().negate())));
			jack(bag, {
				at: place.at,
				dir: place.dir,
				L: Lf,
				W: Wf,
				ripe: kept ? ripe * between(kr, .8, 1) : 0,
				dark: drop,
				r: kr,
				set: grow
			});
			bag.fruitDone();
		}
	}
	for (const m of males) {
		if (g < 4.55 || g > 6.1) continue;
		const r = chance(seed, "jack-male", ...m.key);
		const d = new three.Vector3().crossVectors(m.dir, UP).normalize().add(v3(0, -.6, 0)).normalize();
		const size = lerp(.4, .8, clamp((g - 4.55) / .4)) * about(r, 1, .15);
		const colour = g < 5.05 ? C.male : g < 5.45 ? C.pollen : C.spent;
		const end = m.at.clone().addScaledVector(d, .03);
		bag.add("body", tube([m.at, end], () => .0025, () => C.stalk, 3));
		bag.add("body", bead(end.clone().addScaledVector(d, .025 * size), v3(.01, .028, .01).multiplyScalar(size), colour, 5, new three.Quaternion().setFromUnitVectors(UP, d)));
	}
	const ageSize = lerp(.55, 1, clamp(Y / 2.2));
	for (const sh of leafy) {
		const lr = chance(seed, "jack-leaves", ...sh.key);
//#piece 0988be1ab7ee2b53e8d300045052b36bda76ad579505e46fb6213e15c0d35ef1
		let s = sh.from;
//#piece 7040c88410d4993b5ee11a2427f1989a7646698c62ae526d21cfaf1ec255c35e
			const side = new three.Vector3().crossVectors(d, Math.abs(d.y) > .95 ? v3(1, 0, 0) : UP).normalize().applyAxisAngle(d, phyl);
			const toTip = (total - s) / .1;
			const made = sh.made(s);
			if (s < sh.zone && Y - made > 2) {
				s += .03;
				continue;
			}
			const young = clamp(1 - (Y - made) / .35) * .6 + flushing * clamp(1 - toTip) * .8;
			const size = ageSize * lerp(.45, 1, clamp(toTip)) * between(lr, .78, 1.18);
			const out = side.clone().addScaledVector(d, .55).setY(0);
			if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
			out.normalize();
			const lift = lerp(.7, between(lr, -.35, .15), clamp(toTip));
			const dir = out.multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0));
			const lobed = sh.young && made < .8 && lr() < .5;
			const len = .16 * size;
			bag.add("sheet", sheet({
				length: len,
				width: len * (lobed ? .62 : .4),
				shape: lobed ? LOBED : LEAF,
				lift: (u, v) => .05 * v * v - .07 * u * u,
				paint: leafPaint(lr, young),
				along: lobed ? 8 : 5,
				across: 1
			}), aim(p.clone().addScaledVector(dir, .004), dir, (lr() - .5) * .5));
			s += (sh.young ? .04 : .021) * about(lr, 1, .25);
		}
	}
	return bag.build();
}
/** the trunk's path in more points, so its flare and its bark read */
function fine(pts) {
	const out = [pts[0]];
	for (let i = 1; i < pts.length; i++) {
		const n = i === 1 ? 12 : 6;
		for (let k = 1; k <= n; k++) out.push(pts[i - 1].clone().lerp(pts[i], k / n));
	}
	return out;
}
/** a leaf's colours: glossy dark green, a few turned to show their paler undersides, the young flush pale @param {Chance} r */
function leafPaint(r, young) {
	const tone = r();
	const c = (r() < .08 ? C.under.clone() : tone < .5 ? new three.Color().lerpColors(C.dark, C.mid, tone / .5) : new three.Color().lerpColors(C.mid, C.light, (tone - .5) / .5)).lerp(C.young, clamp(young));
	const rib = c.clone().lerp(C.rib, .3);
	return (u, v) => u < .12 || Math.abs(v) < .1 ? rib : c;
}
/** the fruit's outline along its axis, stalk end to the far end: barrel-shaped, a little broader below */
const PROFILE = (u) => Math.pow(Math.max(0, Math.sin(Math.PI * clamp(u))), .48) * (.84 + .2 * u);
/**
* A jackfruit hanging from `at` along `dir`: oblong, a little lopsided and bent, covered in blunt hexagonal knobs,
* green, yellowing as it ripens, the knobs flattening and their tips browning; `dark` 0 … 1 a female head withering.
* @param {Bag} bag
* @param {{ at: THREE.Vector3, dir: THREE.Vector3, L: number, W: number, ripe: number, dark: number, r: Chance, set: number }} o
*/
function jack(bag, o) {
//#piece 5197cb1b1a375fe872f6cec2ddaa83000d0ec1926cc031a0f0d7bdd9e73f6ea5
	const N = 22 + Math.floor(r() * 5), M = 17 + Math.floor(r() * 4);
	const sides = N * 2, rings = M * 2;
	const bend = about(r, 0, .07), lop = between(r, .04, .14), lopAt = r() * Math.PI * 2, waist = r() * .1, lump = between(r, .03, .11), lumpAt = r() * Math.PI * 2;
	const axis = [];
	for (let k = 0; k <= rings; k++) {
		const u = k / rings;
		axis.push(v3(bend * Math.sin(Math.PI * u) * o.L, -.002 - u * o.L, 0));
	}
	/** how far up a knob this place is: 1 at its point, 0 between knobs */
	const knob = (u, v) => {
		const y = u * M, row = Math.floor(y);
		const dx = (v * N + (row % 2 ? .5 : 0)) % 1 - .5, dy = y % 1 - .5;
		return clamp(1 - Math.sqrt(dx * dx + dy * dy) * 2.1);
	};
	const height = lerp(.1, .05, o.ripe) * o.W * lerp(.5, 1, o.set);
	const radius = (u, v) => {
		const side = 1 + lop * Math.cos(v * Math.PI * 2 - lopAt) * Math.sin(Math.PI * u) - waist * Math.sin(Math.PI * u * 2) * .5 + lump * Math.sin(v * Math.PI * 2 * 2 + lumpAt) * Math.sin(Math.PI * u * 3 + lumpAt) * Math.sin(Math.PI * u);
		return o.W * PROFILE(u) * side + (u > .03 && u < .98 ? knob(u, v) * height : 0);
	};
	const paint = (u, v) => {
		const kb = knob(u, v);
		const ripe = clamp(o.ripe * (1.1 - .25 * Math.cos(v * Math.PI * 2 - lopAt)));
		const ground = C.c.lerpColors(C.green, C.ripe, ripe);
		const tip = new three.Color().lerpColors(C.greenTip, C.ripeTip, ripe);
		const c = ground.lerp(tip, kb > .75 ? .6 : kb < .15 ? .25 : 0);
		if (o.dark > 0) c.lerp(C.spent, o.dark);
		return c.clone();
	};
	const geo = tube(axis, radius, paint, sides);
	geo.computeVertexNormals();
	bag.add("body", geo, m);
//#piece 86cac10cc0c2dbf52938e762c9bbde09bf853f406d8f635fb0ed157a8e6519e4
//#piece b88dbd3e8726d460bccea94650cc5775afaad2b66f07278b48b28e2dd8819b4d
//#piece b2d524cf928622b951aa5c1dc5991391ae84c5934492654fd7291ac81168c0c4
//#piece b71f65d28cb310de1fbefb08952d37fb99362f3f9037ad2f8faa358e9f2c6d58
	id: "jackfruit",
	label: "Jackfruit",
	latin: "Artocarpus heterophyllus · Jackfrucht",
	note: "One straight trunk under a dense dome of big glossy leaves; its flower heads and huge knobbly fruit come straight out of the trunk and the thickest limbs, the fruit hanging against the bark.",
	from: "Tree · 6 years",
	stages: JACKFRUIT_STAGES,
	grow: jackfruit
//#piece 35171bffb608ead070eb23e7bc8d1d229032839d59049e6db39550def1097bf9
const HISTORY = /* @__PURE__ */ (() => ({ jackfruit: [
	{
		...FIRST,
		build: orchard({
			...JACKFRUIT,
			flower: {
				...JACKFRUIT.flower,
				chance: 1.3
			}
		})
	},
	{
		v: 2,
		date: "2026-10-06",
		note: "Fruit hangs against the trunk on stout stalks, many more of them",
		build: jackfruit$1
	},
	{
		v: 3,
		date: "2026-10-07",
		note: "Grown as a jackfruit grows: a leader, a dense dome, big glossy leaves; clusters of fruit on the trunk and limbs"
	}
] }))();
//#piece cd838cff80f29522a48cc4079cbe8135cef8cb0d0dc56971838b3e575fc2998a
*/
//#piece 579c5c92da8c6bae342f6d008b4fb4d179a085bafd79fb3a0c76e761896ad29b

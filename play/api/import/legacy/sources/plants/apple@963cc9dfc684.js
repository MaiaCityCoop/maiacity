//#piece e2273cb9ac978e8f68d22acf6d3a11d5c4d6c9802eacc29c10ae8848d0a454d7
//#piece 64f55215c6a55d5b9b7cd924998f878b3d3d74240133472701fa152a29fb36a1
*/
//#piece 7e1fd698b9b67f23212e705239329059c5bd17ebce77fcdde81690e88dfee8b5
//#piece 2a6ad0386ff69cdbb548c456e3f68c48286274961d0c609bace6b370ea05f5de
//#region src/lib/plants/apple.js
const UP = /* @__PURE__ */ (() => v3(0, 1, 0))();
/** the tree's age in years of growth at g (its stages: the pip … day 365, 1460, 2200 … 2320); the season's shoots
* grow between the blossom and the green apples */
const YEARS = [
	[1.6, 0],
	[2, .1],
	[3, 1],
	[4, 3.8],
	[5, 5.6],
	[6, 5.75],
	[7, 6.05],
	[8, 6.15],
	[9, 6.2]
];
/** the year of the blossom: the spurs on wood old enough by then flower */
const BLOOM = /* @__PURE__ */ (() => linear(5, YEARS))();
/** the trunk's (the leader's) length through the years */
const LEADER = [
	[0, 0],
	[.15, .1],
	[1, .8],
	[2, 1.85],
	[2.5, 2.25],
	[3, 3],
	[4, 3.45],
	[5, 3.95],
	[6, 4.3],
	[7, 4.45]
];
//#piece 860e94666d93a6d98381f2f31f939d69799e0c91c11e9ba997934ac21f78ba63
}
/**
* A space that finds what is near a place by a grid, not by looking at everything: a tree hung with hundreds of
* apples asks it thousands of times.
*/
var GridSpace = class extends Space {
	constructor(cell = .12) {
		super();
		this.cell = cell;
		/** @type {Map<number, { c?: THREE.Vector3, a?: THREE.Vector3, b?: THREE.Vector3, r: number }[]>} */
		this.grid = /* @__PURE__ */ new Map();
		/** how far round a place a question reaches at most (a fruit's radius, a leaf's) */
		this.reach = .045;
	}
	/** @param {number} x @param {number} y @param {number} z */
	key(x, y, z) {
		return ((Math.floor(x / this.cell) + 512) * 1024 + (Math.floor(y / this.cell) + 512)) * 1024 + (Math.floor(z / this.cell) + 512);
	}
	/** @param {{ c?: THREE.Vector3, a?: THREE.Vector3, b?: THREE.Vector3, r: number }} item @param {THREE.Vector3} lo @param {THREE.Vector3} hi */
	file(item, lo, hi) {
		const m = item.r + this.reach, s = this.cell;
		for (let x = Math.floor((lo.x - m) / s); x <= Math.floor((hi.x + m) / s); x++) for (let y = Math.floor((lo.y - m) / s); y <= Math.floor((hi.y + m) / s); y++) for (let z = Math.floor((lo.z - m) / s); z <= Math.floor((hi.z + m) / s); z++) {
			const k = ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);
			let list = this.grid.get(k);
			if (!list) this.grid.set(k, list = []);
			list.push(item);
		}
	}
	/** @param {THREE.Vector3} c @param {number} r */
	ball(c, r) {
		const item = {
			c: c.clone(),
			r
		};
		this.balls.push(item);
		this.file(item, c, c);
	}
	/** @param {THREE.Vector3[]} pts @param {number} r */
	rod(pts, r) {
		for (let i = 0; i + 1 < pts.length; i++) {
			const item = {
				a: pts[i].clone(),
				b: pts[i + 1].clone(),
				r
			};
			this.rods.push(item);
			this.file(item, item.a.clone().min(item.b), item.a.clone().max(item.b));
		}
	}
	/** is there a fruit near p @param {THREE.Vector3} p */
	fruitNear(p) {
		return !!this.grid.get(this.key(p.x, p.y, p.z))?.some((it) => it.c);
	}
	/** @param {THREE.Vector3} c @param {number} r */
	depth(c, r) {
		const list = this.grid.get(this.key(c.x, c.y, c.z));
		if (!list) return 0;
		let worst = 0;
		for (const it of list) if (it.c) worst = Math.max(worst, r + it.r - c.distanceTo(it.c));
		else {
			const a = it.a, b = it.b;
			const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
			const t = clamp(((c.x - a.x) * abx + (c.y - a.y) * aby + (c.z - a.z) * abz) / Math.max(1e-12, abx * abx + aby * aby + abz * abz));
			const dx = a.x + abx * t - c.x, dy = a.y + aby * t - c.y, dz = a.z + abz * t - c.z;
			worst = Math.max(worst, r + it.r - Math.sqrt(dx * dx + dy * dy + dz * dz));
		}
		return Math.max(0, worst);
	}
};
/**
* @typedef {{ s: number, dir: THREE.Vector3, len: number, born: number, flowers: number, keep: number, key: (string | number)[] }} Spur
*   a spur `s` metres along its branch, born in the year `born`; it flowers (`flowers` in its cluster, 0 if not) and
*   keeps `keep` apples
* @typedef {{
*   key: (string | number)[], order: number, at: number, dirs: THREE.Vector3[], step: number, full: number, born: number,
*   rate: number, kids: Branch[], spurs: Spur[], base?: THREE.Vector3, load: number[]
* }} Branch one branch as it will be when grown: `at` how far along its parent it starts, `dirs` the way each of its
*   steps goes (before any fruit bows it), its full length, the year it breaks and how fast it grows (m a year);
*   `load` the apples it carries beyond each step
*/
/** the whole tree as it will grow, from its seed — drawn once a seed */
//#piece b08615434ca6489bc3780c4ed4f44d84884f4d25edb571da646de4d9748a5a62
	const pr = chance(seed, "apple-tree");
	const vigour = about(pr, 1, .07);
	const env = {
		c: v3(about(pr, 0, .15), 3.15 * vigour, about(pr, 0, .15)),
		rx: 3 * vigour * about(pr, 1, .06),
		rz: 3 * vigour * about(pr, 1, .06),
		up: 2 * vigour,
		down: 1.95 * vigour
//#piece 91ca1a5dd69cfea6a9923617546f923afb26dc4923464e6e6ab262b84d9538ad
	};
	/**
	* a branch's way, step by step: toward the light at first, then (the further out, the more) bowing under its own
	* weight, wandering a little
	* @param {Chance} r @param {THREE.Vector3} d0 @param {number} n @param {number} up @param {number} droop @param {number} wander
	*/
//#piece 321140f51b4cb4601a6be393224b0c3a2649929a85f62114f574fb85e0eab730
	/** a point `s` metres along a branch from `from` (unbowed) */
	const point = (from, b, s) => {
		const p = from.clone();
		let left = s;
		for (const d of b.dirs) {
			const t = Math.min(left, b.step);
			p.addScaledVector(d, t);
			left -= t;
			if (left <= 0) break;
		}
		return p;
	};
	const dirAt = (b, s) => b.dirs[Math.min(b.dirs.length - 1, Math.floor(s / b.step))];
	/** when the wood s metres along a branch was made */
	const madeAt = (b, s) => b.order === 0 ? leaderAt(s) : b.born + s / b.rate;
	/** a direction leaving `d` at `tilt`, turned `turn` round it */
//#piece 3caf9b13e85d8d5b548fcb87d01c8a602f44ec24e4f264da0a7e712348c6cc2b
	/** @type {Branch} */
	const trunk = {
		key: ["trunk"],
		order: 0,
		at: 0,
		dirs: [],
		step: 0,
		full: LEADER[LEADER.length - 1][1],
		born: 0,
		rate: 1,
		kids: [],
		spurs: [],
		load: []
	};
	const tr = chance(seed, "apple-trunk");
	trunk.dirs = way(tr, v3(about(tr, 0, .03), 1, about(tr, 0, .03)), 16, .02, 0, .06);
	trunk.step = trunk.full / 16;
	const base = v3(0, -.01, 0);
	/** a branch off `parent`, s metres along it, going d, as long as the crown leaves room for */
	const branch = (parent, key, s, d, order, full, born) => {
		const r = chance(seed, "apple-branch", ...key);
		const n = order === 1 ? 10 : order === 2 ? 7 : order === 3 ? 4 : 3;
		const shape = order === 1 ? [
			.02,
			.2,
			.09
		] : order === 2 ? [
			.01,
			.16,
			.17
		] : order === 3 ? [
			.03,
			.14,
			.2
		] : [
			.08,
			.1,
			.22
		];
//#piece 0db24018cb693dd03f4fb03515a4d395db7a21ad5ba5fac515fcfa4ad3d7a434
			rate: order === 1 ? 1.05 : order === 2 ? .75 : order === 3 ? .5 : .55,
			kids: [],
			spurs: [],
			load: []
		};
		parent.kids.push(b);
		return b;
	};
	/** where each branch starts (unbowed), to measure the room it has */
	const starts = /* @__PURE__ */ new Map();
	starts.set(trunk, base);
	const tiers = [
		{
			n: 4 + Math.floor(tr() * 2),
			from: 1.42,
			to: 1.85,
			tilt: 1,
			longest: 3.4
		},
		{
			n: 2 + Math.floor(tr() * 2),
			from: 2.4,
			to: 2.95,
			tilt: 1,
			longest: 2.8
		},
		{
			n: 2,
			from: 3.3,
			to: 3.7,
			tilt: .95,
			longest: 1.8
		}
	];
	let turn = tr() * Math.PI * 2;
	tiers.forEach((t, ti) => {
		for (let i = 0; i < t.n; i++) {
			const s = lerp(t.from, t.to, (i + tr() * .6) / t.n);
			turn += ti === 0 ? Math.PI * 2 / t.n + about(tr, 0, .3) : 2.4 + about(tr, 0, .3);
			const d = leave(dirAt(trunk, s), t.tilt * about(tr, 1, .1), turn);
			const p = point(base, trunk, s);
			const full = clamp(edge(p, d) * about(tr, .92, .06), .6, t.longest);
			const b = branch(trunk, [
				"limb",
				ti,
				i
			], s, d, 1, full, madeAt(trunk, s) + .05);
			starts.set(b, p);
		}
	});
	/** @param {Branch} b */
	const furnish = (b) => {
		const from = starts.get(b);
		const r = chance(seed, "apple-laterals", ...b.key);
		const kidOrder = b.order === 0 ? 2 : b.order + 1;
		if (kidOrder <= 3) {
			const spacing = kidOrder === 2 ? .3 : .2;
			let s = b.order === 0 ? 3.3 : kidOrder === 2 ? .22 : .1;
			let k = 0;
			let phyl = r() * Math.PI * 2;
			while (s < b.full - (kidOrder === 2 ? .15 : .08)) {
				phyl += 2.4 + about(r, 0, .35);
				const d0 = leave(dirAt(b, s), between(r, .85, 1.2), phyl);
				d0.y = d0.y * .45 + (kidOrder === 2 ? -.02 : -.04);
				d0.normalize();
				const p = point(from, b, s);
				const out = v3(p.x - env.c.x, 0, p.z - env.c.z).normalize();
				const inward = d0.x * out.x + d0.z * out.z < -.25;
				if (!(inward && r() < .6)) {
					const room = edge(p, d0) * between(r, kidOrder === 2 ? .6 : .4, kidOrder === 2 ? .95 : .8) * (inward ? .45 : 1);
					const full = clamp(room, kidOrder === 2 ? .25 : .1, kidOrder === 2 ? 1.6 : .55);
					const kid = branch(b, [...b.key, k], s, d0, kidOrder, full, madeAt(b, s) + .35 + r() * .3);
					starts.set(kid, p);
					furnish(kid);
				}
				k++;
				s += spacing * about(r, 1, .25);
			}
		}
		if (b.order >= 1) {
			const tr4 = chance(seed, "apple-twigs", ...b.key);
			let s = (b.order === 1 ? b.full * .55 : .12) + tr4() * .15;
			let k = 0;
			let phyl = tr4() * Math.PI * 2;
			while (s < b.full - .05) {
				phyl += 2.4 + about(tr4, 0, .5);
				const d = leave(dirAt(b, s), between(tr4, .6, 1.1), phyl);
				d.y = d.y * .7 + .25;
				d.normalize();
				const full = clamp(edge(point(from, b, s), d) * .7, .08, between(tr4, .14, .34));
				branch(b, [
					...b.key,
					"twig",
					k
				], s, d, 4, full, madeAt(b, s) + .4 + tr4() * .4);
				k++;
				s += (b.order === 3 ? .17 : .22) * about(tr4, 1, .3);
			}
		}
		if (b.order >= 1) {
			const sr = chance(seed, "apple-spurs", ...b.key);
			let s = b.order === 1 ? b.full * .45 : .08;
			let k = 0;
			let phyl = sr() * Math.PI * 2;
			while (s < b.full - .06) {
				phyl += 2.4 + about(sr, 0, .4);
				const d = leave(dirAt(b, s), between(sr, .9, 1.4), phyl);
				d.y = d.y * .6 + .35;
				d.normalize();
				const made = madeAt(b, s);
				const flowers = sr() < (BLOOM - made >= 1.5 ? .9 : BLOOM - made >= .9 ? .6 : 0) ? 5 + (sr() < .5 ? 1 : 0) : 0;
				const k5 = sr();
				const keep = flowers && sr() < .42 ? k5 < .3 ? 1 : k5 < .66 ? 2 : k5 < .88 ? 3 : k5 < .97 ? 4 : 5 : 0;
				b.spurs.push({
					s,
					dir: d,
					len: between(sr, .015, .045),
					born: made + .45,
					flowers,
					keep,
					key: [
						...b.key,
						"spur",
						k
					]
				});
				k++;
				s += (b.order === 1 ? .16 : .12) * about(sr, 1, .35);
			}
			if (b.order >= 2 && sr() < .8) {
				const made = madeAt(b, b.full);
				const flowers = BLOOM - made >= .6 ? 5 + (sr() < .5 ? 1 : 0) : 0;
				const k5 = sr();
				const keep = flowers && sr() < .7 ? k5 < .3 ? 1 : k5 < .66 ? 2 : k5 < .88 ? 3 : 4 : 0;
				const d = dirAt(b, b.full).clone().setY(.35).normalize();
				b.spurs.push({
					s: b.full - .005,
					dir: d,
					len: .012,
					born: made + .3,
					flowers,
					keep,
					key: [...b.key, "tip"]
				});
			}
		}
	};
	const limbs = [...trunk.kids];
	furnish(trunk);
	for (const b of limbs) furnish(b);
	if (TREES.size > 24) TREES.delete(TREES.keys().next().value);
	TREES.set(seed, trunk);
	return trunk;
}
/** @typedef {() => number} Chance */
/** an apple leaf: a short stalk, then an oval blade broadest below its middle, narrowing to a point */
const LEAF = (u) => u < .25 ? .07 : Math.max(.07 * (1 - (u - .25) * 6), Math.pow(Math.sin(Math.PI * Math.pow((u - .25) / .75, .75)), .7));
/** the apple's outline along its axis, stalk end to eye: flattened, broad in the shoulder */
const APPLE = (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .42) * (1 - .13 * u);
/** a petal: rounded, broadest beyond its middle, on a short claw */
const PETAL = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .6);
/** the bark's colours: young shoots red-brown, older wood grey-brown, the trunk's plates, their flaking edges, the cracks */
const BARK = /* @__PURE__ */ (() => ({
	young: new three.Color("#8a5a3e"),
	old: new three.Color("#7c7065"),
	flake: new three.Color("#998c7c"),
	crack: new three.Color("#3d332b"),
	plate: new three.Color("#5e5248"),
	c: new three.Color()
}))();
/** the colours, made once */
const C = /* @__PURE__ */ (() => ({
	spur: new three.Color("#6c5c4e"),
	pedicel: new three.Color("#7a8a3e"),
	stalk: new three.Color("#6f6a3a"),
	under: new three.Color("#8ea07c"),
	under2: new three.Color("#a9b496"),
	dark: new three.Color("#2c5524"),
	mid: new three.Color("#3a6a2a"),
	light: new three.Color("#5a8a36"),
	young: new three.Color("#a2c45a"),
	young2: new three.Color("#8ab44c"),
	rib: new three.Color("#d6dca0"),
	green: new three.Color("#a3c450"),
	yellow: new three.Color("#dccf62"),
	red: new three.Color("#c0202c"),
	deep: new three.Color("#8a1424")
}))();
const PETAL_C = /* @__PURE__ */ (() => ({
	white: new three.Color("#fffdfb"),
	pink: new three.Color("#f0a2b9"),
	c: new three.Color()
}))();
/**
* The apple tree, v2.
* @param {number} g @param {string} seed
*/
function apple$1(g, seed) {
	const bag = new Bag();
	const space = new GridSpace();
	bag.space = space;
	const at = v3(0, -.01, 0);
	const Y = linear(g, YEARS);
	sprout(bag, {
		seed,
		at,
		size: v3(.004, .0022, .002),
		coat: "#5a3a22",
		coatShade: "#3a2414",
		stem: linear(g, [
			[0, 0],
			[.3, .002],
			[1, .04],
			[2, .08],
			[9, .08]
		]),
		hook: linear(g, [
			[0, 1],
			[1, 1],
			[1.6, 0]
		]),
		radius: .0018 + .004 * span(g, 1, 3),
		stemColor: "#7a7a42",
		leaf: {
			length: .012,
			width: .0045,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .7),
			color: "#6aa046",
			vein: "#a6c47e"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.6),
		wither: span(g, 3, 3.8),
		keepCoat: false
	});
	root(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(.02, -1, .01),
		length: 1.2,
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
		radius: .002 + .05 * span(g, 2, 8),
		down: .03,
		wander: .1,
		laterals: 10,
		lateral: .3,
		depth: 2,
		age: span(g, 1.5, 6),
		young: "#f3e6cc",
		old: "#6e5032"
	});
	for (let i = 0; i < 16; i++) {
		const rr = chance(seed, "feeder", i);
		const born = 2.6 + i * .25;
//#piece aa5da6ca1b4c8559517add7d344c5063b665749c337e65f4b5603426ea82a815
			length: between(rr, .6, 1) * 2.4,
			grown: (g - born) / 2.8,
			radius: .003 + .02 * span(g, 3, 8),
//#piece e80016485eebd7c96562b4f82807ab2d5f0e737e8d353eefe5f447633e78092f
	const leafSize = g < 4.5 ? 1 : g < 5 ? lerp(1, .5, (g - 4.5) / .5) : lerp(.5, 1, span(g, 5, 6.4));
	const leafYoung = g < 4.5 ? 0 : g < 5 ? (g - 4.5) * 2 : 1 - span(g, 5, 6.6);
	const set = span(g, 5.5, 7.7);
	const ripe = span(g, 7, 8.7);
	const fruiting = g >= 5.5;
	const blooming = g >= 4.6 && g < 5.75;
	const weight = (b) => {
		const n = b.dirs.length;
		b.load = new Array(n).fill(0);
		let total = 0;
		const add = (s, w) => {
			const k = Math.min(n - 1, Math.floor(s / b.step));
			for (let i = 0; i <= k; i++) b.load[i] += w;
			total += w;
		};
		if (fruiting) {
			for (const sp of b.spurs) if (sp.keep) add(sp.s, sp.keep * set * set);
		}
		for (const kid of b.kids) add(kid.at, weight(kid));
		return total;
	};
	weight(tree);
	/** @type {{ at: THREE.Vector3, dir: THREE.Vector3, along: THREE.Vector3, spur: Spur, radius: number }[]} */
	const spurs = [];
	/** @type {{ pts: THREE.Vector3[], from: number, key: (string | number)[], twig: boolean }[]} */
	const leafy = [];
	/**
	* a branch as far as it has grown, bowed by the fruit beyond each step, and everything off it
	* @param {Branch} b @param {THREE.Vector3} from @param {THREE.Quaternion} turn how the branch it sits on has turned it
	*/
	const draw = (b, from, turn) => {
		const length = b.order === 0 ? linear(Y, LEADER) : b.full * clamp((Y - b.born) * b.rate / b.full);
		if (length < .004) return;
		const age = Y - b.born;
		const R = b.order === 0 ? .004 + .072 * Math.pow(clamp(Y / 6.2), 1.25) : b.order === 1 ? .005 + .03 * Math.sqrt(length / 3) * clamp(age / 4.5) : b.order === 2 ? .0035 + .012 * Math.sqrt(length / 1.3) * clamp(age / 3) : b.order === 3 ? .0028 + .0045 * clamp(length / .45) : .0022 + .001 * clamp(length / .3);
		const pts = [from.clone()];
		const qs = [turn.clone()];
		const q = turn.clone();
		let left = length;
		for (let i = 0; i < b.dirs.length && left > 1e-5; i++) {
			const d = b.dirs[i].clone().applyQuaternion(q);
			const r = Math.max(.003, R * (1 - .55 * (i / b.dirs.length)));
			const stiff = b.order === 0 ? 0 : b.order === 1 ? .35 : .9;
			const bow = Math.min(.25, .003 * b.load[i] * b.step / Math.pow(r / .01, 2.6)) * stiff;
			if (bow > 1e-5) {
				const axis = new three.Vector3().crossVectors(UP, d);
				if (axis.lengthSq() > 1e-6) {
					const bq = new three.Quaternion().setFromAxisAngle(axis.normalize(), bow);
					q.premultiply(bq);
					d.applyQuaternion(bq);
					if (d.y < -.85) d.y = -.85;
					d.normalize();
				}
			}
			const t = Math.min(left, b.step);
			pts.push(pts[i].clone().addScaledVector(d, t));
			qs.push(q.clone());
			left -= t;
		}
		const L = length;
		const flare = b.order === 0 ? (u) => 1 + .45 * Math.pow(1 - Math.min(1, u * L / .35), 3) : () => 1;
		const scales = (u, v) => Math.sin(v * Math.PI * 2 * 7 + Math.sin(u * L * 9) * 2.2) * Math.sin(u * L * 23 + v * 19);
		const madeAt = (u) => b.order === 0 ? leaderAt(u * L) : b.born + u * L / b.rate;
		const paint = (u, v) => {
			const woodAge = Y - madeAt(u);
			const c = BARK.c.lerpColors(BARK.young, BARK.old, clamp((woodAge - .6) / 1.8));
			if (b.order <= 1 && woodAge > 2.5) {
				const s = scales(u, v);
				c.lerp(s > .55 ? BARK.flake : s < -.6 ? BARK.crack : BARK.plate, clamp((woodAge - 2.5) / 2) * (b.order === 0 ? 1 : .5));
			}
			return c;
		};
		const radius = (u, v) => {
			const r = Math.max(.0022, R * (1 - (b.order === 0 ? .62 : .6) * u)) * flare(u);
			return b.order === 0 && Y > 3 ? r * (1 + .035 * clamp((Y - 3) / 2) * scales(u, v) * (u < .5 ? 1 : 0)) : r;
		};
		const sides = b.order === 0 ? 11 : b.order === 1 ? 7 : b.order === 2 ? 5 : b.order === 3 ? 4 : 3;
		bag.add("body", tube(pts, radius, paint, sides));
		if (b.order <= 2 && R > .006) space.rod(pts, R * .8 + .006);
		/** where s metres along it is, which way it goes there, and how it has turned there */
//#piece 26e3e2bf28307de70ea98c281bb840dc9f58ee0785af84e980b7b0ae5517d4cf
				q: qs[k + 1],
				r: Math.max(.0022, R * (1 - .6 * (s / Math.max(1e-6, L))))
			};
		};
		const grownBefore = b.order === 0 ? linear(Y - 1, LEADER) : b.full * clamp((Y - 1 - b.born) * b.rate / b.full);
		const season = clamp(length - grownBefore, Math.min(length, b.order <= 2 ? .45 : .2), b.order === 0 ? .9 : .6);
		leafy.push({
			pts,
			from: b.order === 4 ? .015 : length - season,
			key: b.key,
			twig: b.order === 4
		});
		for (const kid of b.kids) {
			if (kid.at > length) continue;
			const w = where(kid.at);
			draw(kid, w.p.clone().addScaledVector(kid.dirs[0].clone().applyQuaternion(w.q), w.r * .5), w.q);
		}
		for (const sp of b.spurs) {
			if (sp.s > length || Y < sp.born) continue;
			const w = where(sp.s);
			const d = sp.dir.clone().applyQuaternion(w.q).normalize();
			const len = sp.len * clamp((Y - sp.born) / 1.5 + .3);
			const a = w.p.clone().addScaledVector(d, w.r * .6);
			const tip = a.clone().addScaledVector(d, len);
			bag.add("body", tube([
				w.p.clone(),
				a,
				tip
			], (u) => .0032 * (1 - .3 * u) + .0012 * Math.max(0, Math.sin(u * 9)), () => C.spur, 3));
			spurs.push({
				at: tip,
				dir: d,
				along: w.d,
				spur: sp,
				radius: w.r
			});
		}
	};
	draw(tree, v3(0, -.01, 0), new three.Quaternion());
	for (const s of spurs) {
		if (!s.spur.flowers) continue;
		const fr = chance(seed, "apple-cluster", ...s.spur.key);
		const opens = 4.7 + fr() * .15;
		const up = s.dir.clone().lerp(UP, .5).normalize();
		const n = s.spur.flowers;
		const sideOf = new three.Vector3().crossVectors(up, Math.abs(up.y) > .95 ? v3(1, 0, 0) : UP).normalize();
		/** where flower k sits and faces: the king in the middle, the others round it on longer stalks */
		const flowerAt = (k) => {
			if (k === 0) return {
				d: up.clone(),
				len: .016
			};
			const side = sideOf.clone().applyAxisAngle(up, k / (n - 1) * Math.PI * 2 + fr() * .4);
			return {
				d: up.clone().multiplyScalar(.55).addScaledVector(side, .85).normalize(),
				len: .024 + fr() * .008
			};
		};
		if (blooming) for (let k = 0; k < n; k++) {
			const { d, len } = flowerAt(k);
			const end = s.at.clone().addScaledVector(d, len);
			const o = opens + (k ? .03 + k * .022 : 0);
			const open = clamp((g - o) / .12);
			const fall = span(g, o + .42, o + .62);
			const kept = k < s.spur.keep;
			if (fall >= 1 && (!kept || g > 5.55)) continue;
			bag.add("body", tube([s.at, end], () => 9e-4, () => C.pedicel, 3));
			const face = d.clone().lerp(UP, .15).normalize();
			if (open <= 0) {
				const bud = .0042 + .0018 * clamp((g - (o - .3)) / .3);
				bag.add("body", bead(end.clone().addScaledVector(face, bud), v3(bud * .85, bud * 1.15, bud * .85), "#cf4f78", 3, new three.Quaternion().setFromUnitVectors(UP, face)));
				continue;
			}
			flower(bag, end, face, open, fall, .6 + fr() * .4, fr() * Math.PI);
			if (fall > .3 && !kept) bag.add("body", bead(end.clone().addScaledVector(face, .003), v3(.003, .004, .003), "#8aa64a", 2));
		}
		if (!fruiting) continue;
		const drop = span(g, 5.6, 6.3);
		for (let k = s.spur.keep; k < n && drop < 1; k++) {
			const { d, len } = flowerAt(k);
			const end = s.at.clone().addScaledVector(d, len);
			const f = .004 * (1 - drop);
			if (f > 8e-4 && g > 5.75) bag.add("body", bead(end, v3(f, f * 1.2, f), mix("#8aa64a", "#b0a050", drop), 2));
		}
		for (let k = 0; k < s.spur.keep; k++) {
			const kr = chance(seed, "apple-fruit", ...s.spur.key, k);
			const size = about(kr, 1, .1) * lerp(.12, 1, set) * (k === 0 ? 1.04 : 1);
			const Lf = .066 * size, W = .04 * size;
			const { d } = flowerAt(k);
			const stalk = .022 + kr() * .01;
			const start = s.at.clone().addScaledVector(d, stalk * .45);
			const swing = d.clone().setY(0);
			if (swing.lengthSq() < 1e-6) swing.set(Math.cos(k * 2.4), 0, Math.sin(k * 2.4));
			swing.normalize();
			const hang = v3(0, -1, 0).lerp(d, clamp(.85 - set * 1.4)).addScaledVector(swing, .35).normalize();
			const from = start.clone().addScaledVector(hang, stalk * .55);
			const place = space.settle(from, hang, (a, dd) => [.32, .68].map((t) => ({
				c: a.clone().addScaledVector(dd, Lf * t),
				r: W * .93
			})), stalk * .9 + W * .6);
			bag.fruit([...s.spur.key, k], s.at, place.dir);
			bag.add("body", tube([
				s.at,
				start,
				place.at
			], (u) => .0011 + 7e-4 * set * (1 - .4 * u), () => C.stalk, 3));
			const out = clamp(Math.hypot(place.at.x, place.at.z) / 2.2) * .5 + clamp((place.at.y - 1.4) / 3) * .5;
			appleFruit(bag, {
				at: place.at,
				dir: place.dir,
				L: Lf,
				W,
				ripe,
				sun: kr() * Math.PI * 2,
				blush: lerp(.55, 1, out) * about(kr, 1, .12)
			});
			bag.fruitDone();
		}
	}
	const leafPaint = (r) => {
		const tone = r();
		const ground = r() < .09 ? new three.Color().lerpColors(C.under, C.under2, tone) : tone < .4 ? new three.Color().lerpColors(C.dark, C.mid, tone / .4) : new three.Color().lerpColors(C.mid, C.light, (tone - .4) / .6);
		const young = new three.Color().lerpColors(C.young, C.young2, tone);
		const c = ground.lerp(young, leafYoung * .8);
		const rib = c.clone().lerp(C.rib, .35);
		return (u, v) => u < .25 || Math.abs(v) < .1 ? rib : c;
	};
	/** a leaf at p reaching out along `out` (level), raised by `lift` @param {Chance} r */
	const leaf = (p, out, lift, size, r) => {
		const len = .11 * size * between(r, .82, 1.12);
		let o = out.clone().setY(0);
		if (o.lengthSq() < 1e-6) o.set(1, 0, 0);
		o.normalize();
		if (fruiting && space.fruitNear(p)) o = space.steer(p, o, lift, len, .012);
		const dir = o.clone().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0));
		bag.add("sheet", sheet({
			length: len,
			width: len * .25,
			shape: LEAF,
			lift: (u) => -.07 * u * u,
			paint: leafPaint(r),
			along: 4,
			across: 1
		}), aim(p, dir, (r() - .5) * 2.4));
	};
	const seedling = lerp(.35, 1, clamp(Y));
	for (const sh of leafy) {
		const lr = chance(seed, "apple-leaves", ...sh.key);
//#piece 0988be1ab7ee2b53e8d300045052b36bda76ad579505e46fb6213e15c0d35ef1
		let s = Math.max(.02, sh.from);
		let i = 0;
		let phyl = lr() * Math.PI * 2;
		while (s < total - .005) {
//#piece 262e37a32254f97590f273c1970976a1df00ce27fe9ef6e8f92c0147de4407fd
			phyl += 2.51;
			const side = new three.Vector3().crossVectors(d, Math.abs(d.y) > .95 ? v3(1, 0, 0) : UP).normalize().applyAxisAngle(d, phyl);
			const toTip = (total - s) / .12;
			const size = leafSize * seedling * lerp(.5, 1, clamp(toTip));
			leaf(p, side.clone().addScaledVector(d, .6), lerp(.55, between(lr, -.35, .25), clamp(toTip)), size, lr);
			s += (sh.twig ? .03 : .038) * about(lr, 1, .2);
		}
	}
	for (const s of spurs) {
		const lr = chance(seed, "apple-rosette", ...s.spur.key);
		const n = 5 + Math.floor(lr() * 3);
		const side = new three.Vector3().crossVectors(s.dir, Math.abs(s.dir.y) > .95 ? v3(1, 0, 0) : UP).normalize();
		const age = clamp((Y - s.spur.born) / .6);
		for (let k = 0; k < n; k++) {
			const out = side.clone().applyAxisAngle(s.dir, k / n * Math.PI * 2 + lr() * .5).addScaledVector(s.dir, .4);
			leaf(s.at, out, between(lr, -.45, .6), leafSize * .78 * lerp(.4, 1, age), lr);
		}
	}
	if (g > 8.4) {
		const wr = chance(seed, "apple-windfalls");
		const n = Math.round(4 + wr() * 5) * clamp((g - 8.4) / .5);
		for (let k = 0; k < n; k++) {
			const a = wr() * Math.PI * 2, rr = between(wr, .6, 2.2);
			const W = .038 * about(wr, 1, .1);
			appleFruit(bag, {
				at: v3(Math.cos(a) * rr, W * .92, Math.sin(a) * rr).clone().add(v3(0, W * .9, 0)),
				dir: v3(wr() - .5, -1, wr() - .5).normalize(),
				L: .066 * (W / .04),
				W,
				ripe: 1,
				sun: wr() * 6.28,
				blush: .8
			});
		}
	}
	return bag.build();
}
/**
* One apple blossom: five rounded petals, white flushed pink, opening from a cup to flat; a boss of yellow stamens.
* @param {Bag} bag @param {THREE.Vector3} at @param {THREE.Vector3} facing @param {number} open @param {number} fall @param {number} pink @param {number} spin
*/
function flower(bag, at, facing, open, fall, pink, spin) {
//#piece e12f1061058e5bcbb15c9be8677913ebfa5b2ca59d2707a5ed8925007c029f11
	if (fall < 1) {
		const petal = () => sheet({
			length: .024 * lerp(.5, 1, open),
			width: .009 * lerp(.5, 1, open),
			shape: PETAL,
			lift: (u, v) => .18 * u * u + .06 * v * v,
			paint: (u) => PETAL_C.c.lerpColors(PETAL_C.white, PETAL_C.pink, clamp(pink * (.1 + u * u * .8) * (1.2 - open * .7))),
			along: 3,
			across: 1
		});
		for (let k = 0; k < 5; k++) {
			const up = lerp(1.2, .18, open) - fall * .9;
			const turn = new three.Matrix4().makeRotationY(-(k / 5 * Math.PI * 2 + spin)).multiply(new three.Matrix4().makeRotationZ(up));
			bag.add("sheet", petal(), m.clone().multiply(turn).multiply(new three.Matrix4().makeScale(1 - fall * .5, 1, 1 - fall * .5)));
		}
	}
	bag.add("body", bead(v3(0, .0016, 0).applyMatrix4(m), v3(.0045, .0018, .0045), fall > .4 ? "#a89a4a" : "#e9cf55", 2));
}
/**
* An apple hanging from `at` along `dir`: yellow-green ripening to yellow, flushed and streaked red on its sunny side,
* its eye at the bottom.
* @param {Bag} bag
* @param {{ at: THREE.Vector3, dir: THREE.Vector3, L: number, W: number, ripe: number, sun: number, blush: number }} o
*/
function appleFruit(bag, o) {
	const m = new three.Matrix4().compose(o.at, new three.Quaternion().setFromUnitVectors(v3(0, -1, 0), o.dir.clone().normalize()).multiply(new three.Quaternion().setFromAxisAngle(UP, o.sun)), v3(1, 1, 1));
	const axis = [];
	const rings = 7;
	for (let k = 0; k <= rings; k++) axis.push(v3(0, o.W * .12 - k / rings * o.L, 0));
	const { green, yellow, red, deep } = C;
	const colour = (u, v) => {
		const ground = green.clone().lerp(yellow, clamp(o.ripe * 1.2));
		const sunny = .5 + .5 * Math.cos(v * Math.PI * 2);
		const streak = .78 + .22 * Math.abs(Math.sin(v * Math.PI * 26 + u * 3));
		const cover = clamp((o.ripe * 1.6 - .2) * o.blush * (.85 + .5 * sunny) * streak * (1 - .25 * u * u));
		return ground.lerp(red, cover).lerp(deep, clamp((cover - .8) * 1.5 * sunny * (1 - streak + .3)));
	};
	bag.add("gloss", tube(axis, (u) => o.W * APPLE(u), colour, 8), m);
	bag.add("body", bead(v3(0, o.W * .12 - o.L * .985, 0), v3(o.W * .16, o.W * .06, o.W * .16), "#4e3e26", 2), m);
}

//#endregion
//#region src/lib/plants/trees.js
/** a description frozen through and through, so a version kept cannot change @template T @param {T} o @returns {T} */
function deepFreeze(o) {
	if (o && typeof o === "object" && !Object.isFrozen(o)) {
		Object.freeze(o);
		for (const v of Object.values(o)) if (!(v instanceof three.Vector3)) deepFreeze(v);
	}
	return o;
}
//#piece 392508ba4674449525343a74c1c3dcb051789ec7cdc025e799d3f84d0b958855
/** an ovate leaf with a toothed edge (the apple's) */
//#piece 451da356fddf36473723e68c65bb3e9dc96e21e21ddad6ff2bf1dcaf9e01c61c
//#piece d8f61b5f54f8fa903d569238df9fc6aff2ad4ec7fbb8fb5ef59d267912091d6e
const APPLE_BASE = /* @__PURE__ */ (() => ripening("#8cb84a", "#c9d05a", "#e6d36a"))();
const APPLE_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Pip",
		0,
		"A brown teardrop pip, chilled through the winter, a centimetre down."
	],
	[
		"Germination",
		20,
		"The radicle goes down, the hook comes up; the seed leaves lift out of the soil."
	],
	[
		"Seedling",
		35,
		"Two oval seed leaves and the first toothed true leaves."
	],
	[
		"Sapling",
		365,
		"A slender red-brown whip, its oval leaves soft and downy beneath."
	],
	[
		"Young tree",
		1460,
		"A clear trunk, tiers of scaffold limbs and laterals along them; the first knobbly spurs, each a rosette of leaves."
	],
	[
		"Blossom",
		2200,
		"On every spur a rosette of young leaves and a cluster of five or six: deep pink buds, the king flower in the middle opening first, white flushed pink."
	],
	[
		"Fruit set",
		2215,
		"The petals fall; the king fruit and one or two others swell, the rest drop in the June drop."
	],
	[
		"Green apples",
		2260,
		"Hard green apples hanging on their short stalks among the leaves."
	],
	[
		"Colouring",
		2300,
		"The sunny side flushes red, the ground colour turns from green to yellow."
	],
	[
		"Ripe",
		2320,
		"Hundreds of red-striped apples in clusters, the laterals bowed under them; they come away with a lift and a twist."
	]
]))();
/** its description at v1, frozen: ./orchard.v1.js grows it (the apple's history, ./index.js); v2 is ./apple.js
* @type {import('./orchard.js').Orchard} */
const APPLE_V1 = /* @__PURE__ */ (() => deepFreeze({
	seed: {
		size: v3(.004, .0022, .002),
		coat: "#5a3a22",
		shade: "#3a2414",
		depth: .01
	},
	hypogeal: false,
	cotyledon: {
		length: .012,
		width: .0045,
		colour: "#6aa046"
	},
	flush: {
		trunk: .75,
		trunkBorn: 1.6,
		trunkFlush: 1.4,
		scaffolds: [3, 4],
		scaffoldAngle: .88,
		gens: 6,
		flush: .28,
		rest: .27,
		shoot: (gen) => [
			0,
			1.15,
			.8,
			.58,
			.42,
			.34,
			.28
		][gen] ?? .28,
		whorl: [2, 3],
		spread: .6,
		up: .035,
		droop: .06,
		wander: .1,
		radius: .12,
		taper: .6,
		thicken: 4,
		bark: ["#7d6a4c", "#5a4a3e"]
	},
	roots: {
		tap: 1.2,
		spread: 2,
		count: 16,
		radius: .04
	},
	leaf: {
		length: .09,
		width: .055,
		shape: toothed,
		colour: "#3f6f2e",
		young: "#8ab45a",
		style: "along",
		per: 0,
		droop: .3
	},
	flower: {
		kind: {
			petals: 5,
			length: .017,
			width: .012,
			colour: "#fbe9ec",
			heart: "#e8d06a",
			sepals: 5,
			sepal: .007,
			stamens: 18,
			stamenColour: "#f0d060"
		},
		size: 1.2,
		opens: 4.6,
		sites: "tips",
		chance: .45,
		per: [4, 6]
	},
	fruit: {
		length: .07,
		width: .042,
		stalk: .035,
		keep: [1, 2],
		setFor: 1.9,
		ripeFrom: 2.8,
		ripeFor: 1,
		gloss: true,
		calyx: "#5a4a2e",
		shape: (u) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), .42) * (1 - .14 * u),
		colour: (ripe, u, v) => APPLE_BASE(ripe).lerp(new three.Color("#b8232f"), clamp(ripe * 1.3 - .2) * (.55 + .45 * Math.max(0, Math.cos(v * Math.PI * 2))) * (.75 + .25 * Math.abs(Math.sin(v * Math.PI * 28))))
	}
}))();
/** the apple as it grows now: a half-standard grown branch by branch (./apple.js) */
const apple = apple$1;
//#piece 733ca5d30663b44e498ffd51c5913b2ba3f0995f65a37826037ae038e9a02b8f
	id: "apple",
	label: "Apple",
	latin: "Malus domestica · Apfel",
	note: "From a pip to an open crown on scaffold limbs: toothed leaves, clusters of pink-budded white blossom, apples flushing red on the sunny side.",
	from: "Tree · 6 years",
	stages: APPLE_STAGES,
	grow: apple
//#piece 35171bffb608ead070eb23e7bc8d1d229032839d59049e6db39550def1097bf9
const HISTORY = /* @__PURE__ */ (() => ({ apple: [{
	...FIRST,
	build: orchard(APPLE_V1)
}, {
	v: 2,
	date: "2026-10-06",
	note: "Dense round crown on a clear trunk; blossom and apples in clusters on spurs"
//#piece 95a310e13553b7ae81407819aa70625e511d8f80bfa2c5053c9b0b4b6aba4ef5

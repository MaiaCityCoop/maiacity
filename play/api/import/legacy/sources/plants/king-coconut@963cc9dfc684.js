//#piece 9cdd83f192deb45a8343feb449b6888a5c058dc15b91b9cfc4ba9940379445c1
//#piece 222d2f2ca6675aacdeb0e2554c54c82e7bf4a0f80921aadf89ef2757169e7456
*/
function tube(points, radius, paint, sides = 6) {
	if (DETAIL.finest > 0 && Math.max(radius(0, 0), radius(.5, 0)) < DETAIL.finest) return made$1([], [], [], [], [], false);
//#piece 1412557b7e2c5a97f9d279ddac124cf4d9d1df9a42cec6b04fd7b14a9f99c43a
	}
//#piece 006b5fa9b50203781d9427ff022bc078a270f9bd116ea7604dff9ba41f0c6894
	}
	return made$1(pos, nor, uv, col, idx, false);
}
/**
//#piece 8a8d2a33018433ad62bcea9d2ab2d8af0e8b6da037be9e2455ff22d62e92a8b4
*/
//#piece 8bcc60705cee4006deeb8fb75270eb977b7082e2984edab9788872eaed908660
	}
	return made$1(pos, nor, uv, col, idx, true);
//#piece eb5059ee1ce6fc4934bc2c5e93b94200f2f9c209e0f18c0affa4a14e9dd1fbc8
*/
//#piece b150a06f398f5f9cbdcafe39d1a607e58386a4e2a2dcdf151eb8c1779cc73d28
	nor.needsUpdate = true;
	return geo;
}
/** @returns {THREE.BufferGeometry} */
function made$1(pos, nor, uv, col, idx, flat) {
//#piece 4ee51323a0eb1c52a260688a9cae66e86df9102d9f9a94eac27287edf3844fa5
//#piece d23917b620e70c614fbde138743f47d67ef6f436995126287d7f043ecc52360b
*/
//#piece 2a4e2ec0748ed20ecd1dcd2254c6acb594d75ce2d3d54109d97c5826a1a0f3e9
//#piece 802d96f69ffb4276391e41621fedc8ceabbaf377d9ddf9d9e35ee7627df28fb8
//#region src/lib/plants/coconut.js
const STAGES = [
	{
		name: "Seed nut",
		day: 0,
		note: "The whole golden husked nut, laid on its side half sunk in moist soil: the seed of a palm is its fruit."
	},
	{
		name: "Germination",
		day: 120,
		note: "A pointed spike breaks out of the nut’s stem end, roots push down through the husk."
	},
	{
		name: "Seedling",
		day: 240,
		note: "The first leaves, whole and split only at their tip; the seedling still feeds on the nut."
	},
	{
		name: "Young palm",
		day: 540,
		note: "Its leaves start to split into leaflets; the nut beside it, spent, rots away."
	},
	{
		name: "Juvenile",
		day: 1100,
		note: "A broad base, no trunk yet, a fountain of pinnate fronds two metres long."
	},
	{
		name: "Flowering",
		day: 2e3,
		note: "A grey trunk ringed with leaf scars; boat-shaped spathes split and the cream flower spikes open."
	},
	{
		name: "Fruit set",
		day: 2100,
		note: "Green-gold buttons set on the branched spikes; many drop, the best hold on."
	},
	{
		name: "Young nuts",
		day: 2250,
		note: "Bunches of bright golden-orange nuts, full of sweet water: the king coconut’s drinking stage."
	},
	{
		name: "Maturing",
		day: 2380,
		note: "The nuts fill their shells with white meat, a new bunch every month above them."
	},
	{
		name: "Ripe",
		day: 2480,
		note: "Heavy bunches dulling to orange-brown under a crown of thirty fronds; the palm keeps fruiting for decades."
	}
];
/** the nut lies along +X, its stem end (where it sprouts) at +X */
const NUT_AT = /* @__PURE__ */ (() => v3(-.1, -.035, 0))();
const BASE = /* @__PURE__ */ (() => v3(.02, 0, .01))();
/** how many fronds the palm has made by g, all told */
const made = (g) => table(g, [
	[1, 0],
	[1.6, 1],
	[2, 2],
	[3, 6],
	[4, 13],
	[5, 24],
	[6, 36],
	[7, 48],
	[8, 60],
	[9, 72]
]);
/** how many it holds at once */
const holds = (g) => table(g, [
	[1, 0],
	[1.6, 1],
	[2, 2],
	[3, 5],
	[4, 10],
	[5, 18],
	[6, 24],
	[7, 28],
	[9, 30]
]);
/** when frond j was made */
function bornAt(j) {
	let lo = 1, hi = 9;
	for (let i = 0; i < 30; i++) {
		const mid = (lo + hi) / 2;
		if (made(mid) > j) hi = mid;
		else lo = mid;
	}
	return hi;
}
/**
* The king coconut at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g
* @param {string} seed
*/
function coconut(g, seed) {
	const bag = new Bag();
	const r = chance(seed, "plant");
	const vigour = about(r, 1, .08);
	const rot = span(g, 3.2, 4.4);
	if (rot < 1) nut(bag, {
		seed,
		key: ["seed"],
		at: NUT_AT,
		dir: v3(1, -.08, 0).normalize(),
		size: 1 - rot * .25,
		grown: 1,
		colour: mix("#c8853a", "#5a4630", rot)
	});
	const roots = Math.round(table(g, [
		[.4, 0],
		[1, 4],
		[2, 9],
		[3, 16],
		[5, 34],
		[7, 48],
		[9, 56]
	]));
	for (let i = 0; i < roots; i++) {
		const rr = chance(seed, "palm-root", i);
		const born = i < 4 ? .4 + i * .12 : bornRoot(i);
		const bear = i * 2.39996 + rr() * .4;
		const fromNut = i < 4;
		const from = fromNut ? NUT_AT.clone().add(v3(.04 + i * .03, -.06, (rr() - .5) * .05)) : BASE.clone().add(v3(Math.cos(bear) * .06 * lerp(1, 2.5, span(g, 4, 7)), -.03 - rr() * .06, Math.sin(bear) * .06 * lerp(1, 2.5, span(g, 4, 7))));
		root(bag, {
			seed,
			key: ["palm", i],
			from,
			dir: fromNut ? v3((rr() - .5) * .4, -1, (rr() - .5) * .4) : v3(Math.cos(bear), -between(rr, .3, 1.1), Math.sin(bear)),
			length: fromNut ? .45 : between(rr, 1.2, 2.4) * vigour,
			grown: (g - born) / 2.4,
			radius: fromNut ? .003 : .0045,
			down: .025,
			wander: .12,
			laterals: 4,
			lateral: .18,
			depth: 1,
			age: (g - born - .6) / 2.5,
			young: "#efd2a6",
			old: "#b5683a"
		});
	}
	const H = table(g, [
		[3.8, 0],
		[4.4, .12],
		[5, 1.5],
		[6, 3.3],
		[7, 5],
		[8, 6.5],
		[9, 7.8]
	]) * vigour;
	const lean = chance(seed, "lean");
	const leanTo = v3(Math.cos(lean() * 6.283), 0, Math.sin(lean() * 6.283));
	const bow = between(lean, .04, .1);
	const trunkAt = (u) => BASE.clone().addScaledVector(leanTo, Math.sin(u * 1.4) * bow * H).add(v3(0, u * H, 0));
	const bole = lerp(.03, .17, span(g, 1.8, 6)) * vigour;
	const sr = chance(seed, "scars");
	const scars = [.25];
	while (scars[scars.length - 1] < 9) scars.push(scars[scars.length - 1] + between(sr, .07, .13));
	/** how far from the nearest scar a height is (above it +, below it −), and the scar's own depth */
	const nearest = (h) => {
		let lo = 0, hi = scars.length - 1;
		while (hi - lo > 1) {
			const mid = lo + hi >> 1;
			if (scars[mid] > h) hi = mid;
			else lo = mid;
		}
		const a = h - scars[lo], b = h - scars[hi];
		return Math.abs(a) < Math.abs(b) ? a : b;
	};
	/** what is where: the trunk, then the nuts, so none grows through the trunk or another */
	const space = bag.space;
	if (g > 1.6) {
		const ht = Math.max(.05, H);
		const n = Math.max(24, Math.min(700, Math.round(ht / .012)));
		const pts = [];
		for (let k = 0; k <= n; k++) pts.push(trunkAt(k / n));
		if (H > .3) space.rod(pts, bole * 1.05);
		bag.add("body", tube(H > .02 ? pts : [BASE.clone().add(v3(0, -.05, 0)), BASE.clone().add(v3(0, bole * .8, 0))], (u, v) => {
			const h = u * ht;
			const body = bole * (1 + .7 * Math.pow(1 - Math.min(1, h / .8), 2)) * (1 - .28 * u + .12 * Math.pow(u, 6));
			const d = nearest(h);
			return body * (1 + (h > .2 ? -.035 * Math.exp(-Math.pow(d / .006, 2)) + .03 * Math.exp(-Math.pow((d - .014) / .01, 2)) : 0) + .008 * Math.sin(v * Math.PI * 2 * 9 + h * 3));
		}, (u, v) => {
			const h = u * ht;
			const d = nearest(h);
			const scar = h > .2 ? Math.exp(-Math.pow(d / .007, 2)) : 0;
			const lip = h > .2 ? Math.exp(-Math.pow((d - .016) / .012, 2)) : 0;
			return mix(mix("#8d8476", "#7a6a52", clamp((u - .7) / .3)), "#6c5f4c", Math.pow(Math.abs(Math.sin(v * Math.PI * 2 * 23 + h * 1.7)), 12) * .6).lerp(new three.Color("#463d33"), scar * .75).lerp(new three.Color("#aaa08e"), lip * .35).lerp(new three.Color("#6b7a3c"), clamp(1 - H / .4) * .6);
		}, 22));
		if (H > .3) {
			const boot = [trunkAt(Math.max(0, 1 - .45 / ht)), trunkAt(1).add(v3(0, .12, 0))];
			bag.add("body", tube(boot, (u) => bole * (.98 + .25 * Math.sin(Math.PI * u)), (u, v) => mix("#7a5f3e", "#9a8358", Math.abs(Math.sin(v * 40 + u * 9))), 18));
		}
	}
	const crown = H > .02 ? trunkAt(1) : BASE.clone().add(v3(0, g < 1.6 ? 0 : bole * .6, 0));
	const spike = span(g, .25, 1.4);
	const sprouting = NUT_AT.clone().add(v3(.11, .05, 0));
	if (spike > 0 && g < 2.2) {
		const top = (g < 1.6 ? sprouting : crown).clone().add(v3(0, .02 + .2 * spike, 0));
		bag.add("body", tube([g < 1.6 ? sprouting : crown, top], (u) => .02 * (1 - u * .85) * lerp(.4, 1, spike), (u) => mix("#c9a45a", "#7fa046", u), 8));
	}
	const total = made(g);
	const live = holds(g);
	for (let j = Math.max(0, Math.floor(total - live - 1)); j < Math.ceil(total); j++) {
		const age = (total - j) / Math.max(1, live);
		if (age < 0 || age > 1.05) continue;
		const born = bornAt(j);
		frond(bag, {
			seed,
			j,
			at: g < 1.6 ? sprouting : crown,
			age,
			opened: clamp((total - j) / 1.2),
			born,
			g,
			vigour
		});
	}
	for (let b = 0; b < 7; b++) {
		const opens = 4.85 + b * .32;
		const phase = g - opens;
		if (phase < -.3 || H < .3) continue;
		bunch(bag, {
			seed,
			b,
			at: crown,
			phase,
			vigour,
			bear: made(opens) % 5 * 2.513 + b * 2.513,
			space,
			reach: bole
		});
	}
	return bag.build();
}
/** when a root from the base is made: a few a month */
const bornRoot = (i) => 1.4 + (i - 4) * .13;
/**
* A frond: its sheathing base, a long stalk, and its blade — while young whole and pleated, split only at its tip;
* on the grown palm cut into a hundred narrow leaflets each side, held in a shallow V, arching over.
* @param {Bag} bag
* @param {{ seed: string, j: number, at: THREE.Vector3, age: number, opened: number, born: number, g: number, vigour: number }} o
*/
function frond(bag, o) {
	const fr = chance(o.seed, "frond", o.j);
	const bear = o.j * 2.513 + about(fr, 0, .15);
	const out = v3(Math.cos(bear), 0, Math.sin(bear));
	const full = table(o.born, [
		[1, .35],
		[2, .6],
		[3, 1],
		[4, 2.1],
		[5, 3.6],
		[6, 4.7],
		[9, 5.4]
	]) * o.vigour;
	const len = full * lerp(.35, 1, o.opened);
	const tilt = lerp(.1, 1.55, Math.pow(clamp(o.age), .75)) + Math.max(0, o.age - .85) * 4 + about(fr, 0, .1);
	const dying = span(o.age, .82, 1.02);
	const pinnate = o.born > 3.1;
	const steps = 14;
	const pts = [o.at.clone()];
	let d = out.clone().multiplyScalar(Math.sin(tilt)).add(v3(0, Math.cos(tilt), 0)).normalize();
	const arch = .06 + .06 * o.age;
	for (let k = 0; k < steps; k++) {
		d = d.clone().add(v3(0, -arch * (k / steps) * (o.opened > .7 ? 1 : .3), 0)).normalize();
		pts.push(pts[k].clone().addScaledVector(d, len / steps));
	}
	const colour = (u) => mix(mix("#c4b25a", "#5f8a38", clamp(u * 3)), "#b98f4a", dying);
	bag.add("body", tube(pts, (u) => (.012 + .03 * clamp(full / 4)) * (1 - .8 * u), colour, 6));
	const along = (u) => {
		const f = u * steps, k = Math.min(13, Math.floor(f));
		return {
			p: pts[k].clone().lerp(pts[k + 1], f - k),
			t: pts[k + 1].clone().sub(pts[k]).normalize()
		};
	};
	const green = (u) => mix(mix("#3f7a2e", "#a7c25a", 1 - clamp(o.opened)), "#c7a24c", clamp(dying * 1.3 - u * .2));
	if (!pinnate) {
		for (const side of [-1, 1]) for (let k = 0; k < 6; k++) {
			const u0 = .3 + k * .115;
			const { p, t } = along(u0);
			const dir = new three.Vector3().crossVectors(t, v3(0, 1, 0)).normalize().multiplyScalar(side).multiplyScalar(.45).addScaledVector(t, .9).add(v3(0, .12, 0)).normalize();
			const l = len * (.36 - k * .03) * lerp(.4, 1, o.opened);
			bag.add("sheet", sheet({
				length: l,
				width: len * .05,
				shape: (u) => Math.sin(Math.PI * Math.pow(u, .7)) * .9 + .1,
				lift: (u, v) => .04 * v * v + (1 - o.opened) * .2 * Math.abs(v),
				paint: (u, v) => green(u0).lerp(new three.Color("#2f5f24"), Math.abs(v) > .7 ? .3 : 0),
				along: 6,
				across: 2
			}), aim(p, dir, side * .4));
		}
		return;
	}
	const pairs = Math.round(lerp(28, 70, clamp((o.born - 3) / 2)));
	for (let k = 0; k < pairs; k++) {
		const u0 = .18 + k / pairs * .8;
		const { p, t } = along(u0);
		const lengthHere = full * .24 * Math.pow(Math.sin(Math.PI * Math.min(1, .1 + k / pairs * .95)), .6) * lerp(.3, 1, o.opened);
		for (const side of [-1, 1]) {
//#piece c2f23e1b662555087324d8540ba1f88d1f1dea39e3916e91b7edf47e196fb13b
			const dir = across.multiplyScalar(.8).addScaledVector(t, .55).add(v3(0, .25 - o.age * .35 - dying * .5, 0)).normalize();
			bag.add("sheet", sheet({
				length: lengthHere,
				width: .018 + .006 * clamp(full / 4),
				shape: (u) => Math.sin(Math.PI * Math.pow(u, .55)) * (1 - .5 * u),
				lift: (u) => -.15 * u * u,
				paint: () => green(u0),
				along: 5,
				across: 1
			}), aim(p, dir, side * .35));
		}
	}
}
/**
* A bunch from a leaf axil: first a closed spathe, then the branched cream flower spike, then the buttons, then the nuts
* swelling, golden-orange, hanging below the crown on a long stalk.
* @param {Bag} bag
* @param {{ seed: string, b: number, at: THREE.Vector3, phase: number, vigour: number, bear: number, space: Space, reach: number }} o
*/
function bunch(bag, o) {
	const br = chance(o.seed, "bunch", o.b);
	const out = v3(Math.cos(o.bear), 0, Math.sin(o.bear));
	const heavy = span(o.phase, .6, 2.2);
	const stalkLen = .55 * lerp(.5, 1, clamp(o.phase + .3));
	const d = out.clone().multiplyScalar(.8).add(v3(0, lerp(.5, -.9, heavy), 0)).normalize();
	const start = o.at.clone().addScaledVector(out, o.reach * 1.25 + .03).add(v3(0, -.2, 0));
	const end = start.clone().addScaledVector(d, stalkLen);
	if (o.phase < 0) {
		const grow = clamp((o.phase + .3) / .3);
		bag.add("body", tube([start, start.clone().addScaledVector(d, .7 * grow)], (u) => .06 * Math.sin(Math.PI * Math.min(1, .15 + u * .85)) * grow, (u) => mix("#7d8a46", "#a07a42", u), 10));
		return;
	}
	bag.add("body", tube([
		start,
		start.clone().lerp(end, .5).add(v3(0, .05, 0)),
		end
	], (u) => .03 * (1 - .4 * u), () => mix("#c9a45a", "#8f7444", heavy), 7));
	if (o.phase < 1.5) bag.add("sheet", sheet({
		length: .75,
		width: .08,
		shape: (u) => Math.sin(Math.PI * Math.pow(u, .7)),
		lift: (u, v) => .3 * v * v,
		paint: () => mix("#a58a52", "#7a5a38", clamp(o.phase)),
		along: 8,
		across: 4
	}), aim(start, d.clone().add(v3(0, -.6, 0)).normalize()));
	const flowering = o.phase < .6;
	const rachillae = 12;
	const nuts = Math.round(lerp(18, 9 + br() * 6, span(o.phase, .4, 1.2)));
	for (let k = 0; k < rachillae; k++) {
		const a = k / rachillae * Math.PI * 2 + br() * .3;
		const spray = new three.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(.55).addScaledVector(d, .6).add(v3(0, -.2 * heavy, 0)).normalize();
		const tip = end.clone().addScaledVector(spray, .35 * lerp(.6, 1, clamp(o.phase * 2)));
		bag.add("body", tube([end, tip], (u) => .008 * (1 - .6 * u), () => flowering ? "#e9dca0" : "#b39a5a", 4));
		if (flowering) for (let m = 1; m <= 6; m++) bag.add("body", bead(end.clone().lerp(tip, m / 6.5), v3(.008, .008, .008), "#f2e6b8", 2));
	}
	for (let n = 0; n < nuts; n++) {
		const nr = chance(o.seed, "nut", o.b, n);
		const a = n * 2.39996;
		const ring = .08 + .08 * Math.sqrt(n / nuts);
		const grown = span(o.phase, .4, 1.9);
		const at = end.clone().add(v3(Math.cos(a) * ring * lerp(.6, 1.6, grown), -.06 - n % 4 * .05 * lerp(.3, 1.4, grown), Math.sin(a) * ring * lerp(.6, 1.6, grown)));
		const dir = at.clone().sub(end).add(v3(0, -.25, 0)).normalize();
		const ripe = span(o.phase, 2.2, 3.4);
		const size = lerp(.12, 1, grown) * about(nr, .9, .08) * o.vigour;
		const place = o.space.settle(at, dir, (a, d) => [{
			c: a.clone(),
			r: .23 * size * .38
		}], .08);
		if (grown > 0) bag.fruit([
			"bunch",
			o.b,
			n
		], place.at.clone().addScaledVector(place.dir, -.23 * size * .5), place.dir);
		nut(bag, {
			seed: o.seed,
			key: [
				"bunch",
				o.b,
				n
			],
			at: place.at,
			dir: place.dir,
			size,
			grown,
			colour: mix(mix("#c9b04a", "#f29a2e", clamp(grown * 1.5)), "#a8692e", ripe)
		});
		bag.fruitDone();
	}
}
/**
* A husked coconut: an ovoid, faintly three-cornered, pointed at its far end, a brown calyx at its stem end.
* @param {Bag} bag
* @param {{ seed: string, key: (string | number)[], at: THREE.Vector3, dir: THREE.Vector3, size: number, grown: number, colour: THREE.Color | string }} o
*/
function nut(bag, o) {
	const L = .23 * o.size;
	const R = L * .4;
	const q = new three.Quaternion().setFromUnitVectors(v3(1, 0, 0), o.dir.clone().normalize());
	const m = new three.Matrix4().compose(o.at, q, v3(1, 1, 1));
	const axis = [];
	for (let k = 0; k <= 22; k++) axis.push(v3(-L / 2 + k / 22 * L, 0, 0));
	const colour = new three.Color(o.colour);
	bag.add("gloss", tube(axis, (u, v) => R * Math.pow(Math.max(0, Math.sin(Math.PI * u)), .5) * (1 - .18 * u * u) * (1 + .05 * Math.cos(v * Math.PI * 6)), (u) => colour.clone().lerp(new three.Color("#e8c25a"), (1 - u) * .12), 22), m);
	bag.add("body", bead(v3(-L / 2 + .005, 0, 0), v3(.012, .03, .03).multiplyScalar(o.size + .2), "#7a5a32", 4), m);
//#piece 69f1d3d6a1a9ba606895e988f6b2d3bf22c7c85e9e9f4295855e80951be3b7da
	id: "king-coconut",
	label: "King coconut",
	latin: "Cocos nucifera 'King' · Thambili",
	note: "A palm from a whole golden nut: whole first leaves, then a ringed trunk and a crown of arching fronds, cream flower spikes and bunches of golden-orange nuts.",
	from: "Palm · 7 years",
	stages: STAGES,
	grow: coconut
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

//#piece 4dd285985d2bddab3999177a981f3d1c5d753ee66b62efce80404635e2087807
//#piece a10558115dd0d7def54813d8261f1ba80e98b89b2e3ec40b39d1579cd716fce1
//#region src/lib/plants/grape.js
const STAGES = [
	{
		name: "Pip",
		day: 0,
		note: "A small pear-shaped pip, chilled through the winter, a centimetre down."
	},
	{
		name: "Germination",
		day: 14,
		note: "The radicle goes down, the hook comes up."
	},
	{
		name: "Seedling",
		day: 30,
		note: "Two oval seed leaves and the first lobed, toothed true leaves."
	},
	{
		name: "First summer",
		day: 150,
		note: "A slender vine climbing its stake, a tendril opposite every leaf."
	},
	{
		name: "Trained",
		day: 730,
		note: "Pruned to one woody trunk up the post and two arms along the wire, short spurs on the arms."
	},
	{
		name: "Flowering",
		day: 1100,
		note: "Green shoots up between the catch wires; tiny green flowers in clusters shed their caps."
	},
	{
		name: "Fruit set",
		day: 1110,
		note: "Clusters of hard little green berries set, opposite the third and fourth leaves."
	},
	{
		name: "Green berries",
		day: 1150,
		note: "The bunches swell and close up, berry pressed to berry, still green and sour."
	},
	{
		name: "Véraison",
		day: 1190,
		note: "Berry by berry they soften and turn: green, pink, red, the bunch speckled."
	},
	{
		name: "Ripe",
		day: 1220,
		note: "Deep red-purple bunches dusted with bloom, sweet: the harvest."
	}
];
const POST = /* @__PURE__ */ (() => v3(.04, 0, -.03))();
const WIRE = .9;
/** a vine leaf's edge: five lobes with deep sinuses, toothed, the stalk in a notch at its base */
function vineLeaf(a) {
	const tips = [
		[0, 1],
		[.95, .88],
		[-.95, .88],
		[1.95, .6],
		[-1.95, .6]
	];
	let reach = 0;
	for (const [at, size] of tips) reach = Math.max(reach, size * (1 - .48 * Math.min(1, Math.abs(a - at) / .48)));
	return reach * (1 + .06 * Math.abs(Math.sin(a * 26)));
}
/**
* The grapevine at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g
* @param {string} seed
*/
function grape(g, seed) {
//#piece c6508f61bffd24fe2de7528d54a8ccad9b8494ff3685b73fe5ff4887623c1c1d
		size: v3(.003, .0018, .002),
		coat: "#7a5232",
		coatShade: "#4a3020",
//#piece 235e4c15e55653826ef0ac6943af682acfa7160af59a8dae07e337e196c328fa
		radius: .001 + .001 * span(g, 1, 3),
		stemColor: "#8a9a4a",
		leaf: {
			length: .012,
			width: .005,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .75)), .65),
			color: "#6aa046",
			vein: "#a6c47e"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.6),
		wither: span(g, 3, 3.8)
	});
	root(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(.02, -1, 0),
		length: 1.2,
		grown: table(g, [
			[0, 0],
			[.3, .005],
			[1, .03],
			[2, .08],
			[3, .25],
			[4, .6],
			[6, 1]
		]),
		radius: .003 + .02 * span(g, 3, 8),
		down: .03,
		wander: .15,
		laterals: 10,
		lateral: .35,
		depth: 2,
		age: span(g, 2, 7),
		young: "#f1e4c8",
		old: "#6a4a32"
	});
	for (let i = 0; i < 12; i++) {
		const rr = chance(seed, "feeder", i);
		const a = i * 2.39996;
		root(bag, {
			seed,
			key: ["feeder", i],
			from: at.clone().add(v3(0, -.05 - rr() * .1, 0)),
			dir: v3(Math.cos(a), -.35, Math.sin(a)),
			length: between(rr, .5, .9),
			grown: (g - 3 - i * .1) / 2.5,
			radius: .006,
			down: .02,
			wander: .15,
			laterals: 5,
			depth: 2,
			age: (g - 4 - i * .1) / 2,
			young: "#efdcb8",
			old: "#6a4a32"
		});
	}
	if (g >= 3) {
		bag.add("prop", tube([POST.clone().add(v3(0, -.3, 0)), POST.clone().add(v3(0, 1.6, 0))], () => .035, (u, v) => mix("#8a6a4a", "#a0845c", Math.abs(Math.sin(v * 40 + u * 3))), 10));
		for (const [y, z] of [
			[WIRE, 0],
			[1.2, .04],
			[1.2, -.04],
			[1.5, .04],
			[1.5, -.04]
		]) bag.add("prop", tube([v3(-1.1, y, z - .03), v3(1.1, y, z - .03)], () => .0015, () => "#9a9a98", 4));
	}
	const young = span(g, 2, 3.6);
	const trained = span(g, 3.6, 4.6);
	if (g > 2 && trained < 1) {
		const len = (.05 + .85 * young) * (1 - trained);
		const pts = [s.top.clone()];
		for (let k = 1; k <= 12; k++) pts.push(s.top.clone().add(v3(Math.sin(k * .9) * .012, k / 12 * len, Math.cos(k * .9) * .01)));
		bag.add("body", tube(pts, (u) => .003 * (1 - .5 * u), () => "#8a9a4a", 5));
		for (let k = 0; k < Math.floor(len / .08); k++) leaf(bag, seed, ["young", k], pts[Math.min(12, Math.round((k + 1) * .08 / len * 12))], k * Math.PI + .3, .7, 1);
	}
	if (trained <= 0) return bag.build();
	const base = s.top.clone();
	const trunkTop = v3(POST.x - .045, .88, POST.z + .02);
	const tr = [
		base,
		base.clone().lerp(trunkTop, .4).add(v3(.01, 0, 0)),
		base.clone().lerp(trunkTop, .75).add(v3(-.012, 0, .006)),
		trunkTop
	];
	const wood = lerp(.01, .035, span(g, 3.6, 9));
	bag.add("body", tube(tr, (u) => wood * (1 - .25 * u), (u, v) => mix("#6a4a32", "#8a6a4a", Math.pow(Math.abs(Math.sin(v * 30 + u * 9)), 4)), 10));
	const arm = .8 * trained * vigour;
	for (const side of [-1, 1]) {
		const ap = [trunkTop.clone()];
		for (let k = 1; k <= 10; k++) ap.push(trunkTop.clone().add(v3(side * (k / 10) * arm, Math.sin(k * .6) * .008 + .01, Math.cos(k * .8) * .006)));
		bag.add("body", tube(ap, (u) => wood * .7 * (1 - .4 * u), () => "#7a5a3c", 8));
		for (let sp = 0; sp < 4; sp++) {
			const u = .2 + sp * .24;
			if (u * .8 > arm) break;
			const spur = trunkTop.clone().add(v3(side * u * .8 * vigour, .03, 0));
			bag.add("body", bead(spur, v3(.012, .02, .012), "#6a4a32", 4));
			for (let sh = 0; sh < 2; sh++) shoot(bag, seed, [
				side,
				sp,
				sh
			], spur.clone().add(v3(sh * .02 - .01, .01, 0)), g, vigour);
		}
	}
	return bag.build();
}
/**
* A grape leaf at a node: on its long stalk, five-lobed, toothed, facing out to the light.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} at @param {number} bear @param {number} size @param {number} grown
*/
function leaf(bag, seed, key, at, bear, size, grown) {
	const lr = chance(seed, "vine-leaf", ...key);
	const out = v3(Math.cos(bear), 0, Math.sin(bear));
	const stalk = at.clone().addScaledVector(out, .06 * size * lerp(.3, 1, grown)).add(v3(0, .02 * size, 0));
	bag.add("body", tube([at, stalk], () => .0012, () => "#8a9a4a", 4));
	const tilt = lerp(.8, between(lr, -.6, -.2), grown);
	const facing = out.clone().multiplyScalar(Math.cos(tilt)).add(v3(0, Math.sin(tilt), 0)).normalize();
	bag.add("sheet", fan({
		size: .075 * size * lerp(.25, 1, grown),
		from: -Math.PI + .45,
		to: Math.PI - .45,
		edge: vineLeaf,
		lift: (s, a) => -.1 * s * s + .015 * Math.cos(a * 5) * s + (1 - grown) * .3 * s * Math.abs(Math.sin(a)),
		paint: (s, a) => mix(mix("#3f6f2e", "#8ab45a", 1 - grown), "#9cc06e", [
			0,
			.95,
			-.95,
			1.95,
			-1.95
		].some((t) => Math.abs(a - t) < .04) ? .5 * (1 - s) : 0),
		rings: 7,
		rays: 48
	}), aim(stalk.clone().addScaledVector(facing, -.008), facing, about(lr, 0, .2)));
}
/**
* A spring shoot from a spur: up between the catch wires, a leaf at each node, tendrils opposite, the flower clusters
* opposite its third and fourth leaves — then the bunches.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} from @param {number} g @param {number} vigour
*/
function shoot(bag, seed, key, from, g, vigour) {
	const sr = chance(seed, "shoot", ...key);
	const born = 4.4 + sr() * .2;
	if (g <= born) return;
	const len = (.15 + .95 * span(g, born, 7)) * vigour * about(sr, 1, .1);
	const lean = v3((sr() - .5) * .25, 1, (sr() - .5) * .15).normalize();
	const pts = [from.clone()];
	for (let k = 1; k <= 14; k++) {
		const u = k / 14;
		pts.push(from.clone().addScaledVector(lean, u * len).add(v3(Math.sin(u * 7 + sr()) * .012, 0, 0)));
	}
	bag.add("body", tube(pts, (u) => .0055 * (1 - .5 * u), (u) => mix(g > 7.8 ? "#8a6a3a" : "#7a8a3a", "#a6bc5a", u), 5));
	const nodes = Math.floor(len / .075);
	for (let k = 0; k < nodes; k++) {
		const p = pts[Math.min(14, Math.round((k + .6) * .075 / len * 14))];
		const bear = (k % 2 ? 0 : Math.PI) + (key[0] === 1 ? .25 : -.25) + about(sr, 0, .2);
		const grown = clamp((len - k * .075) / .25);
		leaf(bag, seed, [...key, k], p, bear + Math.PI / 2, 1, grown);
		if (k === 2 || k === 3) bunch(bag, seed, [...key, k], p, bear - Math.PI / 2, g, vigour);
		else if (k > 3 && grown > .3) {
			const d = v3(Math.cos(bear - Math.PI / 2), .5, Math.sin(bear - Math.PI / 2)).normalize();
			const tp = [];
			for (let m = 0; m <= 10; m++) {
				const u = m / 10;
				tp.push(p.clone().addScaledVector(d, Math.min(u, .6) * .07).add(u > .6 ? v3(Math.cos(u * 18) * .006, Math.sin(u * 18) * .006, 0) : v3(0, 0, 0)));
			}
			bag.add("body", tube(tp, () => 8e-4, () => "#9ab85a", 3));
		}
	}
}
/**
* A cluster: tiny green flowers shedding their caps; then a conical bunch of berries, swelling, closing up, colouring
* berry by berry at véraison, ripe deep red-purple with a dusty bloom.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} at @param {number} bear @param {number} g @param {number} vigour
*/
function bunch(bag, seed, key, at, bear, g, vigour) {
	const br = chance(seed, "bunch", ...key);
	const opens = 4.9 + br() * .25;
	if (g < opens - .4) return;
	const set = span(g, opens + .3, opens + 2.5);
	const out = v3(Math.cos(bear), 0, Math.sin(bear));
	const peduncle = at.clone().addScaledVector(out, .04).add(v3(0, -.02 - .03 * set, 0));
	const flowering = g < opens + .3;
	if (!flowering) bag.fruit(key, at, v3(0, -1, 0));
	bag.add("body", tube([
		at,
		at.clone().addScaledVector(out, .03),
		peduncle
	], () => .002, () => "#7a8a3a", 4));
	const L = (.06 + .1 * set) * vigour * about(br, 1, .15);
	const W = L * .42;
	const n = 70;
	for (let k = 0; k < n; k++) {
		const t = (k + .5) / n;
		const a = k * 2.39996;
		const cone = W * (1 - .72 * t) * Math.sqrt(br() * .7 + .3);
		const p = peduncle.clone().add(v3(Math.cos(a) * cone, -.01 - t * L, Math.sin(a) * cone));
		if (flowering) {
			bag.add("body", bead(p, v3(.0018, .0026, .0018), mix("#a8b85a", "#d8d890", clamp((g - opens + .4) / .6)), 2));
			continue;
		}
		const tr = chance(seed, "berry", ...key, k);
		const turn = span(g, 7.4 + tr() * .7, 8.2 + tr() * .6);
		const r = (.0025 + .0058 * set) * vigour;
		const c = turn < .5 ? mix("#9ab84a", "#c27a7a", turn * 2) : mix("#c27a7a", "#5a1430", (turn - .5) * 2);
		bag.add("gloss", bead(p, v3(r, r * 1.08, r), c.lerp(new three.Color("#8a6a8a"), span(g, 8.5, 9) * .18), 4));
	}
	bag.add("body", tube([peduncle, peduncle.clone().add(v3(0, -L, 0))], () => .0012, () => "#7a8a3a", 3));
	bag.fruitDone();
//#piece 69f1d3d6a1a9ba606895e988f6b2d3bf22c7c85e9e9f4295855e80951be3b7da
	id: "grape",
	label: "Red grape",
	latin: "Vitis vinifera · Traube",
	note: "From a pip to a vine trained on its post and wire: a woody trunk, two arms, green shoots with five-lobed leaves and tendrils, bunches turning red berry by berry.",
	from: "Vine · 3 summers",
	stages: STAGES,
	grow: grape
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

//#piece 4dd285985d2bddab3999177a981f3d1c5d753ee66b62efce80404635e2087807
//#piece 5fd4ec1a2e6d0bc5f114332cdb20755490bd4ac6ad8547671b6404613a808a82
//#piece 2f55e55fa30b6dedf1546ca0df13ef5888c8e71eddea4659c48d40e1994b3477
//#piece a0cc27743d72408fbf8cda0a3e22cdc212d29f3ceb893a013c58bb28572ebe34
//#piece baf32910bd2c948b5d8ceab1b7f03b483d96ef0b1bf0d48476e0f90b8e00c928
*/
//#piece 61ef5fcc5e543b10d1feba84ff26054f7828d64f1841a6266a326eb7c2494e64
//#piece 3a1ae0a2d4c40f13add7584b3a784aadd8648d17d672c2b9ef9bf47a5af5a2fc
const PUMPKIN_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A big flat cream seed, two and a half centimetres down in warm soil."
	],
	[
		"Germination",
		6,
		"The radicle goes down; the hook pulls the seed leaves out of the coat."
	],
	[
		"Seed leaves",
		10,
		"Two big oval seed leaves."
	],
	[
		"True leaves",
		20,
		"The first rough, lobed true leaves."
	],
	[
		"Running",
		40,
		"The vine runs along the ground, a huge leaf standing up at every node, rooting as it goes."
	],
	[
		"Flowering",
		55,
		"Big yellow trumpets open at dawn: male ones on long stalks, female ones on a little round ovary."
	],
	[
		"Fruit set",
		62,
		"The bees have been: the ovaries swell into small green pumpkins lying on the soil."
	],
	[
		"Green pumpkins",
		80,
		"Ribbed pumpkins growing fast, still green."
	],
	[
		"Colouring",
		100,
		"They turn deep orange from the top, the stalk hardening."
	],
	[
		"Ripe",
		110,
		"Deep orange Hokkaidos, the stalks corky and dry, the leaves going over: harvest."
	]
]))();
/** a pumpkin leaf's edge: five broad shallow lobes, its base deeply notched, toothed */
function pumpkinLeaf(a) {
	const tips = [
		[0, 1],
		[1.05, .9],
		[-1.05, .9],
		[2.1, .7],
		[-2.1, .7]
	];
	let reach = 0;
	for (const [at, size] of tips) reach = Math.max(reach, size * (1 - .22 * Math.min(1, Math.abs(a - at) / .55)));
	return reach * (1 + .04 * Math.abs(Math.sin(a * 20)));
}
/** @param {number} g @param {string} seed */
function pumpkin(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const at = v3(0, -.025, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.009, .0022, .0055),
		coat: "#efe4c4",
		coatShade: "#c9b98c",
		stem: table(g, [
			[0, 0],
			[.3, .001],
			[1, .035],
			[2, .06],
			[9, .06]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.5, 0]
		]),
		radius: .003 + .004 * span(g, 2, 5),
		stemColor: "#7a9a4a",
		leaf: {
			length: .05,
			width: .015,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .6),
			color: "#4f9134",
			vein: "#a5cf7d"
		},
		open: span(g, 1.1, 2),
		shed: span(g, .8, 1.4),
		wither: span(g, 4.5, 5.6),
		keepCoat: true
	});
	root(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(0, -1, 0),
		length: .6,
		grown: table(g, [
			[0, 0],
			[.3, .005],
			[1, .08],
			[3, .4],
			[5, .9],
			[7, 1]
		]),
		radius: .003,
		down: .03,
		wander: .15,
		laterals: 0,
		depth: 0,
		age: span(g, 2, 6),
		young: "#f7f1e0",
		old: "#c4a57c"
	});
	for (let i = 0; i < 20; i++) {
		const lr = chance(seed, "pumpkin-lat", i);
		const a = i * 2.39996;
		root(bag, {
			seed,
			key: ["lat", i],
			from: at.clone().add(v3(0, -.01 - i * .012, 0)),
			dir: v3(Math.cos(a), -.2, Math.sin(a)),
			length: between(lr, .3, .6) * vigour,
			grown: (g - 1.2 - i * .12) / 2.6,
			radius: .0016,
			down: .025,
			wander: .3,
			laterals: 6,
			lateral: .3,
			depth: 2,
			age: (g - 2.5 - i * .12) / 3,
			young: "#f6efdc",
			old: "#c3a27a"
		});
	}
	const run = table(g, [
		[2.2, 0],
		[3, .15],
		[4, .9],
		[5, 1.7],
		[6, 2.3],
		[7, 2.7],
		[9, 2.9]
	]) * vigour;
	const head = chance(seed, "vine")() * Math.PI * 2;
	vine(bag, seed, ["main"], s.top.clone(), head, run, g, vigour, true);
	return bag.build();
}
/**
* A pumpkin vine running along the ground: nodes every so often, a leaf standing up at each on its long stalk, a
* tendril, roots down into the soil, the flowers, and where a female flower was, a pumpkin.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} from @param {number} head @param {number} run @param {number} g @param {number} vigour @param {boolean} main
*/
function vine(bag, seed, key, from, head, run, g, vigour, main) {
	if (run < .01) return;
	const vr = chance(seed, "vine-path", ...key);
	const pts = [from.clone()];
	let a = head;
	const step = .05;
	for (let s = step; s <= run + 1e-9; s += step) {
		a += (vr() - .5) * .35;
		const last = pts[pts.length - 1];
		pts.push(v3(last.x + Math.cos(a) * step, Math.max(.012, last.y - .02), last.z + Math.sin(a) * step));
	}
	if (pts.length < 2) return;
	bag.add("body", tube(pts, (u) => (.009 - .004 * u) * vigour, (u) => mix("#6f9440", "#9cc26a", u), 7));
	const nodes = Math.floor(run / .16);
	for (let i = 0; i < nodes; i++) {
		const nr = chance(seed, "pumpkin-node", ...key, i);
		const { p, d } = along(pts, (i + .6) * .16 / run);
		const side = v3(-d.z, 0, d.x).multiplyScalar(i % 2 ? 1 : -1);
		const grown = clamp((run - (i + .6) * .16) / .4);
		const old = span(g, 8.2 + (nodes - i) * .02, 9.5);
		const stalk = (.22 + .15 * nr()) * vigour * lerp(.3, 1, grown);
		const top = p.clone().add(v3(0, stalk, 0)).addScaledVector(side, .06);
		bag.add("body", tube([
			p,
			p.clone().add(v3(0, stalk * .6, 0)).addScaledVector(side, .02),
			top
		], () => .005 * vigour, () => mix("#7aa046", "#b8a04a", old), 5));
		const facing = side.clone().multiplyScalar(.6).add(v3(0, .8 - old * .6, 0)).normalize();
		bag.add("sheet", fan({
			size: .17 * vigour * lerp(.25, 1, grown),
			from: -Math.PI + .35,
			to: Math.PI - .35,
			edge: pumpkinLeaf,
			lift: (s, a2) => -.15 * s * s * (1 + old) + .02 * Math.cos(a2 * 5) * s,
			paint: (s, a2) => mix(mix("#3a6e2a", "#7ab04a", 1 - grown), "#c9b04a", old * 1.2).lerp(new three.Color("#b9cc9a"), [
				0,
				1.05,
				-1.05,
				2.1,
				-2.1
			].some((t) => Math.abs(a2 - t) < .04) ? .4 : 0).lerp(new three.Color("#a8bca0"), Math.abs(Math.sin(a2 * 7 + s * 9)) > .97 ? .3 : 0),
			rings: 8,
			rays: 56
		}), aim(top.clone().addScaledVector(facing, -.02), facing, 0));
		if (i > 1) root(bag, {
			seed,
			key: [
				...key,
				"node-root",
				i
			],
			from: p.clone().add(v3(0, -.01, 0)),
			dir: v3(0, -1, 0),
			length: .18,
			grown: span(g, 3.5 + i * .08, 5 + i * .08),
			radius: .0015,
			laterals: 4,
			depth: 1,
			young: "#f6efdc",
			old: "#c3a27a"
		});
		if (i > 1 && grown > .4) {
			const tp = [];
			for (let m = 0; m <= 10; m++) {
				const t = m / 10;
				tp.push(p.clone().addScaledVector(side.clone().negate(), Math.min(t, .6) * .1).add(t > .6 ? v3(Math.cos(t * 20) * .008, .01 + Math.sin(t * 20) * .008, 0) : v3(0, .015 * t, 0)));
			}
			bag.add("body", tube(tp, () => .001, () => "#9cc26a", 3));
		}
		if (main && i === 3) vine(bag, seed, [...key, "side"], p, Math.atan2(side.z, side.x) + Math.atan2(d.z, d.x) * 0, Math.max(0, run - .6) * .65, g, vigour, false);
		if (i < 3) continue;
		const female = main ? i === 5 || i === 9 || i === 13 : i === 4 || i === 8;
		const opens = 4.6 + i * .07 + nr() * .2;
		if (g < opens - .3) continue;
		const set = span(g, opens + .4, opens + 2.4);
		if (!female || set < .03) {
			const stalkTop = p.clone().add(v3(0, female ? .03 : .18, 0)).addScaledVector(side, -.04);
			bag.add("body", tube([p, stalkTop], () => .003, () => "#7aa046", 4));
			if (female) bag.add("body", bead(stalkTop, v3(.015, .012, .015), "#6a9a3a", 6));
			const open = clamp((g - opens) / .15), wilt = span(g, opens + .25, opens + .45);
			if (wilt < 1) bloom(bag, {
				petals: 5,
				length: .05,
				width: .028,
				colour: "#f2a81c",
				heart: "#e88a10",
				sepals: 5,
				sepal: .012,
				stamens: 0,
				flat: -.4
			}, stalkTop.clone().add(v3(0, female ? .012 : 0, 0)), v3(0, 1, 0), 1 - wilt * .4, open, wilt);
			continue;
		}
		const fr = chance(seed, "pumpkin", ...key, i);
		const R = (.03 + .1 * set) * vigour * about(fr, 1, .08);
		const Hh = R * 1.45;
		const c = p.clone().addScaledVector(side, -(R + .03)).setY(0);
		const ripe = span(g, opens + 2.6, opens + 3.6);
		const axis = [];
		for (let k = 0; k <= 14; k++) axis.push(c.clone().add(v3(0, Hh - k / 14 * Hh, 0)));
		const colour = mix("#3f6a2a", "#e06418", ripe);
		bag.fruit([...key, i], p, v3(0, -1, 0));
		bag.add("gloss", tube(axis, (u, v) => R * Math.pow(Math.max(0, Math.sin(Math.PI * u)), .55) * (1 + .06 * Math.cos(v * Math.PI * 2 * 10)) * (1 - .12 * Math.pow(1 - u, 3)), (u, v) => colour.clone().lerp(new three.Color(ripe > .5 ? "#f08a3a" : "#8aa86a"), Math.pow(Math.abs(Math.cos(v * Math.PI * 10)), 30) * .4), 30));
		bag.add("body", tube([
			p,
			c.clone().add(v3(0, Hh + .03, 0)),
			c.clone().add(v3(0, Hh - .005, 0))
		], () => .008, () => mix("#6a9a3a", "#b8a06a", ripe), 6));
		bag.fruitDone();
	}
//#piece 69f1d3d6a1a9ba606895e988f6b2d3bf22c7c85e9e9f4295855e80951be3b7da
	id: "pumpkin",
	label: "Pumpkin",
	latin: "Cucurbita maxima · Kürbis (Hokkaido)",
	note: "A vine running along the ground, rooting at its nodes, huge lobed leaves standing up, big yellow trumpets, ribbed pumpkins lying on the soil turning deep orange.",
	from: "Vine · 110 days",
	stages: PUMPKIN_STAGES,
	grow: pumpkin
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

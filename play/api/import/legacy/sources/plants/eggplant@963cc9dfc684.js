//#piece 1c847f9682b7eff0986eb7270e4b46c7923ffe3c6e73fcde8073b7ce972f92f6
//#piece a97021c8bd634397ead30fb88b5aa7716e28fe31946fad463c5a442cb5b1d76f
*/
//#piece e6a34d37c796ca5ffb84215cf2caaf1c9f46f4980e4ce4f1551adca44ce3ef6d
//#piece 48383207183e3f1c9ef086f2595cace24a883be4db56d4b7859ac22b19b31d81
//#region src/lib/plants/eggplant.js
const STAGES = [
	{
		name: "Seed",
		day: 0,
		note: "A flat, kidney-shaped tan seed, half a centimetre down: eggplants want the soil warm, 25 °C and more."
	},
	{
		name: "Germination",
		day: 8,
		note: "The radicle goes down; the hypocotyl hooks up into the light."
	},
	{
		name: "Seed leaves",
		day: 14,
		note: "Two oval cotyledons on a short stem."
	},
	{
		name: "True leaves",
		day: 30,
		note: "The first true leaves: soft, felted, grey-green, the midrib already purple."
	},
	{
		name: "Bushing",
		day: 55,
		note: "Planted out, the stem forks into a bush of big wavy leaves."
	},
	{
		name: "Flowering",
		day: 70,
		note: "Nodding violet stars in the leaf axils, a yellow cone of anthers at their heart."
	},
	{
		name: "Fruit set",
		day: 80,
		note: "The petals fall; under each spiny green calyx a little violet fruit swells."
	},
	{
		name: "Swelling",
		day: 95,
		note: "The fruit lengthen and darken, hanging under the leaves."
	},
	{
		name: "Glossy",
		day: 105,
		note: "Full-sized and deep purple, the skin taut and shining: the time to pick."
	},
	{
		name: "Harvest",
		day: 115,
		note: "Branch after branch of black-purple fruit, new flowers still opening above."
	}
];
const SEED_AT = /* @__PURE__ */ (() => v3(0, -.006, 0))();
/** the eggplant's leaf: broad, ovate, its edge in shallow waves */
function leafShape(u) {
	return Math.pow(Math.sin(Math.PI * Math.pow(u, .72)), .68) * (1 - .15 * u) * (1 + .1 * Math.sin(u * Math.PI * 5.5) * (u > .1 ? 1 : 0));
}
/** an eggplant flower: five or six violet petals in a star, the anthers a yellow cone, the calyx purple-green */
const FLOWER = {
	petals: 6,
	length: .019,
	width: .011,
	colour: "#8d6cb8",
	heart: "#f0c419",
	cone: true,
	flat: .25,
	sepals: 6,
	sepal: .012,
	sepalBack: .2,
	sepalColour: "#5f5a4a",
	shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .6)), .7)
};
/**
* The eggplant at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g
* @param {string} seed
*/
function eggplant(g, seed) {
//#piece a92fb2fed60fdca61956e261dede4951505a72726283bd34b7169f5cd55d1ad7
		size: v3(.0016, 5e-4, .0013),
		coat: "#d2b98a",
		coatShade: "#a68a5a",
		stem: table(g, [
			[0, 0],
			[.3, 8e-4],
			[1, .011],
			[2, .03],
			[3, .034],
			[9, .036]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.5, 0]
		]),
		radius: .0011 + .004 * span(g, 2, 6),
		stemColor: "#6e7a48",
		leaf: {
			length: .02,
			width: .0075,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .65),
			color: "#5a8a3c",
			vein: "#98bb78"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.6),
		wither: span(g, 4.3, 5.2)
	});
	root(bag, {
		seed,
		key: ["taproot"],
		from: SEED_AT.clone(),
		dir: v3(.03, -1, 0),
		length: .42,
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
		radius: .0024,
		down: .04,
		wander: .15,
		laterals: 0,
		depth: 0,
		age: span(g, 2, 6),
		young: "#f7f1e0",
		old: "#c4a37a"
	});
	const lr = chance(seed, "laterals");
	for (let i = 0; i < 26; i++) {
		const at = .005 + i * .012 + lr() * .005;
		const born = 1.3 + i * .14;
		const bear = i * 2.39996 + lr() * .5;
		root(bag, {
			seed,
			key: ["lateral", i],
			from: SEED_AT.clone().add(v3(0, -at, 0)),
			dir: v3(Math.cos(bear), -.4, Math.sin(bear)),
			length: between(lr, .12, .28) * vigour,
			grown: (g - born) / 2.6,
			radius: .0012,
			down: .05,
			wander: .3,
			laterals: 7,
			lateral: .3,
			depth: 2,
			age: (g - born - 1) / 3,
			young: "#f6efdc",
			old: "#bf9c72"
//#piece fb9f36f225c80cfcb13de136638598b6496ae52e80009b8495c241d885f85bb3
		length: .42 * vigour,
		grown: table(g, [
			[2.1, 0],
			[3, .12],
			[4, .6],
			[5, 1.3],
			[6, 1.75],
			[7, 2],
			[9, 2.15]
		]),
		radius: .0085,
		up: .05,
		wander: .1,
		spread: .75,
		children: 3,
		shorten: [.6, .85],
		depth: 2,
		from0: .45,
		young: "#7c8a52",
		old: "#5e4f5c",
		age: span(g, 4, 8),
		out: limbs
	});
	const space = bag.space;
	for (const l of limbs) space.rod(l.pts, .008 * (l.order ? .6 : 1) + .004);
	/** the leaves wait until the fruit hang, then turn away from them @type {(() => void)[]} */
	const leaves = [];
	let flowered = 0;
	for (const l of limbs) {
		const total = l.length;
		const lr2 = chance(seed, "leaves", ...l.key);
		let s0 = .03 + lr2() * .03;
		for (let k = 0; k < 9; k++, s0 += between(lr2, .055, .08)) {
			const past = total - s0;
			const bear = k * 2.4 + lr2() * .5;
			const size = about(lr2, 1, .12) * vigour * lerp(.55, 1, clamp(g - 3));
			if (past <= 0) continue;
			const { p } = along(l.pts, s0 / total);
			const old = l.order === 0 && k < 3 ? span(g, 7 + k * .4, 8.5 + k * .4) : 0;
			const grownLeaf = clamp(past / .1);
			if (old < 1) leaves.push(() => leaf(bag, p, space.steer(p, v3(Math.cos(bear), 0, Math.sin(bear)), -.1, .24 * size, .035 * size), size, grownLeaf, old));
			if (l.order >= 1 && k === 1 && flowered < 9) {
				flowered++;
				blossom(bag, seed, [...l.key, k], p, v3(Math.cos(bear + Math.PI), 0, Math.sin(bear + Math.PI)), g, vigour, space);
			}
		}
	}
	for (const leaf of leaves) leaf();
	return bag.build();
}
/** a point along a limb's path at u (0 … 1 of its grown length) */
//#piece 93ea83e46af0e3b2350cd6be7489aa4bc408cfbbbc596c4bae12404f15d1dc4d
	};
}
/**
* An eggplant leaf: a stout purple-tinged stalk and a broad soft wavy blade, hanging out and down.
* @param {Bag} bag @param {THREE.Vector3} at @param {THREE.Vector3} out @param {number} size @param {number} grown @param {number} old
*/
function leaf(bag, at, out, size, grown, old) {
	const len = .06 * size * lerp(.3, 1, grown);
	const stalkDir = out.clone().multiplyScalar(.7).add(v3(0, lerp(1, .55, grown) - old * .6, 0)).normalize();
	const end = at.clone().addScaledVector(stalkDir, len);
	bag.add("body", tube([
		at,
		at.clone().lerp(end, .5).add(v3(0, len * .08, 0)),
		end
	], (u) => .0022 * size * (1 - .3 * u), () => mix("#6f6a52", "#b9a14a", old), 5));
	const blade = .2 * size * lerp(.25, 1, grown);
	const tilt = lerp(.9, -.35, grown) - old * .6;
	const dir = out.clone().multiplyScalar(Math.cos(tilt)).add(v3(0, Math.sin(tilt), 0)).normalize();
	const fold = (1 - grown) * .7 + .05;
	bag.add("sheet", sheet({
		length: blade,
		width: blade * .36,
		shape: leafShape,
		lift: (u, v) => fold * Math.abs(v) * .3 - .1 * u * u + .025 * Math.sin(u * Math.PI * 7) * v * v,
		paint: (u, v) => {
			const vein = Math.abs(v) < .07 ? .7 : 0;
			const green = mix(mix("#57774a", "#7fa262", 1 - grown), "#7a4f7e", vein * (1 - u * .6));
			return old ? green.lerp(mix("#c9b04a", "#9a7a3a", u), clamp(old * 1.3)) : green;
		},
		along: 22,
		across: 6
	}), aim(end, dir));
}
/**
* A flower in a leaf axil, nodding on its stalk; then the fruit it sets, under its spiny calyx, growing long and dark.
* @param {Bag} bag @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} at @param {THREE.Vector3} out @param {number} g @param {number} vigour
* @param {Space} space
*/
function blossom(bag, seed, key, at, out, g, vigour, space) {
	const fr = chance(seed, "eggplant-flower", ...key);
	const opens = 4.4 + fr() * 1.3;
	const bud = clamp((g - (opens - .35)) / .35);
	if (bud <= 0) return;
	const set = span(g, opens + .4, opens + 2.3);
	const hang = clamp(set * 1.5);
	const d = out.clone().multiplyScalar(.6).add(v3(0, .2 - hang * 1.1, 0)).normalize();
	const end = at.clone().addScaledVector(d, .035);
	if (set < .03) bag.add("body", tube([at, end], () => .0018, () => "#6a6150", 5));
	const facing = d.clone().lerp(v3(0, -1, 0), .4).normalize();
	if (g < opens) bag.add("body", bead(end.clone().addScaledVector(facing, .006), v3(.004, .008, .004).multiplyScalar(.5 + bud * .5), mix("#5f5a4a", "#8d6cb8", bud * .7)));
	else if (set < .03) bloom(bag, FLOWER, end, facing, 1.4, clamp((g - opens) / .2), span(g, opens + .25, opens + .4));
	else {
		const size = vigour * about(fr, 1, .12);
		const place = space.settle(end, d.clone().lerp(v3(0, -1, 0), .6), (a, dd) => fruitBalls(a, dd, size, set), .05);
		bag.fruit(key, at, place.dir);
		bag.add("body", tube([
			at,
			end,
			place.at
		], () => .0018 + .0018 * set, () => "#6a6150", 5));
		fruit(bag, {
			seed,
			key,
			at: place.at,
			dir: place.dir,
			size,
			set,
			gloss: span(g, opens + 1.2, opens + 2.5)
		});
		bag.fruitDone();
	}
}
/** the room an eggplant takes: three balls down its length, the last the broadest */
function fruitBalls(at, dir, size, set) {
	const L = .2 * size * lerp(.12, 1, set);
	const R = L * .25;
	return [
		.22,
		.52,
		.8
	].map((f, i) => ({
		c: at.clone().addScaledVector(dir, .004 + L * f),
		r: R * [
			.75,
			.92,
			1
		][i]
	}));
}
/**
* An eggplant: long and full, broadest toward its end, glossy; pale violet when small, deep black-purple full-grown. A
* big green calyx with soft spines clasps its top.
* @param {Bag} bag
* @param {{ seed: string, key: (string | number)[], at: THREE.Vector3, dir: THREE.Vector3, size: number, set: number, gloss: number }} o
*/
function fruit(bag, o) {
	const fr = chance(o.seed, "eggplant", ...o.key);
	const L = .2 * o.size * lerp(.12, 1, o.set);
	const R = L * between(fr, .22, .27);
	const bend = about(fr, 0, .12);
//#piece eeeeb9ab4a453bbb2c3046fffc75b713d50a32661cbfb1bc0cb16c5a8b684255
	const axis = [];
	for (let k = 0; k <= 18; k++) {
		const u = k / 18;
		axis.push(v3(bend * L * u * u, -.004 - u * L, 0));
	}
	const radius = (u) => R * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .08 + u * .92))), .45) * (.68 + .32 * u);
	const colour = mix(mix("#9c78c0", "#4a2560", o.set), "#2a1236", o.gloss);
	bag.add("gloss", tube(axis, radius, (u) => colour.clone().lerp(new three.Color("#5b3a6e"), (1 - u) * .15), 18), m);
	const cap = [];
	for (let k = 0; k <= 5; k++) cap.push(v3(0, -.001 - k / 5 * L * .12, 0));
	bag.add("body", tube(cap, (u) => radius(.02 + u * .1) * 1.05 + .002, () => "#5c7a3c", 12), m);
	for (let k = 0; k < 6; k++) {
		const lobe = sheet({
			length: L * .2 + .01,
			width: R * .35,
			shape: (u) => Math.sin(Math.PI * Math.pow(u, .6)) * (1 - .6 * u),
			lift: (u) => -.35 * u * u,
			paint: (u) => mix("#5c7a3c", "#7f9a52", u),
			along: 6,
			across: 2
		});
		bag.add("sheet", lobe, m.clone().multiply(new three.Matrix4().makeRotationY(k / 6 * Math.PI * 2 + fr())).multiply(new three.Matrix4().makeTranslation(radius(.06) * 1.02, -.004, 0)).multiply(new three.Matrix4().makeRotationZ(-1.25)));
	}
//#piece 69f1d3d6a1a9ba606895e988f6b2d3bf22c7c85e9e9f4295855e80951be3b7da
	id: "eggplant",
	label: "Eggplant",
	latin: "Solanum melongena · Aubergine",
	note: "A forked bush of big soft grey-green leaves with purple midribs, nodding violet stars, long glossy black-purple fruit under spiny green calyxes.",
	from: "Bush · 115 days",
	stages: STAGES,
	grow: eggplant
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

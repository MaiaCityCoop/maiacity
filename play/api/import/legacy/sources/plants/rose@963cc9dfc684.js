//#piece 6832cce98bc8fc7f3dfda3350e586e18d7546f7f765dd0334a4c87471bc96981
//#piece 3e8e835c7ba299de5f480c8ec30affe9ffa07ecc3ba02dc5f4fa8cf6b11d79d3
*/
//#piece b58458d8071c86b2a079b3bde1d1db81983864af963f08122f09c2edfb54a14b
//#piece eb797d051b2bdd8a3ca4ba71567e59054599041b8bd172b895c178eff47b67bf
//#piece 07c2cb2bd4ccbd1481dbdcc90feb4861d47907602781c0e6e052def745902bac
const ROSE_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A hard pale achene from inside a hip, sown in autumn: it wants a winter, often two, before it comes up."
	],
	[
		"Germination",
		60,
		"A root goes down, a hooked shoot comes up."
	],
	[
		"Seed leaves",
		75,
		"Two oval seed leaves, then the first leaf of three wrinkled leaflets."
	],
	[
		"Young bush",
		365,
		"A bristly young shoot, its leaves of five and seven leaflets."
	],
	[
		"Bush",
		1100,
		"A dense thicket a metre and a half high, suckering out, every stem bristling with prickles."
	],
	[
		"Flowering",
		1250,
		"Big single flowers, magenta-pink and scented, golden stamens, at the ends of the shoots."
	],
	[
		"Fruit set",
		1265,
		"The petals drop; the hips start to swell under their crown of sepals — while new flowers still open."
	],
	[
		"Green berries",
		1300,
		"Fat round green hips, flattened, their sepals standing up."
	],
	[
		"Turning",
		1330,
		"The hips turn orange, then scarlet."
	],
	[
		"Ripe",
		1350,
		"Big round red hips like little tomatoes among the wrinkled leaves, a last flower or two."
	]
]))();
/**
* A single rose: five broad petals, notched, cupped while young and spread flat when open, a ring of golden stamens,
* its sepals behind; then the petals falling.
* @param {Bag} bag @param {THREE.Vector3} at @param {THREE.Vector3} facing @param {number} open @param {number} fall @param {string} colour
*/
function rose(bag, at, facing, open, fall, colour) {
//#piece e12f1061058e5bcbb15c9be8677913ebfa5b2ca59d2707a5ed8925007c029f11
	const petal = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .55)), .5) * (u > .9 ? 1 - (u - .9) * 2.5 : 1);
	for (let k = 0; k < 5; k++) {
		const up = lerp(1.2, .15, open) - fall * .9;
		const shrink = 1 - fall * .6;
		bag.add("sheet", sheet({
			length: .036 * lerp(.35, 1, open) * shrink,
			width: .021 * lerp(.35, 1, open) * shrink,
			shape: petal,
			lift: (u, v) => .12 * u * u + .08 * v * v + .015 * Math.sin(u * 9 + v * 4),
			paint: (u) => mix("#f6e6a8", colour, clamp(u * 4)),
			along: 5,
			across: 3
		}), m.clone().multiply(new three.Matrix4().makeRotationY(k / 5 * Math.PI * 2)).multiply(new three.Matrix4().makeRotationZ(up)));
	}
	for (let k = 0; k < 5; k++) bag.add("sheet", sheet({
		length: .028,
		width: .004,
		shape: (u) => 1 - u * .8,
		lift: (u) => -.1 * u,
		paint: () => "#4a7a3a",
		along: 3,
		across: 1
	}), m.clone().multiply(new three.Matrix4().makeRotationY(k / 5 * Math.PI * 2 + .6)).multiply(new three.Matrix4().makeRotationZ(-.35)));
	if (open > .3 && fall < 1) bag.add("body", fan({
		size: .011,
		from: -Math.PI,
		to: Math.PI,
		edge: (a) => .85 + .15 * Math.abs(Math.sin(a * 9)),
		lift: (s) => .3 * s,
		paint: (s) => mix("#d89a20", "#f2c840", s),
		rings: 1,
		rays: 12
	}), m);
	bag.add("body", bead(v3(0, .002, 0).applyMatrix4(m), v3(.0045, .002, .0045), "#c8b040", 3));
}
/**
* A rose hip: round, flattened, glossy, its five sepals standing up as a crown from its top; green, then orange, then
* scarlet.
* @param {Bag} bag @param {THREE.Vector3} at where its stalk meets it @param {THREE.Vector3} dir which way it points @param {number} R @param {number} ripe
*/
function hip(bag, at, dir, R, ripe) {
	const c = at.clone().addScaledVector(dir, R * .85);
	const q = new three.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
	bag.add("gloss", bead(c, v3(R, R * .82, R), ramp([
		[0, "#7aa048"],
		[.4, "#e0a030"],
		[.7, "#ea521e"],
		[1, "#c81e14"]
	], ripe), 6, q));
	const top = c.clone().addScaledVector(dir, R * .78);
	const m = new three.Matrix4().compose(top, q, v3(1, 1, 1));
	for (let k = 0; k < 5; k++) bag.add("sheet", sheet({
		length: R * 1.4,
		width: R * .22,
		shape: (u) => 1 - u * .7,
		lift: (u) => .15 * u,
		paint: () => mix("#4a6a32", "#6a5a32", ripe),
		along: 3,
		across: 1
	}), m.clone().multiply(new three.Matrix4().makeRotationY(k / 5 * Math.PI * 2)).multiply(new three.Matrix4().makeRotationZ(1.1)));
}
const japaneseRose = /* @__PURE__ */ (() => shrub({
	seed: {
		size: v3(.0035, .0022, .0024),
		coat: "#c8b08a",
		shade: "#9a805a"
	},
	cotyledon: {
		length: .008,
		width: .004,
		colour: "#5f9a42"
	},
	stems: {
		count: 15,
		first: 2,
		every: .19,
		rate: 1.3,
		length: [.62, .82],
		lean: [.08, .5],
		crown: .36,
		radius: .012,
		up: .01,
		wander: .09,
		spread: .75,
		children: 4,
		shorten: [.42, .66],
		depth: 2,
		from0: .3,
		young: "#8a6a4a",
		old: "#6a5a50",
		size: [
			[2, .18],
			[3, .4],
			[4, .8],
			[5, 1]
		]
	},
	roots: {
		length: .55,
		count: 8
	},
	leaf: {
		blade: compound({
			pairs: 3,
			leaflet: .33,
			width: .55,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .75)), .7),
			rachis: "#5a7a3a",
			wrinkle: 1,
			across: 1
		}),
		length: .13,
		stalk: .01,
		stalkColour: "#5a7a3a",
		spacing: .068,
		from: 0,
		bare: .3,
		colour: "#2e6a2a",
		young: "#6aa040",
		vein: "#7ea866",
		shade: "#285c26",
		droop: .15,
		autumn: {
			colour: "#d8a830",
			from: 8.5,
			share: .18
		}
	},
	wood: (ctx, t) => {
		const pr = chance(ctx.seed, "rose-prickles", ...t.key);
		const n = Math.floor(t.length * (t.order === 0 ? 24 : t.order === 1 ? 10 : 3));
		const thick = t.order === 0 ? .007 : t.order === 1 ? .004 : .0025;
		for (let k = 0; k < n; k++) {
			const w = walk(t.pts, pr() * t.length);
			const a = pr() * 6.28, l = pr();
			if (!w) continue;
			const out = round(w.d, a).addScaledVector(w.d, -.2).normalize();
			prickle(ctx.bag, w.p.clone().addScaledVector(out, thick * .7), out, .003 + l * .004, 7e-4, l > .5 ? "#8a6a5a" : "#a8806a");
		}
	},
	fruit: (ctx) => {
		const { bag, seed, g, vigour } = ctx;
		const pink = chance(seed, "rose-colour")() < .5 ? "#c42a78" : "#d8508e";
		for (const t of ctx.twigs) {
			if (t.order < 1 || !t.end) continue;
			const tr = chance(seed, "rose-tip", ...t.key);
			const pick = tr(), late = tr();
			if (pick > (t.order === 2 ? .55 : .3)) continue;
			const n = 1 + Math.floor(tr() * 2.4);
			for (let k = 0; k < n; k++) {
				const kr = chance(seed, "rose", ...t.key, k);
				const opens = 4.6 + kr() * .35 + k * .12;
				const a = kr() * 6.28;
				const R = .0125 * vigour * about(kr, 1, .1);
				if (g < opens - .5) continue;
				const out = k ? round(t.dir, a).addScaledVector(t.dir, .8).normalize() : t.dir.clone();
				const at = t.tip.clone().addScaledVector(out, .012 + k * .006);
				const set = span(g, opens + .45, opens + 2.4);
				const place = set < .02 ? null : bag.space.settle(at, out.clone().lerp(v3(0, -1, 0), .5).normalize(), (p, d) => [{
					c: p.clone().addScaledVector(d, R * .9),
					r: R * 1.05
				}], .015);
				if (place) bag.fruit([...t.key, k], t.tip, place.dir);
				bag.add("body", tube([t.tip, at], () => .0012, () => "#5a7a3a", 3));
				if (!place) {
					const facing = out.clone().lerp(UP, .55).normalize();
					if (g < opens) bag.add("body", bead(at.clone().addScaledVector(facing, .006), v3(.005, .008, .005).multiplyScalar(lerp(.4, 1, span(g, opens - .5, opens))), "#b0306a", 4, new three.Quaternion().setFromUnitVectors(UP, facing)));
					else rose(bag, at, facing, clamp((g - opens) / .2), span(g, opens + .3, opens + .45), pink);
					continue;
				}
				bag.add("body", tube([at, place.at], () => .0012, () => "#5a7a3a", 3));
				hip(bag, place.at, place.dir, R * lerp(.3, 1, set), span(g, 7.4 + kr() * .4, 8.5 + kr() * .4));
				bag.fruitDone();
			}
			if (late < .12) {
				const opens = 8.3 + late * 6;
				if (g > opens - .3 && g < opens + .6) {
					const facing = t.dir.clone().lerp(UP, .7).normalize();
					const at = t.tip.clone().addScaledVector(round(t.dir, late * 50), .03).addScaledVector(facing, .03);
					bag.add("body", tube([t.tip, at], () => .0012, () => "#5a7a3a", 3));
					rose(bag, at, facing, clamp((g - opens + .3) / .3), span(g, opens + .3, opens + .6), pink);
				}
			}
//#piece 90d5b61545bfa24968849ea32dd9b1924a72608a6f5f55dd5aee28c67c3ae436
	id: "rose",
	label: "Japanese rose",
	latin: "Rosa rugosa · Kartoffelrose",
	note: "A dense thicket of bristling stems, wrinkled leaves of seven leaflets, big single magenta flowers at the shoot tips all summer, and big round scarlet hips crowned by their sepals.",
	from: "Shrub · 3 years",
	stages: ROSE_STAGES,
	grow: japaneseRose,
//#piece 6a46d079f14d6089f79784ecf20705689a90de4d5314bb9b21fadbd5aa4987ef

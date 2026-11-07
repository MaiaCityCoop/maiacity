//#piece 043e1ab6a9c5729f2b4ae4012747d5ca81eda156ed52f414630287d4d7b5862f
//#piece eb797d051b2bdd8a3ca4ba71567e59054599041b8bd172b895c178eff47b67bf
*/
//#piece 70800341da83776310eb4b033ea7bb914fb1e6a98e315d805ea2ed751cb1a204
const ARONIA_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A tiny brown seed from a black berry, sown in autumn to be chilled through the winter."
	],
	[
		"Germination",
		35,
		"In spring a root goes down, a hooked shoot comes up."
	],
	[
		"Seed leaves",
		50,
		"Two small oval seed leaves, then glossy pointed ones."
	],
	[
		"Young bush",
		365,
		"A few upright shoots, glossy oval leaves."
	],
	[
		"Bush",
		1100,
		"An upright, suckering bush near two metres: many stems from the ground, glossy dark leaves."
	],
	[
		"Flowering",
		1230,
		"Flat corymbs of small white flowers with pink anthers at the tips of the shoots."
	],
	[
		"Fruit set",
		1245,
		"Little green berries, a dozen and more to a cluster."
	],
	[
		"Green berries",
		1280,
		"Clusters of green berries, the shoots bowing under them."
	],
	[
		"Turning",
		1320,
		"Red, then purple, then black, cluster by cluster."
	],
	[
		"Ripe",
		1345,
		"Heavy clusters of glossy black chokeberries, astringent and dark; the first leaves turning red."
	]
]))();
/**
* @typedef {{
*   count: [number, number], r: number, drop: number, stalk: string, bud: string, flower: string, heart: string,
*   bloom: number, colour: (ripe: number) => THREE.Color, season: Season
* }} Corymb — a flat-topped cluster at a shoot's tip: how many flowers, the berry's radius, how many never set
*/
/**
* A corymb: a short stalk at a shoot's tip, the flowers on longer stalks round it holding them level in a flat head;
* then the berries, the cluster bowing over and hanging as they swell, where it touches nothing.
* @param {Ctx} ctx @param {{ at: THREE.Vector3, dir: THREE.Vector3, key: (string | number)[] }} site @param {Corymb} C
*/
function corymb(ctx, site, C) {
	const { bag, seed, g, vigour } = ctx;
	const fr = chance(seed, "corymb", ...site.key);
	const opens = C.season.opens + fr() * .3;
	const n = C.count[0] + Math.floor(fr() * (C.count[1] - C.count[0] + 1));
	const lost = fr();
	const twist = fr() * 6;
	const R = C.r * vigour * about(fr, 1, .08);
	const ripeAt = C.season.ripeFrom + fr() * .3;
	if (g < opens - .6) return;
	const emerge = span(g, opens - .6, opens);
	const set = span(g, opens + .4, opens + .4 + C.season.setFor);
	const up = site.dir.clone().lerp(UP, .6).normalize();
	const c = R * 1.25;
	const Rc = c * Math.sqrt(n) + R;
	const out = level(site.dir);
	const start = site.at.clone().addScaledVector(up, .012);
	const place = bag.space.settle(start, v3(0, -1, 0).addScaledVector(out, .9), (a, d) => [{
		c: a.clone().addScaledVector(d, Rc * 1.1),
		r: Rc
	}], .02);
	const sag = span(set, .15, .9);
	const axis = up.clone().lerp(place.dir, sag).normalize();
	const base = start.clone().lerp(place.at, sag);
	const bearing = set >= .02 && n - Math.floor(lost * (C.drop + 1)) > 0;
	if (bearing) bag.fruit(site.key, site.at, place.dir);
	bag.add("body", tube([
		site.at,
		start,
		base
	], () => .0013, () => C.stalk, 3));
	const centre = base.clone().addScaledVector(axis, Rc * lerp(.5, 1.05, emerge));
	for (let k = 0; k < n; k++) {
		const kr = chance(seed, "corymb-berry", ...site.key, k);
		const r1 = kr(), r2 = kr();
		const rad = c * Math.sqrt(k + .5) * lerp(.6, 1, emerge);
		const p = centre.clone().addScaledVector(round(axis, k * 2.39996 + twist), rad).addScaledVector(axis, -(rad * rad) / (Rc * 2.4));
		bag.add("body", tube([base, p], () => 5e-4, () => C.stalk, 3));
		if (g < opens) {
			bag.add("body", bead(p, v3(1, 1, 1).multiplyScalar(R * .45 * lerp(.5, 1, emerge)), C.bud, 2));
			continue;
		}
		if (set < .02) {
			floret(bag, p, axis, C.bloom, C.flower, C.heart, clamp((g - opens) / .2) * (1 - span(g, opens + .3, opens + .42) * .6), 5, .15);
			continue;
		}
		if (k >= n - Math.floor(lost * (C.drop + 1))) continue;
		const r = R * lerp(.22, 1, set) * (.9 + r1 * .18);
		const ripe = span(g, ripeAt + r2 * .25, ripeAt + r2 * .25 + C.season.ripeFor);
		bag.add("gloss", bead(p, v3(r, r * .92, r), C.colour(ripe), 3));
		bag.add("body", bead(p.clone().addScaledVector(axis, r * .9), v3(1, 1, 1).multiplyScalar(r * .22), "#3a2a2a", 2));
	}
	if (bearing) bag.fruitDone();
}
/** @type {Corymb} */
const ARONIA_CORYMB = {
	count: [10, 18],
	r: .0048,
	drop: 3,
	stalk: "#7a6a40",
	bud: "#e8dccc",
	flower: "#f6f2ea",
	heart: "#d08aa0",
	bloom: .0075,
	colour: (t) => ramp([
		[0, "#8aac50"],
		[.35, "#c4604a"],
		[.65, "#5a1e38"],
		[1, "#1a1420"]
	], t),
	season: {
		opens: 4.7,
		setFor: 2.3,
		ripeFrom: 7.6,
		ripeFor: 1.1
	}
};
const aronia = /* @__PURE__ */ (() => shrub({
	seed: {
		size: v3(.0012, 8e-4, 8e-4),
		coat: "#7a5a3a",
		shade: "#4a3424"
	},
	cotyledon: {
		length: .005,
		width: .0028,
		colour: "#5f9a42"
	},
	stems: {
		count: 13,
		first: 2,
		every: .19,
		rate: 1.3,
		length: [.82, 1.02],
		lean: [.08, .35],
		crown: .3,
		radius: .015,
		up: .015,
		wander: .08,
		spread: .7,
		children: 4,
		shorten: [.42, .66],
		depth: 2,
		from0: .3,
		young: "#8a5a44",
		old: "#5a4a44",
		size: [
			[2, .18],
			[3, .38],
			[4, .78],
			[5, 1]
		]
	},
	roots: {
		length: .55,
		count: 8
	},
	leaf: {
		blade: simple((u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .6)), .75) * (1 + (u > .15 && u < .92 ? u * 14 % 1 * .05 : 0)), .6, .04),
		length: .07,
		stalk: .012,
		stalkColour: "#7a6a40",
		spacing: .035,
		from: 0,
		bare: .35,
		colour: "#2f6a2c",
		young: "#6aa44a",
		vein: "#8ab06a",
		shade: "#245a26",
		droop: .1,
		autumn: {
			colour: "#b8302a",
			from: 8.3,
			share: .2
		}
	},
	fruit: (ctx) => {
		for (const t of ctx.twigs) {
			if (t.order < 1 || !t.end) continue;
			if (chance(ctx.seed, "aronia-tip", ...t.key)() > (t.order === 2 ? .42 : .25)) continue;
			corymb(ctx, {
				at: t.tip,
				dir: t.dir,
				key: t.key
			}, ARONIA_CORYMB);
//#piece 90d5b61545bfa24968849ea32dd9b1924a72608a6f5f55dd5aee28c67c3ae436
	id: "aronia",
	label: "Aronia",
	latin: "Aronia melanocarpa · Apfelbeere",
	note: "An upright suckering shrub near two metres, glossy oval leaves going red in autumn, flat white corymbs at the shoot tips, then heavy clusters of black chokeberries.",
	from: "Shrub · 3 years",
	stages: ARONIA_STAGES,
	grow: aronia,
//#piece 6a46d079f14d6089f79784ecf20705689a90de4d5314bb9b21fadbd5aa4987ef

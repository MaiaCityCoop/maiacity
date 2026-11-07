//#piece a4b00dedf01ce385ddb2af68f1e0dfa88b67384fb73e668e321169e61d0b758d
//#region src/lib/plants/ground.js
//#piece a82999158b30fb3a0ed82921acc6a52ffefd907f320d529c20896aaa58977963
const MOSS_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Spore",
		0,
		"A moss spore, a hundredth of a millimetre, landed on damp shaded soil."
	],
	[
		"Protonema",
		14,
		"A green thread creeps over the soil, branching: the protonema."
	],
	[
		"Buds",
		40,
		"Tiny buds swell on the threads, each the start of a shoot; brown rhizoids anchor them."
	],
	[
		"Leafy shoots",
		90,
		"Upright shoots, narrow leaves in a spiral, star-like from above."
	],
	[
		"Cushion",
		200,
		"The shoots crowd together into a soft dark-green cushion."
	],
	[
		"Carpet",
		400,
		"The cushion spreads into a carpet, holding the rain like a sponge."
	],
	[
		"Sporophytes",
		540,
		"From the female shoots, red-brown stalks rise, each with a capsule under a golden hairy cap."
	],
	[
		"Capsules",
		580,
		"The capsules swell, four-angled, their caps still on."
	],
	[
		"Ripe capsules",
		620,
		"The caps fall, the capsules brown and tilt."
	],
	[
		"Spores",
		640,
		"The lids pop off; spores drift out on dry days. The carpet keeps on growing."
	]
]))();
/**
* The haircap moss at a stage (0 … 9) from the seed id.
* @param {number} g
* @param {string} seed
*/
function moss(g, seed) {
	const bag = new Bag();
	chance(seed, "moss");
	const spread = table(g, [
		[0, .004],
		[1, .01],
		[2, .02],
		[3, .04],
		[4, .08],
		[5, .14],
		[9, .16]
	]);
	if (g < .6) bag.add("body", bead(v3(0, 5e-4, 0), v3(1, 1, 1).multiplyScalar(6e-4), "#7a6a3a", 4));
	const threads = span(g, .4, 2.5) * (1 - span(g, 4, 5.5));
	if (threads > 0) for (let k = 0; k < 24; k++) {
		const tr = chance(seed, "protonema", k);
		const a = k * 2.39996, len = between(tr, .4, 1) * spread * .9;
		const pts = [];
		for (let m = 0; m <= 8; m++) pts.push(v3(Math.cos(a + Math.sin(m) * .4) * len * (m / 8), 6e-4, Math.sin(a + Math.sin(m) * .4) * len * (m / 8)));
		bag.add("body", tube(pts, () => 25e-5 * threads, () => "#7ab84a", 3));
	}
	const shoots = Math.round(table(g, [
		[1.6, 0],
		[3, 60],
		[4, 260],
		[5, 520],
		[9, 620]
	]));
	for (let i = 0; i < shoots; i++) {
		const sr = chance(seed, "shoot", i);
		const d = Math.sqrt((i + .5) / 620) * .16;
		const a = i * 2.39996 + sr() * .3;
		if (d > spread) continue;
		const grown = clamp((spread - d) / .03);
		const H = (.01 + .03 * between(sr, .6, 1)) * lerp(.15, 1, grown) * lerp(.4, 1, span(g, 3, 5.5));
		const base = v3(Math.cos(a) * d, 0, Math.sin(a) * d);
		const tilt = v3(sr() - .5, 4, sr() - .5).normalize();
		const top = base.clone().addScaledVector(tilt, H);
		bag.add("body", tube([base, top], () => 6e-4, () => "#5a4a2a", 3));
		const leaves = Math.round(8 + 18 * grown);
		for (let k = 0; k < leaves; k++) {
			const u = .15 + k / leaves * .85;
			const p = base.clone().lerp(top, u);
			const b = k * 2.39996;
			const dir = v3(Math.cos(b), .55 + .6 * u, Math.sin(b)).normalize();
			bag.add("sheet", sheet({
				length: .009 * lerp(.5, 1, grown),
				width: 9e-4,
				shape: (t) => (1 - t) * Math.min(1, t * 6 + .3),
				paint: (t) => mix("#2f5a24", "#7ab04a", t * .6 + (u > .8 ? .3 : 0)),
				along: 2,
				across: 1
			}), aim(p, dir, 0));
		}
		if (i % 3 === 0) root(bag, {
			seed,
			key: ["rhizoid", i],
			from: base.clone(),
			dir: v3(0, -1, 0),
			length: .012,
			grown,
			radius: 25e-5,
			down: .05,
			wander: .4,
			laterals: 2,
			depth: 1,
			young: "#8a6a4a",
			old: "#5a4030"
		});
		const fr = chance(seed, "sporophyte", i);
		if (fr() > .25 || g < 5.6 || grown < 1) continue;
		const rise = span(g, 5.6, 6.6);
		const capsule = span(g, 6.3, 7.3), ripe = span(g, 7.4, 8.4), spent = span(g, 8.4, 9);
		const seta = top.clone().add(v3((fr() - .5) * .01, .05 * rise, (fr() - .5) * .01));
		bag.add("body", tube([top, seta], () => 4e-4, () => "#9a3a2a", 3));
		const lean = ripe * .9;
		const cap = seta.clone().add(v3(lean * .003, -lean * .002, 0));
		bag.add("body", bead(cap, v3(.0016, .004, .0016).multiplyScalar(lerp(.3, 1, capsule)), mix("#7a9a3a", "#7a4a2a", ripe), 4, new three.Quaternion().setFromAxisAngle(v3(0, 0, 1), -lean * 1.2)));
		if (ripe < .6) bag.add("body", bead(cap.clone().add(v3(0, .0025, 0)), v3(.0022, .003, .0022).multiplyScalar(lerp(.3, 1, capsule)), "#d8b45a", 4));
		if (spent > .3) for (let m = 0; m < 4; m++) bag.add("body", bead(cap.clone().add(v3((fr() - .5) * .01, .004 + fr() * .008, (fr() - .5) * .01)), v3(5e-4, 5e-4, 5e-4), "#b89a4a", 2));
	}
//#piece 0de60e52e7e5ff10ad2b8179ce04e16ede6cf8f56e3a1e095aa50324494751b6
	id: "moss",
	label: "Haircap moss",
	latin: "Polytrichum commune · Widertonmoos",
	note: "From a spore: a green thread over the soil, buds, star-like leafy shoots crowding into a cushion and a carpet; red-brown stalks with hairy-capped capsules that ripen and shed their spores.",
	from: "Ground · 2 years",
	stages: MOSS_STAGES,
	grow: moss
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

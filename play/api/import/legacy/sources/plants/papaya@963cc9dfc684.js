//#piece 24955a19ef2fe29185c1d80f8d75cdf65a2ba48040f696f7729fd9e1dcb1af91
const PAPAYA_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small black wrinkled seed in its clear jelly, washed, a centimetre down in warm soil."
	],
	[
		"Germination",
		12,
		"The radicle goes down, the hook comes up."
	],
	[
		"Seed leaves",
		18,
		"Two oval seed leaves, then a first small lobed leaf."
	],
	[
		"Seedling",
		40,
		"A soft green stem, its leaves already deeply lobed."
	],
	[
		"Young papaya",
		120,
		"One unbranched hollow stem, scarred where old leaves fell, a crown of huge palmate leaves on long hollow stalks."
	],
	[
		"Flowering",
		180,
		"Waxy cream flowers in the axils of the leaves, right on the stem."
	],
	[
		"Fruit set",
		195,
		"Small green fruit set close against the stem, one at each leaf axil."
	],
	[
		"Green fruit",
		240,
		"A ring of heavy green papayas hugging the stem under the leaves, more forming above."
	],
	[
		"Colouring",
		300,
		"The lowest turn yellow from their tips."
	],
	[
		"Ripe",
		320,
		"Yellow-orange papayas below, green ones above: it fruits on as the stem grows."
	]
]))();
/** a papaya leaf's edge: seven deep lobes, each lobed again */
function papayaLeaf(a) {
	const lobes = [
		0,
		.85,
		-.85,
		1.7,
		-1.7,
		2.45,
		-2.45
	];
	let reach = 0;
	for (let k = 0; k < lobes.length; k++) {
		const d = Math.abs(a - lobes[k]);
		reach = Math.max(reach, (k < 1 ? 1 : k < 3 ? .95 : k < 5 ? .8 : .6) * (1 - .7 * Math.min(1, d / .38)));
	}
	return Math.max(.12, reach * (1 + .1 * Math.abs(Math.sin(a * 24))));
}
/**
* The papaya at a stage (0 … 9) from the seed id.
* @param {number} g
* @param {string} seed
*/
function papaya(g, seed) {
//#piece c6508f61bffd24fe2de7528d54a8ccad9b8494ff3685b73fe5ff4887623c1c1d
		size: v3(.0028, .0022, .0022),
		coat: "#2a2420",
		coatShade: "#4a3a30",
//#piece 235e4c15e55653826ef0ac6943af682acfa7160af59a8dae07e337e196c328fa
		radius: .0012 + .002 * span(g, 1, 3),
		stemColor: "#7aa04a",
		leaf: {
			length: .016,
			width: .006,
//#piece 24721d2384e6f9c5e661499dd115eaa576119efc5f4f7709596581e1f73ed9e3
		length: .8,
		grown: table(g, [
			[0, 0],
			[.3, .01],
			[1, .05],
			[3, .3],
			[5, .8],
			[7, 1]
		]),
		radius: .002 + .02 * span(g, 3, 8),
		down: .03,
		wander: .15,
		laterals: 10,
		lateral: .4,
		depth: 2,
		age: span(g, 3, 8),
		young: "#f4ead2",
		old: "#c8a878"
	});
	for (let i = 0; i < 16; i++) {
		const a = i * 2.39996;
		root(bag, {
			seed,
			key: ["lat", i],
			from: at.clone().add(v3(0, -.04, 0)),
			dir: v3(Math.cos(a), -.2, Math.sin(a)),
			length: .7 * vigour,
			grown: (g - 3 - i * .1) / 2.5,
			radius: .006,
			down: .015,
			wander: .2,
			laterals: 5,
			depth: 2,
			age: (g - 4 - i * .1) / 3,
			young: "#f4ead2",
			old: "#c8a878"
		});
	}
	const H = table(g, [
		[2, 0],
		[3, .15],
		[4, 1],
		[5, 1.6],
		[6, 1.8],
		[7, 2.1],
		[8, 2.35],
		[9, 2.5]
	]) * vigour;
	const base = s.top.clone();
	const R = lerp(.006, .075, span(g, 2.5, 8)) * vigour;
	const top = base.clone().add(v3(0, H, 0));
	if (H > .05) bag.space.rod([base, top], R * 1.05);
	const made = table(g, [
		[2, 0],
		[3, 4],
		[4, 18],
		[5, 30],
		[6, 36],
		[7, 44],
		[8, 52],
		[9, 58]
	]);
	const live = Math.min(made, 22);
	if (H > .01) bag.add("body", tube([
		base,
		base.clone().add(v3(0, H * .5, 0)),
		top
	], (u, v) => R * (1.3 - .6 * u) * (1 - .06 * Math.pow(Math.abs(Math.sin(u * H * 34 + v * 3)), 12)), (u, v) => mix("#8a9a6a", "#7aa04a", clamp((u - .6) * 3)).lerp(new three.Color("#6a6a50"), Math.pow(Math.abs(Math.sin(u * H * 34 + v * 3)), 20) * .6), 14));
	/** where on the stem leaf j sprang: the top's last metre, up the spiral */
	const leafAt = (j) => base.clone().add(v3(0, Math.max(0, H - (made - j) * .022), 0));
	for (let j = Math.max(0, Math.floor(made - live)); j < Math.ceil(made); j++) {
		const lr = chance(seed, "papaya-leaf", j);
		const age = (made - j) / live;
		const grown = clamp((made - j) / 2);
		const bear = j * 2.39996;
		const out = v3(Math.cos(bear), 0, Math.sin(bear));
		const p = leafAt(j);
		const size = lerp(.2, 1, clamp(j / 16)) * vigour;
		const tilt = lerp(.25, 1.45, Math.pow(age, .8)) + about(lr, 0, .1);
//#piece 0067898aa7e9aef54cfbd3b0a0426870894d3cfe1c9ddb7c65cccca811455bf2
		const len = .75 * size * lerp(.3, 1, grown);
		const end = p.clone().addScaledVector(dir, len).add(v3(0, -.08 * len * age, 0));
		const yellow = span(age, .85, 1);
		bag.add("body", tube([
			p,
			p.clone().addScaledVector(dir, len * .5),
			end
		], (u) => .008 * size * (1 - .5 * u), () => mix("#8ab05a", "#c8a84a", yellow), 5));
		const facing = out.clone().multiplyScalar(.35).add(v3(0, 1, 0)).normalize();
		bag.add("sheet", fan({
			size: .42 * size * lerp(.25, 1, grown),
			from: -Math.PI + .3,
			to: Math.PI - .3,
			edge: papayaLeaf,
			lift: (sv, a) => -.15 * sv * sv * (1 + age) + .03 * Math.cos(a * 7) * sv,
			paint: (sv, a) => mix(mix("#3a6e2a", "#7ab04a", 1 - grown), "#d8c04a", yellow).lerp(new three.Color("#c8dca0"), [
				0,
				.85,
				-.85,
				1.7,
				-1.7,
				2.45,
				-2.45
			].some((t) => Math.abs(a - t) < .035) ? .45 : 0),
			rings: 7,
			rays: 70
		}), aim(end, out.clone().lerp(facing, .5).normalize(), 0));
		const opens = 4.6 + (j - 26) * .045;
		if (j < 24 || g < opens - .2) continue;
		const set = span(g, opens + .25, opens + 2.1);
		const axil = p.clone().addScaledVector(out, R * 1.05);
		if (set < .03) {
			bag.add("body", bead(axil.clone().addScaledVector(out, .012), v3(.007, .016, .007), "#f2eccf", 5));
			continue;
		}
		const ripe = span(g, opens + 2.4, opens + 3.2);
		const L = (.05 + .2 * set) * vigour * about(lr, 1, .1), W = L * .36;
		const here = R * (1.3 - .6 * clamp((p.y - base.y) / Math.max(.01, H)));
		/** @type {{ balls: { c: THREE.Vector3, r: number }[], cost: number, data: { from: THREE.Vector3, tilt: THREE.Vector3 } }[]} */
		const ways = [];
		for (const drop of [
			0,
			.25,
			.5
		]) for (const turn of [
			0,
			.3,
			-.3,
			.6,
			-.6,
			.95,
			-.95
		]) for (const push of [
			0,
			.5,
			1
		]) {
			const o = out.clone().applyAxisAngle(v3(0, 1, 0), turn);
			const from = p.clone().addScaledVector(o, here + W * (.92 + push * .6)).add(v3(0, -drop * L, 0));
			const tilt = o.clone().multiplyScalar(push * .18).add(v3(0, -1, 0)).normalize();
			const balls = [
				.2,
				.45,
				.7,
				.9
			].map((f) => ({
				c: from.clone().addScaledVector(tilt, L * f),
				r: W * (.8 + .25 * f) * .95
			}));
			ways.push({
				balls,
				cost: Math.abs(turn) * .004 + push * .006 + drop * .01,
				data: {
					from,
					tilt
				}
			});
		}
		const way = bag.space.best(ways);
		const axis = [];
		for (let k = 0; k <= 14; k++) axis.push(way.from.clone().addScaledVector(way.tilt, k / 14 * L));
		bag.fruit(["papaya", j], way.from, way.tilt);
		bag.add("gloss", tube(axis, (u, v) => W * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .04 + u * .98))), .45) * (.8 + .25 * u) * (1 + .05 * Math.cos(v * Math.PI * 10)), (u) => mix("#3f7a2e", "#f2a02a", clamp(ripe * 1.6 - (1 - u) * .7)), 16));
		bag.fruitDone();
	}
//#piece 0de60e52e7e5ff10ad2b8179ce04e16ede6cf8f56e3a1e095aa50324494751b6
	id: "papaya",
	label: "Papaya",
	latin: "Carica papaya",
	note: "One unbranched scarred stem, a crown of huge palmate leaves on long hollow stalks; cream flowers and then a ring of papayas hugging the stem in the leaf axils, ripening from below.",
	from: "Herb-tree · 11 months",
	stages: PAPAYA_STAGES,
	grow: papaya
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

//#piece f2600ac316edfee61d72990fbd47fccda6979019a8d75f09e9cd2bbb7522d1c4
//#region src/lib/plants/ginger.js
const GINGER_STAGES = [
	{
		name: "Seed piece",
		day: 0,
		note: "A plump piece of rhizome with two or three eyes, laid flat five centimetres down in warm, moist soil."
	},
	{
		name: "Sprouting",
		day: 14,
		note: "The eyes swell, pink and green-tipped; white roots go down from the underside."
	},
	{
		name: "Shoot",
		day: 30,
		note: "A pointed shoot, rolled tight, breaks the soil."
	},
	{
		name: "First leaves",
		day: 50,
		note: "A reed-like stem unrolls its leaves in two ranks, one to each side in turn."
	},
	{
		name: "Clump",
		day: 90,
		note: "New knobs on the rhizome, each sending up a stem of its own."
	},
	{
		name: "Reeds",
		day: 130,
		note: "A clump of leafy stems a metre high; below, the hand branching into fingers."
	},
	{
		name: "Young fingers",
		day: 160,
		note: "New fingers of rhizome fill out under the soil, pink where each stem rises."
	},
	{
		name: "Baby ginger",
		day: 190,
		note: "Tender, thin-skinned, pink-tipped: dug now, it is mild and needs no peeling."
	},
	{
		name: "Swelling",
		day: 230,
		note: "The fingers fatten and their skins toughen to tan, ringed with scars."
	},
	{
		name: "Harvest",
		day: 270,
		note: "The leaves yellow and fall over: lift the clump, keep a hand back to plant again."
	}
];
const DEPTH = .05;
/** a lance leaf, narrow and long-pointed */
const lance = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .65)), .75) * (u < .04 ? u / .04 : 1);
/**
* @typedef {{ pts: THREE.Vector3[], tip: THREE.Vector3, dir: THREE.Vector3, gen: number, key: (string | number)[], born: number, grown: number }} Knob
*/
/**
* The ginger at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g
* @param {string} seed
*/
function ginger(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const swell = span(g, 5.3, 9);
	const die = span(g, 8.2, 9.4);
	/** @type {Knob[]} */
	const knobs = [];
	/**
	* A knob of rhizome and the knobs that branch from it: sideways and a little up, the same whatever the stage.
	* @param {(string | number)[]} key @param {THREE.Vector3} from @param {THREE.Vector3} dir @param {number} gen @param {number} born
	*/
	const knob = (key, from, dir, gen, born) => {
		const r = chance(seed, "knob", ...key);
		const len = (gen === 0 ? .055 : between(r, .026, .042)) * vigour;
		const d = dir.clone().setY(0).normalize();
		const path = [from.clone()];
		for (let k = 1; k <= 6; k++) {
			const t = k / 6;
			path.push(from.clone().addScaledVector(d, len * t).add(v3(0, (gen === 0 ? 0 : .006) * t * t, 0)));
		}
		const grown = gen === 0 ? 1 : clamp((g - born) / .9);
		if (grown <= 0) {
			if (g > born - .8) bag.add("body", bead(from, v3(1, .8, 1).multiplyScalar(.003 * span(g, born - .8, born)), "#e8a0a8", 4));
			return;
		}
		const pts = grown >= 1 ? path : path.map((p) => from.clone().lerp(p, grown));
		knobs.push({
			pts,
			tip: pts[6].clone(),
			dir: d,
			gen,
			key,
			born,
			grown
		});
		if (gen >= 4) return;
		const n = gen === 0 ? 2 : r() < (gen < 3 ? .8 : .25) ? 2 : 1;
		for (let i = 0; i < n; i++) {
			const side = i === 0 ? -1 : 1;
			const turn = side * between(r, .5, 1.05) + (gen === 0 ? side * .6 : 0);
			const next = born + (gen === 0 ? .6 + i * .7 : between(r, .7, 1.2) + i * .35);
			if (next > 7.4) continue;
			const at = gen === 0 ? path[2 + i * 3].clone() : path[5].clone();
			knob([...key, i], at, d.clone().applyAxisAngle(v3(0, 1, 0), turn), gen + 1, next);
		}
	};
	const r0 = chance(seed, "hand");
	knob(["hand"], v3(-.025, -.05, 0), v3(Math.cos(r0() * 6.28), 0, Math.sin(r0() * 6.28)), 0, -1);
	for (const k of knobs) {
		const kr = chance(seed, "knob-body", ...k.key);
		const R = k.gen === 0 ? .011 : (.004 + .008 * clamp(k.grown) * lerp(.6, 1.35, swell)) * about(kr, 1, .12) * vigour;
		const young = clamp(1 - (g - k.born) / 3.5) * (1 - swell * .7);
		bag.add("body", tube(k.pts, (u) => R * Math.pow(Math.max(0, Math.sin(Math.PI * (.07 + .86 * u))), .45) * (1 + .06 * Math.sin(u * 19 + kr())), (u) => {
			return (k.gen === 0 ? mix("#c8a878", "#8a7454", span(g, 4, 9)) : mix(mix("#f2dcbc", "#c89a5e", swell), "#e88a96", young * clamp((u - .55) * 2.5))).lerp(new three.Color("#7a5a3a"), Math.pow(Math.abs(Math.sin(u * Math.PI * 4.5)), 24) * .55);
		}, 8));
		root(bag, {
			seed,
			key: ["g-root", ...k.key],
			from: k.pts[3].clone().add(v3(0, -R * .7, 0)),
			dir: v3(kr() - .5, -1, kr() - .5),
			length: between(kr, .08, .16),
			grown: (g - Math.max(.3, k.born + .3)) / 1.6,
			radius: 9e-4,
			down: .04,
			wander: .25,
			laterals: 4,
			lateral: .3,
			depth: 1,
			age: (g - k.born - 1) / 3,
			young: "#f6efe0",
			old: "#c8b090"
		});
		if (k.gen === 0) {
			root(bag, {
				seed,
				key: [
					"g-root",
					"hand",
					2
				],
				from: k.pts[5].clone().add(v3(0, -R * .7, 0)),
				dir: v3(.3, -1, -.2),
				length: .14,
				grown: (g - .4) / 1.6,
				radius: 9e-4,
				down: .04,
				wander: .25,
				laterals: 4,
				lateral: .3,
				depth: 1,
				young: "#f6efe0",
				old: "#c8b090"
			});
			continue;
		}
		stem(bag, seed, k, R, g, vigour, die);
	}
	return bag.build();
}
/**
* A pseudostem and its two ranks of leaves, unrolling from the top as it rises.
* @param {Bag} bag @param {string} seed @param {Knob} k @param {number} R @param {number} g @param {number} vigour @param {number} die
*/
function stem(bag, seed, k, R, g, vigour, die) {
	const sr = chance(seed, "stem", ...k.key);
	const born = k.born + .5;
	const rise = span(g, born, born + 2.4);
	if (rise <= 0) return;
	const full = (k.gen === 1 ? 1.05 : k.gen === 2 ? .92 : .75) * between(sr, .82, 1.08) * vigour;
	const H = DEPTH + full * rise;
	const base = k.tip.clone().add(v3(0, R * .5, 0));
	const lean = k.dir.clone().multiplyScalar(between(sr, .04, .16));
	const at = (h) => base.clone().add(v3(lean.x * h * h * .6, h, lean.z * h * h * .6));
	const pts = [];
	for (let m = 0; m <= 8; m++) pts.push(at(m / 8 * H));
	const dead = clamp(die * 1.4 - (k.gen - 1) * .25);
	bag.add("body", tube(pts, (u) => .0055 * (1 - .55 * u) * lerp(.6, 1, rise), (u) => mix(mix("#e8a0a0", "#5f8f3a", clamp((u * H - DEPTH * .6) / .12)), "#c8b060", dead * u), 6));
	const plane = sr() * Math.PI * 2;
	const out = v3(Math.cos(plane), 0, Math.sin(plane));
	const n = 13;
	for (let j = 0; j < n; j++) {
		const f = .3 + .62 * (j / 12);
		const h = DEPTH + full * f;
		const lg = clamp((H - h) / .14);
		if (lg <= 0) break;
		const side = j % 2 ? 1 : -1;
		const size = (.17 + .07 * Math.sin(Math.PI * (.25 + .6 * (j / 12)))) * vigour * about(sr, 1, .08);
		const tilt = lerp(.12, between(sr, .85, 1.15) - .25 * (j / n), lg) + dead * .5;
		const o = out.clone().multiplyScalar(side).applyAxisAngle(v3(0, 1, 0), about(sr, 0, .15));
		const dir = o.clone().multiplyScalar(Math.sin(tilt)).add(v3(0, Math.cos(tilt), 0)).normalize();
		const colour = mix(mix("#8ac05a", "#3f7a2e", lg), "#d8c060", clamp(dead * 1.3 - (1 - j / n) * .2));
		bag.add("sheet", sheet({
			length: size * lerp(.35, 1, lg),
			width: size * .085 * lerp(.4, 1, lg),
			shape: lance,
			lift: (u, v) => (1 - lg) * .25 * v * v + .03 * v * v - (.12 + dead * .3) * u * u,
			paint: (u, v) => colour.clone().lerp(new three.Color("#a8c88a"), Math.abs(v) < .08 ? .35 : 0),
			along: 9,
			across: 2
		}), aim(at(h).addScaledVector(o, .004), dir, 0));
	}
//#piece 69f1d3d6a1a9ba606895e988f6b2d3bf22c7c85e9e9f4295855e80951be3b7da
	id: "ginger",
	label: "Ginger",
	latin: "Zingiber officinale · Ingwer",
	note: "From a piece of rhizome: reed-like stems a metre high, two ranks of narrow leaves; below the soil, the hand branching into knobbly fingers, pink where each stem rises.",
	from: "Rhizome · 9 months",
	stages: GINGER_STAGES,
	grow: ginger
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

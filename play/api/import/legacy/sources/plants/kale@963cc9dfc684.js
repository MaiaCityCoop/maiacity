//#piece 518aa236fe590e7deb62c53542badea4c01124d32176b4af875d2063d6576e7a
const KALE_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A round dark-brown seed two millimetres across, a centimetre down."
	],
	[
		"Germination",
		4,
		"The radicle goes down, the hook comes up."
	],
	[
		"Seed leaves",
		8,
		"Two heart-shaped seed leaves, notched at the tip, on a purplish stem."
	],
	[
		"True leaves",
		20,
		"The first true leaves, already blue-green and waxy."
	],
	[
		"Young plant",
		40,
		"A rosette on a short, stout stem."
	],
	[
		"Leafy",
		60,
		"Big leaves on long stalks, new ones from the top as the stem lengthens."
	],
	[
		"First picking",
		80,
		"The lowest leaves snapped off down at the stem, leaving scars."
	],
	[
		"Picking",
		110,
		"Picked from the bottom up week by week; the stem rises bare and scarred."
	],
	[
		"Winter",
		150,
		"Frost sweetens it: a crown of leaves on a scarred stem, like a little palm."
	],
	[
		"Harvest",
		180,
		"Still picking from the crown through the winter; in spring it will flower."
	]
]))();
/** curly kale's leaf: oblong, its edge frilled; Lacinato's: long and narrow, rounded at the tip */
const curlyLeaf = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .55) * (.72 + .28 * Math.abs(Math.sin(u * 23))) * (u < .1 ? u * 6 + .4 : 1);
const strapLeaf = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .62)), .5) * (u < .08 ? u * 8 + .3 : 1);
/**
* Kale at a stage (0 … 9, between them on the way) from the seed id: curly or Lacinato, by the seed.
* @param {number} g @param {string} seed
*/
function kale(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const curly = chance(seed, "kale-sort")() < .55;
	const at = v3(0, -.008, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.0011, .001, .001),
		coat: "#5a3a2a",
		coatShade: "#3a2418",
		stem: table(g, [
			[0, 0],
			[.3, 8e-4],
			[1, .012],
			[2, .022],
			[9, .022]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.5, 0]
		]),
		radius: 9e-4 + .004 * span(g, 2, 6),
		stemColor: "#7a6a8a",
//#piece 313913a130a113f0936214b8b9b91e3c97dd1aaf60589b0b5ae12ccab3f2f520
			color: "#5a8a5a",
			vein: "#9cc0a0"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.5),
		wither: span(g, 3.6, 4.6)
	});
	root(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(0, -1, 0),
		length: .4,
		grown: table(g, [
			[0, 0],
			[.3, .02],
			[1, .08],
			[3, .4],
			[5, .85],
			[7, 1]
		]),
		radius: .003 + .006 * span(g, 3, 8),
		down: .04,
		wander: .15,
		laterals: 14,
		lateral: .4,
		depth: 2,
		age: span(g, 3, 8),
		young: "#f6efdc",
		old: "#c8b08a"
	});
	const n = 28;
	const born = (i) => 2.2 + i * .25;
	const node = (i) => (i < 8 ? i * .007 : .056 + (i - 8) * .019) * vigour;
	const sr = chance(seed, "kale-stem");
	const lean = v3(sr() - .5, 0, sr() - .5).multiplyScalar(.12);
	const stemAt = (h) => s.top.clone().add(v3(lean.x * h * h * 2, h, lean.z * h * h * 2));
	let last = -1;
	for (let i = 0; i < n; i++) if (g > born(i)) last = i;
	if (last >= 0) {
		const H = node(last) + .012 * clamp(g - born(last));
		const pts = [];
		for (let m = 0; m <= 12; m++) pts.push(stemAt(m / 12 * H));
		const R = (.004 + .014 * span(g, 3, 8.5)) * vigour;
		bag.add("body", tube(pts, (u) => R * (1 - .35 * u), (u) => mix("#8a9a8a", "#6a8a6a", u), 8));
		bag.space.rod(pts, R);
	}
	const picked = (i) => g > 5.7 + i * .24;
	for (let i = 0; i <= last; i++) {
		const lr = chance(seed, "kale-leaf", i);
		const bear = i * 2.39996 + about(lr, 0, .1);
		const out = v3(Math.cos(bear), 0, Math.sin(bear));
		const p = stemAt(node(i));
		if (picked(i)) {
			if (i >= 2) bag.add("body", bead(p.clone().addScaledVector(out, .008 + .008 * span(g, 3, 8.5)), v3(.007, .0035, .004), "#c8ccb0", 3, new three.Quaternion().setFromUnitVectors(v3(1, 0, 0), out)));
			continue;
		}
		const grown = clamp((g - born(i)) / 1.6);
		const size = (.1 + .42 * clamp(i / 10)) * vigour * about(lr, 1, .07) * lerp(.25, 1, grown);
		const tilt = lerp(.15, between(lr, .8, 1.15), grown);
//#piece 0067898aa7e9aef54cfbd3b0a0426870894d3cfe1c9ddb7c65cccca811455bf2
		const stalk = size * .28;
		const from = p.clone().addScaledVector(out, .006);
		const top = from.clone().addScaledVector(dir, stalk);
		bag.add("body", tube([from, top], (u) => .0035 * lerp(.5, 1, grown) * (1 - .3 * u), () => curly ? "#8aa88a" : "#9aa898", 5));
		const bladeDir = dir.clone().add(v3(0, -.12, 0)).normalize();
		const blade = size * .8;
		const colour = curly ? mix("#4a7a52", "#3a6650", lr() * .6) : mix("#2e4a44", "#36524a", lr());
		if (curly) bag.add("sheet", sheet({
			length: blade,
			width: blade * .24,
			shape: curlyLeaf,
			lift: (u, v) => .12 * v * v - .14 * u * u + .05 * Math.pow(Math.abs(v), 1.6) * Math.sin(u * 64 + v * 9) * lerp(.4, 1, grown),
			paint: (u, v) => colour.clone().lerp(new three.Color("#b8c8b0"), Math.abs(v) < .07 ? .55 : 0).lerp(new three.Color("#6a9a6a"), Math.abs(v) > .85 ? .3 : 0),
			along: 26,
			across: 8
		}), aim(top, bladeDir, 0));
		else bag.add("sheet", sheet({
			length: blade * 1.1,
			width: blade * .11,
			shape: strapLeaf,
			lift: (u, v) => .03 * v * v - .22 * u * u + .012 * Math.sin(u * 52) * Math.sin(v * 7.5) * lerp(.3, 1, grown),
			paint: (u, v) => colour.clone().lerp(new three.Color("#b0bca8"), Math.abs(v) < .08 ? .55 : 0).lerp(new three.Color("#5a7a70"), Math.max(0, Math.sin(u * 52) * Math.sin(v * 7.5)) * .35),
			along: 24,
			across: 6
		}), aim(top, bladeDir, 0));
	}
//#piece 0de60e52e7e5ff10ad2b8179ce04e16ede6cf8f56e3a1e095aa50324494751b6
	id: "kale",
	label: "Kale",
	latin: "Brassica oleracea var. sabellica · Grünkohl",
	note: "An upright stem crowned with blue-green leaves, curled and frilled or long and blistered (Lacinato); picked from the bottom up, the stem bare and scarred like a little palm.",
	from: "Leaves · 180 days",
	stages: KALE_STAGES,
	grow: kale
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

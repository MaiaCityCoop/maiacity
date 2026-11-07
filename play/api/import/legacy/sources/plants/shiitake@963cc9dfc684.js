//#piece 9b370cefea54afbc4c560ce9db81392d66aa970b65e3cb7ea36f66cb4310f1b7
//#piece 2f56a4b3d3e399c325017056717a3d06b108e21771734b2213f8854dd38bf07c
//#piece 231d0ceacb98ad1088fc294c3c1b5abc96e2dc8d48b468bd535070f22e1b1a9d
//#piece f45cc8f36959c11673d3c5b41cf658a427d9d9b6c4323ef04a197aa0d441ddef
//#piece f08d08c537213e06dc73ed72bb76957b6015a20339bffafed9f802b52128ddcd
const SHIITAKE_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Plugging",
		0,
		"A fresh-cut oak log, drilled in a diamond pattern; plugs of spawn tapped in and sealed with wax."
	],
	[
		"Running",
		60,
		"The mycelium runs out from each plug through the wood, unseen."
	],
	[
		"Colonising",
		180,
		"White mottling creeps over the cut ends."
	],
	[
		"Colonised",
		300,
		"The ends are white through: the log is ready to fruit."
	],
	[
		"Shocked",
		330,
		"Soaked a day in cold water to wake it."
	],
	[
		"Pinning",
		337,
		"Small knobs push through cracks in the bark."
	],
	[
		"Buttons",
		341,
		"Brown buttons with a white-fringed rim."
	],
	[
		"Opening",
		344,
		"The caps open, brown with pale flecks, their gills cream."
	],
	[
		"Mature",
		347,
		"Caps a hand across, edges just beginning to flatten: pick now."
	],
	[
		"Resting",
		360,
		"The log rests a couple of months, then fruits again — for four or five years."
	]
]))();
/**
* Shiitake on an oak log.
* @param {number} g
* @param {string} seed
*/
function shiitake(g, seed) {
	const bag = new Bag();
	const R = .07, L = .9;
	const a = v3(-.9 / 2, R, 0), b = v3(L / 2, .12000000000000001, 0);
	log(bag, a, b, R, span(g, 1.5, 3), "#5a4a3e");
	const pr = chance(seed, "plugs");
	for (let k = 0; k < 24; k++) {
		const u = .08 + k % 8 * .12 + Math.floor(k / 8) % 2 * .06;
		const ang = Math.floor(k / 8) * 2.1 + pr() * .2;
		const radial = v3(0, Math.cos(ang), Math.sin(ang));
		bag.add("body", bead(a.clone().lerp(b, u).addScaledVector(radial, R), v3(.006, .006, .006), "#c8a03a", 4));
	}
	const fr = chance(seed, "flush");
	for (let k = 0; k < 9; k++) {
		const u = between(fr, .1, .9), ang = between(fr, -1.6, 1.6);
		const radial = v3(0, Math.cos(ang), Math.sin(ang));
		const pins = 4.7 + fr() * .5;
		const grow = span(g, pins, pins + 3.2) * (1 - span(g, 8.6, 9.2));
		if (grow <= .01) continue;
		const size = about(fr, 1, .2);
		const up = radial.clone().lerp(v3(0, 1, 0), .5).normalize();
		mushroom(bag, {
			key: ["flush", k],
			at: a.clone().lerp(b, u).addScaledVector(radial, R * .95),
			up,
			stipe: .035 * size * lerp(.3, 1, grow),
			stipeR: .007 * size,
			capR: .05 * size * lerp(.15, 1, grow),
			open: span(g, 6, 7.8),
			cap: (uu, ang2) => mix("#6a3e24", "#a8784a", uu * .6).lerp(new three.Color("#e8dcc8"), uu > .4 && Math.abs(Math.sin(ang2 * 9 + uu * 30)) > .93 ? .6 : 0),
			gills: "#efe6d2",
			stem: "#e2d6c0"
		});
	}
//#piece 0de60e52e7e5ff10ad2b8179ce04e16ede6cf8f56e3a1e095aa50324494751b6
	id: "shiitake",
	label: "Shiitake",
	latin: "Lentinula edodes · Shiitake",
	note: "An oak log plugged with spawn and sealed with wax; months of colonising, a cold soak, then brown flecked caps breaking from the bark, again for years.",
	from: "Fungus · 1 year",
	stages: SHIITAKE_STAGES,
	grow: shiitake
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

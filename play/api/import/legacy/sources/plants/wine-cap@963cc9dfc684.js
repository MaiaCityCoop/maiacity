//#piece 9b370cefea54afbc4c560ce9db81392d66aa970b65e3cb7ea36f66cb4310f1b7
//#piece 5fd4ec1a2e6d0bc5f114332cdb20755490bd4ac6ad8547671b6404613a808a82
//#piece f45cc8f36959c11673d3c5b41cf658a427d9d9b6c4323ef04a197aa0d441ddef
const WINECAP_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Spawn",
		0,
		"Spawn — grain or sawdust grown through with mycelium — mixed into a bed of fresh hardwood chips."
	],
	[
		"Running",
		14,
		"White threads run out from the spawn through the damp chips."
	],
	[
		"Colonising",
		40,
		"Thick white cords, rhizomorphs, bind the chips together and reach down into the soil."
	],
	[
		"Colonised",
		70,
		"The bed is white through; the mycelium feeds the soil and the plants around it."
	],
	[
		"Pinning",
		85,
		"After rain: tiny wine-red knobs push up out of the chips."
	],
	[
		"Buttons",
		88,
		"Round wine-red buttons on stout white stems."
	],
	[
		"Opening",
		91,
		"The caps open, their veil tearing into a ring with ridged edges."
	],
	[
		"Mature",
		93,
		"Big burgundy caps a hand across, their gills turning purple-grey with spores."
	],
	[
		"Fading",
		96,
		"The caps fade to tan as they age; pick them young."
	],
	[
		"Next flush",
		110,
		"The bed rests and flushes again, as long as the chips last: top it up each year."
	]
]))();
/**
* Wine caps in a bed of wood chips.
* @param {number} g
* @param {string} seed
*/
function wineCap(g, seed) {
	const bag = new Bag();
	const R = .32;
	const cr = chance(seed, "chips");
	for (let k = 0; k < 420; k++) {
		const d = Math.sqrt(cr()) * R, a = cr() * Math.PI * 2;
		const q = new three.Quaternion().setFromEuler(new three.Euler(cr() * .6 - .3, cr() * 6.28, cr() * .6 - .3));
		bag.add("body", bead(v3(Math.cos(a) * d, .006 + cr() * .025 * (1 - d / R), Math.sin(a) * d), v3(.012, .0025, .007).multiplyScalar(between(cr, .6, 1.4)), mix("#b08a5a", "#e8e0cc", span(g, 1, 3.5) * (cr() < .5 ? .8 : .2)), 2, q));
	}
	for (let i = 0; i < 18; i++) {
		const mr = chance(seed, "mycelium", i);
		const a = i * 2.39996;
		root(bag, {
			seed,
			key: ["myc", i],
			from: v3(Math.cos(a) * .05, .01, Math.sin(a) * .05),
			dir: v3(Math.cos(a), -between(mr, .2, .9), Math.sin(a)),
			length: between(mr, .2, .38),
			grown: span(g, .3 + i * .05, 3 + i * .05),
			radius: 8e-4,
			down: .03,
			wander: .4,
			laterals: 6,
			lateral: .4,
			depth: 2,
			young: "#ffffff",
			old: "#efeae0"
		});
	}
	const fr = chance(seed, "troop");
	for (let k = 0; k < 9; k++) {
		const pins = 3.6 + fr() * .6;
		const grow = span(g, pins, pins + 3.2);
		if (grow <= 0) {
			fr();
			fr();
			continue;
		}
		const d = Math.sqrt(fr()) * R * .8, a = fr() * Math.PI * 2;
		const size = about(fr, 1, .2);
		const fade = span(g, 7.3, 8.6);
		mushroom(bag, {
			key: ["troop", k],
			at: v3(Math.cos(a) * d, .02, Math.sin(a) * d),
			up: v3(fr() - .5, 4, fr() - .5),
			stipe: .12 * size * lerp(.2, 1, grow),
			stipeR: .012 * size * lerp(.4, 1, grow),
			capR: .065 * size * lerp(.12, 1, grow),
			open: span(g, 5.6, 7.2),
			cap: (u) => mix("#7a1e2a", "#c89a6a", fade).lerp(new three.Color("#a8545a"), u * .25),
			gills: mix("#e8e2dc", "#5a4a5a", span(g, 6.5, 7.5)).getStyle(),
			stem: "#f2ece0",
			ring: "#eae2d4"
		});
	}
//#piece 0de60e52e7e5ff10ad2b8179ce04e16ede6cf8f56e3a1e095aa50324494751b6
	id: "wine-cap",
	label: "Wine cap",
	latin: "Stropharia rugosoannulata · Riesenträuschling",
	note: "The food forest’s mushroom: spawn in a bed of wood chips, white rhizomorphs binding the chips and running into the soil, then a troop of wine-red caps on white stems.",
	from: "Fungus · 4 months",
	stages: WINECAP_STAGES,
	grow: wineCap
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

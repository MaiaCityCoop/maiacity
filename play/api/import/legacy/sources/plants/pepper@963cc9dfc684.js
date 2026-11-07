//#piece 1c847f9682b7eff0986eb7270e4b46c7923ffe3c6e73fcde8073b7ce972f92f6
//#piece a97021c8bd634397ead30fb88b5aa7716e28fe31946fad463c5a442cb5b1d76f
//#piece 71f23d73adda5ba143ef4e14b0986abbffc8e5172ab601e0bb143158ed9a726e
const PEPPER_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A flat round pale seed, half a centimetre down in warm soil: peppers want 25 °C to sprout."
	],
	[
		"Germination",
		9,
		"The radicle goes down, the hook comes up."
	],
	[
		"Seed leaves",
		16,
		"Two long narrow seed leaves."
	],
	[
		"True leaves",
		35,
		"Glossy, pointed, dark green true leaves."
	],
	[
		"Forking",
		60,
		"The stem forks, and forks again, into a little bush."
	],
	[
		"Flowering",
		75,
		"A single small white flower nods in every fork."
	],
	[
		"Fruit set",
		85,
		"The petals fall; a little green bell swells behind each."
	],
	[
		"Green peppers",
		100,
		"Blocky green bells, three or four lobes, hanging heavy."
	],
	[
		"Colouring",
		120,
		"They darken, then turn: chocolate, then red."
	],
	[
		"Ripe",
		135,
		"Glossy red peppers, thick-walled and sweet."
	]
]))();
const PEPPER_FLOWER = {
	petals: 6,
	length: .011,
	width: .0045,
	colour: "#f6f4ea",
	heart: "#d8c860",
	sepals: 6,
	sepal: .004,
	stamens: 6,
	stamenColour: "#8a7ab8",
	flat: .3
};
/** @param {number} g @param {string} seed */
function pepper(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .1);
	const at = v3(0, -.006, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.0018, 5e-4, .0017),
		coat: "#ecdcae",
		coatShade: "#c8b47e",
		stem: table(g, [
			[0, 0],
			[.3, 8e-4],
			[1, .01],
			[2, .03],
			[9, .032]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.5, 0]
		]),
		radius: .001 + .004 * span(g, 2, 6),
		stemColor: "#5f8a3a",
		leaf: {
			length: .024,
			width: .0055,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .85)), .7),
			color: "#4f8a35",
			vein: "#9cc277"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.6),
		wither: span(g, 4.4, 5.4)
	});
	root(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(0, -1, 0),
		length: .35,
		grown: table(g, [
			[0, 0],
			[.3, .006],
			[1, .05],
			[3, .35],
			[6, 1]
		]),
		radius: .002,
		down: .04,
		wander: .15,
		laterals: 0,
		depth: 0,
		age: span(g, 2, 6),
		young: "#f6efdc",
		old: "#c4a37a"
	});
	const lr0 = chance(seed, "laterals");
	for (let i = 0; i < 22; i++) {
		const a = i * 2.39996;
		root(bag, {
			seed,
			key: ["lat", i],
			from: at.clone().add(v3(0, -.005 - i * .01, 0)),
			dir: v3(Math.cos(a), -.4, Math.sin(a)),
			length: between(lr0, .1, .24),
			grown: (g - 1.3 - i * .15) / 2.5,
			radius: .001,
			down: .05,
			wander: .3,
			laterals: 6,
			lateral: .3,
			depth: 2,
			age: (g - 2.5 - i * .15) / 3,
			young: "#f6efdc",
			old: "#c0a078"
//#piece fb9f36f225c80cfcb13de136638598b6496ae52e80009b8495c241d885f85bb3
		length: .25 * vigour,
		grown: table(g, [
			[2, 0],
			[3, .3],
			[4, .9],
			[5, 1.6],
			[6, 2.2],
			[7, 2.6],
			[9, 2.8]
		]),
		radius: .008,
		up: .04,
		wander: .08,
		spread: .55,
		children: 2,
		shorten: [.8, .95],
		depth: 3,
		from0: .95,
		young: "#6f9a42",
		old: "#5a7a3a",
		age: span(g, 4, 8),
		out: limbs
	});
	const space = bag.space;
	for (const l of limbs) space.rod(l.pts, .006);
	/** @type {(() => void)[]} */
	const leaves = [];
	for (const l of limbs) {
		const lr = chance(seed, "pepper-leaves", ...l.key);
		const n = Math.floor(l.length / .05);
		for (let k = 0; k < Math.min(n, 6); k++) {
			const { p } = along(l.pts, (k + .6) / Math.max(1, n));
			const bear = k * 2.39996 + lr() * .5;
			const size = about(lr, 1, .12) * vigour;
			const grown = clamp((l.length - (k + .6) * .05) / .08);
			leaves.push(() => {
				const dir = space.steer(p, v3(Math.cos(bear), 0, Math.sin(bear)), -.2, .12 * size, .02).clone().multiplyScalar(.85).add(v3(0, lerp(.8, -.25, grown), 0)).normalize();
				bag.add("sheet", sheet({
					length: .1 * size * lerp(.3, 1, grown),
					width: .024 * size,
					shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .75)), .7) * (u < .1 ? u / .1 : 1),
					lift: (u, v) => .05 * v * v - .08 * u * u,
					paint: (u, v) => mix("#2f6a28", "#6aa84a", 1 - grown).lerp(new three.Color("#8fbf6e"), Math.abs(v) < .08 ? .4 : 0),
					along: 10,
					across: 4
				}), aim(p.clone().addScaledVector(dir, .012), dir, 0));
			});
		}
		if (l.order >= 1) {
			const fr = chance(seed, "pepper-flower", ...l.key);
			const opens = 4.3 + l.order * .35 + fr() * .4;
			if (g < opens - .25) continue;
			const fork = l.pts[0];
			const down = v3(fr() - .5, -1, fr() - .5).normalize();
			const set = span(g, opens + .4, opens + 2.2);
			if (set < .03) {
				const end = fork.clone().addScaledVector(down, .02);
				bag.add("body", tube([fork, end], () => .001, () => "#6f9a42", 4));
				if (g < opens) bag.add("body", bead(end, v3(.003, .004, .003), "#e8eccf", 4));
				else bloom(bag, PEPPER_FLOWER, end, down, 1.2, clamp((g - opens) / .2), span(g, opens + .25, opens + .4));
				continue;
			}
			const size = vigour * about(fr, 1, .1);
			const L = .1 * size * lerp(.15, 1, set), R = .042 * size * lerp(.15, 1, set);
			const place = space.settle(fork.clone().addScaledVector(down, .02), down, (a, d) => [{
				c: a.clone().addScaledVector(d, L * .45),
				r: R * .95
			}], .04);
			bag.fruit([...l.key], fork, place.dir);
			bag.add("body", tube([fork, place.at], () => .0025 + .002 * set, () => "#5f8a3a", 5));
			const ripe = span(g, opens + 2.3, opens + 3.3);
			const colour = ripe < .4 ? mix("#2f7a2a", "#3a4a22", ripe / .4) : mix("#3a4a22", "#c41e1e", (ripe - .4) / .6);
			const lobes = 3 + Math.floor(fr() * 2);
			const m = new three.Matrix4().compose(place.at, new three.Quaternion().setFromUnitVectors(v3(0, -1, 0), place.dir), v3(1, 1, 1));
			const axis = [];
			for (let k = 0; k <= 14; k++) axis.push(v3(0, -.003 - k / 14 * L, 0));
			bag.add("gloss", tube(axis, (u, v) => R * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .08 + u * .95))), .3) * (1 - .1 * u) * (1 + .09 * Math.cos(v * Math.PI * 2 * lobes) * (.3 + u)), () => colour, 20), m);
			bag.add("body", bead(v3(0, -.002, 0), v3(R * .45, R * .18, R * .45), "#4f7a2e", 6), m);
			bag.fruitDone();
		}
	}
	for (const leaf of leaves) leaf();
//#piece 0de60e52e7e5ff10ad2b8179ce04e16ede6cf8f56e3a1e095aa50324494751b6
	id: "pepper",
	label: "Bell pepper",
	latin: "Capsicum annuum · Paprika",
	note: "A little forking bush of glossy pointed leaves, a white flower nodding in every fork, blocky bells hanging green, then turning red.",
	from: "Bush · 135 days",
	stages: PEPPER_STAGES,
	grow: pepper
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

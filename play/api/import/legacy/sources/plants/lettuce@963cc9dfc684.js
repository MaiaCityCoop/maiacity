//#piece 693245eec24e4da3790df47da8269873aa7f5742253bfa856c596ae3a92c8344
//#piece 749b45e82ae91e3db04830db380916a1cefdafe9d7a8f01612173e436ca3fb4d
const LETTUCE_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A slender grey seed four millimetres long, barely covered: lettuce wants light to sprout."
	],
	[
		"Germination",
		3,
		"The radicle goes down, the hook comes up."
	],
	[
		"Seed leaves",
		6,
		"Two small oval seed leaves."
	],
	[
		"True leaves",
		14,
		"Soft, round, pale green true leaves."
	],
	[
		"Rosette",
		25,
		"A flat rosette of broad wavy leaves."
	],
	[
		"Heart forming",
		32,
		"The new leaves stay upright and start to cup round each other."
	],
	[
		"Heading",
		38,
		"The inner leaves fold over the heart: a head is forming."
	],
	[
		"Firming",
		44,
		"The head fills and firms, pale yellow-green inside."
	],
	[
		"Full head",
		50,
		"A round, buttery head inside a ruff of spreading outer leaves."
	],
	[
		"Harvest",
		55,
		"Cut it now — before it bolts."
	]
]))();
/** @param {number} g @param {string} seed */
function lettuce(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const at = v3(0, -.004, 0);
	sprout(bag, {
		seed,
		at,
		size: v3(.002, 6e-4, 8e-4),
		coat: "#9a9078",
		coatShade: "#6a6250",
		stem: table(g, [
			[0, 0],
			[.3, 8e-4],
			[1, .008],
			[2, .014],
			[4, .014]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.5, 0]
		]),
		radius: 6e-4 + .003 * span(g, 1, 5),
		stemColor: "#a8c47a",
		leaf: {
			length: .01,
			width: .0045,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .6),
			color: "#7ab04a",
			vein: "#a6cc7a"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.5),
		wither: span(g, 3.5, 4.5)
	});
	root(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(0, -1, 0),
		length: .25,
		grown: table(g, [
			[0, 0],
			[.3, .02],
			[1, .08],
			[3, .4],
			[6, 1]
		]),
		radius: .0015,
		down: .04,
		wander: .15,
		laterals: 12,
		lateral: .35,
		depth: 2,
		age: span(g, 3, 8),
		young: "#f6efdc",
		old: "#d9c4a0"
	});
	const head = span(g, 4.5, 8.5);
	for (let i = 0; i < 30; i++) {
		const born = 2 + i * .22;
		if (g <= born) break;
		const lr = chance(seed, "leaf", i);
		const grown = clamp((g - born) / 1.4);
		const inner = clamp((born - 4.2) / 2.2);
		const len = (.04 + .11 * clamp(i / 8) - .04 * inner) * vigour * lerp(.3, 1, grown);
		const bear = i * 2.39996 + about(lr, 0, .2);
		const out = v3(Math.cos(bear), 0, Math.sin(bear));
		const tilt = lerp(lerp(.9, 1.35, clamp(i / 10)), lerp(.35, -.15, inner), clamp(inner * 1.5) * head);
//#piece 0067898aa7e9aef54cfbd3b0a0426870894d3cfe1c9ddb7c65cccca811455bf2
		const cup = lerp(.12, .9, inner * head);
		const r0 = .004 + .01 * (1 - inner);
		const colour = mix(mix("#5f9a3a", "#8cc05a", 1 - grown), "#d4e49a", inner * head);
		bag.add("sheet", sheet({
			length: len,
			width: len * .5,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.min(1, .05 + u * .95)), .55) * (.55 + .45 * u),
			lift: (u, v) => cup * v * v * (.3 + .4 * u) + (inner ? 0 : -.1 * u * u) + .02 * Math.sin(u * 14 + v * 6) * Math.abs(v) * (1 - inner),
			paint: (u, v) => colour.clone().lerp(new three.Color("#e8f0c8"), Math.abs(v) < .08 ? .5 * (1 - u) : 0),
			along: 12,
			across: 8
		}), aim(v3(Math.cos(bear) * r0, .004, Math.sin(bear) * r0), dir, 0));
	}
//#piece 0de60e52e7e5ff10ad2b8179ce04e16ede6cf8f56e3a1e095aa50324494751b6
	id: "lettuce",
	label: "Lettuce",
	latin: "Lactuca sativa · Kopfsalat",
	note: "A butterhead: a rosette of broad wavy leaves, the inner ones standing up and cupping over each other into a pale, buttery head.",
	from: "Head · 55 days",
	stages: LETTUCE_STAGES,
	grow: lettuce
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

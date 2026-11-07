//#piece 24955a19ef2fe29185c1d80f8d75cdf65a2ba48040f696f7729fd9e1dcb1af91
const PASSION_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small black pitted seed from the pulp, a centimetre down."
	],
	[
		"Germination",
		14,
		"The radicle goes down, the hook comes up."
	],
	[
		"Seed leaves",
		21,
		"Two oval seed leaves, then simple oval true leaves."
	],
	[
		"Climbing",
		60,
		"A slender vine up its stake, tendrils grabbing, the leaves now three-lobed."
	],
	[
		"On the wire",
		150,
		"Over the top and along the wire both ways; shoots hang down like a curtain."
	],
	[
		"Flowering",
		200,
		"Extraordinary flowers on the hanging shoots: white petals, a crown of purple-and-white filaments, the stigmas on a column."
	],
	[
		"Fruit set",
		210,
		"Pollinated, each flower leaves a small round green fruit."
	],
	[
		"Green fruit",
		240,
		"Glossy green balls the size of an egg, hanging on their stalks."
	],
	[
		"Colouring",
		275,
		"They darken to purple."
	],
	[
		"Ripe",
		285,
		"Deep purple, wrinkling as they ripen; they drop when ready."
	]
]))();
/** a passion-fruit leaf: three deep lobes, finely toothed */
function passionLeaf(a) {
	const lobes = [
		[0, 1],
		[1, .88],
		[-1, .88]
	];
	let reach = 0;
	for (const [at, size] of lobes) reach = Math.max(reach, size * (1 - .7 * Math.min(1, Math.abs(a - at) / .5)));
	return Math.max(.15, reach) * (1 + .03 * Math.abs(Math.sin(a * 30)));
}
/**
* The passion fruit (maracuja) at a stage (0 … 9) from the seed id.
* @param {number} g
* @param {string} seed
*/
function passionFruit(g, seed) {
//#piece c6508f61bffd24fe2de7528d54a8ccad9b8494ff3685b73fe5ff4887623c1c1d
		size: v3(.003, .0012, .0022),
		coat: "#2a2420",
		coatShade: "#3a3028",
//#piece 235e4c15e55653826ef0ac6943af682acfa7160af59a8dae07e337e196c328fa
		radius: .001 + .002 * span(g, 1, 4),
		stemColor: "#7aa04a",
		leaf: {
			length: .014,
			width: .005,
//#piece 24721d2384e6f9c5e661499dd115eaa576119efc5f4f7709596581e1f73ed9e3
		length: .5,
		grown: table(g, [
			[0, 0],
			[.3, .01],
			[1, .06],
			[3, .4],
			[5, 1]
		]),
		radius: .003,
		down: .03,
		wander: .15,
		laterals: 10,
		lateral: .4,
		depth: 2,
		age: span(g, 3, 7),
		young: "#f1e4c8",
		old: "#a8865a"
	});
	const POST = v3(.04, 0, 0), WIRE = 1.8;
	if (g >= 2.8) {
		bag.add("prop", tube([POST.clone().add(v3(0, -.3, 0)), POST.clone().add(v3(0, 1.85, 0))], () => .03, () => "#8a6a4a", 8));
		bag.add("prop", tube([v3(-1.4, WIRE, 0), v3(1.4, WIRE, 0)], () => .002, () => "#9a9a98", 4));
	}
	const climb = table(g, [
		[2, 0],
		[3, .4],
		[4, 1.8],
		[4.5, 1.8],
		[9, 1.8]
	]) * vigour;
	const reach = table(g, [
		[3.6, 0],
		[4.6, .9],
		[5.4, 1.3],
		[9, 1.35]
	]) * vigour;
	const up = [];
	for (let k = 0; k <= 30; k++) {
		const h = k / 30 * climb;
		up.push(s.top.clone().lerp(POST.clone().add(v3(-.03, 0, 0)), clamp(h / .2)).add(v3(Math.cos(h * 9) * .025, h, Math.sin(h * 9) * .025)));
	}
	if (climb > .01) bag.add("body", tube(up, (u) => .005 * (1 - .4 * u) * lerp(.4, 1, span(g, 3, 6)), () => "#6f9a42", 5));
	/** a leaf, three-lobed, on its stalk @param {THREE.Vector3} p @param {THREE.Vector3} out @param {number} grown */
	const leaf = (p, out, grown) => {
		const stalk = p.clone().addScaledVector(out, .04).add(v3(0, .01, 0));
		bag.add("body", tube([p, stalk], () => .0012, () => "#7aa04a", 3));
		bag.add("sheet", fan({
			size: .11 * vigour * lerp(.3, 1, grown),
			from: -Math.PI + .5,
			to: Math.PI - .5,
			edge: passionLeaf,
			lift: (sv) => -.12 * sv * sv,
			paint: (sv, a) => mix("#2f6a28", "#7ab04a", 1 - grown).lerp(new three.Color("#a6c47e"), [
				0,
				1,
				-1
			].some((t) => Math.abs(a - t) < .04) ? .4 : 0),
			rings: 6,
			rays: 40
		}), aim(stalk, out.clone().add(v3(0, -.2, 0)).normalize(), 0));
	};
	for (let k = 2; k < 30; k += 3) leaf(up[k], v3(Math.cos(k * 2.4), 0, Math.sin(k * 2.4)), clamp((climb - k / 30 * climb) / .3 + .3));
	for (const side of [-1, 1]) {
		const arm = [];
		for (let k = 0; k <= 20; k++) arm.push(POST.clone().add(v3(side * (k / 20) * reach, WIRE + Math.sin(k * 1.3) * .01, Math.cos(k * .9) * .015)));
		if (reach < .02) continue;
		bag.add("body", tube(arm, (u) => .0045 * (1 - .5 * u), () => "#6f9a42", 5));
		const shoots = Math.floor(reach / .18);
		for (let h = 0; h < shoots; h++) {
			const sr = chance(seed, "hang", side, h);
			const from = arm[Math.min(20, Math.round((h + .6) * .18 / reach * 20))];
			const len = table(g, [
				[4.2, 0],
				[5, .6],
				[6, .9],
				[9, 1]
			]) * between(sr, .6, 1.1) * vigour;
			if (len < .02) continue;
			const pts = [];
			for (let k = 0; k <= 10; k++) pts.push(from.clone().add(v3((sr() - .5) * .04 * k / 10, -(k / 10) * len, (sr() - .5) * .06 * k / 10 + .02 * k / 10)));
			bag.add("body", tube(pts, (u) => .003 * (1 - .5 * u), () => "#7aa04a", 4));
			bag.space.rod(pts, .005);
			for (let k = 1; k <= 10; k += 2) {
				const a = k * 2.4 + h;
				leaf(pts[k], v3(Math.cos(a), 0, Math.sin(a)), 1);
				if (k < 3 || k > 9) continue;
				const fr = chance(seed, "passion", side, h, k);
				const opens = 4.8 + fr() * .5 + k * .03;
				if (g < opens - .2 || fr() > .7) continue;
				const set = span(g, opens + .25, opens + 2);
				const out = v3(Math.cos(a + Math.PI), 0, Math.sin(a + Math.PI));
				const stalkEnd = pts[k].clone().addScaledVector(out, .03).add(v3(0, -.05, 0));
				if (set >= .03) bag.fruit([
					"passion",
					side,
					h,
					k
				], pts[k], v3(0, -1, 0));
				bag.add("body", tube([
					pts[k],
					pts[k].clone().addScaledVector(out, .03),
					stalkEnd
				], () => .0012, () => "#7aa04a", 3));
				if (set < .03) passionFlower(bag, stalkEnd, out.clone().add(v3(0, -.3, 0)).normalize(), clamp((g - opens + .2) / .3), span(g, opens + .15, opens + .25));
				else {
					const ripe = span(g, opens + 2, opens + 2.9);
					const r = (.008 + .028 * set) * vigour;
					const wrinkle = span(g, 8.6, 9.5) * .12;
					const place = bag.space.settle(stalkEnd, v3(0, -1, 0), (at2, d) => [{
						c: at2.clone().addScaledVector(d, r * 1.05),
						r: r * .98
					}], .04);
					if (place.at.distanceTo(stalkEnd) > 1e-4) bag.add("body", tube([stalkEnd, place.at], () => .0012, () => "#7aa04a", 3));
					const ax = [];
					for (let m = 0; m <= 12; m++) ax.push(place.at.clone().addScaledVector(place.dir, m / 12 * r * 2.1));
					bag.add("gloss", tube(ax, (u, v) => r * Math.pow(Math.max(0, Math.sin(Math.PI * u)), .5) * (1 + wrinkle * Math.sin(u * 23 + v * 31) * Math.sin(v * 17)), () => mix(mix("#4f8a2e", "#5a7a3a", ripe), "#4a1a4a", ripe), 14));
					bag.fruitDone();
				}
			}
		}
	}
	return bag.build();
}
/**
* A passion flower: five white sepals and five white petals in a flat star, a crown of filaments banded purple and
* white over them, and in the middle the column with its five anthers and three stigmas.
* @param {Bag} bag @param {THREE.Vector3} at @param {THREE.Vector3} facing @param {number} open @param {number} wilt
*/
function passionFlower(bag, at, facing, open, wilt) {
	const m = new three.Matrix4().compose(at, new three.Quaternion().setFromUnitVectors(v3(0, 1, 0), facing), v3(1, 1, 1).multiplyScalar(1 - wilt * .5));
	for (let k = 0; k < 10; k++) {
		const petal = sheet({
			length: .035 * lerp(.4, 1, open),
			width: .009,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .6),
			lift: (u) => .03 * u,
			paint: () => k % 2 ? "#f6f6ee" : "#e8f0dc",
			along: 6,
			across: 2
		});
		bag.add("sheet", petal, m.clone().multiply(new three.Matrix4().makeRotationY(k / 10 * Math.PI * 2)).multiply(new three.Matrix4().makeRotationZ(lerp(1.3, .05, open))));
	}
	if (open < .3) return;
	for (let k = 0; k < 60; k++) {
		const a = k / 60 * Math.PI * 2;
		const pts = [];
		for (let n = 0; n <= 4; n++) {
			const t = n / 4;
			pts.push(v3(Math.cos(a) * (.004 + t * .028), .003 + Math.sin(t * Math.PI * 2 + k) * .002, Math.sin(a) * (.004 + t * .028)).applyMatrix4(m));
		}
		bag.add("body", tube(pts, () => 5e-4, (t) => t < .3 ? "#5a1a6a" : t < .55 ? "#f4f0f4" : "#7a3a9a", 3));
	}
	bag.add("body", tube([v3(0, 0, 0).applyMatrix4(m), v3(0, .018, 0).applyMatrix4(m)], () => .0018, () => "#9ac06a", 5));
	for (let k = 0; k < 5; k++) {
		const a = k / 5 * Math.PI * 2;
		bag.add("body", bead(v3(Math.cos(a) * .008, .016, Math.sin(a) * .008).applyMatrix4(m), v3(.003, .0012, .0015), "#d8c040", 3));
	}
	for (let k = 0; k < 3; k++) {
		const a = k / 3 * Math.PI * 2;
		bag.add("body", tube([v3(0, .018, 0).applyMatrix4(m), v3(Math.cos(a) * .007, .027, Math.sin(a) * .007).applyMatrix4(m)], () => 8e-4, () => "#6a4a3a", 3));
	}
//#piece 69f1d3d6a1a9ba606895e988f6b2d3bf22c7c85e9e9f4295855e80951be3b7da
	id: "passion-fruit",
	label: "Passion fruit",
	latin: "Passiflora edulis · Maracuja",
	note: "A vine up its stake and along a wire, shoots hanging like a curtain; three-lobed leaves, astonishing flowers with a crown of purple-and-white filaments, round fruit turning purple and wrinkling.",
	from: "Vine · 9 months",
	stages: PASSION_STAGES,
	grow: passionFruit
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160

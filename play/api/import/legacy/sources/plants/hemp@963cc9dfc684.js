//#piece 34c24ca411c4f08cc2f83615839c74923cd4bdb04f03ec7bbeeee53f00899aef
//#piece 3f6d6d51eabe1ebdf5960ea8f51834e87c2f5e966564530e15f6b8d7c9be85f5
//#piece bbdf987b61afd40490368149cf343d4c599cba993fbe9d25188a8c57a10ad616
//#piece a90e8078ce813b4914a250b8fba97b6d1dc95df728311d4c883e50bc198e4669
//#piece c2d4ee9cfcf857ad82919a39e34d001c475e668c1850ecc78af525989c3207b8
//#piece ba40edf81615360631028fd5cc7061728fd54f35d346c04671c2a15d815b4672
//#piece 0f0c63e8359009b99732158dd4d7a76a7af3b4f3eb108912f4dd120bfb8a2522
//#piece bb181f084165c06e34a1464010ca5d68e8bf9b2cb033c9895d6b258872c997b6
const oval = (u) => Math.pow(Math.sin(Math.PI * u), .7);
const hempLeaflet = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .9) * (u > .1 && u < .95 ? 1 + .16 * Math.cos(u * Math.PI * 6) : 1);
const HEMP_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small smooth grey-brown seed, marbled, two centimetres down in warm spring soil — sown thick, so the stalks grow tall and slender."
	],
	[
		"Germination",
		4,
		"The radicle goes down, the hook comes up."
	],
	[
		"Seed leaves",
		8,
		"Two small oval seed leaves."
	],
	[
		"First pairs",
		18,
		"The first true leaves in pairs: a single toothed leaflet, then three, then five."
	],
	[
		"Vegetative",
		40,
		"Growing fast, leaves of seven and nine leaflets spread like hands, in pairs a quarter-turn apart."
	],
	[
		"Stretch",
		65,
		"Shooting up two metres and more, the leaves now one at a node, spiralling up the stalk."
	],
	[
		"Flowering",
		85,
		"At the top and the short side shoots, clusters of small bracts with white pistils; the pollen drifts in the wind."
	],
	[
		"Seed set",
		100,
		"Seeds swell in the bracts; the lowest leaves yellow."
	],
	[
		"Ripening",
		115,
		"The seed heads turn brown-grey, the leaves fall from the bottom up."
	],
	[
		"Harvest",
		125,
		"Seed threshed from the heads; the bare stalks cut and laid in the field to ret for their fibre."
	]
]))();
/**
* Hemp at a stage (0 … 9, between them on the way) from the seed id: one slender stalk, as it grows sown thick.
* @param {number} g @param {string} seed
*/
function hemp(g, seed) {
//#piece 1165ad2654fba6b3f48ca4c077710a3e9051b5eaba69f899526d1f7844e1dcb3
	const at = v3(0, -.02, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.0022, .0015, .0017),
		coat: "#7a7458",
		coatShade: "#4a4232",
		stem: table(g, [
			[0, 0],
			[.3, .001],
			[1, .025],
			[2, .042],
			[9, .045]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.5, 0]
		]),
		radius: .0011 + .0015 * span(g, 1.5, 4),
		stemColor: "#6a8a3a",
		leaf: {
			length: .013,
			width: .0055,
			shape: oval,
			color: "#5f9a40",
			vein: "#9ac470"
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
		length: .6,
		grown: table(g, [
			[0, 0],
			[.3, .02],
			[1, .08],
			[3, .3],
			[5, .8],
			[6, 1]
		]),
		radius: .0016 + .004 * span(g, 3, 7),
		down: .06,
		wander: .18,
		laterals: 7,
		lateral: .35,
		depth: 1,
		age: span(g, 3, 8),
		young: "#f4ead6",
		old: "#b8986a"
	});
	const Hmax = 2.5 * vigour;
	const L = table(g, [
		[1.6, 0],
		[2, .012],
		[3, .1],
		[4, .45],
		[5, 1.35],
		[6, 2.05],
		[7, 2.4],
		[9, 2.5]
	]) * vigour;
	if (L < .003) {
		blades.into(bag);
		return bag.build();
	}
	const r = chance(seed, "hemp-stalk");
	const N = 20;
	const lens = [];
	for (let k = 0; k < N; k++) lens.push(.3 + Math.pow(Math.sin(Math.PI * Math.min(1, (k + .5) / N * 1.15)), .8));
	const sum = lens.reduce((a, b) => a + b, 0);
	const nodes = [.02];
	for (let k = 0; k < N; k++) nodes.push(nodes[k] + lens[k] / sum * Hmax * .96);
	const lean = v3(r() - .5, 0, r() - .5).multiplyScalar(.05);
	const base = s.top.clone();
	const full = nodes.map((z) => base.clone().add(v3(lean.x * z + .012 * Math.sin(z * 3 + r()), z, lean.z * z + .012 * Math.cos(z * 2.6))));
	full.push(base.clone().add(v3(lean.x * Hmax, Hmax, lean.z * Hmax)));
	const zAt = (z) => {
		let k = 0;
		while (k < nodes.length - 1 && nodes[k + 1] < z) k++;
		const z1 = k + 1 < nodes.length ? nodes[k + 1] : Hmax;
		return full[k].clone().lerp(full[k + 1], clamp((z - nodes[k]) / Math.max(1e-6, z1 - nodes[k])));
	};
	const ripe = span(g, 8, 9.2);
	const stalkColour = (u) => mix(mix("#5a7a34", "#7a9a44", u), "#b8a878", ripe);
	const stem = [base.clone(), ...full.filter((_, k) => k < nodes.length && nodes[k] < L).slice(1)];
	stem.push(zAt(L));
	const Rb = .0016 + .0055 * span(g, 3, 6.5) * vigour;
	bag.add("body", tube(stem, (u) => Rb * (1 - .75 * u), stalkColour, 6));
	const flowering = span(g, 5.6, 6.3), seeding = span(g, 6.6, 7.6);
	const b0 = r() * Math.PI * 2;
	const leaflets = [
		1,
		3,
		5,
		7,
		7,
		9,
		9,
		9,
		9,
		9,
		7,
		7,
		7,
		7,
		5,
		5,
		5,
		3,
		3,
		1
	];
	for (let k = 0; k < N; k++) {
		const z = nodes[k + 1] - .005;
		if (z > L - .01) break;
		const f = k / N;
		const kr = chance(seed, "hemp-node", k);
		const p = zAt(z);
		const grown = clamp((L - z) / .28);
		const old = span(g, 6.1 + 2.8 * f, 7.1 + 2.8 * f);
		const fallen = g > 7.3 + 2.8 * f;
		const head = k >= 13;
		const size = (.05 + .1 * Math.pow(Math.sin(Math.PI * Math.min(1, (k + 1.5) / (N * .8))), .7)) * vigour * (head ? .6 : 1);
		const pair = k < 6;
		for (const side of pair ? [0, 1] : [0]) {
			const bear = pair ? b0 + k * Math.PI / 2 + side * Math.PI : b0 + k * 2.39996;
			if (!fallen) palmate(bag, blades, kr, p, level(bear + about(kr, 0, .15)), leaflets[k], size, grown, old);
			if (!pair && !head && !fallen && g > 4.2) palmate(bag, blades, kr, p.clone().add(v3(0, .01, 0)), level(bear + .5), 5, size * .45, grown * span(g, 4.2 + f, 5 + f), old);
			if (!pair && k >= 8 && k < 16 && kr() < .4) {
				const reach = (.12 + .2 * kr()) * span(g, 4.5 + f, 5.6 + f) * vigour;
				if (reach > .01) {
					const sp = arch(p, tilted(level(bear + .4), .55), reach, -.25, 3);
					wire(bag, blades, sp, .0018, stalkColour, 4, UP);
					for (let j = 0; j < 2; j++) if (!fallen) palmate(bag, blades, kr, point(sp, .4 + j * .3), level(bear + (j ? 1 : -1)), 5, size * .55, grown, old);
					hempHead(blades, kr, point(sp, 1), towards(sp, 1), .6, flowering, seeding, ripe);
				}
			}
		}
		if (head) hempHead(blades, kr, p, v3(0, 1, 0), .9 + .9 * (k - 13) / 7, flowering, seeding, ripe);
	}
	if (L > Hmax * .8) hempHead(blades, chance(seed, "hemp-top"), zAt(L - .06), v3(0, 1, 0), 2.6, flowering, seeding, ripe);
	blades.into(bag);
	return bag.build();
}
/**
* A hemp leaf: a long stalk, its toothed leaflets spread like a hand from the end, the middle one longest, all drooping
* a little; folded up while young, hanging and yellow when old.
* @param {Bag} bag @param {Blades} blades @param {() => number} r @param {THREE.Vector3} at @param {THREE.Vector3} out
* @param {number} count @param {number} size the middle leaflet's length @param {number} grown @param {number} old
*/
function palmate(bag, blades, r, at, out, count, size, grown, old) {
	if (grown <= .02) return;
	const pet = size * .75 * lerp(.3, 1, grown);
	const pts = arch(at, tilted(out, lerp(.35, .95, grown) + old * .4), pet, .15 + old * .3, 3);
	wire(bag, blades, pts, .0011 + size * .008, () => mix("#5a8a3a", "#c8b060", old), 3, UP);
	const end = pts[pts.length - 1];
	const across = level(Math.atan2(out.z, out.x));
	const spread = count > 1 ? Math.min(.42, 2.9 / (count - 1)) : 0;
	const green = mix(mix("#7aa848", "#356a28", grown), "#c8b448", old);
	const vein = mix(green, "#a8c888", .35);
	for (let j = 0; j < count; j++) {
		const a = (j - (count - 1) / 2) * spread;
		const len = size * lerp(.35, 1, grown) * (1 - .5 * Math.pow(Math.abs(a) / 1.5, 1.4)) * about(r, 1, .05);
		const lift = lerp(.9, .12, grown) - old * .7 + Math.abs(a) * .08;
		const d = across.clone().applyAxisAngle(UP, -a).multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0)).normalize();
		blades.add({
			at: end,
			dir: d,
			length: len,
			width: len * .11,
			shape: hempLeaflet,
			segs: 6,
			fold: .3 * (1 - grown) + .12,
			droop: .22 * grown + old * .3,
			paint: (u, v) => Math.abs(v) < .1 ? vein : green
		});
	}
}
/**
* A cluster of hemp's flowers: small toothed leaves and bracts crowding round in a spiral, white pistils from the
* bracts while it flowers, seeds swelling in them, all browning as it ripens.
* @param {Blades} blades @param {() => number} r @param {THREE.Vector3} at @param {THREE.Vector3} up @param {number} size
* @param {number} flowering @param {number} seeding @param {number} ripe
*/
function hempHead(blades, r, at, up, size, flowering, seeding, ripe) {
	if (flowering <= 0) return;
	const count = Math.round(8 + 10 * size);
	const leaf = mix(mix("#4f8a36", "#3f7030", seeding), "#8a7448", ripe);
	const bract = mix(mix("#8ab858", "#6a9a44", seeding), "#9a8050", ripe);
	for (let m = 0; m < count; m++) {
		const a = m * 2.39996 + r();
		const k = m / count;
		const p = at.clone().addScaledVector(up, k * .1 * size).addScaledVector(level(a), .004 * size * (1 - k));
		const isLeaf = m % 2 === 0;
		const d = up.clone().multiplyScalar(isLeaf ? .8 : 1.4).add(level(a)).normalize();
		const len = (isLeaf ? .025 + .025 * r() : .012 + .008 * r()) * Math.sqrt(size) * lerp(.5, 1, flowering) * (1 - .35 * k);
		blades.add({
			at: p,
			dir: d,
			length: len,
			width: len * (isLeaf ? .16 : .32),
			shape: isLeaf ? hempLeaflet : oval,
			segs: isLeaf ? 3 : 2,
			fold: .3,
			droop: isLeaf ? .15 : 0,
			paint: isLeaf ? leaf : bract
		});
		if (isLeaf) continue;
		if (flowering > .3 && seeding < .7) blades.add({
			at: p,
			dir: d.clone().add(level(a + 1)).normalize(),
			length: len * .8,
			width: len * .06,
			shape: oval,
			segs: 1,
			paint: mix("#f2eee0", "#c8a878", seeding)
		});
		if (seeding > 0 && DETAIL.level >= .5) blades.add({
			at: p.clone().addScaledVector(d, len * .2),
			dir: d,
			length: .004 * seeding,
			width: .0016 * seeding,
			shape: oval,
			segs: 2,
			twin: .8,
			paint: mix("#8a9a5a", "#6a6050", ripe),
			round: true
		});
	}
}
/** the fields' plants, as ./index.js lists them */
const FIELDS = [{
	id: "hemp",
	label: "Hemp",
	latin: "Cannabis sativa · Nutzhanf",
	note: "One slender stalk two and a half metres high in a summer, leaves of five to nine toothed leaflets spread like hands; seed in clusters of bracts at the top, the stalk retted for its fibre.",
	from: "Annual · 125 days",
	stages: HEMP_STAGES,
	grow: hemp,
//#piece 321da8178e3fcd3936e38b431f8e7656e24efbf273bc90ad3fda83d92835fb46

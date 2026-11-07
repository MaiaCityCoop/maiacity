//#piece fba99ee668356677203a38cdc2f6a3b1ba0d86b73d4dbe09717537e25f68c545
//#piece 7d83573c34a9eaa206da80d2f5fc8aef7f8e5322632d78fb1edb91e97ad699c3
//#piece cf4edb364df707f2970771d025c9e54703f2078c8f142b19c05c2ea35c49c7d2
//#piece 1d512c44003c7b913af306d16ad50cee245abb35fc0046988ad83eae2886ed01
		}
		left -= seg;
	}
//#piece 3e8e835c7ba299de5f480c8ec30affe9ffa07ecc3ba02dc5f4fa8cf6b11d79d3
//#piece 3cbf07d6f099859e96544cad797958935056c4176cebc3d7a29e131b879b14f4
*/
//#piece 447161526f542e099d94aa4faffd780fce0122208100ab732e6996005ed892f0
}
/**
//#piece ddf7fb903df75d94ffaaf76d5fb7932002f9851df9194fefe6de8c65f5210a96
//#piece 07c2cb2bd4ccbd1481dbdcc90feb4861d47907602781c0e6e052def745902bac
const BLACKBERRY_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Seed",
		0,
		"A small hard pitted seed from a drupelet, sown in autumn: two winters, sometimes, before it wakes."
	],
	[
		"Germination",
		40,
		"A root goes down, a hooked shoot comes up."
	],
	[
		"Seed leaves",
		55,
		"Two small oval seed leaves, then a first leaf of three toothed leaflets."
	],
	[
		"First cane",
		365,
		"A first prickly cane, green flushed red, arching over."
	],
	[
		"Canes",
		730,
		"Long arching primocanes, two metres and more, their tips bowing to the soil and rooting there; leaves of five leaflets."
	],
	[
		"Flowering",
		1060,
		"The canes’ second summer: side shoots along them with sprays of white-pink flowers; new green canes rise from the crown."
	],
	[
		"Fruit set",
		1075,
		"The petals fall; little green knots of drupelets."
	],
	[
		"Green berries",
		1100,
		"Clusters of hard green berries on the side shoots."
	],
	[
		"Turning",
		1120,
		"Berry by berry, red, unevenly: green, red and black on one spray."
	],
	[
		"Ripe",
		1135,
		"Glossy black blackberries among the red and the green, picked over weeks."
	]
]))();
/** @type {Leafing} */
const BRAMBLE_LEAF = /* @__PURE__ */ (() => ({
	blade: compound({
		pairs: 2,
		digitate: true,
		leaflet: .55,
		width: .6,
		shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .7) * (1 + (u > .1 && u < .92 ? u * 15 % 1 * .08 : 0)),
		rachis: "#6a7a3a"
	}),
	length: .2,
	stalk: .055,
	stalkColour: "#7a6a3a",
	spacing: .085,
	from: 0,
	bare: .12,
	colour: "#2f622a",
	young: "#6a9a40",
	vein: "#86a864",
	shade: "#28562a",
	droop: .2
}))();
/** a blackberry: a bumpy oval of drupelets, glossy, green, red, then black */
function bramble(bag, at, dir, L, W, ripe) {
	const c = ramp([
		[0, "#8aa848"],
		[.25, "#b8b058"],
		[.5, "#c43040"],
		[.75, "#5a1626"],
		[1, "#141014"]
	], ripe);
	const pts = [];
	for (let k = 0; k <= 6; k++) pts.push(at.clone().addScaledVector(dir, k / 6 * L));
	bag.add("gloss", tube(pts, (u, v) => W * Math.pow(Math.max(0, Math.sin(Math.PI * (.06 + u * .94))), .5) * (1 + .14 * Math.abs(Math.sin(v * Math.PI * 6 + u * 9)) * Math.abs(Math.sin(u * Math.PI * 6))), (u, v) => c.clone().multiplyScalar(.85 + .3 * Math.abs(Math.sin(v * Math.PI * 6 + u * 9))), 7));
}
/**
* The blackberry at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g
* @param {string} seed
*/
function blackberry(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const at = v3(0, -.004, 0);
	const s = sprout(bag, {
		seed,
		at,
		size: v3(.0016, .001, .0011),
		coat: "#8a6a4a",
		coatShade: "#5a4430",
		stem: table(g, [
			[0, 0],
			[.35, 6e-4],
			[1, .006],
			[2, .014],
			[9, .014]
		]),
		hook: table(g, [
			[0, 1],
			[1, 1],
			[1.6, 0]
		]),
		radius: 6e-4 + .003 * span(g, 1.5, 4),
		stemColor: "#8a7a4a",
		leaf: {
			length: .006,
			width: .0035,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .75)), .65),
//#piece 49b20a489be3332830db3dc10ebafddf8a68e0d1c64107aae9202ada3c05738f
		length: .65,
		count: 11
	}, vigour);
	/** @type {{ born: number, first: boolean }[]} */
	const canes = [
		2.1,
		3.2,
		3.3,
		3.4,
		3.5,
		3.6,
		3.7,
		3.8,
		3.9,
		4.6,
		4.7,
		4.8,
		4.9,
		5.05,
		5.25,
		5.5
	].map((born) => ({
		born,
		first: born < 4
	}));
//#piece 258ffe442a20534b52d8c954dedf8938f8b3d467b0892310c3d62ea0dea3637d
	/** @type {{ pts: THREE.Vector3[], length: number, order: number, key: (string | number)[] }[]} */
	const shoots = [];
	/** @type {(() => void)[]} */
	const fruiting = [];
	canes.forEach((c, j) => {
		const cr = chance(seed, "bramble", j);
		const bear = j * 2.39996 + cr() * .7;
		const full = (j === 0 ? 1.5 : between(cr, 1.9, 2.7)) * vigour;
		const lean = between(cr, .25, .65);
		const bend = between(cr, 1.1, 1.6);
		const from0 = j === 0 ? s.top.clone() : v3(Math.cos(bear), 0, Math.sin(bear)).multiplyScalar(between(cr, .03, .14));
		if (g <= c.born) return;
		const L = full * (c.first ? j === 0 ? table(g, [
			[2.1, 0],
			[3, .35],
			[3.6, .6],
			[4.4, 1]
		]) : span(g, c.born, c.born + 1) : span(g, c.born, c.born + 3.6));
		if (L < .003) return;
		const out = v3(Math.cos(bear), 0, Math.sin(bear));
		const steps = 30;
		const pts = [from0];
		let p = from0.clone();
		for (let k = 0; k < steps; k++) {
			const sAt = k / steps * full;
			const th = Math.min(2.3, lean + Math.max(0, sAt - full * .28) * bend);
			const d = out.clone().multiplyScalar(Math.sin(th)).add(v3(0, Math.cos(th), 0)).applyAxisAngle(UP, Math.sin(k * .7 + j) * .05);
			p = p.clone().addScaledVector(d, full / steps);
			p.y = Math.max(.012, p.y);
			pts.push(p.clone());
		}
		const n = L / full * steps;
		const whole = Math.floor(n);
		const now = pts.slice(0, whole + 1);
		if (whole < steps) now.push(pts[whole].clone().lerp(pts[whole + 1], n - whole));
		if (now.length < 2) return;
		const flori = c.first ? span(g, 4.25, 4.65) : 0;
		const thick = .0085 * (.35 + .65 * clamp(L / full)) * (j === 0 ? .7 : 1);
		bag.add("body", tube(now, (u) => thick * (1 - .65 * u), (u) => mix(mix("#6f8a3c", "#9a3a3a", .35 + .35 * Math.sin(u * 7 + j)), "#5e3236", flori), 7));
		bag.space.rod(now, thick + .004);
		const pr = chance(seed, "bramble-prickles", j);
		for (let k = 0; k < Math.floor(L * 22); k++) {
			const w = walk(now, pr() * L);
			const a = pr() * 6.28;
			if (!w) continue;
			const o = round(w.d, a).addScaledVector(w.d, -.45).normalize();
			prickle(bag, w.p.clone().addScaledVector(o, thick * .6), o, .0055, .0018, flori > .5 ? "#7a4a3a" : "#b0504a", .25);
		}
		const tip = now[now.length - 1];
		if (L > full * .92 && tip.y < .03) root(bag, {
			seed,
			key: ["tip", j],
			from: tip.clone(),
			dir: v3(0, -1, 0),
			length: .18,
			grown: span(g, c.born + (c.first ? 1 : 3.3), c.born + (c.first ? 1.8 : 3.9)),
			radius: .0015,
			laterals: 4,
			depth: 1,
			young: "#f1e4cc",
			old: "#8a6a4a"
		});
		leafy.push({
			pts: now,
			length: L,
			order: 1,
			key: ["cane", j]
		});
		if (!c.first) return;
		for (let k = 0; k < 16; k++) {
			const kr = chance(seed, "bramble-lateral", j, k);
			const sAt = (.28 + k * .042) * full;
			const pick = kr(), len = between(kr, .18, .36) * vigour, a = kr();
			if (pick > .55 || sAt > L - .05) continue;
			const born = 4.5 + kr() * .15;
			if (g <= born) continue;
			const w = walk(now, sAt);
			if (!w) continue;
			const side = level(round(w.d, a * 6.28), out);
			const heavy = span(g, 6, 8.5);
			let d = side.clone().multiplyScalar(.5).add(v3(0, 1, 0)).normalize();
			const lp = [w.p.clone()];
			const grown = len * span(g, born, born + .6);
			for (let m = 0; m < 6; m++) {
				d = d.clone().addScaledVector(side, .08).add(v3(0, -.04 - heavy * .08, 0)).normalize();
				lp.push(lp[m].clone().addScaledVector(d, grown / 6));
			}
			bag.add("body", tube(lp, (u) => .0028 * (1 - .5 * u), () => "#6a5a36", 4));
			shoots.push({
				pts: lp,
				length: grown,
				order: 1,
				key: [
					"lateral",
					j,
					k
				]
			});
			const end = lp[6], endDir = d.clone();
			fruiting.push(() => spray(ctx, [
				"spray",
				j,
				k
			], end, endDir, lp));
		}
	});
	for (const f of fruiting) f();
	leafOut(ctx, BRAMBLE_LEAF, leafy);
	leafOut(ctx, {
		...BRAMBLE_LEAF,
		blade: compound({
			pairs: 1,
			digitate: true,
			leaflet: .6,
			width: .6,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .7),
			rachis: "#6a7a3a"
		}),
		length: .14,
		stalk: .03,
		spacing: .05,
		bare: 0
	}, shoots);
	return bag.build();
}
/**
* The spray at the end of a blackberry's side shoot: a flower at its tip and more on stalks below, opening first at
* the tip, then the berries ripening one by one in the same order.
* @param {Ctx} ctx @param {(string | number)[]} key @param {THREE.Vector3} end @param {THREE.Vector3} dir @param {THREE.Vector3[]} lp
*/
function spray(ctx, key, end, dir, lp) {
	const { bag, seed, g, vigour } = ctx;
	const sr = chance(seed, ...key);
	const n = 3 + Math.floor(sr() * 5);
	const pink = sr() < .4;
	for (let k = 0; k < n; k++) {
		const kr = chance(seed, ...key, k);
		const opens = 4.7 + k * .04 + kr() * .15;
		const base = k === 0 ? end : lp[Math.max(2, 6 - Math.floor(k / 2))];
		const stalk = round(dir, k * 2.39996 + kr()).addScaledVector(dir, .5).add(v3(0, .2, 0)).normalize();
		const at = base.clone().addScaledVector(stalk, k === 0 ? .008 : .018 + kr() * .012);
		const set = span(g, opens + .45, opens + 2.3);
		const ripeAt = 7.4 + k * .15 + kr() * .45;
		const size = vigour * about(kr, 1, .1);
		if (g < opens - .5) continue;
		if (set < .02) {
			bag.add("body", tube([base, at], () => 7e-4, () => "#6a7a3a", 3));
			if (g < opens) bag.add("body", bead(at.clone().addScaledVector(stalk, .004), v3(.004, .005, .004).multiplyScalar(lerp(.4, 1, span(g, opens - .5, opens))), "#8aa060", 3));
			else floret(bag, at, stalk.clone().lerp(UP, .3).normalize(), .013, pink ? "#f4d0dc" : "#f6f2ea", "#c8d080", clamp((g - opens) / .2) * (1 - span(g, opens + .3, opens + .45) * .6), 5, .1);
			continue;
		}
		const L = .021 * size * lerp(.3, 1, set), W = .0095 * size * lerp(.3, 1, set);
		const place = bag.space.settle(at, stalk.clone().lerp(v3(0, -1, 0), .6).normalize(), (p, d) => [.3, .72].map((t) => ({
			c: p.clone().addScaledVector(d, .021 * size * t),
			r: .0095 * size * 1.05
		})), .02);
		bag.fruit([...key, k], base, place.dir);
		bag.add("body", tube([
			base,
			at,
			place.at
		], () => 8e-4, () => "#6a7a3a", 3));
		bramble(bag, place.at, place.dir, L, W, span(g, ripeAt, ripeAt + .9));
		bag.fruitDone();
	}
}
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "blackberry",
	label: "Blackberry",
	latin: "Rubus fruticosus · Brombeere",
	note: "Long thorny canes arching over to root where they touch the soil: leafy the first summer, the second their side shoots flower white and pink and bear clusters of drupelet berries, green, red and black at once.",
	from: "Canes · 3 summers",
	stages: BLACKBERRY_STAGES,
	grow: blackberry,
//#piece 6a46d079f14d6089f79784ecf20705689a90de4d5314bb9b21fadbd5aa4987ef

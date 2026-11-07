//#piece 34c24ca411c4f08cc2f83615839c74923cd4bdb04f03ec7bbeeee53f00899aef
//#piece 73c4b4165ced2776f22d4be5cb51cf59f62131baca5c9441167f9bf38ac0d58e
//#piece b6ef2ce50708891b5fc6551bd99957da123395110f6ad44a5d4a0ce9e7c47b66
//#piece d9fbf1bcb3dd12603d17bb06379710dcb6bfd795862c2b4b6ffa14f65e685549
const ARTICHOKE_STAGES = /* @__PURE__ */ (() => stages([
	[
		"Offset",
		0,
		"A rooted offset sliced from the side of an old plant with a heel of root, planted in spring."
	],
	[
		"Rooting",
		14,
		"New white roots below; from its heart a first new leaf."
	],
	[
		"New leaves",
		40,
		"Grey-green leaves, deeply cut, rising in a fountain."
	],
	[
		"Fountain",
		100,
		"A fountain of silver leaves near a metre long, arching over; mulched against the winter."
	],
	[
		"Big clump",
		380,
		"Its second spring: a clump of silver leaves a metre and a half across."
	],
	[
		"Stems",
		410,
		"Thick, ribbed grey stems rise from the heart, a bud at every tip."
	],
	[
		"Buds",
		425,
		"The king bud at the top of each stem, smaller ones on the side shoots, scale over scale."
	],
	[
		"Harvest",
		440,
		"Cut while tight and fist-sized, the scales still closed: their fleshy bases and the heart are eaten. A few are left."
	],
	[
		"Opening",
		460,
		"A bud left on loosens its scales; a violet tuft shows at the top."
	],
	[
		"Thistle",
		475,
		"A violet thistle a hand across, loud with bumblebees; cut the stems down after and new shoots come from the base."
	]
]))();
/** an artichoke leaf: long, cut almost to the midrib into lobes */
const cutLeaf = (u) => {
	const env = Math.pow(Math.sin(Math.PI * Math.pow(u, .72)), .7);
	const lobes = .14 + .86 * Math.pow(Math.abs(Math.sin(u * Math.PI * 6.5 + .4)), .7) * (1 - .15 * Math.abs(Math.sin(u * 60)));
	return env * lerp(.3, lobes, clamp((u - .06) / .1));
};
/**
* The globe artichoke at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g @param {string} seed
*/
function artichoke(g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const crown = v3(0, .01, 0);
	bag.add("body", bead(v3(0, -.04, 0), v3(.03, .05, .03).multiplyScalar(lerp(.8, 1.6, span(g, 0, 5))), "#7a6a4a", 5));
	for (let i = 0; i < 6; i++) {
		const rr = chance(seed, "artichoke-root", i);
		const a = i * 2.39996;
		root(bag, {
			seed,
			key: ["r", i],
			from: v3(Math.cos(a) * .02, -.07, Math.sin(a) * .02),
			dir: v3(Math.cos(a) * .4, -1, Math.sin(a) * .4),
			length: between(rr, .4, .7) * vigour,
			grown: table(g, [
				[0, .1],
				[1, .25],
				[3, .6],
				[5, 1]
			]),
			radius: .004 + .006 * span(g, 1, 6),
			down: .04,
			wander: .2,
			laterals: 4,
			lateral: .35,
			depth: 1,
			age: span(g, 1, 6),
			young: "#f2e8d4",
			old: "#a8865a"
		});
	}
	const space = bag.space;
	/** @type {(() => void)[]} */
	const later = [];
	const stems = 3 + Math.floor(chance(seed, "artichoke-stems")() * 2);
	for (let k = 0; k < stems; k++) {
		const fr = chance(seed, "artichoke-stem", k);
		const born = 4.6 + k * .15;
		if (g <= born) break;
		const rise = span(g, born, born + 1.2);
		const H = (1 + .35 * fr()) * vigour * rise;
		const a = k * 2.39996 + fr();
		const stem = arch(crown.clone().addScaledVector(level(a), .03), tilted(level(a), between(fr, .06, .2)), H, -.08, 8);
		const R = .011 * lerp(.5, 1, rise);
		bag.add("body", tube(stem, (u, v) => R * (1 - .35 * u) * (1 + .08 * Math.cos(v * Math.PI * 16)), (u, v) => mix("#8a9c86", "#b8c4b0", Math.cos(v * Math.PI * 16) > .6 ? .5 : 0), 10));
		space.rod(stem, R);
		for (let j = 0; j < 3; j++) {
			const p = point(stem, .15 + j * .16);
			const o = level(a + 2.2 * (j + 1));
			later.push(() => {
				const out = space.steer(p, o, .6, .25, .03);
				bag.add("sheet", sheet({
					length: .3 * rise * (1 - j * .22),
					width: .05 * rise * (1 - j * .22),
					shape: cutLeaf,
					lift: (u, v) => .06 * v * v - .2 * u * u,
					paint: (u, v) => leafColour("#8a9c88", "#9aaa94", 1, 0, u).lerp(tint("#dce0d4"), Math.abs(v) < .08 ? .5 : 0),
					along: 18,
					across: 3
				}), aim(p, tilted(out, .9), 0));
			});
		}
		/** @type {{ at: THREE.Vector3, axis: THREE.Vector3, R: number, cut: number, key: number }[]} */
		const buds = [{
			at: stem[8],
			axis: towards(stem, 1),
			R: .045,
			cut: k % 2 ? 7.35 + k * .05 : Infinity,
			key: 0
		}];
		for (let b = 0; b < 2; b++) {
			const from = point(stem, .55 + b * .15);
			const len = (.22 + .08 * fr()) * span(g, born + .4, born + 1.4);
			if (len < .01) continue;
			const twig = arch(from, tilted(level(a + (b ? 2.2 : -2.2)), .55), len, -.25, 4);
			bag.add("body", tube(twig, (u) => R * .6 * (1 - .3 * u), () => tint("#94a690"), 6));
			space.rod(twig, R * .6);
			buds.push({
				at: twig[4],
				axis: towards(twig, 1),
				R: .028,
				cut: fr() < .75 ? 7.3 + b * .15 + k * .05 : Infinity,
				key: b + 1
			});
		}
		for (const bud of buds) {
			if (g > bud.cut) {
				bag.add("body", bead(bud.at, v3(.008, .004, .008), "#c8d0b0", 3));
				continue;
			}
			const grow = span(g, born + .5, 7);
			const size = bud.R * vigour * lerp(.25, 1, grow);
			space.ball(bud.at.clone().addScaledVector(bud.axis, size), size * 1.1);
			head(bag, seed, [k, bud.key], bud.at, bud.axis, size, span(g, 7.8, 8.6) * (bud.key ? .8 : 1), span(g, 8.2, 9));
		}
	}
	for (let i = 0; i < 30; i++) {
		const born = .9 + i * .2;
		if (g <= born) break;
		const wither = span(g, born + 3.3, born + 3.9);
		if (wither >= 1) continue;
		const lr = chance(seed, "artichoke-leaf", i);
		const grown = clamp((g - born) / 1.2);
		const L = (.25 + .7 * ((.45 + .55 * clamp(i / 12)) * vigour * about(lr, 1, .08))) * lerp(.25, 1, grown);
		const bear = i * 2.39996 + about(lr, 0, .15);
		const tilt = lerp(.12, between(lr, .45, .75), grown) + wither * .6;
		const at = crown.clone().addScaledVector(level(bear), .02);
		later.push(() => {
			const out = g > 4.6 ? space.steer(at.clone().add(v3(0, L * .3, 0)), level(bear), Math.PI / 2 - tilt, L * .6, .04) : level(bear);
			const dir = tilted(out, tilt);
			const stalk = at.clone().addScaledVector(dir, L * .1);
			bag.add("body", tube([at, stalk], () => .006 * lerp(.5, 1, grown), () => tint("#b8c0ac"), 5));
			bag.add("sheet", sheet({
				length: L,
				width: L * .17,
				shape: cutLeaf,
				lift: (u, v) => .07 * v * v - (.32 + wither * .4) * u * u * lerp(.4, 1, grown) + .02 * Math.sin(u * 40) * v,
				paint: (u, v) => leafColour("#879a86", "#9aac90", grown, wither, u).lerp(tint("#e2e6dc"), Math.abs(v) < .07 ? .55 : Math.abs(v) > .7 ? .12 : 0),
				along: 34,
				across: 4
			}), aim(stalk, dir, (lr() - .5) * .3));
		});
	}
	for (const f of later) f();
	return bag.build();
}
/**
* An artichoke head at the top of its stalk at `at`: a globe of fleshy scales, tight while it is eaten, loosening and
* spreading as it opens, then a tuft of violet florets out of its top.
* @param {Bag} bag @param {string} seed @param {number[]} key @param {THREE.Vector3} at @param {THREE.Vector3} axis
* @param {number} R @param {number} open @param {number} flower
*/
function head(bag, seed, key, at, axis, R, open, flower) {
	const hr = chance(seed, "artichoke-head", ...key);
	const turn = upTo(axis);
	const c = at.clone().addScaledVector(axis, R * .95);
	bag.add("body", bead(c, v3(R * .82, R * .95, R * .82), "#6a8456", 6, turn));
	const n = 34;
	for (let k = 0; k < n; k++) {
		const t = k / n;
		const phi = lerp(.35, 2.5, t), th = k * 2.39996 + hr() * .1;
		const nrm = v3(Math.sin(phi) * Math.cos(th), -Math.cos(phi), Math.sin(phi) * Math.sin(th)).applyQuaternion(turn);
		const up = v3(Math.cos(phi) * Math.cos(th), Math.sin(phi), Math.cos(phi) * Math.sin(th)).applyQuaternion(turn);
		const p = c.clone().add(v3(Math.sin(phi) * Math.cos(th) * R * .78, -Math.cos(phi) * R * .9, Math.sin(phi) * Math.sin(th) * R * .78).applyQuaternion(turn));
		const spread = .12 + open * (.5 + .6 * (1 - t));
		const dir = up.clone().lerp(nrm, clamp(spread)).normalize();
		const len = R * (.62 - .2 * t);
		bag.add("sheet", sheet({
			length: len,
			width: R * .3,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .5)), .55) * (u > .85 ? .75 : 1),
			lift: (u, v) => -.15 * v * v + .05 * u,
			paint: (u) => mix(mix("#7a9a66", "#5f7a4e", t), "#6a4a72", clamp(u - .45) * (1.2 + open)).lerp(tint("#c8d0a8"), (1 - u) * .25),
			along: 3,
			across: 2
		}), face(p, dir, nrm));
	}
	if (flower <= 0) return;
	const disc = c.clone().addScaledVector(axis, R * .65);
	const m = 80;
	for (let j = 0; j < m; j++) {
		const rr = Math.sqrt(j / m), a = j * 2.39996;
		const local = v3(Math.cos(a) * rr * R * .72, 0, Math.sin(a) * rr * R * .72).applyQuaternion(turn);
		const from = disc.clone().add(local);
		const d = axis.clone().addScaledVector(local.clone().normalize(), rr * .9).normalize();
		bag.add("body", tube([from, from.clone().addScaledVector(d, R * .85 * flower)], (u) => .0014 * (1 - .4 * u), (u) => mix("#6a3aa8", "#a070e0", u), 3));
	}
}
//#piece a2f3aac50dc955c8e1d5483ecbe43ff8114943da640f50a0a56ed344a37597d4
	id: "artichoke",
	label: "Globe artichoke",
	latin: "Cynara cardunculus var. scolymus · Artischocke",
	note: "A fountain of deeply cut silver-grey leaves; ribbed stems carry the scaly buds that are eaten, or left to open into violet thistles.",
	from: "Perennial · 2 years",
	stages: ARTICHOKE_STAGES,
	grow: artichoke,
//#piece feef0e8121e2feb0d65027316063df20b3e6bc2baf1ef0d05b1b48087cb64841

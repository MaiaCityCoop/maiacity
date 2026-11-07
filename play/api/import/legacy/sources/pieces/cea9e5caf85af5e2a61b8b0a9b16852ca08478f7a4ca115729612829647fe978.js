/** @param {Look} look @param {number} g @param {string} seed */
function grow(look, g, seed) {
	const bag = new Bag();
	const vigour = about(chance(seed, "plant"), 1, .08);
	const corm = v3(0, -.14, 0);
	plantBanana(bag, look, seed, ["mother"], corm, g, vigour, 1);
	if (g > 3.6) {
		const a = chance(seed, "follower")() * Math.PI * 2;
		plantBanana(bag, look, seed, ["follower"], corm.clone().add(v3(Math.cos(a) * .35, .02, Math.sin(a) * .35)), (g - 3.6) * .6, vigour * .85, 0);
	}
	return bag.build();
}
/**
* One banana plant: corm, roots, pseudostem, leaves, and (if it is the mother) its bunch.
* @param {Bag} bag @param {Look} look @param {string} seed @param {(string | number)[]} key @param {THREE.Vector3} corm @param {number} g @param {number} vigour @param {number} bears
*/
function plantBanana(bag, look, seed, key, corm, g, vigour, bears) {
	chance(seed, "banana", ...key);
	const big = span(g, .5, 4.6);
	bag.add("body", bead(corm, v3(1, .8, 1).multiplyScalar(.05 + .1 * big), "#8a6a4a", 8));
	const roots = Math.round(table(g, [
		[.4, 0],
		[1, 6],
		[3, 20],
		[5, 36],
		[9, 44]
	]));
	for (let i = 0; i < roots; i++) {
		const rr = chance(seed, "banana-root", ...key, i);
		const a = i * 2.39996;
		root(bag, {
			seed,
			key: [
				...key,
				"root",
				i
			],
			from: corm.clone().add(v3(Math.cos(a) * .08 * big, -.02, Math.sin(a) * .08 * big)),
			dir: v3(Math.cos(a), -between(rr, .1, .6), Math.sin(a)),
			length: between(rr, .5, 1.4) * vigour,
			grown: (g - .4 - i * .08) / 2.5,
			radius: .004,
			down: .02,
			wander: .15,
			laterals: 4,
			lateral: .2,
			depth: 1,
			age: (g - 1.5 - i * .08) / 3,
			young: "#f6efe0",
			old: "#c4a77a"
		});
	}
	const H = table(g, [
		[0, .25],
		[1, .3],
		[2, .5],
		[3, 1.1],
		[4, 2.2],
		[5, 2.8],
		[9, 2.85]
	]) * vigour;
	const R = table(g, [
		[0, .025],
		[2, .04],
		[3, .07],
		[4, .12],
		[5, .14],
		[9, .145]
	]) * vigour;
	const stem = [
		corm.clone(),
		v3(corm.x, corm.y + .15, corm.z),
		v3(corm.x, H * .5, corm.z),
		v3(corm.x + .01, H, corm.z)
	];
	bag.add("body", tube(stem, (u) => R * (1.15 - .35 * u), (u, v) => mix(mix(look.stem[0], look.stem[1], Math.abs(Math.sin(v * 21 + u * 7))), "#6a4a3a", Math.pow(Math.abs(Math.sin(v * 9 + u * 31)), 20) * .7).lerp(new three.Color("#a8865a"), clamp((.12 - u) * 8)), 14));
	const top = stem[3];
	const made = table(g, [
		[0, 3],
		[1, 4],
		[2, 7],
		[3, 12],
		[4, 18],
		[5, 24],
		[9, 24]
	]);
	const live = table(g, [
		[0, 3],
		[2, 5],
		[3, 8],
		[4, 11],
		[5, 12],
		[6, 11],
		[9, 9]
	]);
	const shooting = bears && g > 4.9;
	for (let j = Math.max(0, Math.floor(made - live - 1)); j < Math.ceil(made); j++) {
		const age = (made - j) / Math.max(1, live);
		if (age < 0 || age > 1.15) continue;
		const lr = chance(seed, "banana-leaf", ...key, j);
		const bear = j * 2.8 + about(lr, 0, .2);
		const out = v3(Math.cos(bear), 0, Math.sin(bear));
		const size = lerp(.18, 1, clamp(j / 14)) * vigour;
		const L = 2 * size, W = lerp(.12, .6, clamp(j / 14)) * vigour;
		const opened = clamp((made - j) / .9);
		if (opened < .25 && !shooting) {
			bag.add("body", tube([top, top.clone().add(v3(0, L * .6 * lerp(.4, 1, opened * 4), 0))], (u) => .03 * size * (1 - .8 * u), () => "#8ab85a", 8));
			continue;
		}
		const tilt = lerp(.15, 1.2, Math.pow(clamp(age), .8)) + Math.max(0, age - .85) * 3;
		const dry = span(age, .8, 1.1);
//#piece 0067898aa7e9aef54cfbd3b0a0426870894d3cfe1c9ddb7c65cccca811455bf2
		const petiole = top.clone().addScaledVector(dir, .35 * size);
		bag.add("body", tube([top, petiole], () => .02 * size, () => mix(look.stalk, "#9a7a4a", dry), 6));
		const bladeDir = dir.clone().lerp(out, .4).normalize();
		const tears = [];
		const torn = clamp(age * 1.5) * (j > 6 ? 1 : .2);
		for (let t = 0; t < 8; t++) if (lr() < torn * .6) tears.push(.12 + t * .105 + lr() * .04);
		const colour = mix(mix("#3f7a2e", "#8ac05a", 1 - opened), "#2f6024", age * .4);
		bag.add("body", tube([petiole, petiole.clone().addScaledVector(bladeDir, L).add(v3(0, -.25 * L * (.3 + age), 0))], (u) => .012 * size * (1 - .8 * u), () => mix("#b8c88a", "#9a7a4a", dry), 5));
		for (const side of [-1, 1]) halfBlade(bag, {
			at: petiole,
			dir: bladeDir,
			side,
			length: L,
			width: W,
			droop: .12 + age * .15,
			colour,
			dry,
			tears: side < 0 ? tears : tears.map((t) => Math.min(.95, t + .03)),
			roll: side * .15
		});
	}
	if (shooting) bunch(bag, look, seed, top, g, vigour);
}
/**
* The bunch: the stalk up through the pseudostem and over; the hands, each under its purple bract until the bract
* lifts; the fingers curving up; the male bud hanging below.
* @param {Bag} bag @param {Look} look @param {string} seed @param {THREE.Vector3} top @param {number} g @param {number} vigour
*/
function bunch(bag, look, seed, top, g, vigour) {
	const br = chance(seed, "bunch");
	const out = v3(Math.cos(br() * 6.28), 0, Math.sin(br() * 6.28));
	const shoot = span(g, 4.9, 5.4);
	const path = new three.CatmullRomCurve3([
		[0, 0],
		[.12, .32],
		[.38, .38],
		[.56, .1],
		[.62, -.35],
		[.62, -.85],
		[.6, -1.25]
	].map(([o, y]) => top.clone().addScaledVector(out, o * vigour).add(v3(0, y * vigour, 0))));
	const pts = path.getPoints(16).map((_, k) => path.getPoint(k / 16 * lerp(.25, 1, shoot)));
	bag.add("body", tube(pts, (u) => .03 * (1 - .4 * u), () => "#6f8a3a", 8));
	const hands = look.hands;
	const fill = span(g, 5.6, 7.8);
	const ripe = span(g, 8, 9);
	for (let h = 0; h < hands; h++) {
		const f = (.5 + h * .021) * 16, k = Math.min(15, Math.floor(f));
		const at = pts[k].clone().lerp(pts[k + 1], f - k);
		const along = pts[k + 1].clone().sub(pts[k]).normalize();
		const revealed = span(g, 5.4 + h * .15, 5.7 + h * .15);
		const around = h * 2.2;
		if (revealed < 1) {
			bag.add("body", bead(at.clone().add(v3(Math.cos(around) * .06, 0, Math.sin(around) * .06)), v3(.06, .1, .05), "#6a1e3a", 6, new three.Quaternion().setFromUnitVectors(v3(0, 1, 0), along.clone().negate())));
			if (revealed <= 0) continue;
		}
		const fingers = look.fingers[0] + Math.floor(br() * (look.fingers[1] - look.fingers[0] + 1));
		for (let n = 0; n < fingers; n++) {
			const a = around + (n / fingers - .5) * 2.4;
			const row = n % 2 ? 1 : .86;
			const base = at.clone().add(v3(Math.cos(a) * .065 * row, -.012 * (n % 2), Math.sin(a) * .065 * row));
			const radial = v3(Math.cos(a), 0, Math.sin(a));
			const len = look.length * lerp(.5, 1, fill) * vigour * (1 - h * .025) * revealed;
			const R = look.girth * lerp(.35, 1, fill) * vigour * (1 - h * .02);
			const fp = [];
			for (let m = 0; m <= 8; m++) {
				const t = m / 8;
				fp.push(base.clone().addScaledVector(radial, len * (.75 * t)).add(v3(0, len * (.75 * t * t - .1 * t), 0)));
			}
			const colour = mix(mix("#4f7a2a", look.green, fill), look.ripe, clamp(ripe * 1.3 - h * .05));
			if (fill > 0) bag.fruit([
				"finger",
				h,
				n
			], base, fp[8].clone().sub(fp[0]));
			bag.add("gloss", tube(fp, (t, v) => R * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, .05 + t))), .4) * (1 - .3 * t) * (1 + .06 * Math.cos(v * Math.PI * 10)), (t) => colour.clone().lerp(new three.Color(look.tip), clamp((t - .93) * 14)), 10));
			bag.fruitDone();
		}
	}
	bag.add("body", bead(pts[16].clone().add(v3(0, -.1, 0)), v3(.07, .15, .07).multiplyScalar(lerp(.5, 1, shoot)), "#5a1a34", 8));
//#piece 69f1d3d6a1a9ba606895e988f6b2d3bf22c7c85e9e9f4295855e80951be3b7da

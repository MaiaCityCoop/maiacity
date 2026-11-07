	const look = {
		koi: {
			base: "#e86a1e",
			belly: "#f6c08a",
			patch: "#e86a1e"
		},
		kohaku: {
			base: "#f3f0ea",
			belly: "#f6f3ee",
			patch: "#d23a1c"
		},
		ogon: {
			base: "#d9a63a",
			belly: "#f0d48a",
			patch: "#d9a63a"
		},
		carp: {
			base: "#6e5a32",
			belly: "#d8b46a",
			patch: "#6e5a32"
		},
		nile: {
			base: "#717a70",
			belly: "#d4d6cc",
			patch: "#3e4640"
		},
		redtilapia: {
			base: "#e48a6a",
			belly: "#f4cdb8",
			patch: "#e48a6a"
		}
	}[kind];
	const base = new three.Color(look.base), belly = new three.Color(look.belly);
	const paint = (c, at) => {
		const { p, n } = at;
		c.copy(base);
		mix(c, belly, ramp(-n.y, -.2, .6));
		c.multiplyScalar(1 - .25 * ramp(n.y, .4, .95));
		const sc = L * .045;
		const row = Math.floor(p.y / sc), u = p.z / sc + (row % 2 ? .5 : 0);
		const d = Math.hypot(u - Math.round(u), p.y / sc - row - .5);
		if (!at.tag("head") || at.tag("body") > .5) c.multiplyScalar(1 - .12 * ramp(d, .3, .5));
		if (kind === "kohaku") mix(c, look.patch, ramp(fbm3(p.x * 18 / L, p.y * 12 / L, p.z * 9 / L, 3, 5), .05, .12) * ramp(n.y, -.3, .2));
		if (kind === "nile") mix(c, look.patch, .55 * ramp(Math.sin(p.z / L * 52), .55, .85) * ramp(n.y, -.5, .2) * ramp(p.z, Z(-.36), Z(-.3)) * ramp(Z(.22), Z(.16), p.z));
		if (at.main === "lips") mix(c, belly, .5);
	};
	const skin = s.skin(L * .016, paint, `fish-${kind}-${L.toFixed(2)}-${y.toFixed(2)}`);
	const fin = kind === "kohaku" ? "#f2ece4" : kind === "nile" ? "#6a6a5e" : look.base;
	const parts = [{ skin }];
	for (const up of [1, -1]) parts.push({
		geo: egg([
			0,
			y + up * L * .08,
			Z(-.5)
		], [
			L * .006,
			L * .1,
			L * .055
		], [
			up * -.65,
			0,
			0
		]),
		color: kind === "nile" ? (p) => p.z < Z(-.53) ? "#b8523a" : fin : fin,
		bone: "fin"
	});
	parts.push({
		geo: egg([
			0,
			y + L * .13 * deep,
			Z(tilapia ? -.02 : 0)
		], [
			L * .005,
			L * .055,
			L * (tilapia ? .24 : .2)
		], [
			.15,
			0,
			0
		]),
		color: fin,
		chain: {
			bones: [
				"body1",
				"body2",
				"body3",
				"body4"
			],
			soft: L * .05
		}
	});
	parts.push({
		geo: egg([
			0,
			y - L * .12 * deep,
			Z(-.2)
		], [
			L * .005,
			L * .045,
			L * .07
		], [
			-.4,
			0,
			0
		]),
		color: fin,
		bone: "body4"
	});
	for (const x of [-1, 1]) parts.push({
		geo: egg([
			x * L * .04,
			y - L * .11,
			Z(.03)
		], [
			L * .005,
			L * .035,
			L * .06
		], [
			-.5,
			0,
			x * .5
		]),
		color: fin,
		bone: "body2"
	});
	for (const [side, x] of [["L", 1], ["R", -1]]) parts.push({
		geo: egg([
			x * L * .085,
			y - L * .075,
			Z(.17)
		], [
			L * .004,
			L * .035,
			L * .06
		], [
			-.5,
			x * .6,
			x * .5
		]),
		color: fin,
		bone: `pect${side}`
	});
	parts.push(...eyes([
		L * .06,
		y + L * .025,
		Z(.35)
	], L * .022, [
		1,
		.05,
		.25
	], tilapia ? "#c9b26a" : "#d9b45a", "round", "head", {
		irisR: .8,
		pupilR: .55
	}));
	if (!tilapia) for (const x of [-1, 1]) parts.push({
		geo: limb([
			x * L * .022,
			y - L * .03,
			Z(.42)
		], [
			x * L * .05,
			y - L * .07,
			Z(.44)
		], L * .004, L * .003, { seg: 5 }),
		color: look.belly,
		bone: "head"
	});
	const r = rig(bones, parts, animalMaterials(.35, { metalness: kind === "ogon" ? .45 : .12 }));
	r.object.name = `fish-${kind}`;
	const cruise = .5 * L;
	const wave = (t, m) => {
		const ph = m.dist / (.75 * L) + t * .35;
		const pace = clamp(m.speed / cruise, 0, 2);
		const amp = .06 + .1 * Math.min(1, pace);
		const bend = clamp(m.turn ?? 0, -2, 2) * .12;
		const pose = { root: [
			0,
			.004 * L * Math.sin(t * 1.3),
			0
		] };
		SPINE.forEach((n, i) => {
			const grow = [
				.25,
				.35,
				.5,
				.7,
				.95,
				1.25,
				1.1
			][i];
			pose[n] = [
				0,
				amp * grow * Math.sin(TAU * ph - .9 * i) + (i ? bend : -bend * .5),
				0
			];
		});
		const scull = (1 - Math.min(1, pace)) * .5 + .15;
		pose.pectL = [
			0,
			0,
			.3 + scull * Math.sin(t * 6)
		];
		pose.pectR = [
			0,
			0,
			-.3 - scull * Math.sin(t * 6 + .5)
		];
		return pose;
	};
	const swim = (t, m) => wave(t, onTheSpot(t, cruise, m));
	const turn = (t, m) => wave(t, {
		...onTheSpot(t, cruise, m),
		turn: 1.2 * Math.sin(t * .8)
	});

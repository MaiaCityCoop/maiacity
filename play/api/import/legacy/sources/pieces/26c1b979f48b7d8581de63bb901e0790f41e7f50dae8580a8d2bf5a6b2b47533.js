		const p = (leg[0] === "F" ? J.fore : J.hind).map((v) => [
			v[0] * side,
			v[1],
			v[2]
		]);
		const fleece = L.woolLegs > .5 ? {
			...wool,
			bump: .012
		} : { tag: "leg" };
		if (leg[0] === "F") s.cone([
			p[0][0] * .9,
			p[0][1] + .04,
			p[0][2]
		], p[1], .07 + .02 * w, .05, {
			bone: `upper${leg}`,
			k: .06,
			...wool
		});
		else s.egg([
			p[0][0] * 1.05,
			.48,
			-.26
		], [
			.085 + .03 * w,
			.13 + .02 * w,
			.11 + .02 * w
		], {
			bone: `upper${leg}`,
			k: .07,
			...wool
		});
		s.cone(p[1], p[2], leg[0] === "F" ? .034 : .04, .024, {
			bone: `lower${leg}`,
			k: .03,
			...leg[0] === "H" ? wool : fleece,
			...leg[0] === "H" ? { bump: .004 + .006 * w } : {}
		});
		s.cone(p[2], p[3], .022, .017, {
			bone: `cannon${leg}`,
			k: .02,
			...fleece
		});
		s.cone(p[3], [
			p[4][0],
			.03,
			(p[3][2] + p[4][2]) / 2
		], .018, .019, {
			bone: `foot${leg}`,
			k: .012,
			tag: "leg"
		});
	}
	s.cone(J.tail[0], J.tail[2], .05 + .02 * w, .035, {
		chain: q.tail.slice(0, 2),
		k: .05,
		...wool
	});
	const woolC = new three.Color(L.wool), faceC = new three.Color(L.face), legC = new three.Color(L.legs), noseC = new three.Color(L.nose);
	const dirt = new three.Color("#b5a387"), t1 = new three.Color(), t2 = new three.Color();
	const paint = (c, at) => {
		const { p, n } = at;
		const crimp = fbm3(p.x * 30, p.y * 30, p.z * 30, 2, 3);
		t1.copy(woolC).multiplyScalar(.92 + .1 * crimp);
		mix(t1, dirt, .35 * ramp(-n.y, -.1, .8) * (L.wool === LOOK$1.black.wool ? .2 : 1) + .25 * ramp(.42 - p.y, 0, .2));
		t2.copy(at.main === "nose" ? noseC : at.main === "leg" ? legC : faceC).multiplyScalar(.95 + .08 * fbm3(p.x * 60, p.y * 60, p.z * 60, 2, 4));
		const wv = ramp(at.tag("wool"), .3, .7);
		c.copy(t2).lerp(t1, wv);
	};
	const parts = [{ skin: s.skin(.015, paint, `sheep-${breed}`) }];
	const earLen = L.ears === "long" ? .12 : L.ears === "pricked" ? .095 : .07;
	/** a dark-faced breed's ears are dark inside too */
	const dark = new three.Color(L.face).getHSL({
		h: 0,
		s: 0,
		l: 0
	}).l < .3;
	const droop = L.ears === "long" ? -.75 : -.15;
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const base = [
			x * .05,
			.9,
			.565
		];
		const tip = new three.Vector3(x, droop, -.25).normalize().multiplyScalar(earLen);
		parts.push({
			geo: egg([
				base[0] + tip.x * .5,
				base[1] + tip.y * .5,
				base[2] + tip.z * .5
			], [
				earLen * .5,
				.012,
				.03
			], [
				0,
				x * -.25,
				Math.atan2(tip.y, Math.abs(tip.x)) * x
			]),
			color: L.face,
			bone: `ear${side}`
		});
		parts.push({
			geo: egg([
				base[0] + tip.x * .52,
				base[1] + tip.y * .52 + .004,
				base[2] + tip.z * .52 + .006
			], [
				earLen * .42,
				.006,
				.022
			], [
				0,
				x * -.25,
				Math.atan2(tip.y, Math.abs(tip.x)) * x
			]),
			color: dark ? "#3a2f2a" : "#d9b3a6",
			bone: `ear${side}`
		});
	}
	parts.push(...eyes([
		.054,
		.855,
		.648
	], .0145, [
		.85,
		.12,
		.45
	], "#b8862e", "bar"));

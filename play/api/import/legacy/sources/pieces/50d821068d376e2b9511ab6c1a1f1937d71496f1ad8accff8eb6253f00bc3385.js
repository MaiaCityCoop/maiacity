		const p = (leg[0] === "F" ? J$3.fore : J$3.hind).map((v) => [
			v[0] * side,
			v[1],
			v[2]
		]);
		if (leg[0] === "F") s.cone([
			p[0][0] * .9,
			p[0][1] + .05,
			p[0][2] - .01
		], p[1], .065 + .01 * hv, .042, {
			bone: `upper${leg}`,
			k: .06,
			...coat
		});
		else s.egg([
			p[0][0] * 1.05,
			.56,
			-.27
		], [
			.065 + .012 * hv,
			.12,
			.09
		], {
			bone: `upper${leg}`,
			k: .06,
			...coat
		});
		s.cone(p[1], p[2], leg[0] === "F" ? .03 : .038, .021, {
			bone: `lower${leg}`,
			k: .03,
			tag: "leg"
		});
		s.cone(p[2], p[3], .019, .015, {
			bone: `cannon${leg}`,
			k: .018,
			tag: "shin"
		});
		s.cone(p[3], [
			p[4][0],
			.03,
			(p[3][2] + p[4][2]) / 2
		], .016, .017, {
			bone: `foot${leg}`,
			k: .01,
			tag: "shin"
		});
	}
	s.cone(J$3.tail[0], J$3.tail[2], .024, .014, {
		chain: q.tail,
		k: .03,
		tag: "tail"
	});
	const base = new three.Color(L.coat), dark = new three.Color(L.dark), nose = new three.Color(L.nose), light = base.clone().lerp(new three.Color("#ffffff"), .25);
	const paint = (c, at) => {
		const { p, n } = at;
		c.copy(base).multiplyScalar(.93 + .1 * fbm3(p.x * 18, p.y * 18, p.z * 18, 3, 2));
		mix(c, light, .35 * ramp(-n.y, .2, .9));
		const below = (y) => ramp(y - p.y, -.03, .03);
		if (breed === "alpine") {
			const stripe = ramp(n.y, .75, .95) * ramp(.05, .02, Math.abs(p.x)) * ramp(p.z, -.45, -.4);
			const stripes = (at.tag("face") + at.tag("nose")) * ramp(.035, .015, Math.abs(Math.abs(p.x) - .03 + .15 * (p.z - .7)));
			mix(c, dark, Math.max(stripe, below(.32), ramp(-n.y, .6, .9) * ramp(.62, .55, p.y), stripes, at.tag("nose")));
		} else if (breed === "pied") {
			const patch = fbm3(p.x * 4.5 + 3, p.y * 4.5, p.z * 4.5, 3, 9);
			mix(c, dark, ramp(patch, .05, .12));
			mix(c, "#1f1a17", ramp(fbm3(p.x * 6, p.y * 6 + 2, p.z * 6, 2, 13), .25, .3) * .9);
		} else if (breed === "boer") {
			const head = Math.max(at.tag("face") + at.tag("nose"), ramp(p.z, .47, .53) * ramp(p.y, .78, .84));
			const blaze = ramp(.022, .01, Math.abs(p.x)) * ramp(n.y + n.z, .3, .8);
			mix(c, dark, head * (1 - blaze));
		} else if (breed === "nubian") mix(c, dark, .6 * ramp(n.y, .6, .95) * ramp(.04, 0, Math.abs(p.x)) + .4 * below(.2));
		if (at.main === "nose") mix(c, nose, .85);
		if (at.main === "shin") c.multiplyScalar(.92);
	};
	const parts = [{ skin: s.skin(.013, paint, `goat-${breed}`) }];
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const base3 = [
			x * .045,
			.985,
			.55
		];
		const long = L.ears === "long";
		const len = long ? .17 : .11;
		const dir = new three.Vector3(x * (long ? .35 : 1), long ? -1 : .05, long ? .15 : -.1).normalize();
		const mid = [
			base3[0] + dir.x * len * .5,
			base3[1] + dir.y * len * .5,
			base3[2] + dir.z * len * .5
		];
		const tilt = long ? [
			0,
			0,
			x * .35
		] : [

		const p = (leg[0] === "F" ? J$1.fore : J$1.hind).map((v) => [
			v[0] * side,
			v[1],
			v[2]
		]);
		if (leg[0] === "F") {
			s.cone([
				p[0][0],
				p[0][1] + .01,
				p[0][2]
			], p[1], .018, .012, {
				bone: `upper${leg}`,
				k: .015,
				...fur
			});
			s.cone(p[1], p[2], .01, .008, {
				bone: `lower${leg}`,
				k: .008,
				tag: "paw"
			});
			s.cone(p[2], p[4], .0085, .009, {
				bone: `foot${leg}`,
				k: .006,
				tag: "paw"
			});
		} else {
			s.cone(p[1], p[2], .018, .011, {
				bone: `lower${leg}`,
				k: .02,
				...fur
			});
			s.cone(p[2], p[3], .012, .011, {
				bone: `cannon${leg}`,
				k: .01,
				tag: "paw"
			});
			s.cone(p[3], p[4], .011, .01, {
				bone: `foot${leg}`,
				k: .008,
				tag: "paw"
			});
		}
	}
	s.ball([
		0,
		.118,
		-.16
	], .022, {
		chain: q.tail.slice(0, 1),
		k: .015,
		tag: "tail"
	});
	const base = new three.Color(L.coat), belly = new three.Color(L.belly), t = new three.Color();
	const paint = (c, at) => {
		const { p, n } = at;
		c.copy(base);
		if (coat === "wild") {
			c.multiplyScalar(.85 + .3 * fbm3(p.x * 160, p.y * 160, p.z * 160, 2, 7));
			mix(c, "#5d4a39", .4 * ramp(n.y, .5, .95));
		} else c.multiplyScalar(.94 + .08 * fbm3(p.x * 60, p.y * 60, p.z * 60, 2, 7));
		const under = Math.max(ramp(-n.y, .2, .7) * ramp(.09, .06, p.y), at.tag("belly"), at.tag("tail") * ramp(.2, -.5, n.y));
		t.copy(belly);
		c.lerp(t, under * (coat === "black" ? .25 : .9));
		if (coat === "dutch") {
			const front = ramp(p.z, .04, .07) * (1 - at.tag("fur") * ramp(.02, .035, Math.abs(p.x)) * ramp(p.y, .14, .16) * ramp(.16, .13, p.z));
			const blaze = at.tag("muzzle") + ramp(.012, .004, Math.abs(p.x)) * ramp(p.z, .14, .16);
			mix(c, belly, Math.max(front, blaze, at.tag("paw")));
		}
		if (at.main === "muzzle") mix(c, belly, .4);

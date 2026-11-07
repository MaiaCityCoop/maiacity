		}
	}[kind];
	const back = new three.Color(look.back), head = new three.Color(look.head), belly = new three.Color(look.belly);
	const paint = (c, at) => {
		const { p, n } = at;
		c.copy(back).lerp(head, at.tag("head"));
		const blot = fbm3(p.x * 110 / k, p.y * 110 / k, p.z * 110 / k, 3, 17);
		mix(c, look.spots, ramp(blot, .15, .3) * (at.tag("limb") ? 1 : .8));
		mix(c, belly, Math.max(at.tag("belly") * ramp(-n.y, -.2, .3), ramp(-n.y, .4, .8)));
		if (kind === "common" && at.main === "head") mix(c, "#3a2a1c", ramp(n.x * Math.sign(p.x), .5, .8) * ramp(.045 * k, .035 * k, p.y) * ramp(p.z, .02 * k, .03 * k));
		const ear = Math.hypot(Math.abs(p.x) - .026 * k, p.y - .046 * k, p.z - .03 * k);
		if (at.main === "head") mix(c, kind === "bullfrog" ? "#4e5a2c" : "#6a5a3a", ramp(.0075 * k, .006 * k, ear));
		c.multiplyScalar(.95 + .08 * fbm3(p.x * 400, p.y * 400, p.z * 400, 2, 2));

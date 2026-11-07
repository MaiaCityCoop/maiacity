		const w = m(arm[2], x);
		for (const a of [
			-.6,
			-.2,
			.2,
			.6
		]) parts.push({
			geo: limb(w, [
				w[0] + x * Math.sin(a + .4) * .014 * k,
				0,
				w[2] + Math.cos(a + .4) * .014 * k
			], .0018 * k, .0022 * k, { seg: 5 }),
			color: look.back,
			bone: `hand${side}`

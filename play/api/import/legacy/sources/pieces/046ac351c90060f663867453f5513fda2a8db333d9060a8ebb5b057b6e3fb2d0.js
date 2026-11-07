	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const ankle = [
			x * J.leg[2][0],
			J.leg[2][1],
			J.leg[2][2]
		], toes = [
			x * J.leg[3][0],
			J.leg[3][1],
			J.leg[3][2]
		];
		parts.push({
			geo: limb(ankle, toes, .0011 * k, .001 * k, { seg: 6 }),
			color: L.legs,
			bone: `tarsus${side}`
		});
		for (const a of [
			-.45,
			0,
			.45,
			Math.PI
		]) {
			const len = (a === Math.PI ? .008 : a === 0 ? .012 : .009) * k;
			const tip = [
				toes[0] + Math.sin(a) * len,
				8e-4 * k,
				toes[2] + Math.cos(a) * len
			];
			parts.push({
				geo: limb(toes, tip, 8e-4 * k, 5e-4 * k, { seg: 5 }),
				color: L.legs,
				bone: `toes${side}`
			});
		}
	}
	parts.push({
		geo: egg(at(sunk([
			0,
			.039,
			-.072
		]), k), [
			.0125 * k,
			.0012 * k,
			.012 * k
		], [
			.42,
			0,
			0
		]),
		color: L.tail,
		bone: "tail"
	});

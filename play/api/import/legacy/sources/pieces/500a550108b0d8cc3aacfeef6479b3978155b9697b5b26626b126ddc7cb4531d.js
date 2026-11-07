			0,
			x * .15,
			x * -.05
		];
		const earGeo = long ? egg(mid, [
			.016,
			len * .5,
			.045
		], tilt) : egg(mid, [
			len * .5,
			.012,
			.033
		], tilt);
		const earC = breed === "boer" ? L.dark : breed === "alpine" ? L.coat : L.coat;
		parts.push({
			geo: earGeo,
			color: earC,
			bone: `ear${side}`
		});
	}
	parts.push(...eyes([
		.047,
		.935,
		.625
	], .0135, [
		.85,
		.15,
		.45
	], "#d9b44a", "bar"));
	if (L.horns) for (const x of [-1, 1]) {
		const pts = [];
		const sweep = breed === "boer" ? 1.35 : 1;
		for (let i = 0; i <= 6; i++) {
			const t = i / 6, a = .25 + t * 1.6 * sweep;
			pts.push([
				x * (.03 + .03 * t),
				1 + .11 * Math.sin(a) * sweep,
				.565 - .1 * (1 - Math.cos(a)) * sweep
			]);

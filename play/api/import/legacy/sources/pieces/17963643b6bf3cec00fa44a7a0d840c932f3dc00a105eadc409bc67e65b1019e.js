		return pose;
	};
	const stand = (t) => ({
		...living(t, 0),
		root: [
			.004 * Math.sin(t * .5 + seed),
			.002 * Math.sin(t * 1.6),
			0
		],
		body: [
			0,
			0,
			.01 * Math.sin(t * .5 + seed)
		]

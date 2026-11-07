			{
				name: `arm${s}`,
				parent: "body",
				at: m(arm[0], x)
			},
			{
				name: `forearm${s}`,
				parent: `arm${s}`,
				at: m(arm[1], x)
			},
			{
				name: `hand${s}`,
				parent: `forearm${s}`,
				at: m(arm[2], x)
			},
			{
				name: `thigh${s}`,
				parent: "body",
				at: m(leg[0], x)
			},
			{
				name: `shin${s}`,
				parent: `thigh${s}`,
				at: m(leg[1], x)
			},
			{
				name: `tarsus${s}`,
				parent: `shin${s}`,
				at: m(leg[2], x)
			},
			{
				name: `foot${s}`,
				parent: `tarsus${s}`,
				at: m(leg[3], x)
			}
		])
	];
	const sk = skeleton(bones);
	const s = sculpt(bones);
	s.egg(P(0, .034, -.012), [
		.034 * k,
		.024 * k,
		.05 * k
	], {
		bone: "body",
		tag: "back"
	}, [
		-.25,
		0,
		0
	]);
	s.egg(P(0, .042, .04), [
		.032 * k,
		.018 * k,
		.034 * k
	], {
		bone: "head",
		k: .018 * k,
		tag: "head"
	}, [
		-.1,
		0,
		0
	]);
	s.egg(P(0, .026, .045), [
		.026 * k,
		.012 * k,
		.026 * k
	], {
		bone: "throat",
		k: .012 * k,
		tag: "belly"
	});
	s.egg(P(0, .024, -.005), [
		.03 * k,
		.014 * k,
		.04 * k
	], {
		bone: "body",
		k: .015 * k,
		tag: "belly"
	});

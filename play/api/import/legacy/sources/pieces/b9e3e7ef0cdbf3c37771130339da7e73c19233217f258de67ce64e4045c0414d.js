	const L = LOOK$3[breed];
	const q = quadSkeleton(J$3);
	const s = sculpt(q.bones);
	const hv = L.heavy;
	const coat = { tag: "coat" };
	s.egg([
		0,
		.635,
		-.02
	], [
		.14 + .02 * hv,
		.16,
		.35
	], {
		chain: [
			"pelvis",
			"body",
			"chest"
		],
		...coat
	});
	s.egg([
		0,
		.55,
		-.05
	], [
		.15 + .02 * hv,
		.12,
		.25
	], {
		chain: [
			"pelvis",
			"body",
			"chest"
		],
		k: .1,
		...coat
	});
	s.egg([
		0,
		.6,
		.27
	], [
		.11 + .02 * hv,
		.15,
		.12
	], {
		bone: "chest",
		k: .07,
		...coat
	});
	s.egg([
		0,
		.725,
		.22
	], [
		.06,
		.05,
		.13
	], {
		bone: "chest",
		k: .06,
		tag: "back"
	});
	for (const x of [-1, 1]) s.egg([
		x * .085,
		.745,
		-.25
	], [
		.04,
		.035,
		.05
	], {
		bone: "pelvis",
		k: .05,
		tag: "back"
	});
	s.egg([
		0,
		.7,
		-.34
	], [
		.1 + .02 * hv,
		.1,
		.11
	], {
		bone: "pelvis",
		k: .07,
		...coat
	}, [
		-.3,
		0,
		0
	]);
	s.cone([
		0,
		.64,
		.35
	], [
		0,
		.88,
		.52
	], .085 + .015 * hv, .055, {
		chain: ["neck", "neck2"],
		k: .06,
		tag: "neck"
	});
	const face = {
		bone: "head",
		k: .03,
		tag: "face"
	};
	s.egg([
		0,
		.955,
		.585
	], [
		.055,
		.058,
		.07
	], face);
	s.egg([
		0,
		.9,
		.665
	], [
		.046,
		.052,
		.12
	], face, [
		.78 - .08 * (breed === "nubian" ? 1 : 0),
		0,
		0
	]);
	if (breed === "nubian") s.egg([
		0,
		.905,
		.7
	], [
		.03,
		.035,
		.09
	], face, [
		.55,
		0,
		0
	]);
	s.egg([
		0,
		.835,
		.745
	], [
		.035,
		.036,
		.052
	], {
		...face,
		tag: "nose",
		k: .025
	}, [
		.78,
		0,
		0
	]);
	s.egg([
		0,
		.855,
		.67
	], [
		.032,
		.026,
		.075
	], {
		bone: "jaw",
		tag: "face",
		k: .02
	}, [
		.7,
		0,
		0
	]);

	const L = LOOK$2[coat];
	const q = quadSkeleton(J$1);
	const s = sculpt(q.bones);
	const fur = { tag: "fur" };
	s.egg([
		0,
		.112,
		-.035
	], [
		.066,
		.072,
		.118
	], {
		chain: [
			"pelvis",
			"body",
			"chest"
		],
		...fur
	}, [
		-.12,
		0,
		0
	]);
	s.egg([
		0,
		.095,
		.055
	], [
		.05,
		.058,
		.055
	], {
		bone: "chest",
		k: .03,
		...fur
	});
	for (const x of [-1, 1]) s.egg([
		x * .042,
		.085,
		-.075
	], [
		.04,
		.058,
		.068
	], {
		bone: `upperH${x > 0 ? "L" : "R"}`,
		k: .035,
		...fur
	});
	s.egg([
		0,
		.06,
		-.02
	], [
		.05,
		.035,
		.08
	], {
		chain: [
			"pelvis",
			"body",
			"chest"
		],
		k: .04,
		tag: "belly"
	});
	s.cone([
		0,
		.115,
		.075
	], [
		0,
		.155,
		.112
	], .042, .036, {
		chain: ["neck", "neck2"],
		k: .03,
		...fur
	});
	const head = {
		bone: "head",
		k: .018,
		tag: "fur"
	};
	s.egg([
		0,
		.172,
		.132
	], [
		.038,
		.04,
		.052
	], head, [
		.3,
		0,
		0
	]);
	for (const x of [-1, 1]) s.egg([
		x * .024,
		.153,
		.148

	const b = birdSkeleton(J$2);
	const s = sculpt(b.bones);
	const feather = {
		tag: "feather",
		bump: .004,
		lumps: .02
	};
	s.egg([
		0,
		.36,
		-.02
	], [
		.135,
		.13,
		.27
	], {
		bone: "body",
		...feather
	}, [
		.06,
		0,
		0
	]);
	s.egg([
		0,
		.35,
		.13
	], [
		.12,
		.12,
		.12
	], {
		bone: "body",
		k: .06,
		...feather
	});
	s.egg([
		0,
		.28,
		-.04

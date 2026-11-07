	const L = LOOK$1[breed];
	const q = quadSkeleton(J);
	const w = L.depth;
	const s = sculpt(q.bones);
	const wool = {
		tag: "wool",
		bump: .008 + .014 * w,
		lumps: L.lumps
	};
	s.egg([
		0,
		.6,
		-.02
	], [
		.15 + .08 * w,
		.17 + .07 * w,
		.38 + .08 * w
	], {
		chain: [
			"pelvis",
			"body",
			"chest"
		],
		...wool
	});
	s.egg([
		0,
		.61,
		-.29

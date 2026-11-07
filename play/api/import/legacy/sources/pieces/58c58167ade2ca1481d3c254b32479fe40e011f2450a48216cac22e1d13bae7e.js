	if (kind === "chick") {
		const s = .36;
		const sc = (p, big = 1) => [
			p[0] * s * big,
			p[1] * s * big,
			p[2] * s * big
		];
		return {
			j: {
				body: sc(j.body),
				neck: [sc(j.neck[0]), sc(j.neck[1])],
				head: [
					0,
					.4 * s * 1.03,
					.15 * s * 1.1
				],
				beak: [
					0,
					.395 * s * 1.03,
					.2 * s * 1.12
				],
				tail: sc(j.tail),
				wing: sc(j.wing),
				leg: j.leg.map((p) => sc(p))
			},
			k: s
		};
	}
	return {
		j,
		k: 1
	};
}
function chicken(kind = "red") {
	const { j, k } = joints(kind);
	const b = birdSkeleton(j);
	const s = sculpt(b.bones);
	const chick = kind === "chick";
	const L = chick ? {
		body: "#f2d36a",
		neck: "#f4da78",
		wing: "#ecc95c",
		tail: "#ecc95c",
		legs: "#f0b860",
		comb: 0,
		lobe: "#f2d36a",
		fluff: 1
	} : LOOK$4[kind];
	const f = L.fluff;
	const at = (p) => [
		p[0] * k,
		p[1] * k,
		p[2] * k
	];
	const feather = {
		tag: "feather",
		bump: chick ? .0015 : .004 * f,
		lumps: chick ? .004 : .011
	};
	if (chick) {
		s.egg([
			0,
			.088,
			0
		], [
			.034,
			.033,
			.042
		], {
			bone: "body",
			...feather
		}, [
			.2,
			0,
			0
		]);
		s.ball(j.head, .022, {
			bone: "head",
			k: .012,
			...feather
		});
		s.cone(j.neck[0], j.head, .02, .018, {
			chain: b.neck,
			k: .01,
			...feather
		});
		for (const x of [-1, 1]) s.egg([
			x * .03,
			.09,
			0
		], [
			.008,
			.02,
			.028
		], {
			bone: `wing${x > 0 ? "L" : "R"}`,
			k: .008,
			...feather,
			tag: "wing"
		});
	} else {
		s.egg(at([
			0,
			.245,
			-.005
		]), [
			.09 * f,
			.1 * f,
			.145 * f
		], {
			bone: "body",
			...feather
		}, [
			.3,
			0,
			0
		]);
		s.egg(at([
			0,
			.222,
			.07
		]), [
			.082 * f,
			.088 * f,
			.08 * f
		], {
			bone: "body",
			k: .04,
			...feather
		});
		s.egg(at([
			0,
			.295,
			-.06
		]), [
			.07 * f,
			.055 * f,
			.1
		], {
			bone: "body",
			k: .04,
			...feather
		}, [
			-.25,
			0,
			0
		]);
		s.egg(at([
			0,
			.2,
			-.095
		]), [
			.075 * f,
			.065 * f,
			.065 * f
		], {
			bone: "body",
			k: .04,
			...feather
		});
		s.cone(j.neck[0], j.head, (kind === "rooster" ? .05 : .045) * f, .026, {
			chain: b.neck,
			k: .035,
			...feather,
			tag: "neck"
		});
		s.ball(j.head, .03 * (kind === "rooster" ? 1.05 : 1), {
			bone: "head",
			k: .015,
			tag: "neck",
			bump: .001,
			lumps: .008
		});
		for (const [side, x] of [["L", 1], ["R", -1]]) s.egg([
			x * .083 * f * k,
			.265 * k,
			-.005 * k
		], [
			.028,
			.068 * f,
			.12 * f
		], {
			bone: `wing${side}`,
			k: .02,
			...feather,
			tag: "wing"
		}, [
			.32,
			0,
			0
		]);
		s.cone(at([
			0,
			.3,
			-.1
		]), at([
			0,
			.37,
			-.165
		]), .052 * f, .025, {
			bone: "tail",
			k: .03,
			...feather,
			tag: "tail"
		});
	}
	for (const [side, x] of [["L", 1], ["R", -1]]) {
		const knee = j.leg[1], ankle = j.leg[2];
		s.egg([
			x * knee[0],
			(knee[1] + ankle[1]) / 2 + .006 * k,
			(knee[2] + ankle[2]) / 2
		], [
			.032 * k * f,
			.05 * k,
			.04 * k * f
		], {
			bone: `shank${side}`,
			k: .03 * k,
			...feather,
			tag: "thigh"
		}, [
			-.6,
			0,
			0
		]);
	}

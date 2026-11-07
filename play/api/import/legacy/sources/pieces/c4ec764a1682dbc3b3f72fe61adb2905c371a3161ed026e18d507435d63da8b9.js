			0,
			.245,
			0
		],
		neck: [[
			0,
			.29,
			.1
		], [
			0,
			.35,
			.135
		]],
		head: [
			0,
			.415,
			.155
		],
		beak: [
			0,
			.405,
			.215
		],
		tail: [
			0,
			.3,
			-.12
		],
		wing: [
			.085,
			.29,
			.07
		],
		leg: [
			[
				.045,
				.22,
				.005
			],
			[
				.05,
				.165,
				.055
			],
			[
				.05,
				.105,
				-.01
			],
			[
				.05,
				.012,
				.012
			],
			[
				.05,
				0,
				.075
			]
		]
	};
	if (kind === "rooster") {
		const up = (p, dy, dz = 0) => [
			p[0],
			p[1] + dy,
			p[2] + dz
		];
		return {
			j: {
				body: up(j.body, .04),
				neck: [up(j.neck[0], .06, .01), up(j.neck[1], .09, .01)],
				head: up(j.head, .12, 0),
				beak: up(j.beak, .12, .005),
				tail: up(j.tail, .05),
				wing: up(j.wing, .045),
				leg: [
					up(j.leg[0], .04),
					up(j.leg[1], .035, .005),
					up(j.leg[2], .02),
					j.leg[3],
					j.leg[4]
				]
			},
			k: 1.15
		};

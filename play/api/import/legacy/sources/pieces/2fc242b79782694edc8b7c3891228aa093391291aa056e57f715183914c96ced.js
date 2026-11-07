		root: [
			0,
			.004 * s * Math.sin(t * 1.7),
			0
		],
		hips: [
			0,
			.03 * Math.sin(t * .4),
			.015 * Math.sin(t * .4)
		],
		spine: [
			.015 * Math.sin(t * 1.7 + .6),
			0,
			0
		],
		chest: [
			.02 * Math.sin(t * 1.7),
			0,
			-.012 * Math.sin(t * .4)
		],
		head: [
			.04 * Math.sin(t * .31),
			.28 * Math.sin(t * .23),
			0
		]
	});
	const walk = (t) => {
		const f = loop(t, 1.05) * Math.PI * 2, sn = Math.sin(f), c = Math.cos(f);
		const lift = (x) => .08 + .7 * Math.max(0, x) ** 2;
		return {
			root: [
				0,
				(.018 * Math.cos(2 * f) - .012) * s,
				0
			],
			hips: [
				0,
				.1 * sn,
				.035 * sn
			],
			chest: [
				.05,
				-.14 * sn,
				0
			],
			head: [
				.03,
				.05 * sn,
				0
			],
			thighL: [
				-.42 * sn,
				0,
				.03
			],
			thighR: [
				.42 * sn,
				0,
				-.03
			],
			shinL: [
				lift(c),
				0,
				0
			],
			shinR: [
				lift(-c),
				0,
				0
			],
			footL: [
				.18 * sn - .1 * Math.max(0, c),
				0,
				0
			],
			footR: [
				-.18 * sn - .1 * Math.max(0, -c),
				0,
				0
			],
			upperArmL: [
				.36 * sn,
				0,
				.08
			],
			upperArmR: [
				-.36 * sn,
				0,
				-.08
			],
			forearmL: [
				-.3 - .15 * Math.max(0, -sn),
				0,
				0
			],
			forearmR: [
				-.3 - .15 * Math.max(0, sn),
				0,
				0
			]
		};
	};
	const wave = (t) => {
		const w = Math.sin(t * 7);
		return {
			...idle(t),
			...poses.wave,
			forearmR: [
				0,
				0,
				-1.4 + .35 * w
			],
			handR: [
				0,
				0,
				.2 * w
			]
		};
	};
	const sitDown = (t) => {
		const u = loop(t, 5);
		const k = u < .4 ? u / .4 : u < .6 ? 1 : 1 - (u - .6) / .4;

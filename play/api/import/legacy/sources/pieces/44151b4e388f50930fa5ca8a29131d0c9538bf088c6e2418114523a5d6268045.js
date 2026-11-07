		sit: {
			...seated,
			spine: [
				.05,
				0,
				0
			],
			chest: [
				.03,
				0,
				0
			],
			head: [
				.08,
				0,
				0
			],
			upperArmL: [
				-.45,
				0,
				-.05
			],
			upperArmR: [
				-.45,
				0,
				.05
			],
			forearmL: [
				-.25,
				-1.2,
				0
			],
			forearmR: [
				-.25,
				1.2,
				0
			],
			handL: [
				-.6,
				0,
				0
			],
			handR: [
				-.6,
				0,
				0
			]
		},
		"sit, elbows on knees": {
			...seated,
			spine: [
				.45,
				0,
				0
			],
			chest: [
				.4,
				0,
				0
			],
			neck: [
				.1,
				0,
				0
			],
			head: [
				.2,
				0,
				0
			],
			upperArmL: [
				-.85,
				0,
				-.03
			],
			upperArmR: [
				-.85,
				0,
				.03
			],
			forearmL: [
				-1.3,
				0,
				-.45
			],
			forearmR: [
				-1.3,
				0,
				.45
			],
			handL: [
				-.3,
				0,
				0
			],
			handR: [
				-.3,
				0,
				0
			]
		},
		fallen: {
			root: [
				0,
				fallHips - .98 * s,
				0
			],
			hips: [
				back,
				0,
				0
			],
			thighL: [
				b - Math.PI / 2 - back,
				0,
				.05
			],
			thighR: [
				b - Math.PI / 2 - back,
				0,
				-.05
			],
			shinL: [
				Math.PI / 2 - b,
				0,
				0
			],
			shinR: [
				Math.PI / 2 - b,
				0,
				0
			],
			chest: [
				.03,
				0,
				0
			],
			head: [
				-.12,
				.18,
				0
			],
			upperArmL: [
				0,
				0,
				1.25
			],
			upperArmR: [
				0,
				0,
				-1.25
			],
			forearmL: [
				0,
				0,
				.35
			],
			forearmR: [
				0,
				0,
				-.35
			]
		},
		lie: {
			root: [
				0,
				-.86 * s,
				0
			],
			hips: [
				-Math.PI / 2,
				0,
				0
			],
			upperArmL: [
				0,
				0,
				.18
			],
			upperArmR: [
				0,
				0,
				-.18
			],
			footL: [
				-.1,
				0,
				0
			],
			footR: [
				-.1,
				0,
				0
			]
		},
		kneel: {
			root: [
				0,
				(.535 - .98) * s,
				0
			],
			shinL: [
				Math.PI / 2,
				0,
				0
			],
			shinR: [
				Math.PI / 2,
				0,
				0
			],
			footL: [
				1.4,
				0,
				0
			],
			footR: [
				1.4,
				0,
				0
			],
			upperArmL: [
				-.2,
				0,
				.08
			],
			upperArmR: [
				-.2,
				0,
				-.08
			],
			forearmL: [
				-.4,
				0,
				0
			],
			forearmR: [
				-.4,
				0,
				0
			]
		},
		"look up": {

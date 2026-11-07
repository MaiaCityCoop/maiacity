				return pose;
			},
			hop: (t, m) => ({
				...base.hop(t, m),
				...still(t),
				tail: [
					.15 * Math.max(0, Math.sin(t * Math.PI * 2 * .3 * k / (.07 * k))),
					0,
					0
				]
			}),
			peck: (t) => ({
				...base.peck(t),
				...still(t)
			}),
			idle: (t) => ({
				...base.idle(t),
				...still(t)
			}),
			sing: (t) => {
				/** @type {Pose} */
				const pose = {
					...still(t),
					body: [
						-.15,
						0,
						0
					],
					root: [
						0,
						-.004 * k,
						0
					]
				};
				const u = frac(t / 4.2 + seed * .1), phrase = u < .55;

				return pose;
			},
			sit: (t) => {
				/** @type {Pose} */
				const pose = {
					...still(t),
					root: [
						0,
						-.014 * k,
						0
					],
					body: [
						.12,
						0,
						0
					],
					tail: [
						-.1,
						0,
						0
					]
				};

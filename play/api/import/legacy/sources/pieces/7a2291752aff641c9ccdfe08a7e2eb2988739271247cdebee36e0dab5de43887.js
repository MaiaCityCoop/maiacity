//#piece ca810ecb3efdfc61ec0b31932ed56c5235d42a6b13ccb92361bc199f4d75b8aa
		const sway = Math.sin(TAU * ph);
		const turn = clamp(mo.turn ?? 0, -1.5, 1.5);
		const pose = {
			root: [
				-g.roll * .15 * pace * sway,
				-g.bob * pace * (.5 + .5 * Math.cos(TAU * 2 * ph)),
				0
			],
			body: [
				g.pitch * pace * Math.sin(TAU * 2 * ph),
				-turn * .1,
				g.roll * pace * sway
			],
			tail: [
				.05 * pace,
				(life.wag ?? .1) * pace * Math.sin(TAU * ph - 1),
				0
			]
		};
		if (life.carry) pose[neck[0]] = [
			-life.carry,
			0,
			0
		];

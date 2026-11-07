			earSwing * .3 * f
		];
		p.earR = [
			earSwing * (-.25 * turn),
			0,
			0
		];
		return p;
	};
//#piece ca810ecb3efdfc61ec0b31932ed56c5235d42a6b13ccb92361bc199f4d75b8aa
		const per = g.bobs ?? 2;
		const bob = bobOf(g, mo, .1, per);
		const sway = Math.sin(TAU * ph);
		const turn = clamp(mo.turn ?? 0, -1.5, 1.5);
		const pose = {
			...living(t, Math.min(1, pace)),
			root: [
				0,
				-g.bob * pace * (.5 + .5 * bob),
				0
			],
			body: [
				g.pitch * pace * Math.sin(TAU * per * ph),
				-turn * .08,
				g.roll * pace * sway - turn * .04
			],
			chest: [
				g.flex * pace * Math.sin(TAU * ph + .5),
				.04 * pace * sway + turn * .05,
				0
			],
			pelvis: [
				-g.flex * pace * Math.sin(TAU * ph + .5),
				-.04 * pace * sway - turn * .03,
				0
			]
		};
		const nod = g.nod * pace * Math.sin(TAU * 2 * ph - .6);
		pose.neck = [
			.08 * pace + nod,
			turn * .15,
			0
		];
		pose.neck2 = [
			.05 * pace - nod * .4,
			turn * .15,
			0
		];
		pose.head = [
			-.1 * pace - nod * .5,
			turn * .1,
			0
		];

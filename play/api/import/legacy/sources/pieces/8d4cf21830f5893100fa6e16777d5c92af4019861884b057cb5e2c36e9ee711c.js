		seed,
		gaits: { hop: {
			speed: .3 * k,
			stride: .07 * k,
			duty: .45,
			feet: {
				L: 0,
				R: 0
			},
			lift: .012 * k,
			bob: .009 * k,
			roll: 0,
			pitch: .06,
			tilt: .35,
			fold: 1.2,
			curl: .5,
			hold: 0
		} },
		wag: .15
	});
	const beakDir = new three.Vector3(J.beak[0] - J.head[0], J.beak[1] - J.head[1], J.beak[2] - J.head[2]).normalize();
	/** the wings folded, the tail at rest with a flick now and then @param {number} t @returns {Pose} */
	const still = (t) => ({
		wingL: [
			0,
			0,
			0
		],
		wingR: [
			0,
			0,
			0
		],
		tail: [
			-.25 * Math.pow(Math.max(0, Math.sin(t * .9 + seed)), 12),
			.04 * wander(t, 2, seed),
			0
		]
	});
	return {
		rig: r,
		clips: {
			fly: (t) => {
				const u = frac(t / .85 + seed * .13), beating = u < .62;
				const beat = Math.sin(t * Math.PI * 2 * 9);
				const open = beating ? 1 : 1 - smooth((u - .62) / .08) + smooth((u - .94) / .06);
				/** @type {Pose} */
				const pose = {
					root: [
						0,
						beating ? .004 * k * Math.max(0, beat) : -.01 * k * smooth((u - .62) / .38),
						0
					],
					body: [
						.55,
						0,
						0
					],
					tail: [
						-.35,
						0,
						0
					],
					wingL: wingTurn("L", open, beating ? .15 + .85 * beat : .1, beating ? .25 - .2 * beat : .6),
					wingR: wingTurn("R", open, beating ? .15 + .85 * beat : .1, beating ? .25 - .2 * beat : .6)
				};

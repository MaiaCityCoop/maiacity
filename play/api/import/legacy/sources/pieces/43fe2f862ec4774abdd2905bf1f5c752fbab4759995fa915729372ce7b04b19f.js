			z,
			y,
			curl: rake > .75 ? .6 : -.15
		} });
		down(pose, .35 + .2 * Math.sin(t * 3), .05);
		return pose;
	};
	/** the neck's length, joint to joint, from its base to the head */
	const neckLen = [...j.neck, j.head].reduce((sum, p, i, all) => i ? sum + Math.hypot(p[0] - all[i - 1][0], p[1] - all[i - 1][1], p[2] - all[i - 1][2]) : 0, 0);
	moves.graze = (t) => {
		const pose = rest(t);
		const nibble = Math.max(0, Math.sin(t * 7)) ** 2;
		const side = .05 * wander(t, 2.6, seed + 6);
		pose.body = [
			.22,

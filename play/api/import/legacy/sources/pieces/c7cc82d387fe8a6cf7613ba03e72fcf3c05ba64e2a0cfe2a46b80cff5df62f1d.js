		return pose;
	};
	moves.hiss = (t) => {
		const pose = rest(t);
		const sway = Math.sin(t * 2.5);
		pose.body = [
			.15,
			0,
			0
		];
		if (life.carry) pose[neck[0]] = [
			.75,
			.1 * sway,
			0
		];
		pose.wingL = [
			0,
			0,
			.55 + .1 * Math.sin(t * 9)
		];
		pose.wingR = [
			0,
			0,
			-.55 - .1 * Math.sin(t * 9)

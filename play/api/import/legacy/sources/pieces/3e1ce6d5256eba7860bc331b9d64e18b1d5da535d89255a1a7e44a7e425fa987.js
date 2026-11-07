		return pose;
	};
	moves.flap = (t) => {
		const pose = rest(t);
		const w = Math.sin(t * 15);
		pose.root = [
			0,
			.012 * Math.max(0, w),
			0
		];
		pose.body = [
			-.35,
			0,
			0
		];
		pose.wingL = [
			.2 * w,
			0,
			.5 + .9 * (.5 + .5 * w)
		];
		pose.wingR = [
			.2 * w,
			0,

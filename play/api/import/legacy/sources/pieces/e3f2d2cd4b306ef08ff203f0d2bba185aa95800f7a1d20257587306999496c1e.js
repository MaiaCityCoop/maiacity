		return pose;
	};
	moves.idle = (t) => {
		const pose = rest(t);
		const k = life.steady ?? 1;
		const look = wander(t, 1.6 * k, seed + 1), up = wander(t, 2.3 * k, seed + 3);

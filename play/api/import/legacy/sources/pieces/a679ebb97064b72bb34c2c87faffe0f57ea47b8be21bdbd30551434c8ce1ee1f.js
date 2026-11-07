	};
	moves.peck = (t) => {
		const pose = rest(t);
		const burst = frac(t / 2.4) < .6;
		const bend = .55 + .4 * (burst ? Math.pow(Math.max(0, Math.sin(t * 11)), 3) : 0);
		pose.body = [
			.35 * (burst ? 1 : .6),

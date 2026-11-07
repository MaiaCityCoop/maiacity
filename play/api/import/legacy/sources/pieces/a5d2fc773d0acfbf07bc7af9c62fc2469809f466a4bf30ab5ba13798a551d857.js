const ease = {
	lin: (t) => t,
	io: (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
	in: (t) => t * t * t,
	out: (t) => 1 - Math.pow(1 - t, 3),
	expo: (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
	back: (t) => {
		return 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
	}
};

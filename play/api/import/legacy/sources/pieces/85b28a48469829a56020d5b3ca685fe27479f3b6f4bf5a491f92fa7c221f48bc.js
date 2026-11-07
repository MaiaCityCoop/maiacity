		if (i) cum.push(cum[i - 1] + dense(ys[i]));
	}
	return (u) => {
		const target = u * cum[n];
		let i = 0;
		while (i < n && cum[i + 1] < target) i++;
		const f = (target - cum[i]) / Math.max(1e-9, cum[i + 1] - cum[i]);
		return ys[i] + (ys[Math.min(n, i + 1)] - ys[i]) * Math.min(1, f);
	};
})())();
/** a point of the head: `u` 0…1 chin to crown, `a` round it (0: its left side, π/2: its front) */

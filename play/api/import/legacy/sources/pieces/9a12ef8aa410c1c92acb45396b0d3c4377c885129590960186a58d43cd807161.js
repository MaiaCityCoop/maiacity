		if (g.hold > 0) {
			const u = frac(2 * ph);
			const span = g.stride / 2 * g.hold * Math.min(1, pace);
			const z = u < g.hold ? span * (.5 - u / g.hold) : span * (-.5 + smooth((u - g.hold) / (1 - g.hold)));

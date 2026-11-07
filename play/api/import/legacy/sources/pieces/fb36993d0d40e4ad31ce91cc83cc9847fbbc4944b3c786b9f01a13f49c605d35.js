		down(pose, burst ? bend : .35, .06 + .01 * wander(t, 1, seed), .02 * wander(t, 1.7, seed + 5));
		return pose;
	};
	moves.scratch = (t) => {
		const pose = rest(t);
		const u = frac(t / 2.2);
		const s = u < .5 ? "L" : "R";
		const k = frac(u * 4);
		const rake = u < .92 ? k : 0;
		const z = .05 - .12 * smooth(rake) + .07 * smooth((rake - .75) / .25);
		const y = rake > .75 ? .03 * Math.sin(Math.PI * (rake - .75) / .25) : 0;
		pose.body = [
			.2,

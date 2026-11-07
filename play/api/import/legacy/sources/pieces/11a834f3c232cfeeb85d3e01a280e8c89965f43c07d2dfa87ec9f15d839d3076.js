	const thigh = .43 * s, knee = .5 * s;
	const slope = (hip) => Math.asin(three.MathUtils.clamp((hip - knee) / thigh, -.9, .9));

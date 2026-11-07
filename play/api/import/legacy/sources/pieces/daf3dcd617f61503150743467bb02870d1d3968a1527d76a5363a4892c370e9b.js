	const ROOT = 1.722, TIP = 1.68, BASE = 1.668;
	if (y <= BASE || y >= ROOT) return 0;
	const p = y >= TIP ? .02 * ((ROOT - y) / .04200000000000004) ** 1.35 : .02 * ((y - BASE) / .01200000000000001) ** .55;
	const wx = .0048 + .0058 * (ROOT - Math.max(y, TIP)) / .04200000000000004;
	return p * Math.exp(-((x / wx) ** 2));
}
/** the lips, part of the surface: the upper, the lower and the line between them */

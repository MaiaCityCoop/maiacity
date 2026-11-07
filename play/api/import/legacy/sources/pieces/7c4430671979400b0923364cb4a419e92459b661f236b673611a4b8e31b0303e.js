	const t = Math.max(0, Math.min(1, (y - at(i)[0]) / (at(i + 1)[0] - at(i)[0])));
	const cr = (k) => {
		const a = at(i - 1)[k], b = at(i)[k], c = at(i + 1)[k], d = at(i + 2)[k];
		return .5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
	};
	return {
		w: Math.max(5e-4, cr(1)),
		zf: cr(2),
		zs: cr(3),
		zb: cr(4),
		n: cr(5)
	};
}

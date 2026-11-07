function along(pts, u) {
	const f = clamp(u) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f));
	return {

const mix = (a, b, t) => tint(a).clone().lerp(tint(b), clamp(t));
/** a point along a path at u (0 … 1) */
function point(pts, u) {
	const f = clamp(u) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f));
	return pts[k].clone().lerp(pts[k + 1], f - k);
}

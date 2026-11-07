//#piece 5bab9eba67b13d9752ddd4cd446cf49af14ab94549952131ce7b5ca0e836c713
/** which way a path runs at u (0 … 1) */
function towards(pts, u) {
	const f = clamp(u) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f));
	return pts[k + 1].clone().sub(pts[k]).normalize();
}

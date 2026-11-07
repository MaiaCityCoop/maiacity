/** the first part of a path, to u (0 … 1) of its points */
function upto(pts, u) {
	const f = clamp(u) * (pts.length - 1), k = Math.floor(f);
	const out = pts.slice(0, k + 1).map((p) => p.clone());
	if (k < pts.length - 1 && f - k > 1e-4) out.push(pts[k].clone().lerp(pts[k + 1], f - k));
	if (out.length < 2) out.push(out[0].clone().add(v3(0, 1e-5, 0)));
	return out;
}
//#piece ba40edf81615360631028fd5cc7061728fd54f35d346c04671c2a15d815b4672

function tracePoly(pts, r, path) {
	const n = pts.length;
	for (let i = 0; i < n; i++) {
		const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
		const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
		const d = Math.min(Array.isArray(r) ? r[i] : r, la / 2, lb / 2);
		const p0 = [p[0] + (a[0] - p[0]) * d / la, p[1] + (a[1] - p[1]) * d / la];
		const p1 = [p[0] + (b[0] - p[0]) * d / lb, p[1] + (b[1] - p[1]) * d / lb];
		if (i === 0) path.moveTo(p0[0], p0[1]);
		else path.lineTo(p0[0], p0[1]);
		if (d > 1e-6) path.quadraticCurveTo(p[0], p[1], p1[0], p1[1]);
	}

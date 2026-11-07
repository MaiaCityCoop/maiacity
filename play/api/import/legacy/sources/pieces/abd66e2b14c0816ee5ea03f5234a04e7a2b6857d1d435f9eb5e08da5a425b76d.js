	const n = Math.min(pts.length - 1, L / step);
	const whole = Math.floor(n);
	const now = pts.slice(0, whole + 1);
	if (whole < pts.length - 1) now.push(pts[whole].clone().lerp(pts[whole + 1], n - whole));
	if (now.length < 2) return;

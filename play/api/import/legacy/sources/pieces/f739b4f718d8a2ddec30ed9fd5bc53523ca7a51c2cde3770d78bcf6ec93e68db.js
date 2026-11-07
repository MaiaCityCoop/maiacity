	const c = Math.cos(a), sn = Math.sin(a);
	const x = w * Math.sign(c) * Math.abs(c) ** (2 / n);
	const S = Math.abs(sn) ** (2 / n);
	return [
		x,
		y,

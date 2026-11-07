	/** an angle (L) along a line, its legs `leg` mm, turned so its outside corner is at `corner` (±x, ±y) */
	const angle = (a, b, sx, sy, leg = 50.8, t = 6.35) => {
		const out = [];
		if (a[0] === b[0] && a[1] === b[1]) {
			out.push(bar([
				a[0] - sx * (leg / 2 - leg / 2),
				a[1] - sy * (leg / 2),
				a[2]
			], [
				b[0],
				b[1] - sy * (leg / 2),
				b[2]

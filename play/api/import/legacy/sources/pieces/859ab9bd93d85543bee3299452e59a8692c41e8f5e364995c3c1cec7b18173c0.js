			out.push(box(a[0] - sx * (leg / 2), a[1] - sy * (t / 2), (a[2] + b[2]) / 2, leg, t, b[2] - a[2], 1));
		} else out.push(bar(a, b, t, leg, 1), bar([
			a[0],
			a[1],
			a[2] - leg / 2 + t / 2
		], [
			b[0],
			b[1],
			b[2] - leg / 2 + t / 2
		], leg, t, 1));
		return out;
	};
	const LEN = len;

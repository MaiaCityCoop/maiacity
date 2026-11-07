	const madeAt = (b, s) => b.order === 0 ? leaderAt(s / vigour) : b.born + s / b.rate;
	const starts = /* @__PURE__ */ new Map([[trunk, v3(0, 0, 0)]]);
	const point = (b, s) => {
		const p = starts.get(b).clone();
		let left = s;
		for (const d of b.dirs) {
			const t = Math.min(left, b.step);
			p.addScaledVector(d, t);
			left -= t;
			if (left <= 0) break;
		}
		return p;
	};
	const dirAt = (b, s) => b.dirs[Math.min(b.dirs.length - 1, Math.floor(s / b.step))];

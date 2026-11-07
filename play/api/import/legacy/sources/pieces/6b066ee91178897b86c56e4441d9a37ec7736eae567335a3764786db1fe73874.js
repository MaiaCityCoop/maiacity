		const pts = [from.clone()];
		let left = length;
		for (let i = 0; i < b.dirs.length && left > 1e-5; i++) {
			const t = Math.min(left, b.step);
			pts.push(pts[i].clone().addScaledVector(b.dirs[i], t));
			left -= t;
		}
		const L = length;
		const made = (u) => b.order === 0 ? leaderAt(u * L / (b.full / LEADER[LEADER.length - 1][1])) : b.born + u * L / b.rate;

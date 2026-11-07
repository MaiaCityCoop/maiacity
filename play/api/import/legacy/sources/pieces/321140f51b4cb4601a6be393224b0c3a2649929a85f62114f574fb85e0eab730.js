	const way = (r, d0, n, up, droop, wander) => {
		const d = d0.clone().normalize();
		const dirs = [];
		for (let i = 0; i < n; i++) {
			d.y += up * (1 - i / n) - droop * (i / n);
			d.x += (r() * 2 - 1) * wander;
			d.z += (r() * 2 - 1) * wander;
			dirs.push(d.normalize().clone());
		}
		return dirs;
	};

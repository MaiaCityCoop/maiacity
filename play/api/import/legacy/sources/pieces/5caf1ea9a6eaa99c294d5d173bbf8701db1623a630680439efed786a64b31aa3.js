	const ws0 = prof.pts[kWs], ws1 = prof.pts[kWs + 1];
	const aLine = (d, y) => {
		const dz = ws1[0] - ws0[0], dy = ws1[1] - ws0[1], L = Math.hypot(dz, dy);
		return ws0[0] - dy / L * d + (y - (ws0[1] + dz / L * d)) * dz / dy;
	};

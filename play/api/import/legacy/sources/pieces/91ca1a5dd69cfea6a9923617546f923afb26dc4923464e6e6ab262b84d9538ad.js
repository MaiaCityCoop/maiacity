	};
	/** how far from p along d to the crown's edge */
	const edge = (p, d) => {
		for (const ry of [env.up, env.down]) {
			const ox = (p.x - env.c.x) / env.rx, oy = (p.y - env.c.y) / ry, oz = (p.z - env.c.z) / env.rz;
			const dx = d.x / env.rx, dy = d.y / ry, dz = d.z / env.rz;
			const A = dx * dx + dy * dy + dz * dz, B = 2 * (ox * dx + oy * dy + oz * dz), C = ox * ox + oy * oy + oz * oz - 1;
			const disc = B * B - 4 * A * C;
			if (disc < 0) return .05;
			const t = (-B + Math.sqrt(disc)) / (2 * A);
			const y = p.y + d.y * t;
			if (ry === env.up === y >= env.c.y) return Math.max(.05, t);
		}
		return .05;

function limb(bag, o) {
	const r = chance(o.seed, "limb", ...o.key);
	const grown = clamp(o.grown);
	if (grown <= .003) return;
	const order = o.order ?? 0, depth = o.depth ?? 3;
	const up = o.up ?? .08, wander = o.wander ?? .12;
	const steps = order ? 6 : 10;
	const step = o.length / steps;
	/** the whole path, drawn in full every time */
	const path = [o.from.clone()];
	const dir = o.dir.clone().normalize();
	for (let i = 0; i < steps; i++) {
		dir.y += up;
		dir.x += (r() * 2 - 1) * wander;
		dir.z += (r() * 2 - 1) * wander;
		dir.normalize();
		path.push(path[i].clone().addScaledVector(dir, step));
	}

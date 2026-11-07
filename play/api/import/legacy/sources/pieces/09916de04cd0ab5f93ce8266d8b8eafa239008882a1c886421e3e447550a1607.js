function root(bag, o) {
	if (!DETAIL.roots) return;
	const { seed, key, from, length, radius, young, old } = o;
	const grown = clamp(o.grown);
	if (grown <= .002 || length * grown < 1e-4) return;
	const r = chance(seed, "root", ...key);
	const down = o.down ?? .15, wander = o.wander ?? .35, order = o.order ?? 0, depth = o.depth ?? 2;
	const steps = Math.max(4, Math.min(24, Math.round(10 + length * 40)));
	const step = length / steps;
	/** the whole path, drawn in full every time */
	const path = [from.clone()];
	const dir = o.dir.clone().normalize();
	for (let i = 0; i < steps; i++) {
		dir.y -= down;
		dir.x += (r() * 2 - 1) * wander;
		dir.y += (r() * 2 - 1) * wander * .5;
		dir.z += (r() * 2 - 1) * wander;
		if (dir.y > -.05 && path[i].y > -.004) dir.y = -.25;
		dir.normalize();
		const next = path[i].clone().addScaledVector(dir, step);
		if (o.floor !== void 0 && next.y < o.floor) next.y = o.floor + (next.y - o.floor) * .1;
		path.push(next);
	}

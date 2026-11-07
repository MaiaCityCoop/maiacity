function noduled(bag, o) {
	const r = chance(o.seed, "noduled", ...o.key);
	const grown = clamp(o.grown);
	if (grown <= .01) return;
	const steps = 12;
	const pts = [o.from.clone()];
	const d = o.dir.clone().normalize();
	for (let i = 0; i < steps; i++) {
		d.y -= .06;
		d.x += (r() - .5) * .4;
		d.z += (r() - .5) * .4;
		if (d.y > -.2) d.y = -.2;
		d.normalize();
		pts.push(pts[i].clone().addScaledVector(d, o.length * grown / steps));
	}

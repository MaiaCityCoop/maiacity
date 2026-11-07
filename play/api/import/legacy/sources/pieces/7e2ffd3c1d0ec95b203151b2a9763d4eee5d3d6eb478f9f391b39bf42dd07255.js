function arch(at, dir, length, bow, n = 6) {
	const pts = [at.clone()];
	const d = dir.clone().normalize();
	for (let k = 0; k < n; k++) {
		d.y -= bow / n;
		d.normalize();
		pts.push(pts[k].clone().addScaledVector(d, length / n));
	}

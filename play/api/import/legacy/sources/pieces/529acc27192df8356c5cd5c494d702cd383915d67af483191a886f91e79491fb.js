function sprout(bag, o) {
	const r = chance(o.seed, "sprout");
	const bearing = Math.atan2(-.9, 1.25) + (r() * 2 - 1) * .4;
	const across = v3(Math.cos(bearing), 0, Math.sin(bearing));
	const axis = new three.Vector3().crossVectors(across, v3(0, 1, 0)).normalize();
	const lean = (r() * 2 - 1) * .12;
	const steps = 14;
	/** @type {THREE.Vector3[]} */
	const path = [o.at.clone()];
	let dir = v3(0, 1, 0).addScaledVector(across, lean).normalize();
	const step = Math.max(1e-6, o.stem / steps);
	for (let i = 0; i < steps; i++) {
		const bend = (i + .5) / steps > .62 ? o.hook * Math.PI * .95 / (steps * .38) : 0;
		dir = dir.clone().applyAxisAngle(axis, -bend).normalize();
		path.push(path[i].clone().addScaledVector(dir, step));
	}

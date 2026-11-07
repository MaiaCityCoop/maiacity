	bag.add("body", bead(v3(0, .0012, 0).applyMatrix4(m), v3(.0034, .0022, .0034).multiplyScalar(size), fall > .5 ? "#bfc35a" : kind.heart, 8));
	const stamens = kind.stamens ?? 20;
	for (let k = 0; k < stamens; k++) {
		const a = k / stamens * Math.PI * 2;
		bag.add("body", bead(v3(Math.cos(a) * .0042, .0018, Math.sin(a) * .0042).applyMatrix4(m), v3(6e-4, 6e-4, 6e-4).multiplyScalar(size), fall > .5 ? "#9c7a3a" : kind.stamenColour ?? "#e9b52a", 2));
	}

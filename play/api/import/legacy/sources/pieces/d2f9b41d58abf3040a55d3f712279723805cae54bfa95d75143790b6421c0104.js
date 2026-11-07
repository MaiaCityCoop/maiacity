	const coatAt = o.keepCoat ? o.at : top;
	if (o.shed < 1) {
		const s = o.size.clone().multiplyScalar(1 - .25 * o.shed);
		const turn = new three.Quaternion().setFromUnitVectors(v3(1, 0, 0), o.keepCoat || o.stem < o.radius ? across : tip);
		const lift = o.keepCoat ? v3(0, 0, 0) : tip.clone().multiplyScalar(o.size.x * .6);

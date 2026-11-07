	const leave = (d, tilt, turn) => {
		const side = new three.Vector3().crossVectors(d, Math.abs(d.y) > .95 ? v3(1, 0, 0) : UP).normalize().applyAxisAngle(d, turn);
		return d.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(side, Math.sin(tilt)).normalize();
	};

		return pose;
	};
	/** the head down to the ground ahead of the feet, `k` of the way (0: up as it stands) */
	const down = (pose, k, ahead, side = 0) => {
		const look = new three.Vector3(0, -.85, .5).normalize().lerp(beakDir, 1 - k).normalize();
		const low = new three.Vector3(side, .006, b.toe.L[2] + ahead).clone().addScaledVector(look, -headLen);

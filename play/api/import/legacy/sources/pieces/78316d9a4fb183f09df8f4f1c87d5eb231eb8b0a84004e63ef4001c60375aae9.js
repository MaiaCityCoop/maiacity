	});
	moves.idle = (t) => {
		const pose = stand(t);
		const look = wander(t, 4.2, seed + 1), up = wander(t, 6.1, seed + 2);
		pose.neck = [
			-.08 + .1 * up,
			.25 * look,
			0
		];
		pose.neck2 = [

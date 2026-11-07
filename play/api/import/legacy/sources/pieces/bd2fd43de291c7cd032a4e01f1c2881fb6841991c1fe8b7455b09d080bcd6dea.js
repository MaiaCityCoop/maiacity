	moves.alert = (t) => {
		const pose = stand(t);
		const look = wander(t, 2.2, seed + 4);
		pose.neck = [
			-.25,
			.15 * look,
			0
		];
		pose.neck2 = [
			-.15,
			.15 * look,
			0
		];
		pose.head = [
			.25,
			.3 * look,
			0
		];
		pose.earL = [

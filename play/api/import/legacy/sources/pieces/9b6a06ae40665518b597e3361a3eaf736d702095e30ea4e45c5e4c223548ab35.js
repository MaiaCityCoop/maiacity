	const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
	const headLen = len(j.head, j.muzzle);
	const neckLen = len(j.neck[0], j.neck[1]) + len(j.neck[1], j.head);
	moves.graze = (t) => {
		const pose = stand(t);
		const shift = wander(t, 5, seed + 5);
		pose.root = [
			pose.root[0],
			pose.root[1] - .008,
			0
		];
		pose.body = [
			.09,
			.04 * shift,
			0
		];
		pose.chest = [
			.06,
			0,
			0
		];
		const bite = Math.max(0, Math.sin(t * 5.5)) ** 2;
		const look = new three.Vector3(.12 * shift, -1, .7).normalize();
		const base = q.sk.joint(pose, "neck");
		const pollY = .014 + .015 * bite - look.y * headLen;
		const drop = base.y - pollY;
		const ahead = Math.sqrt(Math.max(.05 ** 2, (.96 * neckLen) ** 2 - drop * drop));

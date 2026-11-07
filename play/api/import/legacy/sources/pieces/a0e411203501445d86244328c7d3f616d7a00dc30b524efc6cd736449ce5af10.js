	const { sk, j, neck } = b;
	const n = neck.length;
	reach(sk, pose, neck[n - 2], neck[n - 1], j.head, target);
	aim(sk, pose, "head", j.beak, look);

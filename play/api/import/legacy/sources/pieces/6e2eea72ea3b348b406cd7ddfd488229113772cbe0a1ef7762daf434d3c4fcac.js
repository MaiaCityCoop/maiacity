	const { j, neck } = b;
	const seed = life.seed ?? 1;
	const beakDir = new three.Vector3(j.beak[0] - j.head[0], j.beak[1] - j.head[1], j.beak[2] - j.head[2]).normalize();
	const headLen = Math.hypot(j.beak[0] - j.head[0], j.beak[1] - j.head[1], j.beak[2] - j.head[2]);
	const rest = (t) => ({
		tail: [
			.04 * Math.sin(t * 1.3 + seed),
			.06 * wander(t, 2.5, seed + 4),
			0
		],
		root: [

	const top = LEADER[LEADER.length - 1][1] * vigour;
	/** @type {Branch} */
	const trunk = {
		key: ["trunk"],
		order: 0,
		at: 0,
		dirs: [],
		step: top / 24,
		full: top,

function leaderAt(h) {
	for (let i = 1; i < LEADER.length; i++) if (h <= LEADER[i][1]) return LEADER[i - 1][0] + (LEADER[i][0] - LEADER[i - 1][0]) * ((h - LEADER[i - 1][1]) / (LEADER[i][1] - LEADER[i - 1][1]));
	return LEADER[LEADER.length - 1][0];

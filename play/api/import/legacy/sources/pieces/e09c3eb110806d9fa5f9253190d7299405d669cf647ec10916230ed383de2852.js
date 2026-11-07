			0,
			.25 * look,
			0
		];
		pose.head = [
			.05 - .1 * up,
			.35 * look,
			.08 * look
		];
		if (j.jaw) pose.jaw = [
			.04 * Math.max(0, Math.sin(t * 7)),
			.03 * Math.sin(t * 3.5),
			0
		];

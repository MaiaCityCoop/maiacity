		];
		for (const [z0, z1] of walls) {
			const len = z1 - z0, mid = (z0 + z1) / 2;
			add(block(.05, .5100000000000001, len, [
				x,
				(1.63 - .04) / 2,
				mid

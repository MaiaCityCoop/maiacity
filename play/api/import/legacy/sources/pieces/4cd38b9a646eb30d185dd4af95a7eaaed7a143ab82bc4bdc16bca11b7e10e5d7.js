		for (const [back, face] of [[1.93, -1], [.06, 1]]) {
			const bz = sz * back, f = sz * face;
			for (let i = 0; i < 5; i++) {
				const x = -.9 + i * .45;
				add(block(.42, .1, .44, [
					x,
					1,
					bz + f * .27

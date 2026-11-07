		const screen = new three.Shape();
		screen.absarc(0, 0, .1, 0, Math.PI * 2, false);
		for (let k = 0; k < 24; k++) {
			const a = k / 24 * Math.PI * 2;
			screen.holes.push(ring(.065 * Math.cos(a), .065 * Math.sin(a), .012));
			if (k % 2 === 0) screen.holes.push(ring(.035 * Math.cos(a + .13), .035 * Math.sin(a + .13), .009));
		}

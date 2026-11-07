		for (const sx of [-1, 1]) {
			put(cyl([
				sx * 150,
				-Lh,
				58
			], [
				sx * 150,
				-Lh - 1.5,
				58
			], 11, 16), BLACK$1);
			hole(sx * 150, 58, 5.5, STEEL$1);
		}
	});

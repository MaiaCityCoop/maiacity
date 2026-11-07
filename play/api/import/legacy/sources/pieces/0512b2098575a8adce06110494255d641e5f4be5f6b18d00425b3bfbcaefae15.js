		what: "Two 4×4 steel tubes front to back under the cube: the “strong structural frame” of 7s that the engine, pump and tanks bolt to, and that takes the forks, the lifting pins or another cube stacked on it.",
		specs: [
			["Stock", "4\" × 4\" square tube (101.6 mm)"],
			["Length", "660 mm [inferred: the 27\" cube]"],
			["Version", "7s / v15.6 (VII: 2×2 angle)"]
		]
	}, base, (put) => {
		for (const sx of [-1, 1]) put(box(sx * (W - 50.8), 0, B / 2, 101.6, LEN, 101.6, 6), FRAME);

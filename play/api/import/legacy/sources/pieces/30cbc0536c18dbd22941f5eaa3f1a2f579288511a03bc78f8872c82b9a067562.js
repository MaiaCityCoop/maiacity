		what: "Where the panels plug in: a pair of MC4 connectors, plus and minus, and the DC isolator that cuts them off.",
		specs: [["Connectors", "MC4"], ["Isolator", "1,000 V DC"]]
	}, base, (put) => {
		put(cyl([
			200,
			-Lh + 30,
			B + 80
		], [
			200,
			-Lh - 10,
			B + 80
		], 12, 10), RED$2);
		put(cyl([
			240,
			-Lh + 30,
			B + 80
		], [
			240,
			-Lh - 10,
			B + 80
		], 12, 10), BLACK$2);

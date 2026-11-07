			-.035,
			0,
			0
		], [
			-.005,
			0,
			0
		], .025, 28), M.black));
		const shroudRing = new three.Shape();
		shroudRing.absarc(0, 0, .088, 0, Math.PI * 2, false);
		shroudRing.holes.push(ring(0, 0, .081));

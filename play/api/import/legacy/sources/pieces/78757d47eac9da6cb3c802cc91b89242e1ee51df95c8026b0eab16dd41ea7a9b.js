			0,
			.445,
			CRANK.z
		], [
			0,
			.47,
			CRANK.z
		], .022, 28), M.castAl)];
		for (const sx of [-1, 1]) {
			const port = C.clone().addScaledVector(axis(sx), ENGINE.deck + .02).add(new three.Vector3(-sx * .05, 0, -.03));

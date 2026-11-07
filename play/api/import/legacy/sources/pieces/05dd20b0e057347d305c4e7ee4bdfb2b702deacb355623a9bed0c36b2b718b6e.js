			what: "Four corner posts of 1/4\" × 2\" × 2\" angle make the cage: they guard the engine, carry the rails and give hand-holds to lift it by.",
			specs: [["Stock", "1/4\" × 2\" × 2\" angle (6.35 × 50.8 × 50.8 mm)"], ["Envelope", "27\" (686 mm) cube"]]
		}, [m(GEO.merge([
			post(-1, -1),
			post(-1, 1),
			post(1, -1),
			post(1, 1)
		]), M.red)], { explode: [
			0,
			0,
			0
		] });
		/** a top rail along x or z, its outside corner up and out */
		const rail = (ax, s) => {
			const y = H - t / 2;

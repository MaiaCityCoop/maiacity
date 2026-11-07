			0,
			-.1,
			0
		] });
		const leg = .0508, t = .00635;
		/** an upright angle at a corner, its outside corner outwards */
		const post = (sx, sz) => {
			const h = H - B, cx = sx * (X - t / 2), cz = sz * (Z - t / 2);

		what: "Four corner posts and four top rails of 1/4\" × 2\" × 2\" angle make the cube’s cage: they guard the engine, carry the fuel tank and give hand-holds to lift it by. OSE’s frame page cuts its members 29\", 27\" and 24\" long.",
		specs: [
			["Stock", "1/4\" × 2\" × 2\" angle (6.35 × 50.8 × 50.8 mm)"],
			["Members", "29\", 27\" and 24\" pieces"],
			["Envelope", "27\" (686 mm) cube"]
		]
	}, base, (put) => {
		for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const g of angle([
			sx * (W - 3),
			sy * (Lh - 3),
			B
		], [
			sx * (W - 3),
			sy * (Lh - 3),
			H
		], sx, sy)) put(g, FRAME);
		for (const sx of [-1, 1]) for (const g of angle([
			sx * (W - 3),
			-Lh,
			H - 3
		], [
			sx * (W - 3),
			Lh,
			H - 3
		], sx, 0)) put(g, FRAME);
		for (const sy of [-1, 1]) for (const g of angle([
			-W,
			sy * (Lh - 3),
			H - 3
		], [
			W,
			sy * (Lh - 3),
			H - 3
		], 0, sy)) put(g, FRAME);
	});
	part("frame", {
		id: "quick-attach",
		label: "Power Cube quick-attach plate",

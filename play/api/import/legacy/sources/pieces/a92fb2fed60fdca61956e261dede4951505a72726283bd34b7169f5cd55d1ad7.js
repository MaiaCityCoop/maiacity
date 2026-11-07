	const bag = new Bag();
	const r = chance(seed, "plant");
	const vigour = about(r, 1, .1);
	const s = sprout(bag, {
		seed,
		at: SEED_AT,

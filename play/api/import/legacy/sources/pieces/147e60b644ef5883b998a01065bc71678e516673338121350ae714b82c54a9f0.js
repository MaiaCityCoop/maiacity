	return (g, seed) => {
		const bag = new Bag();
		const vigour = about(chance(seed, "plant"), 1, .08);
		const at = v3(0, -spec.seed.depth, 0);
		const s = sprout(bag, {
			seed,
			at,

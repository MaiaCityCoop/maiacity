		bag.add("body", tube([
			site.at,
			start,
			place.at
		], (u) => .002 + .004 * set * (F.width / .05) * (1 - .4 * u), () => "#6f6a3a", 4));
		fruitOf$1(bag, F, {
			seed,
			key: [...site.key, k],
			at: place.at,
			dir: place.dir,
			L,
			W,
			ripe,
			set

		for (const site of sites) flowering(bag, spec, seed, g, site, space, vigour);
		for (const sh of shoots) leaves(bag, spec, seed, g, sh);
		return bag.build();
	};
}
/** a place along a path, u 0 … 1 */

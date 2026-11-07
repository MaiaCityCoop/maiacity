		});
	}
	/** @type {import('./tree.js').Limb[]} */
	const limbs = [];
	limb(bag, {
		seed,
		key: ["stem"],
		from: s.top.clone(),
		dir: v3(0, 1, 0),

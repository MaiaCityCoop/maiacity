		spring: true
	},
	bear(ctx) {
		const { bag, g, seed } = ctx;
		for (const sh of ctx.shoots) {
			if (sh.gen !== ctx.gens - 1) continue;
			const cr = chance(seed, "catkins", ...sh.key);

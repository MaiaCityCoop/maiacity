			size: spec.seed.size,
			coat: spec.seed.coat,
			coatShade: spec.seed.shade,
			stem: table(g, [
				[0, 0],
				[.3, spec.seed.depth * .1 + .001],
				[1, spec.seed.depth + .03],
				[2, spec.seed.depth + .07],
				[9, spec.seed.depth + .07]
			]),
			hook: table(g, [
				[0, 1],
				[1, 1],
				[1.6, 0]
			]),

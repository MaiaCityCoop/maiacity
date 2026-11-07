				return kit.explode(built.centre, k, pose(t, true));
			},
			assemble: (t) => {
				const n = steps.length, period = n * 2.6 + 3;
				const u = Math.min(1, loop(t, period) * (period / (n * 2.6)));
				return kit.assemble(built.centre, u, n, pose(t, u >= 1));
			}
		},
		poses: {
			off: pose(0, false),
			exploded: kit.explode(built.centre, 1, pose(0, false))
		},
		first: "run",
		catalog: {
			assemblies,
			parts: built.catalogParts,
			steps,
			sources

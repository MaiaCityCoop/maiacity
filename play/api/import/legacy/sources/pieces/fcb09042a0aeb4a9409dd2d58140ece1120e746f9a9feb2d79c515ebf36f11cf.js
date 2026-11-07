			leaf: spec.cotyledon ? {
				length: spec.cotyledon.length,
				width: spec.cotyledon.width,
				shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .7),
				color: spec.cotyledon.colour,
				vein: "#a6c47e"
			} : {
				length: .001,
				width: 5e-4,
				shape: () => 1,
				color: "#7a8a4a",
				vein: "#7a8a4a"
			},
			open: spec.hypogeal ? 0 : span(g, 1.1, 2),
			shed: spec.hypogeal ? span(g, 3.5, 4.5) : span(g, 1, 1.6),
			wither: spec.hypogeal ? 1 : span(g, 3, 3.8),
			keepCoat: spec.hypogeal

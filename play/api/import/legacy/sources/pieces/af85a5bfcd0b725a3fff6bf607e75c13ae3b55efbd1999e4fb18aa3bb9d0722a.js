			color: (p) => p.y < .985 ? k.trousers : p.y < 1.012 ? k.belt : k.shirt,
			chain: {
				bones: [
					"hips",
					"spine",
					"chest",
					"neck"
				],
				soft: .07

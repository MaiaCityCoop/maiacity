			arm: 1,
			drive: "The road; steered by the knuckle",
			tag: tagWheel("front left")
		}),
		fr: wheelCorner(kit, {
			...wheelOpts,
			id: "fr",
			label: "front right",
			at: [
				-axle.x,
				yw,
				axle.front
			],
			side: -1,
			brake: "disc",

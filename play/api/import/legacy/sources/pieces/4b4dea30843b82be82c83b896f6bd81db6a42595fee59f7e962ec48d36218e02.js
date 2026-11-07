			[
				.155,
				.28,
				-.255
			],
			[
				.2,
				.25,
				-.29
			],
			[
				.23,
				.2516,
				-.322
			]
		], .0125), M.hose)], { explode: [
			.14,
			-.04,
			-.2
		] });
		const gauge = new three.Group();
		const ga = [
			.17,
			.48,
			-.336
		];
		gauge.position.set(...ga);
		gauge.rotation.y = Math.PI;

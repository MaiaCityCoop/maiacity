			what: "A plate across the tank between the return and the suction, and a brass mesh strainer on the suction outlet at its bottom: the pump never draws air or grit.",
			specs: [["Strainer", "100 mesh (149 µm) [inferred]"]]
		}, [baffle, ...strainer], { explode: [
			0,
			.25,
			-.12
		] });
		const suctionPts = [
			[
				-.2,
				rv.y0 - .002,
				-.25
			],
			[
				-.2,
				.3,
				-.25
			],
			[
				-.15,
				.27,
				-.255
			],
			[
				-.09,
				CRANK.y + cd / 2,
				-.258
			],
			[
				-.066,
				CRANK.y + cd / 2,
				z0 - .01 - bw / 2
			]
		];
		part({
			id: "suction-hose",
			label: "Suction hose",

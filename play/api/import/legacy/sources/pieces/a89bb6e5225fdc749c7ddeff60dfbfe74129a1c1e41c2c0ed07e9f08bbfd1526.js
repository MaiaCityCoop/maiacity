			what: "How the cube is coupled to a machine: plates across its back with a 4×8 receiver tube between them, so it slides onto the machine’s mount and is pinned, and comes off again in minutes for the next machine.",
			specs: [
				["Plates", "2 × 3/8\" × 4\" × 27\""],
				["Receiver tube", "4\" × 8\" × 1/4\""],
				["Pins", "2 × 1\" [inferred]"]
			]
		}, qa, { explode: [
			0,
			0,
			-.16
		] });
		const eye = new three.TorusGeometry(.026, .0075, 12, 28);
		part({
			id: "lift-eyes",
			label: "Lifting eyes",

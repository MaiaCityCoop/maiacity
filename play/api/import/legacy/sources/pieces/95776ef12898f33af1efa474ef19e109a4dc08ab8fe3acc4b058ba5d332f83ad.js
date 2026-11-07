			what: "One forged crank for both cylinders: their two rods share one pin, the counterweights balance them, its front end carries the flywheel and its back end drives the pump.",
			moves: "Turns at engine speed (shown slowed 40 times).",
			drive: "The pistons, through the rods; it drives the pump",
			specs: [
				["Throw", `${fmt(r * 1e3, 1)} mm (stroke 73.4 mm)`],
				["Main journals", "Ø 35 mm [inferred]"],
				["Speed", "3,600 rpm governed"]
			]
		}, [crank], { explode: [
			0,
			-.02,
			0
		] });
		moving.crank = crank;
		for (const [side, sx] of banks) {
			const d = axis(sx);

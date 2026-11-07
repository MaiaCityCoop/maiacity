			what: "One bank of the 90° V-twin: a finned air-cooled cylinder and its overhead-valve head. The flywheel’s fan pushes air through the shroud and over these fins.",
			moves: "Its piston runs up and down inside, twice per two turns of the crank.",
			drive: "Burning petrol and air",
			specs: [["Layout", "90° V-twin, OHV"], ["Cooling", "Air, by the flywheel fan"]]
		}, base, (put) => {
			const d = [sx * Math.SQRT1_2, Math.SQRT1_2];
			const at = (k) => [
				d[0] * k,
				30,
				235 + d[1] * k
			];

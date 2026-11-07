			what: "A fixed-displacement gear pump: two gears mesh and carry oil from the suction port round to the pressure port — about a cubic inch every turn, 15 gallons a minute at engine speed. This flow is everything the machine it is coupled to can do.",
			moves: "Its gears turn with the engine.",
			drive: "The engine, through the coupling",
			specs: [
				["Displacement", "~1 in³/rev (v4: 0.976 in³, 16.0 cm³)"],
				["Flow", "15.2 gpm (57.5 L/min) at 3,600 rpm"],
				["Pressure", "3,000 psi (207 bar) max"],
				["Shaft", "3/4\" spline"],
				["Earlier", "Hydreco pump (VI)"]
			]
		}, base, (put) => {
			put(box(0, -275, 235, 105, 100, 120, 10), "#3b4a5a");
			put(cyl([
				-52,
				-275,
				235
			], [
				-80,
				-275,
				235

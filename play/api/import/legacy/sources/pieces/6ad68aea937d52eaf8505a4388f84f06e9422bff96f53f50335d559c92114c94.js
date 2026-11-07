			what: "The flywheel at the crank’s front: its weight smooths the twin’s firing, its magnets fire the plugs and charge the battery, its vanes are the cooling fan.",
			moves: "Turns with the crankshaft (shown slowed: really 60 turns a second).",
			drive: "The crankshaft",
			specs: [["Speed", "3,600 rpm"], ["Charging", "Flywheel alternator"]]
		}, joints.flywheel, (put) => {
			put(cyl([
				0,
				258,
				235
			], [
				0,
				272,
				235

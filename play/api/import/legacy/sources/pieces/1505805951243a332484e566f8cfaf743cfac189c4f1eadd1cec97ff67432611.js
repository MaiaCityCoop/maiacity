				what: "An aluminium piston with two compression rings and an oil ring, on a hardened pin: the burning charge pushes it down 405 cm³ a stroke.",
				moves: "Up and down its cylinder, twice a turn of the crank for its four strokes.",
				drive: "The burning charge; it turns the crank through its rod",
				specs: [["Diameter", "83.8 mm"], ["Stroke", "73.4 mm"]]
			}, [piston], { explode: d.clone().multiplyScalar(.3).toArray() }, pz);
			part({
				id: `rod-${side}`,
				label: `Connecting rod, ${side}`,

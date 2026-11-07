		leaf: {
			length: 5e-4,
			width: 3e-4,
			shape: () => 1,
			color: "#7a8a4a",
			vein: "#7a8a4a"
		},
		open: 0,
		shed: span(g, 4, 5.5),
		wither: 1,
		keepCoat: true
	});
	legumeRoots(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(0, -1, 0),

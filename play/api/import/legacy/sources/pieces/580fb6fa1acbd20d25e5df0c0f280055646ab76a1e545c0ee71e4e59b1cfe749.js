		leaf: {
			length: .001,
			width: 5e-4,
			shape: () => 1,
			color: "#7a8a4a",
			vein: "#7a8a4a"
		},
		open: 0,
		shed: span(g, 3.5, 4.5),
		wither: 1,
		keepCoat: true
	});
	root(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(.02, -1, .01),

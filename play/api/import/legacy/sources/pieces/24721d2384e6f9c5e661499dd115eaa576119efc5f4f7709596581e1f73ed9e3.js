			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .6),
			color: "#5a9a3c",
			vein: "#9cc46e"
		},
		open: span(g, 1.1, 2),
		shed: span(g, 1, 1.6),
		wither: span(g, 3, 3.6)
	});
	root(bag, {
		seed,
		key: ["tap"],
		from: at.clone(),
		dir: v3(0, -1, 0),

		for (const sx of [-1, 1]) put(box(sx * (Wh - 30), 0, -1, 20, LEN - 20, 3), DARK);
	});
	part("front", {
		label: "Front panel",
		what: "The pack’s face: it closes the tray’s front and carries the handles, the terminals and the state-of-charge lights.",
		specs: [["Size", "460 × 125 mm"]]
	}, (put) => {
		put(box(0, Lh - 3, H / 2, W, 6, H, 2), DARK);

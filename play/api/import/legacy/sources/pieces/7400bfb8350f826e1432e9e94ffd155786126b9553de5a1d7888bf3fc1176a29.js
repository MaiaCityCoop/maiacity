	});
	part("latches", {
		label: "Latches",
		count: 4,
		what: "Four over-centre latches, two a side: flip them and the lid lifts. No tool opens the pack.",
		specs: [["Type", "Over-centre, stainless"]]
	}, (put) => {
		for (const sx of [-1, 1]) for (const y of [-120, 120]) put(box(sx * (Wh + 3), y, H - 18, 6, 40, 30, 2), STEEL);

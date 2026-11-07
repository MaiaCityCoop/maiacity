		});
		part("latches", {
			label: "Latches",
			count: 4,
			what: "Four flush over-centre latches, two a side: flip them and the lid lifts. No tool opens the pack.",
			specs: [["Type", "Over-centre, flush"]]
		}, (put) => {
			for (const sx of [-1, 1]) for (const y of [-120, 120]) put(box(sx * (Wh + 1.5), y, H - 16, 4, 36, 22, 1.5), FACE);

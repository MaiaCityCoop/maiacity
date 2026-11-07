		put(slab(W, LEN, RC, 110, 2, 3), SEAM);
		for (const sx of [-1, 1]) put(box(sx * (Wh - 60), 0, -1, 20, LEN - 80, 3), DARK$1);
	});
	if (v < 6) part("front", {
		label: "Front panel",
		what: "The pack’s face, set into the case’s front: it carries the handles, the charge strip along its top" + (v < 3 ? " and the terminals." : "; its power and data leave by the plug in its back."),
		specs: [["Size", "380 × 80 mm"]]
	}, (put) => {
		put(box(0, Lh + 1, 62, 380, 3, 80, 1), FACE);
	});
	part("charge", {
		label: "Charge strip",
		what: "A slim LED strip along the top of its face, under the lid’s seam: ten segments light up with the pack’s state of charge.",
		specs: [
			["Length", "380 mm, 10 segments"],
			["Shows", "State of charge, 10 % a segment"],
			["Fed by", "The BMS"]
		]
	}, (put) => {
		put(box(0, Lh + .5, 104, 386, 2, 7, 1), BLACK$1);

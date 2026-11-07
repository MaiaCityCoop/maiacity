		for (let k = 0; k < 4; k++) hole(-12 + k * 8, 72, 1.6, CAP$1);
//#piece 56c91e5b186df640fa37aee9d012dcb3b62be16ca5b3045836b87e902231efa2
	else part("terminals", {
		label: "Back plug",
		what: "The pack’s plus, minus and data in one blind-mate plug in its back, between two guide pins: slide the pack in and it plugs itself into the cube’s backplane; pull it out by its handles and it lets go. No cables, no bolts.",
		specs: [
			["Power", "2 × 120 A blade contacts [inferred]"],
			["Data", "CAN, 4 pins"],
			["Guides", "2 pins, ⌀ 10 mm"]
		]
	}, (put) => {
		put(box(0, -Lh - 3, 58, 170, 6, 46, 1), BLACK$1);

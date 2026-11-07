			52
		], [
			-180 + i * 6,
			rowY(i),
			top + 3
		], 1.2, 4), RED);
	});
	part("terminals", {
//#piece 4e6e9b1ff605b8635d59af7607b80fe4250c7db6517fdb13399509330c61b2bb
			Lh + 22,
			55
		], 13, 12), RED);
		put(cyl([
			140,
			Lh,
			55
		], [
			140,
			Lh + 22,
			55
		], 13, 12), BLACK);
		put(box(-110, Lh + 2, 55, 26, 6, 20, 2), "#d9d9d9");
	});
	part("lid", {
		label: "Lid",
		what: "The aluminium lid and the spring pad under it: closing it presses every contact plate onto its poles, the whole pack’s only joining force.",
		specs: [["Pad", "Silicone foam, ~0.2 MPa [inferred]"]]
	}, (put) => {
		put(box(0, 0, H - 2, W, LEN, 4), LID);

			52 + DZ
		], [
			-180 + i * 6,
			rowY(i),
			top + 3
		], 1.2, 4), RED$1);
	});
	if (v < 3) part("terminals", {
//#piece 4e6e9b1ff605b8635d59af7607b80fe4250c7db6517fdb13399509330c61b2bb
			Lh + 16,
			55
		], 13, 16), RED$1);
		put(cyl([
			140,
			Lh,
			55
		], [
			140,
			Lh + 16,
			55
		], 13, 16), BLACK$1);
		put(box(-110, Lh + 3, 55, 26, 4, 20, 2), "#d9d9d9");
	});
	else if (v >= 7) part("terminals", {
		label: "Back socket",
		what: "The pack’s plus, minus and data in one socket flush in its back, nothing sticking out. Its contacts sit at the bottom of pockets that take the cube’s insulating collars: the collars slide in first, then the pins meet their contacts, so no metal is ever open to a finger on either side. Two lined guide holes take the cube’s guide pins first: slide the pack in and it plugs itself into the backplane; pull it out and it lets go.",
		specs: [
			["Power", "2 pockets ⌀ 19 mm, sockets for ⌀ 8 mm pins, 120 A [inferred]"],
			["Data", "CAN, 4 sockets in one pocket"],
			["Guides", "2 lined holes, ⌀ 11 mm, for ⌀ 10 mm pins"],
			["Touch", "Finger-safe, IP2X"]
//#piece 78d15ce1e4f29bc6e9170fd76d75960bd5954a2a03af4de0e6a821d78fc47c72
		for (const x of [-45, 45]) {
			hole(x, 58, 9.5, FACE);
			put(cyl([
				x,
				yb - .6,
				58
			], [
				x,
				yb - .8,
				58

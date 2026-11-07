		}
		const dz = v >= 8 ? 58 : 72;
		put(box(0, yb - .2, dz, 50, .4, 16, 2), FACE);
		put(box(0, yb - .5, dz, 45, .4, 13, 2), HOLE);
		for (let k = 0; k < 4; k++) put(cyl([
			-12 + k * 8,
			yb - .7,
			dz
		], [
			-12 + k * 8,
			yb - .9,
			dz
		], 1.6, 8), CAP$1);
//#piece 56c91e5b186df640fa37aee9d012dcb3b62be16ca5b3045836b87e902231efa2
	else if (v >= 5) part("terminals", {
		label: "Back socket",
		what: "The pack’s plus, minus and data in one socket flush in its back: proper holes, nothing sticking out. Two lined guide holes take the cube’s guide pins first, then its two power pins and four data pins slide into their sockets: slide the pack in and it plugs itself into the backplane; pull it out and it lets go. With nothing proud on its back, it stands on any shelf and no contact gets bent.",
		specs: [
			["Power", "2 sockets for ⌀ 8 mm pins, 120 A [inferred]"],
			["Data", "CAN, 4 sockets"],
			["Guides", "2 lined holes, ⌀ 11 mm, for ⌀ 10 mm pins"]
//#piece 78d15ce1e4f29bc6e9170fd76d75960bd5954a2a03af4de0e6a821d78fc47c72

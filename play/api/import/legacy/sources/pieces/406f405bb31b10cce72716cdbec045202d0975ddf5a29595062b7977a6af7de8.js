//#piece 0512b2098575a8adce06110494255d641e5f4be5f6b18d00425b3bfbcaefae15
		for (const y of [-Lh + 40, Lh - 40]) put(box(0, y, B / 2, CUBE.W - 203, 50.8, 50.8, 3), FRAME);
	});
	part("frame", {
		id: "cage",
		label: "Power Cube posts and top rails (2×2 angle)",
		count: 8,

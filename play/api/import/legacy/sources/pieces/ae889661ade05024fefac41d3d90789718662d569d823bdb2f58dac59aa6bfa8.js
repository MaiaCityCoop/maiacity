		put(box(0, -Lh - 7, 58, 22, 3, 10), CAP$1);
		for (const sx of [-1, 1]) put(cyl([
			sx * 150,
			-Lh,
			58
		], [
			sx * 150,
			-Lh - 12,
			58
		], 5, 10), STEEL$1);
	});
	if (v === 3) part("clicklock", {
		...CLICKLOCK,
		what: `${CLICKLOCK.what} In a BatteryCube the pawls click in just as its back plug meets the backplane.`
	}, (put) => clickLatch(box, put, {
		half: Wh,
		face: Lh,
		z: 10,
		tabZ: 24
	}));
	if (v >= 5) for (const [id, info, draw] of clickLockPieces(box, cyl, {
		half: Wh,
		face: Lh,
		z: lockZ(v),
		back: lockBack(v),
		grip: [
			0,
			Lh + 22,
			lockZ(v)
		],
		straight: true
	})) part(id, info, draw);
	else if (v >= 4) for (const [id, info, draw] of clickLockPieces(box, cyl, {
		half: Wh,
		face: Lh,
		z: 10,
		grip: [
			0,
			Lh + 22,
			52
		]
	})) part(id, info, draw);
	if (v >= 6) {
		part("clamp", {
			label: "Clamp",
			what: "A stiff plate on four posts over the cells, its spring pad pressing every top contact plate onto its poles: the job the lid did, now on the drawer, so the cells stay pressed when it comes out.",
			specs: [["Pad", "Silicone foam, ~0.2 MPa [inferred]"], ["Posts", "4, from the base plate"]]
		}, (put) => {

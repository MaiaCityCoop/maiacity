			what: "The drive gear on the pump’s shaft and the idler it turns: oil trapped between their teeth and the housing is carried round the outside from suction to pressure, and the meshing teeth push it out.",
			moves: "Turn against each other at engine speed.",
			drive: "The pump’s shaft",
			specs: [["Teeth", "12 each [inferred]"], ["Displacement", "2π m² z b ≈ 16 cm³ a turn"]]
		}, [gears], { explode: [
			0,
			.03,
			-.42
		] });
		moving.drive = driveG;
		moving.idler = idlerG;
		const rv = {
			x0: -.297,
			x1: .297,
			y0: .335,
			y1: .555,
			z0: -.32,
			z1: -.115,
			t: .003
		};
		const rw = rv.x1 - rv.x0, rh = rv.y1 - rv.y0, rd = rv.z1 - rv.z0, rc = [
			(rv.x0 + rv.x1) / 2,
			(rv.y0 + rv.y1) / 2,
			(rv.z0 + rv.z1) / 2
		];
		const walls = [

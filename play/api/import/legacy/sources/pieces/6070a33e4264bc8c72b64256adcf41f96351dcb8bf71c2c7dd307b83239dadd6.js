	});
	const built = kit.build();
	const r = rig([{
		name: "base",
		at: [
			0,
			0,
			0
		]
	}, ...built.bones], built.pieces, [skin(.55, { side: three.DoubleSide })]);
	r.object.name = "BatteryPack";

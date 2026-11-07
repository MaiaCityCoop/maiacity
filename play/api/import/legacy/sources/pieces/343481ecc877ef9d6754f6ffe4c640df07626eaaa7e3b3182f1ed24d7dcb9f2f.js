		const driveG = new three.Group(), idlerG = new three.Group();
		driveG.position.set(0, 0, z0 - .01 - bw / 2);
		idlerG.position.set(0, cd, z0 - .01 - bw / 2);
		driveG.add(drive, m(rodZ(.0095, -.04, .05), M.shaft));
		idlerG.add(idler, m(rodZ(.0095, -.022, .022), M.shaft));
		gears.add(driveG, idlerG);
		part({
			id: "pump-gears",
			label: "Pump gears",

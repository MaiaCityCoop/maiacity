		], { explode: [
			0,
			0,
			-.18
		] });
		const pump = new three.Group();
		pump.position.set(0, CRANK.y, 0);
		const flange = new three.Shape();
		flange.moveTo(-.0532, .012);
		flange.absarc(-.0532, 0, .012, Math.PI / 2, Math.PI * 1.5, false);
		flange.lineTo(-.02, -.04);
		flange.lineTo(.02, -.04);
		flange.lineTo(.0532, -.012);
		flange.absarc(.0532, 0, .012, -Math.PI / 2, Math.PI / 2, false);
		flange.lineTo(.02, .07);
		flange.lineTo(-.02, .07);
		flange.lineTo(-.0532, .012);
		flange.holes.push(ring(-.0532, 0, .0055), ring(.0532, 0, .0055), ring(0, 0, .012));
		const z0 = PUMP.z0, bw = PUMP.width;
		const tip = PUMP.teeth * PUMP.module / 2 + PUMP.module + 2e-4, cd = PUMP.teeth * PUMP.module;
		const eight = new three.Path();
		const yi = cd / 2, xi = Math.sqrt(tip * tip - yi * yi);
		eight.moveTo(xi, yi);
		eight.absarc(0, cd, tip, Math.atan2(yi - cd, xi), Math.atan2(yi - cd, -xi) + Math.PI * 2, false);
		eight.absarc(0, 0, tip, Math.atan2(yi, -xi), Math.atan2(yi, xi) + Math.PI * 2, false);

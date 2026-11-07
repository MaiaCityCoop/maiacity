				-.026,
				0,
				0
			], [
				.026,
				0,
				0
			], .0095, 20).rotateY(Math.PI / 2), M.shaft));
			const rod = new three.Group();
			const beam = new three.Shape();
			beam.moveTo(-.011, .02);
			beam.lineTo(-.007, ENGINE.rod - .012);
			beam.lineTo(.007, ENGINE.rod - .012);
			beam.lineTo(.011, .02);
			beam.lineTo(-.011, .02);

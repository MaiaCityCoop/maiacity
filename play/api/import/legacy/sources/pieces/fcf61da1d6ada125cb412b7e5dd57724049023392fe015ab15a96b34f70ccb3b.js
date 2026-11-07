				what: "The plug in the head, its boot and the lead to its ignition coil at the flywheel: a spark each turn, fired by the flywheel’s magnet.",
				specs: [["Gap", "0.76 mm [inferred]"]]
			}, plug, { explode: [
				sx * .08,
				.1,
				.14
			] });
			const piston = new three.Group();
			const pr = ENGINE.bore / 2 - 2e-4;
			piston.add(m(GEO.lathe([
				[0, .03],
				[pr - .002, .03],
				[pr, .028],
				[pr, .022],
				[pr - .0015, .022],
				[pr - .0015, .0195],
				[pr, .0195],
				[pr, .016],
				[pr - .0015, .016],
				[pr - .0015, .0135],
				[pr, .0135],
				[pr, -.026],
				[pr - .004, -.026],
				[pr - .004, .022],
				[0, .022]

			for (let k = 0; k < 6; k++) {
				const g = block(.22, .012, .006, [
					0,
					0,
					0
				], .002);
				g.rotateZ(k / 6 * Math.PI);
				g.translate(...L(0, 275, 235));

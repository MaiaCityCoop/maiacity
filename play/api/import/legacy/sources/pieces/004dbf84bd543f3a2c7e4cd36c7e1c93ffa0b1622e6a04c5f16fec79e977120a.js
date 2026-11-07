		});
		const f = m(leg[3], x);
		const web = new three.Shape();
		web.moveTo(0, 0);
		for (let i = 0; i <= 4; i++) {
			const a = -.5 + i * .25;
			web.lineTo(Math.sin(a) * .04 * k, Math.cos(a) * .04 * k * (1 - Math.abs(i - 2.5) * .12));
			if (i < 4) web.lineTo(Math.sin(a + .125) * .03 * k, Math.cos(a + .125) * .03 * k);
		}
		web.lineTo(0, 0);
		const g = new three.ExtrudeGeometry(web, {
			depth: .0015 * k,
			bevelEnabled: false,
			curveSegments: 2
		});

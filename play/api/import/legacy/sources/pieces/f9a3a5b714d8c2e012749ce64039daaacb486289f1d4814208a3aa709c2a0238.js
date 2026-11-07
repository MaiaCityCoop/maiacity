			for (let k = 112; k < 250; k += 13) put(cyl(at(k), at(k + 4), 70, 18), ENGINE);
			put(cyl(at(250), at(305), 68, 16), ENGINE);
			const g = block(.12, .04, .15, [
				0,
				0,
				0
			], .012);
			g.rotateZ(-sx * Math.PI / 4);
			g.translate(...L(...at(320)));

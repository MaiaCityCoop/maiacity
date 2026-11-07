			for (let m = 0; m < L.per; m++) {
				const a = m * 2.39996 + lr() * .6;
				leaf(at, v3(Math.cos(a), 0, Math.sin(a)).addScaledVector(dir, .9));
			}
		}
		return;

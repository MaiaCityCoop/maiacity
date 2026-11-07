		leaf: {
			length: .011,
			width: .007,
			shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .6)), .6) * (1 - .35 * Math.exp(-Math.pow((u - 1) / .12, 2))),

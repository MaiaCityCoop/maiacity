			down: .01,
			wander: .14,
			laterals: 5,
			lateral: .25,
			depth: 2,
			age: (g - born - .6) / 2.5,
			young: "#efdcb8",
			old: "#6e5032"
		});
	}
	if (Y <= 0) return bag.build();
	const tree = design(seed);

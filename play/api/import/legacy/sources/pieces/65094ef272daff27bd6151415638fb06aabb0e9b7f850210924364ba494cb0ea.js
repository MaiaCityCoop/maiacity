		});
	}
	if (insides) insides(part, {
		box,
		bar,
		cyl,
		hose,
		T,
		L,
		P: (x, y, z) => L(x, y, z).map((v, i) => v + at[i]),
		kit,
		W,
		Lh,
		H,
		B,
		joints,
		base
	});
	else hydraulics();
	function hydraulics() {
		part("hydraulics", {
			id: "coupling",
			label: "Shaft coupling",

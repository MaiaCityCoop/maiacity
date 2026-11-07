		put(cyl([
			-200,
			-Lh,
			520
		], [
			-200,
			-Lh - 6,
			520
		], 30, 20), "#f4f4ee");
		put(box(-60, -Lh - 2, 520, 90, 6, 40, 3), BLACK);
	});
	part("electrics", {
		id: "sockets",
		label: "Sockets",
		count: 3,
		source: SRC_E,
		what: "What the cube gives out: a red three-phase socket for the village grid or a workshop, and two blue 230 V sockets for a home or tools, each under its spring lid.",
		specs: [["Three-phase", "400 V, 16 A (CEE red)"], ["Single phase", "2 × 230 V, 16 A (CEE blue)"]]
	}, base, (put) => {
		for (const [x, c] of [

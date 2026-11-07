		color: k.hairColour,
		bone: "head"
	}];
	if (k.hair === "long") {
		out.push({
			geo: egg([
				0,
				1.62,
				-.06
			], [
				.09,
				.15,
				.055
			], [
				.12,
				0,
				0
			], [28, 20]),
			color: k.hairColour,
			bone: "head"
		});
		for (const x of [-1, 1]) out.push({
			geo: egg([
				x * .074,
				1.645,
				-.012
			], [
				.024,
				.105,
				.065
//#piece 92f9cd502e9858eda4034943ae8463b718f9d16dedd1d395464bad58dc43fd2c
			-.1
		], [
			.04,
			.038,
			.038
		], [
			0,
			0,
			0
		], [20, 16]),
		color: k.hairColour,
		bone: "head"
	});
	return out;
}

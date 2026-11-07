	const grain = fbm(size, 51, 6, 4);
	return paint("bark", size, (img) => {
		for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
			const v = .45 + Math.abs(Math.sin((x + grain(x, y * .3) * 40) * .2)) * .3 + grain(x, y) * .25;

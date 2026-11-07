		}
	});
}
/** A stream bed's water: cool green-blue with soft ripples. */
function water() {
	const size = 256;
	const grain = fbm(size, 61, 6, 4);
	return paint("water", size, (img) => {
		for (let i = 0; i < size * size; i++) {
			const g = grain(i % size, i / size | 0);
			set$1(img, i * 4, 58 + g * 40, 108 + g * 50, 112 + g * 45);

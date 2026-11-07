	return flagCache = {
		map: paint("flagstone", size, (img) => {
			for (let i = 0; i < size * size; i++) {
				const x = i % size, y = i / size | 0;
				const g = grain(x, y);
				const v = edge[i] < 3.2 ? .42 + g * .1 : (.7 + g * .22) * shade[i];
				set$1(img, i * 4, 205 * v, 196 * v, 178 * v);
			}
		}, 1),
		bump: paint("flagstone-bump", size, (img) => {
			for (let i = 0; i < size * size; i++) {
				const v = Math.min(1, edge[i] / 6) * 200 + grain(i % size, i / size | 0) * 55;
				set$1(img, i * 4, v, v, v);
			}
		}, 1, false)
	};
}
/** Pale limestone blocks in courses, for the pillars and knee walls. */
function limestone() {
	const size = 512;
	const grain = fbm(size, 21, 8, 5);
	const r = rng(3);
	const rows = 8;
	const offsets = Array.from({ length: rows }, () => r() * 256);
	const tints = Array.from({ length: 64 }, () => .9 + r() * .12);
	return paint("limestone", size, (img) => {
		for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
			const row = Math.floor(y / (size / rows));
			const bx = (x + offsets[row]) % size;
			const col = Math.floor(bx / (size / 4));
			const v = y % (size / rows) < 3 || bx % (size / 4) < 3 ? .66 : (.84 + grain(x, y) * .16) * tints[row * 8 + col];
			set$1(img, (y * size + x) * 4, 236 * v, 229 * v, 214 * v);
		}
	});
}
/** Oiled oak boards with grain running along them. */
function oak() {
	const size = 512;
	const grain = fbm(size, 31, 4, 4);
	const r = rng(8);
	const planks = 6;
	const tints = Array.from({ length: planks }, () => .85 + r() * .2);
	return paint("oak", size, (img) => {
		for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
			const p = Math.floor(y / (size / planks));
			const lines = Math.sin((y + grain(x * .2, y) * 60) * .35 + p * 7) * .5 + .5;
			const v = y % (size / planks) < 2 ? .45 : (.72 + lines * .14 + grain(x, y) * .14) * tints[p];
			set$1(img, (y * size + x) * 4, 181 * v, 128 * v, 78 * v);
		}
	});
}
/** Dark garden soil with mulch. */
function soil() {
	const size = 256;
	const grain = fbm(size, 41, 16, 4);
	const r = rng(9);
	return paint("soil", size, (img) => {
		for (let i = 0; i < size * size; i++) {
			const g = grain(i % size, i / size | 0);
			const speck = r() < .06 ? .25 : 0;
			const v = .5 + g * .35 + speck;
			set$1(img, i * 4, 96 * v, 70 * v, 48 * v);

//#piece 80b80756754bb01e97cbe3b255388c61a5ebf89c55671cdbfd0779fcddf628a0
const set$1 = (img, i, r, g, b, a = 255) => {
	img.data[i] = r;
	img.data[i + 1] = g;
	img.data[i + 2] = b;
	img.data[i + 3] = a;
};
/** Irregular flagstones with sunken joints: a Voronoi of stones, each its own shade. */
let flagCache = null;
function flagstone() {
	if (flagCache) return flagCache;
	const size = 512;
	const r = rng(11);
	const pts = Array.from({ length: 42 }, () => [
		r() * size,
		r() * size,
		.85 + r() * .3
	]);
	const grain = fbm(size, 5, 8, 4);
	const edge = new Float32Array(size * size);
	const shade = new Float32Array(size * size);
	for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
		let d1 = 1e9, d2 = 1e9, s = 1;
		for (const [px, py, k] of pts) for (const ox of [
			-512,
			0,
			size
		]) for (const oy of [
			-512,
			0,
			size
		]) {
			const d = Math.hypot(x - px - ox, y - py - oy);
			if (d < d1) [d2, d1, s] = [
				d1,
				d,
				k
			];
			else if (d < d2) d2 = d;
		}
		edge[y * size + x] = d2 - d1;
		shade[y * size + x] = s;
	}

const cache = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
/** A small seeded random, so every texture is the same on every visit. */
function rng(seed) {
	let s = seed >>> 0 || 1;
	return () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
}
/** Smooth value noise in 0..1, tileable over `period`. */
function noise(period, seed) {
	const r = rng(seed);
	const g = Array.from({ length: period * period }, () => r());
	const at = (x, y) => g[(y % period + period) % period * period + (x % period + period) % period];
	return (x, y) => {
		const xi = Math.floor(x), yi = Math.floor(y);
		const fx = x - xi, fy = y - yi;
		const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
		const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
		return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
	};
}
/** Several octaves of noise, tileable over the canvas. */
function fbm(size, seed, base = 4, octaves = 4) {
	const layers = Array.from({ length: octaves }, (_, i) => ({
		n: noise(base << i, seed + i * 97),
		f: (base << i) / size,
		w: 1 / (1 << i)
	}));
	const total = layers.reduce((s, l) => s + l.w, 0);
	return (x, y) => layers.reduce((s, l) => s + l.n(x * l.f, y * l.f) * l.w, 0) / total;
}
function paint(key, size, draw, repeat = 1, colour = true) {
	const hit = cache.get(key);
	if (hit) return hit;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d");
	const img = ctx.createImageData(size, size);
	draw(img);
	ctx.putImageData(img, 0, 0);
	const tex = new three.CanvasTexture(canvas);
	tex.wrapS = tex.wrapT = three.RepeatWrapping;
	tex.repeat.set(repeat, repeat);
	tex.anisotropy = 8;
	if (colour) tex.colorSpace = three.SRGBColorSpace;
	cache.set(key, tex);
	return tex;
}

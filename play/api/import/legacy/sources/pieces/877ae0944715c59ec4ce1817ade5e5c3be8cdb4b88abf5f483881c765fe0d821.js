*/
function coverAt(recipe, r, x, z, hidden) {
	const here = surfacesAt(recipe.surface, x, z);
	let empty = 1, total = 0;
	const w = recipe.cover.map((c, i) => {
		if (hidden?.has(i)) return 0;
		const f = fbm2(x / c.colony + i * 9.7 + 3.1, z / c.colony - i * 5.3);
		const cut = .5 + (.5 - c.spread) * .55;
		const m = Math.min(1, Math.max(0, (f - cut) / .04 + .5)) * (c.on ? Math.min(1, here[c.on] * 2.2 + .05) : 1), fill = c.fill ?? .85;
		empty *= 1 - fill * m;
		const v = c.share * fill * m;
		total += v;
		return v;
	});
	if (total <= 0 || r() < empty) return -1;
	let t = r() * total;
	for (let i = 0; i < w.length; i++) if ((t -= w[i]) < 0) return i;
	return w.length - 1;
}
/**
* The seed a kind of a biome's cover is built at: by its place in the recipe and its name, so each kind of a floor is
* built a little differently, and the same every time. @param {number} i @param {Cover} kind

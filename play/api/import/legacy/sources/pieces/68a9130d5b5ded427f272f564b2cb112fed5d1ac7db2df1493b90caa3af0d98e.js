/** A stainless worktable w × d, its top at h, an upstand at the back, a shelf under it. */
/** @param {number} w @param {number} d @param {{ h?: number, shelf?: boolean, upstand?: boolean }} [o] */
function steelTable(w, d, { h = .9, shelf = true, upstand = true } = {}) {
	const g = new three.Group();
	part(g, w, .04, d, m.steel(), 0, h - .02, 0);
	if (upstand) part(g, w, .1, .012, m.steel(), 0, h + .05, -d / 2 + .006);
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(g, v3(sx * (w / 2 - .04), 0, sz * (d / 2 - .04)), v3(sx * (w / 2 - .04), h - .04, sz * (d / 2 - .04)), .02, m.steel());
	if (shelf) part(g, w - .04, .02, d - .04, m.steel(), 0, .2, 0);
	return g;
}

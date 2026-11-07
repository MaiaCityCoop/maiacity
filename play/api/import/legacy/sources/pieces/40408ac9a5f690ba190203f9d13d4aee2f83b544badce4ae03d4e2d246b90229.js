//#piece 31ee9d232982a4a3c3aaa7915346e823b2cdf91ae6949bbb45323ca07cbad122
/** A wire shelving rack w × d × h, `levels` shelves; its shelves' heights in userData.shelves. */
/** @param {number} w @param {number} d @param {number} h @param {number} levels @param {THREE.Material} [mat] */
function rack(w, d, h, levels, mat = m.chrome()) {
	const g = new three.Group();
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(g, v3(sx * (w / 2 - .015), 0, sz * (d / 2 - .015)), v3(sx * (w / 2 - .015), h, sz * (d / 2 - .015)), .013, mat);
	/** @type {number[]} */
	const shelves = [];
	for (let i = 0; i < levels; i++) {
		const y = .15 + i * (h - .2) / (levels - 1);
		part(g, w, .02, d, mat, 0, y, 0);
		shelves.push(y + .01);
	}
	g.userData.shelves = shelves;

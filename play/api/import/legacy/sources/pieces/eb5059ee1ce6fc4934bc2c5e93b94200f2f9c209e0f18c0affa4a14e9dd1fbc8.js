}
/** a small round thing — a seed, an achene, a wart, a bud — at `at`, stretched by `scale`, of one colour */
function bead(at, scale, color, detail = 6, turn = new three.Quaternion()) {
	detail = fewer(detail, 2);
	const g = new three.SphereGeometry(1, detail + 2, detail);
	g.applyMatrix4(new three.Matrix4().compose(at, turn, scale));
	const c = new three.Color(color);
	const n = g.attributes.position.count;
	const col = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) col.set([
		c.r,
		c.g,
		c.b
	], i * 3);
	g.setAttribute("color", new three.BufferAttribute(col, 3));
	return g;
//#piece d53b60c8b67edd0307c663231cf95185635898a84af5be6bd66af0a7128e313f

//#piece 488b9bd536935688f4182ee7352ce913ce7b9a913b2a8cf986cb007bb20e4d1b
	return g;
}
/** An egg: a sphere `r` across, scaled by `s`, turned by `rot`, at `at`. */
function egg(at, s, rot = [
	0,
	0,
	0
], detail = [20, 14]) {
	const g = new three.SphereGeometry(1, fine(detail[0], 6), fine(detail[1], 4));
	g.applyMatrix4(new three.Matrix4().compose(new three.Vector3(...at), new three.Quaternion().setFromEuler(new three.Euler(...rot)), new three.Vector3(...s)));
	return g;
}
/** A cone (a beak, a horn, a fin): `r` at its base, `h` long, pointing along `dir` from its base at `at`. */
function spike(at, dir, r, h, { flat = 1, seg = 10 } = {}) {
	const g = new three.ConeGeometry(r, h, fine(seg, 4));
	g.applyMatrix4(new three.Matrix4().makeTranslation(0, h / 2, 0));
	g.applyMatrix4(new three.Matrix4().makeScale(flat, 1, 1));
	g.applyMatrix4(new three.Matrix4().compose(new three.Vector3(...at), new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), new three.Vector3(...dir).normalize()), new three.Vector3(1, 1, 1)));

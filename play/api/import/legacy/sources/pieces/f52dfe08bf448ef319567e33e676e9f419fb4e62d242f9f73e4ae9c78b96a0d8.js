/** the i-th of n turns, one after another, as far as f of them is done: how far this one is (0 … 1) */
const turn = (f, i, n) => clamp(f * n - i);
const UP = /* @__PURE__ */ (() => new three.Vector3(0, 1, 0))();
/** a round rod stretched from a to b, set again as it moves */
function rod(r, mat, seg = 6) {
	const o = new three.Mesh(new three.CylinderGeometry(r, r, 1, seg), mat);
	o.castShadow = true;
	o.userData.span = (a, b) => {
		const d = b.clone().sub(a);
		const len = d.length();
		o.visible = len > 1e-4;
		if (!o.visible) return;
		o.position.copy(a).addScaledVector(d, .5);
		o.quaternion.setFromUnitVectors(UP, d.divideScalar(len));
		o.scale.set(1, len, 1);
	};
	return o;

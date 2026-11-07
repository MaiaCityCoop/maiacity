*/
function limb(a, b, r0, r1, { flat = 1, turn = 0, seg = 12 } = {}) {
	const A = new three.Vector3(...a), B = new three.Vector3(...b);
	const len = A.distanceTo(B);
	const pts = [];
	const cap = fine(5, 2), body = fine(Math.max(4, Math.round(len / .03)), 2);
	for (let i = 0; i <= cap; i++) {
		const t = i / cap * (Math.PI / 2);
		pts.push(new three.Vector2(Math.max(1e-4, Math.sin(t) * r1), -Math.cos(t) * r1));
	}
	for (let i = 1; i < body; i++) {
		const t = i / body;
		pts.push(new three.Vector2(r1 + (r0 - r1) * t, len * t));
	}
	for (let i = 0; i <= cap; i++) {
		const t = i / cap * (Math.PI / 2);
		pts.push(new three.Vector2(Math.max(1e-4, Math.cos(t) * r0), len + Math.sin(t) * r0));
	}

*/
function cut(a, b, y0, y1, holes) {
	const us = [a, b];
	for (const h of holes) us.push(Math.max(a, Math.min(b, h.u0)), Math.max(a, Math.min(b, h.u1)));
	us.sort((p, q) => p - q);
	/** @type {{ u0: number, u1: number, y0: number, y1: number }[]} */
	const out = [];
	for (let i = 0; i < us.length - 1; i++) {
		const u0 = us[i], u1 = us[i + 1];
		if (u1 - u0 < 1e-4) continue;
		const mid = (u0 + u1) / 2;
		const h = holes.find((o) => mid > o.u0 && mid < o.u1);
		if (!h) out.push({
			u0,
			u1,
			y0,
			y1
		});
		else {
			if (h.y0 > y0 + .001) out.push({
				u0,
				u1,
				y0,
				y1: Math.min(h.y0, y1)
			});
			if (h.y1 < y1 - .001) out.push({
				u0,
				u1,
				y0: Math.max(h.y1, y0),
				y1
			});
		}
	}
	return out;
}
/**
* One wall, built in its own frame — u along it, w out of it, the outer face at `half` — and turned into place by
* `rot`: its steel skin and corrugation outside, its lining inside, a reveal round each opening, glass in a window, a
* door swung open. Returns what of it is in the way, on the floor.
* @param {THREE.Group} g
* @param {{ rot: number, half: number, span: number, inner: number, holes: Hole[], skin: THREE.Material, lining: THREE.Material }} o
* @returns {Rect[]}

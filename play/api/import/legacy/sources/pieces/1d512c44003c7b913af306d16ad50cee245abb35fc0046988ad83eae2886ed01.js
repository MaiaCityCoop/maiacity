//#region src/lib/plants/wald-berries.js
//#piece bdf318251a7f667dc72932b676c0f675002ea4f82cd10fb4886830fa3163daef
/** @typedef {{ c: THREE.Vector3, r: number }} Ball */
/** @typedef {import('./tree.js').Limb} Limb */
/** the point at the distance s along a path, and its direction there — null past its end */
function walk(pts, s) {
	let left = Math.max(0, s);
	for (let i = 1; i < pts.length; i++) {
		const seg = pts[i].distanceTo(pts[i - 1]);
		if (left <= seg) {
			const t = seg > 1e-9 ? left / seg : 0;
			return {
				p: pts[i - 1].clone().lerp(pts[i], t),
				d: pts[i].clone().sub(pts[i - 1]).normalize()
			};

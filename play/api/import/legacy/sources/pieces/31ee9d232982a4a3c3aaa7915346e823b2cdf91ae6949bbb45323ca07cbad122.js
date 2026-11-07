function fitter(g, solids) {
	return {
		/**
		* Put `o` with its middle at x, z (on the floor inside, unless `y`), turned `ry`; `w` × `d` (along x and z before
		* turning) is in the way.
		* @template {THREE.Object3D} O
		* @param {O} o @param {number} x @param {number} z
		* @param {{ ry?: number, w?: number, d?: number, y?: number }} [opts]
		* @returns {O}
		*/
		put(o, x, z, { ry = 0, w = 0, d = 0, y } = {}) {
			o.position.set(x, y ?? (Math.abs(x) < L / 2 && Math.abs(z) < W / 2 ? FLOOR : 0), z);
			o.rotation.y = ry;
			g.add(o);
			if (w && d) {
				const turned = Math.abs(Math.sin(ry)) > .7;
				const hw = (turned ? d : w) / 2, hd = (turned ? w : d) / 2;
				solids.push({
					x0: x - hw,
					x1: x + hw,
					z0: z - hd,
					z1: z + hd
				});
			}
			return o;
		},
		/** @param {number} x0 @param {number} x1 @param {number} z0 @param {number} z1 */
		block(x0, x1, z0, z1) {
			solids.push({
				x0,
				x1,
				z0,
				z1
			});
		}
	};
}
/** against the back wall, facing in: z of a thing `d` deep */
/** @param {number} d */
const atBack = (d) => Z0 + d / 2;
/** against the front wall, facing in (turned π) */
/** @param {number} d */
const atFront = (d) => Z1 - d / 2;

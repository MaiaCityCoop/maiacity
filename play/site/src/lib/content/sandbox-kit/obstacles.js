/**
 * WHAT STANDS IN THE WAY of the walker (./walker.js): circles on the ground (y their floor), filed in 8 m cells.
 * Standing in one never traps you (a world may put you inside a bush): only a step into one, or deeper, is refused.
 */

/** @typedef {{ x: number, z: number, r: number, y?: number }} Obstacle */

/**
 * @param {Obstacle[]} list
 * @param {{ cell?: number, pad?: number, floor?: number }} [o]
 *   cell: the size of a cell (m); pad: how close a walker's middle may come to an obstacle's edge; floor: how far
 *   apart in height an obstacle and a walker must be for it not to be in the way (a table upstairs is not)
 */
export function createObstacles(list, { cell = 8, pad = 0.25, floor = 1 } = {}) {
	/** @type {Map<string, Obstacle[]>} */
	const cells = new Map();
	/** the few too big for a cell's neighbours to hold: always looked at */
	/** @type {Obstacle[]} */
	const large = [];
	const key = (/** @type {number} */ x, /** @type {number} */ z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
	for (const o of list) {
		if (o.r + pad > cell) {
			large.push(o);
			continue;
		}
		const k = key(o.x, o.z);
		const at = cells.get(k);
		if (at) at.push(o);
		else cells.set(k, [o]);
	}
	/** @param {number} x @param {number} z @param {(o: Obstacle) => boolean} hit */
	const any = (x, z, hit) => {
		const ix = Math.floor(x / cell), iz = Math.floor(z / cell);
		for (let dx = -1; dx <= 1; dx++)
			for (let dz = -1; dz <= 1; dz++) for (const o of cells.get(`${ix + dx},${iz + dz}`) ?? []) if (hit(o)) return true;
		return large.some(hit);
	};
	return {
		/**
		 * Whether a step to x, z is refused: into an obstacle, or deeper into the one you stand in.
		 * @param {number} x @param {number} z
		 * @param {{ y?: number, from?: { x: number, z: number } }} [step] y: the floor the step lands on (obstacles on
		 *   another floor are not in the way); from: where the step starts (so a step out of an obstacle is never refused)
		 */
		blocks(x, z, { y, from } = {}) {
			return any(x, z, (o) => {
				if (y !== undefined && Math.abs(y - (o.y ?? 0)) >= floor) return false;
				const d = Math.hypot(o.x - x, o.z - z);
				if (d >= o.r + pad) return false;
				if (from) {
					const before = Math.hypot(o.x - from.x, o.z - from.z);
					// already in it, and on the way out: let them go
					if (before < o.r + pad && d > before) return false;
				}
				return true;
			});
		}
	};
}

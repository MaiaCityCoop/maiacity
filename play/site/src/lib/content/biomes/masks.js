/*
 * WHERE A KIND GATHERS — the masks a biome's cover is placed by, the way nature places it (intent 24454c2d; research:
 * Horizon Zero Dawn's GPU placement, Far Cry 5's, three's ForestGenerator). A kind's density at a point is its colonies
 * (./index.js) times the product of its masks there, each 1 where it says nothing:
 *
 *   shade    under the crowns or out in the sun: the canopy from the trees' real places and crown sizes (a world's
 *            `trunks`), a kind's `shade` from −1 (only in the sun) to 1 (only under crowns)
 *   edge     the band along the canopy's edge, where wood meets meadow and most kinds crowd: `edge`, how much more of
 *            it stands there (0 none, 1 twice as much at the very edge), the band `band` metres wide either side
 *   clear    paths, buildings and water kept clear by `clear` metres (the world's `open(x, z, margin)`)
 *   wet      the hollows of the relief (moist) or its rises (dry): `wet` from −1 (only dry) to 1 (only moist)
 *   slope    nothing steeper than `steep` degrees
 *   ring     a ring round every trunk, `ring: [from, to, gain]` metres from its centre: a food forest's guilds round
 *            their tree (comfrey, clover, strawberries), the leaf litter at a trunk's foot
 *
 * Where a world says nothing of its canopy (no `trunks`) or its relief (no `heightAt`), those masks are 1: the kind
 * stands as its colonies say. Every sum is in the ground's own metres and depends on the place alone.
 */
import { fbm2 } from './noise.js';

/** @typedef {{ x: number, z: number, r: number }} Trunk a tree, where its trunk stands and its crown's radius (m) */
/**
 * @typedef {object} Masks a biome's own numbers for its masks (its card's `masks` part)
 * @property {number} band how wide the canopy's edge band is, either side of the drip line (m)
 * @property {number} skew how far its sizes lean small: a size is lo + (hi − lo)·r^skew (1 even, 2 mostly small)
 * @property {number} tilt how far a plant leans off upright at most (°)
 * @property {number} sink how deep its base is sunk, of its size (m at size 1)
 * @property {number} drift how far its colour drifts from place to place (0…0.3 of each channel)
 * @property {number} across how big a region of one colour is (m)
 */
/**
 * @typedef {object} KindMasks a kind's own numbers for its masks (each left out: that mask is 1)
 * @property {number} [footprint] how much ground one of it takes (m): its places are dithered at this spacing, and
 *   kinds of one footprint exclude each other there; the biome's spacing (1/√density) if not said
 * @property {number} [shade] −1 only in the sun … 1 only under the crowns
 * @property {number} [edge] how much more of it stands in the canopy's edge band (0…4)
 * @property {number} [clear] how far it keeps off paths, buildings and water (m)
 * @property {number} [wet] −1 only on the rises … 1 only in the hollows
 * @property {number} [steep] the steepest ground it stands on (°)
 * @property {[number, number, number]} [ring] from, to (m from a trunk's centre) and how much more of it stands there
 */

/** the masks a biome has where its card names none of their numbers */
export const MASKS = Object.freeze({ band: 2.5, skew: 2, tilt: 4, sink: 0.02, drift: 0.12, across: 18 });

const smooth = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ v) => {
	const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

/**
 * The trunks that matter to a tile: those whose crown, ring or edge band reaches it.
 * @param {Trunk[]} trunks @param {number} x0 @param {number} z0 @param {number} x1 @param {number} z1 @param {number} pad
 */
export function trunksNear(trunks, x0, z0, x1, z1, pad) {
	return trunks.filter((t) => t.x + t.r + pad >= x0 && t.x - t.r - pad <= x1 && t.z + t.r + pad >= z0 && t.z - t.r - pad <= z1);
}

/**
 * What the canopy is at x, z: how far inside the crowns (`edge`, signed metres: + inside, − outside the nearest drip
 * line), how far the nearest trunk is (`trunk`, m), how shaded it is (`shade`, 0 sun … 1 deep under) and how near the
 * edge (`band`, 1 on the drip line, falling off over `band` metres). Null where no canopy is known.
 * @param {Trunk[] | undefined} trunks @param {number} x @param {number} z @param {number} band
 */
export function canopyAt(trunks, x, z, band) {
	return trunks ? canopyOf(trunks, band, 0)(x, z) : null;
}

/**
 * The canopy's sums as a lookup over many points (`canopyAt`'s): the trunks kept on a grid, each point looking only
 * at those whose crown, edge band or ring (out to `ring` metres) could reach it; further off it lies in the open sun.
 * @param {Trunk[]} trunks @param {number} band @param {number} ring
 * @returns {(x: number, z: number) => { edge: number, trunk: number, shade: number, band: number }}
 */
export function canopyOf(trunks, band, ring) {
	const crown = trunks.reduce((m, t) => Math.max(m, t.r), 0);
	const look = Math.max(crown + band * 2, ring), cell = Math.max(2, look);
	let gx0 = Infinity, gz0 = Infinity, gx1 = -Infinity, gz1 = -Infinity;
	for (const t of trunks) {
		gx0 = Math.min(gx0, Math.floor(t.x / cell)), gz0 = Math.min(gz0, Math.floor(t.z / cell));
		gx1 = Math.max(gx1, Math.floor(t.x / cell)), gz1 = Math.max(gz1, Math.floor(t.z / cell));
	}
	const nx = trunks.length ? gx1 - gx0 + 1 : 0, nz = trunks.length ? gz1 - gz0 + 1 : 0;
	/** @type {Trunk[][]} the trunks on a grid of `cell` metres over theirs */
	const grid = Array.from({ length: nx * nz }, () => []);
	for (const t of trunks) /** @type {Trunk[]} */ (grid[(Math.floor(t.x / cell) - gx0) * nz + Math.floor(t.z / cell) - gz0]).push(t);
	return (x, z) => {
		let edge = -Infinity, trunk = Infinity;
		const gx = Math.floor(x / cell) - gx0, gz = Math.floor(z / cell) - gz0;
		for (let i = Math.max(0, gx - 1); i <= Math.min(nx - 1, gx + 1); i++)
			for (let j = Math.max(0, gz - 1); j <= Math.min(nz - 1, gz + 1); j++) {
				for (const t of /** @type {Trunk[]} */ (grid[i * nz + j])) {
					const dx = x - t.x, dz = z - t.z, d = Math.sqrt(dx * dx + dz * dz);
					if (d > look + t.r) continue;
					if (t.r - d > edge) edge = t.r - d;
					if (d < trunk) trunk = d;
				}
			}
		// in the open: as far out as the lookup reaches, no shade, no band, no ring
		if (edge === -Infinity) edge = -look;
		return { edge, trunk, shade: smooth(-band * 0.5, band, edge), band: Math.exp(-((edge / band) ** 2)) };
	};
}

/**
 * The relief at x, z: how much of a hollow it is (`wet`, −1 on a rise … 1 in a hollow) and how steep (`slope`, °).
 * Null where the world gives no heights.
 * @param {((x: number, z: number) => number) | undefined} heightAt @param {number} x @param {number} z
 */
export function reliefAt(heightAt, x, z) {
	if (!heightAt) return null;
	const h = heightAt(x, z), e = 0.5, R = 3;
	const gx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e), gz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
	const around = (heightAt(x + R, z) + heightAt(x - R, z) + heightAt(x, z + R) + heightAt(x, z - R)) / 4;
	return { wet: Math.max(-1, Math.min(1, (around - h) / 0.3)), slope: (Math.atan(Math.hypot(gx, gz)) * 180) / Math.PI };
}

/**
 * How much of a kind stands at a point against its colonies alone (0…, 1 where its masks say nothing): the product of
 * its masks there. `open`, the world's own: whether a plant may stand there, `margin` metres clear of its paths,
 * buildings and water.
 * @param {KindMasks} k
 * @param {ReturnType<typeof canopyAt>} canopy @param {ReturnType<typeof reliefAt>} relief
 * @param {((x: number, z: number, margin?: number) => boolean) | undefined} open @param {number} x @param {number} z
 */
export function maskAt(k, canopy, relief, open, x, z) {
	let m = 1;
	if (canopy) {
		if (k.shade) m *= Math.max(0, 1 + k.shade * (2 * canopy.shade - 1));
		if (k.edge) m *= 1 + k.edge * canopy.band;
		if (k.ring) {
			const [from, to, gain] = k.ring, w = Math.max(0.05, (to - from) * 0.15);
			m *= 1 + gain * smooth(from - w, from + w, canopy.trunk) * (1 - smooth(to - w, to + w, canopy.trunk));
		}
	}
	if (relief) {
		if (k.wet) m *= Math.max(0, 1 + k.wet * relief.wet);
		if (k.steep !== undefined) m *= 1 - smooth(k.steep, k.steep + 5, relief.slope);
	}
	if (m > 0 && k.clear && open && !open(x, z, k.clear)) return 0;
	return m;
}

/**
 * A plant's colour where it stands: each channel a little off, by regions `across` metres big, the same for every
 * kind there (a drier patch yellower, a damper one bluer-green). @param {Masks} masks @param {number} x @param {number} z
 * @returns {[number, number, number]}
 */
export function tintAt(masks, x, z) {
	const a = (fbm2(x / masks.across + 41.7, z / masks.across - 13.9) - 0.5) * 2, b = (fbm2(x / masks.across - 27.3, z / masks.across + 8.1) - 0.5) * 2;
	const d = masks.drift;
	return [1 + d * a, 1 + d * 0.5 * b, 1 - d * 0.6 * a];
}

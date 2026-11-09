/*
 * THE BIOMES' NOISE — one value noise, written twice: in JavaScript (where the cover is scattered) and in TSL (where
 * the ground is drawn, ../render/nodes/ground.js), the same sums in both, so a colony of wood anemones stands on the patch of litter the shader
 * drew for it. In metres over the ground.
 */

const fract = (/** @type {number} */ x) => x - Math.floor(x);
/** a hash of a lattice point, 0…1 @param {number} x @param {number} y */
function h21(x, y) {
	let px = fract(x * 123.34), py = fract(y * 456.21);
	const d = px * (px + 45.32) + py * (py + 45.32);
	px += d;
	py += d;
	return fract(px * py);
}
/** smooth value noise, 0…1 @param {number} x @param {number} y */
export function vn(x, y) {
	const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
	const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
	const a = h21(ix, iy), b = h21(ix + 1, iy), c = h21(ix, iy + 1), d = h21(ix + 1, iy + 1);
	return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
}
/** three octaves of it, 0…1 @param {number} x @param {number} y */
export const fbm2 = (x, y) => vn(x, y) * 0.55 + vn(x * 2.03 + 7.1, y * 2.03 + 7.1) * 0.3 + vn(x * 4.1 + 3.3, y * 4.1 + 3.3) * 0.15;

// the worlds' seeded random is the kernel's (../../kernel/random.js); stream.js (held) still takes it here as rng
export { seededRandom as rng } from '../../kernel/random.js';

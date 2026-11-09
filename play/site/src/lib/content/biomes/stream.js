/*
 * A BIOME'S COVER, STREAMED — the one program laying a biome's cover everywhere (intent 11ead007). Too dense for a whole
 * world at once (six to ten plants a square metre in a carpet), it is laid in small tiles round the eye, each from its
 * place alone, a tile or so a frame, the tiles left behind let go. Every plant is a copy of its kind's build (its card's
 * `ref`) drawn by $lib/content/assets/render, put down once with its rank; it thins with distance and grows out of or
 * sinks into the ground on the GPU ($lib/content/render/nodes `aCover`), so nothing pops and it has no edge. Tiles are
 * built beyond where it shows. `update(x, z, budget)` every frame with the eye in the floor's ground.
 */
import * as THREE from 'three';
import { layTile } from './index.js';

/**
 * @param {{
 *   drawn: { use: (ref: string, shadows?: boolean, picture?: boolean) => any, take: (k: any, at: THREE.Matrix4, cover?: any) => any, give: (c: any) => void },
 *   recipe: import('./index.js').Recipe,
 *   open?: (x: number, z: number, margin?: number) => boolean,
 *   tile?: number, reach?: number, near?: number, thin?: number, perFrame?: number, seed?: number, density?: number,
 *   origin?: [number, number], at?: [number, number, number], hidden?: boolean, heightAt?: (x: number, z: number) => number,
 *   sown?: number, trunks?: import('./masks.js').Trunk[], blades?: boolean
 * }} o
 *   drawn: the renderer (kinds used, copies taken and given back); recipe: the biome, each kind naming its build (`ref`);
 *   open: whether cover may stand at x, z, its third argument a kind's margin; tile, reach, near (all stands within it),
 *   thin (left at reach): m and 0…1; perFrame: tiles a frame; density: the biome's, if other (a slow device); origin:
 *   this ground's 0, 0 in the world (its colonies' noise); at: the floor's ground in the drawn world; hidden: not drawn
 *   until shown; heightAt: its relief (and the wet and slope masks); sown: a field's lines (./surfaces.js `rowsOf`);
 *   trunks: its trees, for the canopy masks (./masks.js); blades: its grass drawn as blades beside it (./grass.js,
 *   intent 090168c8), so its unsown grass kinds are laid but not drawn here
 */
export function coverStream(o) {
	const tile = o.tile ?? 12, reach = o.reach ?? 30, perFrame = o.perFrame ?? 1, seed = o.seed ?? 1;
	const near = o.near ?? Math.min(10, reach * 0.4), thin = o.thin ?? 0.3;
	const [ox, oz] = o.origin ?? [0, 0];
	const [ax, ay, az] = o.at ?? [0, 0, 0];
	const { recipe, drawn } = o;
	// each kind by the build its biome's card names (a hash): drawn finely however small, so never as a picture
	const kinds = recipe.cover.map((c) => {
		if (o.blades && !c.rows && (c.kind === 'grass' || c.kind === 'tallgrass')) return null;
		if (!c.ref) throw new Error(`the biome names no asset for its cover kind ${c.kind}`);
		return drawn.use(c.ref, false, false);
	});
	/** @type {Map<string, { ix: number, iz: number, copies: any[] }>} */
	const tiles = new Map();
	let hidden = !!o.hidden;
	const m = new THREE.Matrix4();
	const lay = (/** @type {number} */ ix, /** @type {number} */ iz) => {
		const copies = [];
		layTile(recipe, ix, iz, { tile, seed, density: o.density, open: o.open, origin: [ox, oz], sown: o.sown, trunks: o.trunks, heightAt: o.heightAt }).forEach(({ m: M, rank, tint }, k) => {
			if (!kinds[k]) return;
			for (let i = 0; i < rank.length; i++) {
				m.fromArray(M, i * 16);
				const e = m.elements;
				e[13] += ay + (o.heightAt ? o.heightAt(/** @type {number} */ (e[12]), /** @type {number} */ (e[14])) : 0);
				e[12] += ax;
				e[14] += az;
				// a biome with masks: each plant's colour where it stands (its region's drift)
				copies.push(drawn.take(kinds[k], m, { rank: /** @type {number} */ (rank[i]), near, reach, thin, ...(tint ? { tint: tint.subarray(i * 3, i * 3 + 3) } : {}) }));
			}
		});
		return copies;
	};
	const drop = (/** @type {string} */ key) => {
		for (const c of tiles.get(key)?.copies ?? []) drawn.give(c);
		tiles.delete(key);
	};
	return {
		/** where the eye is: the tiles near it built (the nearest first, `budget` a frame), the far ones let go */
		update(/** @type {number} */ x, /** @type {number} */ z, budget = perFrame) {
			if (hidden) return;
			// built out past where the cover shows, so a tile is ready before it is seen
			const out = reach + tile * 0.75;
			const ix = Math.floor(x / tile), iz = Math.floor(z / tile), n = Math.ceil(out / tile);
			/** @type {[number, number, number][]} */
			const want = [];
			for (let dx = -n; dx <= n; dx++)
				for (let dz = -n; dz <= n; dz++) {
					const cx = (ix + dx + 0.5) * tile, cz = (iz + dz + 0.5) * tile;
					const d = Math.hypot(cx - x, cz - z) - tile * 0.71;
					if (d < out && !tiles.has(`${ix + dx},${iz + dz}`)) want.push([d, ix + dx, iz + dz]);
				}
			want.sort((a, b) => a[0] - b[0]);
			for (const [, tx, tz] of want.slice(0, budget)) tiles.set(`${tx},${tz}`, { ix: tx, iz: tz, copies: lay(tx, tz) });
			for (const [key, t] of tiles) if (Math.hypot((t.ix + 0.5) * tile - x, (t.iz + 0.5) * tile - z) - tile * 0.71 > out + tile) drop(key);
		},
		/** none of it drawn (a dome's floor while hidden), or drawn again from the next update @param {boolean} on */
		show(on) {
			hidden = !on;
			if (hidden) for (const key of [...tiles.keys()]) drop(key);
		},
		/** how many plants are put down now */
		count: () => [...tiles.values()].reduce((a, t) => a + t.copies.length, 0),
		dispose() {
			hidden = true;
			for (const key of [...tiles.keys()]) drop(key);
		}
	};
}
/** @typedef {ReturnType<typeof coverStream>} Cover */

/** One tile of a biome's cover from its place alone (./index.js `layTile`). @type {typeof layTile} */
export const coverTile = layTile;

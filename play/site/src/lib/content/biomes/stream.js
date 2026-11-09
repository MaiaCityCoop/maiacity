/*
 * A BIOME'S COVER, STREAMED — the one program that lays a biome's cover, in every world, sandbox, dome and the asset
 * viewer (intent 11ead007). A biome's floor is dense where it is full (six or ten plants to a square metre inside a
 * carpet of them), too dense to lay out over a whole world at once. So it is laid out in small tiles round the eye as
 * it goes: each tile worked out from its place alone (the same tile, the same plants, every time it is built), a tile
 * or so a frame so walking never stutters, and the tiles left behind let go.
 *
 * Every plant of it is one copy of its kind as play built it (the kind's `ref`, a build by hash, from the biome's
 * card), drawn by the universal renderer ($lib/content/assets/render): each put down once, when its tile is built,
 * whole and with its rank (0…1, drawn when it is placed). It fades with distance rather than ending: near the eye all
 * of it stands, further off fewer and fewer (`thin`), and each plant grows up out of the ground or sinks back into it
 * as the eye comes and goes — on the graphics card, every frame, by the render kit's TSL ($lib/content/render/nodes
 * `aCover`), so nothing pops, the cover has no edge and nothing of it is moved while you walk. The tiles are built
 * beyond where the cover shows, so a new one is never seen arriving.
 *
 * `coverStream({ drawn, recipe, open, … })` → `{ update(x, z, budget), show(on), count(), dispose() }`: `update` with
 * where the eye is (in the floor's own ground) every frame.
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
 *   sown?: number, trunks?: import('./masks.js').Trunk[]
 * }} o
 *   drawn: the renderer it is drawn by (its kinds used, copies taken and given back); recipe: the biome, each kind of
 *   its cover naming its build (`ref`); open: whether cover may stand at x, z (not on a path, in the water, in a
 *   trunk…); tile: a tile's size (m); reach: how far from the eye it is drawn (m); near: how far every plant of it
 *   stands, beyond which it thins out; thin: how much of it is left at its reach (0…1); perFrame: how many tiles may be
 *   built a frame; density: the biome's, if it should be other (fewer on a slow device); origin: where this ground's
 *   0, 0 lies in the world (a dome's floor laid in its own ground), so its colonies stand on the surfaces its ground
 *   is painted with; at: where the floor's own ground lies in the world it is drawn in; hidden: none of it drawn until
 *   it is shown; heightAt: the floor's height at x, z of its own ground where it is not flat (and its relief, for a biome's wet and
 *   slope masks); sown: the way a field's lines run (radians from +x towards +z; ./surfaces.js `rowsOf`), for the
 *   kinds a machine sowed; trunks: the trees standing on it, each its place and crown's radius in its own ground, for
 *   a biome's canopy masks (./masks.js). `open` may take a third argument, a margin: how far a kind keeps clear
 */
export function coverStream(o) {
	const tile = o.tile ?? 12, reach = o.reach ?? 30, perFrame = o.perFrame ?? 1, seed = o.seed ?? 1;
	const near = o.near ?? Math.min(10, reach * 0.4), thin = o.thin ?? 0.3;
	const [ox, oz] = o.origin ?? [0, 0];
	const [ax, ay, az] = o.at ?? [0, 0, 0];
	const { recipe, drawn } = o;
	// each kind by the build its biome's card names (a hash): drawn finely however small, so never as a picture
	const kinds = recipe.cover.map((c) => {
		if (!c.ref) throw new Error(`the biome names no asset for its cover kind ${c.kind}`);
		return drawn.use(c.ref, false, false);
	});
	/** @type {Map<string, { ix: number, iz: number, copies: any[] }>} */
	const tiles = new Map();
	let hidden = !!o.hidden;
	const m = new THREE.Matrix4();
	/** a tile's plants put down, each whole with its rank: the graphics card grows them */
	const lay = (/** @type {number} */ ix, /** @type {number} */ iz) => {
		const copies = [];
		layTile(recipe, ix, iz, { tile, seed, density: o.density, open: o.open, origin: [ox, oz], sown: o.sown, trunks: o.trunks, heightAt: o.heightAt }).forEach(({ m: M, rank, tint }, k) => {
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
		/** none of it drawn (a dome's floor while its inside is not shown), or drawn again from the next update @param {boolean} on */
		show(on) {
			hidden = !on;
			if (hidden) for (const key of [...tiles.keys()]) drop(key);
		},
		/** how many plants of it are put down now, for a look at its weight */
		count: () => [...tiles.values()].reduce((a, t) => a + t.copies.length, 0),
		/** every copy handed back to the renderer's keeping */
		dispose() {
			hidden = true;
			for (const key of [...tiles.keys()]) drop(key);
		}
	};
}
/** @typedef {ReturnType<typeof coverStream>} Cover */

/**
 * One tile of a biome's cover, worked out from its place alone, in one pass (./index.js `layTile`: a biome with masks
 * by its masks, one without exactly as before). @type {typeof layTile}
 */
export const coverTile = layTile;

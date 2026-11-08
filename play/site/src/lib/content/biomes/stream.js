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
import { colonyAt, coverAt } from './index.js';
import { inTrack } from './surfaces.js';
import { rng } from './noise.js';

/**
 * @param {{
 *   drawn: { use: (ref: string, shadows?: boolean, picture?: boolean) => any, take: (k: any, at: THREE.Matrix4, cover?: any) => any, give: (c: any) => void },
 *   recipe: import('./index.js').Recipe,
 *   open?: (x: number, z: number) => boolean,
 *   tile?: number, reach?: number, near?: number, thin?: number, perFrame?: number, seed?: number, density?: number,
 *   origin?: [number, number], at?: [number, number, number], hidden?: boolean, heightAt?: (x: number, z: number) => number,
 *   rows?: number, blades?: boolean
 * }} o
 *   drawn: the renderer it is drawn by (its kinds used, copies taken and given back); recipe: the biome, each kind of
 *   its cover naming its build (`ref`); open: whether cover may stand at x, z (not on a path, in the water, in a
 *   trunk…); tile: a tile's size (m); reach: how far from the eye it is drawn (m); near: how far every plant of it
 *   stands, beyond which it thins out; thin: how much of it is left at its reach (0…1); perFrame: how many tiles may be
 *   built a frame; density: the biome's, if it should be other (fewer on a slow device); origin: where this ground's
 *   0, 0 lies in the world (a dome's floor laid in its own ground), so its colonies stand on the surfaces its ground
 *   is painted with; at: where the floor's own ground lies in the world it is drawn in; hidden: none of it drawn until
 *   it is shown; heightAt: the floor's height at x, z of its own ground where it is not flat; rows: the way the floor's
 *   rows run (radians from +x towards +z; ./surfaces.js `rowsOf`), for the kinds sown in rows; blades: its grass drawn
 *   blade by blade by a grass field beside it (./grass.js, intent 090168c8), so its grass kinds (not sown in rows) are
 *   laid as before, the other kinds where they were, but none of their copies drawn here
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
	/** a tile's plants put down, each whole with its rank: the graphics card grows them */
	const lay = (/** @type {number} */ ix, /** @type {number} */ iz) => {
		const copies = [];
		coverTile(recipe, ix, iz, { tile, seed, density: o.density, open: o.open, origin: [ox, oz], rows: o.rows }).forEach(({ m: M, rank }, k) => {
			if (!kinds[k]) return;
			for (let i = 0; i < rank.length; i++) {
				m.fromArray(M, i * 16);
				const e = m.elements;
				e[13] += ay + (o.heightAt ? o.heightAt(/** @type {number} */ (e[12]), /** @type {number} */ (e[14])) : 0);
				e[12] += ax;
				e[14] += az;
				copies.push(drawn.take(kinds[k], m, { rank: /** @type {number} */ (rank[i]), near, reach, thin }));
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

/** @typedef {{ m: Float32Array, rank: Float32Array }[]} TileKinds each kind's plants in a tile, by rank, least first */

/**
 * One tile of a biome's cover, worked out from its place alone (the same tile, the same plants, every time): each kind's
 * plants in it (by its index in `recipe.cover`), their places and their ranks, least first.
 * @param {import('./index.js').Recipe} recipe @param {number} ix @param {number} iz
 * @param {{ tile?: number, seed?: number, density?: number, open?: (x: number, z: number) => boolean, origin?: [number, number], hidden?: Set<number>, rows?: number }} [o]
 *   rows: the way the floor's rows run (radians from +x towards +z; ./surfaces.js `rowsOf`), for the kinds in rows
 * @returns {TileKinds}
 */
export function coverTile(recipe, ix, iz, o = {}) {
	const tile = o.tile ?? 12, seed = o.seed ?? 1, hidden = o.hidden ?? new Set();
	const [ox, oz] = o.origin ?? [0, 0];
	const r = rng((ix * 73856093) ^ (iz * 19349663) ^ (seed * 83492791));
	/** @type {{ rank: number, m: THREE.Matrix4 }[][]} */
	const at = recipe.cover.map(() => []);
	const s = 1 / Math.sqrt(o.density ?? recipe.density), x0 = ix * tile, z0 = iz * tile;
	const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3();
	for (let x = x0; x < x0 + tile; x += s)
		for (let z = z0; z < z0 + tile; z += s) {
			const px = x + r() * s, pz = z + r() * s;
			const k = coverAt(recipe, r, px + ox, pz + oz, hidden);
			const turn = r() * Math.PI * 2, size = 0.75 + r() * 0.6, rank = r();
			if (k < 0 || (o.open && !o.open(px, pz))) continue;
			at[k]?.push({ rank, m: new THREE.Matrix4().compose(p.set(px, 0, pz), q.setFromAxisAngle(up, turn), sc.setScalar(size)) });
		}
	// the kinds a machine sowed, on their rows: each row a line across the world (so the tiles join), the rows running
	// the way `o.rows` says, none in the field's tramlines; by a chance of their own, so a biome without rows lays its
	// cover exactly as it did before rows were
	recipe.cover.forEach((c, k) => {
		if (!c.rows || hidden.has(k)) return;
		const rr = rng((ix * 2654435761) ^ (iz * 40503) ^ (seed * 83492791) ^ ((k + 1) * 97531));
		const a = o.rows ?? 0, dx = Math.cos(a), dz = Math.sin(a);
		const { spacing, along } = c.rows, jitter = c.rows.jitter ?? 0;
		// the tile's corners in the world, across and along the rows
		const xs = [x0 + ox, x0 + tile + ox], zs = [z0 + oz, z0 + tile + oz];
		let c0 = Infinity, c1 = -Infinity, s0 = Infinity, s1 = -Infinity;
		for (const wx of xs)
			for (const wz of zs) {
				const across = -dz * wx + dx * wz, on = dx * wx + dz * wz;
				c0 = Math.min(c0, across), c1 = Math.max(c1, across), s0 = Math.min(s0, on), s1 = Math.max(s1, on);
			}
		for (let j = Math.ceil(c0 / spacing); j * spacing <= c1; j++) {
			const across = j * spacing;
			if (inTrack(recipe.tramlines, across) > 0.2) continue;
			for (let n = Math.ceil(s0 / along); n * along <= s1; n++) {
				const on = n * along;
				const wx = dx * on - dz * across, wz = dz * on + dx * across;
				// the tile its place on the row lies in lays it (nudged off the line by its jitter after)
				const lx = wx - ox, lz = wz - oz;
				const px = lx + (rr() - 0.5) * jitter, pz = lz + (rr() - 0.5) * jitter;
				const turn = rr() * Math.PI * 2, size = 0.85 + rr() * 0.3, rank = rr(), keep = rr();
				if (lx < x0 || lx >= x0 + tile || lz < z0 || lz >= z0 + tile) continue;
				if (keep >= (c.fill ?? 0.85) * colonyAt(recipe, k, px + ox, pz + oz) || (o.open && !o.open(px, pz))) continue;
				at[k]?.push({ rank, m: new THREE.Matrix4().compose(p.set(px, 0, pz), q.setFromAxisAngle(up, turn), sc.setScalar(size)) });
			}
		}
	});
	return at.map((list) => {
		list.sort((a, b) => a.rank - b.rank);
		const m = new Float32Array(list.length * 16), rank = new Float32Array(list.length);
		list.forEach((e, i) => {
			e.m.toArray(m, i * 16);
			rank[i] = e.rank;
		});
		return { m, rank };
	});
}

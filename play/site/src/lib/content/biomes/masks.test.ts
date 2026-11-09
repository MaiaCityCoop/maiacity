// Plants placed the way nature places them (intent 24454c2d): a biome with masks gathers its cover at the canopy's
// edge, under or out of the crowns, in the hollows and round the trunks, keeps it off the paths, lays it in one pass
// by a dither fixed in the world (so a place grows the same whatever tiles are laid round it), and a biome without
// masks still lays exactly as before.
import { describe, expect, it } from 'vitest';
// @ts-ignore — plain JS
import { BIOMES, layTile } from './index.js';
// @ts-ignore — plain JS
import { coverTile } from './stream.js';
// @ts-ignore — plain JS
import { biomeCatalog, biomeOfCard, BiomeCardError } from './card.js';

type Tile = { m: Float32Array; rank: Float32Array; tint?: Float32Array }[];
/** every plant of a set of tiles, kind by kind, as [x, z, rank, size] */
function plants(tiles: Tile[], kinds: number) {
	const out: number[][][] = Array.from({ length: kinds }, () => []);
	for (const t of tiles)
		t.forEach(({ m, rank }, k) => {
			for (let i = 0; i < rank.length; i++) {
				const sx = Math.hypot(m[i * 16]!, m[i * 16 + 1]!, m[i * 16 + 2]!);
				out[k]!.push([m[i * 16 + 12]!, m[i * 16 + 14]!, rank[i]!, sx, m[i * 16 + 13]!, m[i * 16 + 5]! / sx]);
			}
		});
	return out;
}
const lay = (recipe: any, x0: number, z0: number, n: number, tile: number, o: any = {}) => {
	const tiles: Tile[] = [];
	for (let ix = x0; ix < x0 + n; ix++) for (let iz = z0; iz < z0 + n; iz++) tiles.push(layTile(recipe, ix, iz, { tile, seed: 707, ...o }));
	return tiles;
};

const FOOD = (BIOMES as any[]).find((b) => b.id === 'food-forest');
const kindOf = (r: any, kind: string) => r.cover.findIndex((c: any) => c.kind === kind);
/** the food forest with masks: grass in the sun, anemones and ferns in the shade, clover at the edge, strawberries in
 *  the hollows, a guild ring of strawberries round the trunks, litter at their feet; ferns and deadwood larger layers */
const MASKED: any = {
	...FOOD,
	masks: { band: 2.5, skew: 2, tilt: 4, sink: 0.02, drift: 0.12, across: 18 },
	cover: FOOD.cover.map((c: any) => {
		const own: Record<string, any> = {
			grass: { shade: -0.9, clear: 0.3 },
			tallgrass: { shade: -0.8, edge: 1.5, clear: 0.5 },
			clover: { edge: 2, clear: 0.2 },
			strawberry: { wet: 0.8, ring: [1.2, 2.6, 4] },
			anemone: { shade: 0.8 },
			litter: { ring: [0, 1.2, 4], shade: 0.5 },
			fern: { footprint: 0.8, shade: 0.7, steep: 35 },
			deadwood: { footprint: 2.4 },
			stones: { footprint: 1.2 }
		};
		return { ...c, ...(own[c.kind] ?? {}) };
	})
};

describe('a biome without masks', () => {
	for (const b of BIOMES as any[])
		it(`${b.id}: laid by the one pass exactly as the stream laid it`, () => {
			for (const [ix, iz] of [[0, 0], [-1, 2], [3, -1]]) {
				const a = layTile(b, ix, iz, { tile: 8, seed: 707 }), c = coverTile(b, ix, iz, { tile: 8, seed: 707 });
				a.forEach((t: any, k: number) => {
					expect(Array.from(t.m)).toEqual(Array.from(c[k].m));
					expect(Array.from(t.rank)).toEqual(Array.from(c[k].rank));
					expect(t.tint).toBeUndefined();
				});
			}
		});
});

describe('a biome with masks', () => {
	it('grows the same in a place whatever tiles it is laid in (from its place alone)', () => {
		const opts = { trunks: [{ x: 5, z: 6, r: 3 }], heightAt: (x: number, z: number) => 0.2 * Math.sin(x / 4) * Math.cos(z / 5) };
		const big = plants(lay(MASKED, 0, 0, 1, 12, opts), MASKED.cover.length);
		const small = plants(lay(MASKED, 0, 0, 2, 6, opts), MASKED.cover.length);
		const key = (p: number[]) => p.map((v) => v.toFixed(5)).join(',');
		big.forEach((list, k) => expect(list.map(key).sort()).toEqual(small[k]!.map(key).sort()));
		expect(big.flat().length).toBeGreaterThan(400);
		// and again, the same
		const again = plants(lay(MASKED, 0, 0, 1, 12, opts), MASKED.cover.length);
		expect(again).toEqual(big);
	});

	it('keeps every plant off the path, and the kinds that keep clear further off', () => {
		// a path 2 m wide along x = 0
		const open = (x: number, _z: number, margin = 0) => Math.abs(x) > 1 + margin;
		const got = plants(lay(MASKED, -2, -2, 4, 6, { open }), MASKED.cover.length);
		got.forEach((list, k) => {
			const clear = MASKED.cover[k].clear ?? 0;
			for (const [x] of list) expect(Math.abs(x!)).toBeGreaterThan(1 + clear);
		});
		expect(got[kindOf(MASKED, 'grass')]!.length).toBeGreaterThan(50);
	});

	it('gathers the edge kinds in the canopy’s edge band, the shade kinds under the crowns and the sun kinds out of them', () => {
		const trunks = [{ x: 0, z: 0, r: 6 }];
		const got = plants(lay(MASKED, -3, -3, 6, 6, { trunks }), MASKED.cover.length);
		const per = (k: number, inside: (d: number) => boolean) => {
			// plants a square metre in the ring of distances given, over the 36 m square
			let n = 0, area = 0;
			for (const [x, z] of got[k]!) if (inside(Math.hypot(x!, z!))) n++;
			for (let x = -17.75; x < 18; x += 0.5) for (let z = -17.75; z < 18; z += 0.5) if (inside(Math.hypot(x, z))) area += 0.25;
			return n / area;
		};
		const edge = (d: number) => Math.abs(d - 6) < 1, under = (d: number) => d > 1.5 && d < 3.5, sun = (d: number) => d > 10 && d < 16;
		const clover = kindOf(MASKED, 'clover'), anemone = kindOf(MASKED, 'anemone'), grass = kindOf(MASKED, 'grass');
		// gathered, not cut off at full: a kind as full as it stands is spread thinner, so its edge band holds it at
		// several times the open's density
		expect(per(clover, edge)).toBeGreaterThan(3 * per(clover, sun));
		expect(per(anemone, under)).toBeGreaterThan(2 * per(anemone, sun));
		expect(per(grass, sun)).toBeGreaterThan(2 * per(grass, under));
	});

	it('rings its guild round the trunks and lays litter at their feet', () => {
		// trunks on a grid 9 m apart, crowns 3 m across their radius
		const trunks: { x: number; z: number; r: number }[] = [];
		for (let x = -13.5; x < 18; x += 9) for (let z = -13.5; z < 18; z += 9) trunks.push({ x, z, r: 3 });
		const got = plants(lay(MASKED, -3, -3, 6, 6, { trunks }), MASKED.cover.length);
		const nearest = (x: number, z: number) => Math.min(...trunks.map((t) => Math.hypot(x - t.x, z - t.z)));
		const density = (k: number, lo: number, hi: number) => {
			let n = 0;
			for (const [x, z] of got[k]!) {
				const d = nearest(x!, z!);
				if (d >= lo && d < hi) n++;
			}
			return n / (trunks.length * Math.PI * (hi * hi - lo * lo));
		};
		const litter = kindOf(MASKED, 'litter'), straw = kindOf(MASKED, 'strawberry');
		expect(density(litter, 0, 1.1)).toBeGreaterThan(2 * density(litter, 3, 4.4));
		expect(density(straw, 1.4, 2.4)).toBeGreaterThan(6 * density(straw, 3, 4.4));
		// round every trunk, its colonies or not
		for (const t of trunks) expect(got[straw]!.some(([x, z]) => Math.abs(Math.hypot(x! - t.x, z! - t.z) - 1.9) < 0.7)).toBe(true);
	});

	it('grows its moist kinds in the hollows, and nothing on ground steeper than it stands on', () => {
		// a bowl every 12 m, 0.6 m deep; steep banks along z = 30
		const heightAt = (x: number, z: number) => -0.3 * (1 + Math.cos((x / 12) * Math.PI * 2)) * 0.5 * (1 + Math.cos((z / 12) * Math.PI * 2)) + (z > 30 ? (z - 30) * 1.2 : 0);
		const got = plants(lay(MASKED, -2, -2, 4, 6, { heightAt }), MASKED.cover.length);
		const straw = kindOf(MASKED, 'strawberry');
		const inHollow = (x: number, z: number) => Math.hypot(x - 12 * Math.round(x / 12), z - 12 * Math.round(z / 12)) < 3;
		const onRise = (x: number, z: number) => Math.hypot(x - 12 * Math.round(x / 12) - 6, z - 12 * Math.round(z / 12) - 6) < 3 || Math.hypot(x - 12 * Math.round(x / 12) + 6, z - 12 * Math.round(z / 12) + 6) < 3;
		let wet = 0, dry = 0;
		for (const [x, z] of got[straw]!) {
			if (inHollow(x!, z!)) wet++;
			if (onRise(x!, z!)) dry++;
		}
		expect(wet).toBeGreaterThan(1.5 * Math.max(1, dry));
		const steep = plants(lay(MASKED, 0, 5, 2, 6, { heightAt }), MASKED.cover.length)[kindOf(MASKED, 'fern')]!;
		for (const [, z] of steep) expect(z!).toBeLessThan(30.6);
	});

	it('leaves no small plant inside a larger one’s footprint (layered exclusion), and one plant a cell of its own', () => {
		const got = plants(lay(MASKED, -1, -1, 3, 6, {}), MASKED.cover.length);
		const fp = (k: number) => MASKED.cover[k].footprint ?? 1 / Math.sqrt(MASKED.density);
		let checked = 0;
		got.forEach((small, ks) =>
			got.forEach((large, kl) => {
				if (fp(kl) <= fp(ks)) return;
				const d = 0.3 * (fp(kl) + fp(ks));
				let worst = Infinity;
				for (const [lx, lz] of large)
					for (const [sx, sz] of small) {
						worst = Math.min(worst, Math.hypot(lx! - sx!, lz! - sz!) - d);
						checked++;
					}
				expect(worst).toBeGreaterThanOrEqual(-1e-6);
			})
		);
		expect(checked).toBeGreaterThan(1000);
		// kinds of one footprint never share a place: no two plants of the base layer closer than a third of it
		const base = got.flatMap((list, k) => (fp(k) === 1 / Math.sqrt(MASKED.density) ? list : []));
		const s = 1 / Math.sqrt(MASKED.density);
		let closest = Infinity;
		for (let i = 0; i < base.length; i++) for (let j = i + 1; j < base.length; j++) closest = Math.min(closest, Math.hypot(base[i]![0]! - base[j]![0]!, base[i]![1]! - base[j]![1]!));
		expect(closest).toBeGreaterThan(0.3 * s);
	});

	it('leans its sizes small, turns them freely, tilts them at most 5°, sinks their bases and drifts their colour', () => {
		const tiles = lay(MASKED, 0, 0, 2, 6, {});
		const all = plants(tiles, MASKED.cover.length).flat();
		const sizes = all.map((p) => p[3]!).sort((a, b) => a - b);
		const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length, median = sizes[sizes.length >> 1]!;
		expect(median).toBeLessThan(mean);
		expect(sizes[0]).toBeGreaterThanOrEqual(0.6 - 1e-6);
		expect(sizes[sizes.length - 1]).toBeLessThanOrEqual(1.5 + 1e-6);
		for (const p of all) {
			// the up axis leans at most 4° (the masks' tilt)
			expect(Math.acos(Math.min(1, p[5]!)) * (180 / Math.PI)).toBeLessThanOrEqual(4 + 1e-3);
			expect(p[4]).toBeCloseTo(-0.02 * p[3]!, 5);
		}
		const tints = tiles.flatMap((t) => t.flatMap((k) => (k.tint ? Array.from(k.tint) : [])));
		expect(tints.length).toBe(all.length * 3);
		expect(Math.max(...tints)).toBeLessThanOrEqual(1.12 + 1e-6);
		expect(Math.min(...tints)).toBeGreaterThanOrEqual(1 - 0.12 * 0.6 - 1e-6);
		expect(new Set(tints.map((v) => v.toFixed(3))).size).toBeGreaterThan(20);
	});

	it('stands its rows in the one pass, none in its tramlines, kept by its masks', () => {
		const FIELD: any = {
			id: 'field', label: 'A field', note: '', from: '', surface: { stubble: 8, tilled: 2 }, density: 6,
			tramlines: { every: 24, gauge: 1.8, tyre: 0.48 }, masks: {},
			cover: [
				{ kind: 'grass', share: 10, colony: 40, spread: 0.98, fill: 1, rows: { spacing: 0.25, along: 0.3, jitter: 0.02 }, clear: 0.5 },
				{ kind: 'stones', share: 2, colony: 3, spread: 0.4, footprint: 0.6 }
			]
		};
		const open = (x: number, _z: number, margin = 0) => Math.abs(x - 4) > 0.5 + margin;
		const got = plants(lay(FIELD, -1, -1, 3, 8, { open }), 2);
		expect(got[0]!.length).toBeGreaterThan(5000);
		for (const [x, z] of got[0]!) {
			expect(Math.abs(z! - 0.25 * Math.round(z! / 0.25))).toBeLessThan(0.0145);
			expect(Math.abs(x! - 4)).toBeGreaterThan(1);
			const across = 0.25 * Math.round(z! / 0.25), d = Math.abs(across - 24 * Math.round(across / 24));
			expect(Math.abs(d - 0.9)).toBeGreaterThan(0.2);
		}
		// the same from its place alone
		const halves = plants(lay(FIELD, -2, -2, 6, 4, { open }), 2);
		expect(halves[0]!.length).toBe(got[0]!.length);
	});
});

describe('a biome’s masks on its card', () => {
	it('reads back as it was written', () => {
		const card = { group: 'biomes', id: 'food-forest', version: 2, label: 'x', catalog: biomeCatalog(MASKED, { ref: (k: string, i: number) => `${'a'.repeat(64)}?kind=${i}`, label: (k: string) => k }) };
		const back = biomeOfCard(card);
		expect(back.masks).toEqual(MASKED.masks);
		back.cover.forEach((c: any, i: number) => {
			for (const key of ['footprint', 'shade', 'edge', 'clear', 'wet', 'steep', 'ring']) expect(c[key]).toEqual(MASKED.cover[i][key]);
		});
	});
	it('a card without masks reads as a biome without them', () => {
		const card = { group: 'biomes', id: 'food-forest', version: 1, label: 'x', catalog: biomeCatalog(FOOD, { ref: () => 'a'.repeat(64), label: (k: string) => k }) };
		const back = biomeOfCard(card);
		expect(back.masks).toBeUndefined();
		for (const c of back.cover as any[]) for (const key of ['footprint', 'shade', 'edge', 'clear', 'wet', 'steep', 'ring']) expect(c[key]).toBeUndefined();
	});
	for (const [part, spec, value] of [
		['cover-fern', 'Shade', '1.5'],
		['cover-fern', 'Footprint', '0 m'],
		['cover-clover', 'At the edge', '9'],
		['cover-strawberry', 'Ring to', '0.5 m'],
		['masks', 'Tilt', '12°'],
		['masks', 'Colour drift', '0.9']
	] as const)
		it(`refuses ${part}'s ${spec} of ${value}`, () => {
			const catalog: any = biomeCatalog(MASKED, { ref: () => 'a'.repeat(64), label: (k: string) => k });
			const p = catalog.parts.find((x: any) => x.id === part);
			p.specs.find((s: string[]) => s[0] === spec)[1] = value;
			expect(() => biomeOfCard({ group: 'biomes', id: 'f', version: 2, label: 'x', catalog })).toThrow(BiomeCardError);
		});
});

// @ts-ignore — plain JS
import { coverStream } from './stream.js';
describe('a biome with masks, streamed', () => {
	it('hands the renderer each plant with its colour where it stands, and lays it by the world’s trees and paths', () => {
		const taken: { at: number[]; tint?: ArrayLike<number> }[] = [];
		const drawn = { use: (ref: string) => ({ ref }), take: (_k: unknown, at: any, cover: any) => (taken.push({ at: at.elements.slice(), tint: cover.tint && Array.from(cover.tint) }), {}), give: () => {} };
		const recipe = { ...MASKED, cover: MASKED.cover.map((c: any) => ({ ...c, ref: 'a'.repeat(64) })) };
		const asked: number[] = [];
		const open = (x: number, _z: number, margin = 0) => (asked.push(margin), Math.abs(x) > 1 + margin);
		coverStream({ drawn, recipe, open, trunks: [{ x: 5, z: 5, r: 3 }], tile: 8, reach: 12, near: 6 }).update(0, 0, 999);
		expect(taken.length).toBeGreaterThan(200);
		for (const t of taken) {
			expect(t.tint).toHaveLength(3);
			expect(Math.abs(t.at[12]!)).toBeGreaterThan(1);
		}
		// the kinds that keep clear asked the world for their margin
		expect(asked.some((m) => m > 0)).toBe(true);
		// a biome without masks: no colours, as before
		taken.length = 0;
		coverStream({ drawn, recipe: { ...recipe, masks: undefined }, tile: 8, reach: 12, near: 6 }).update(0, 0, 999);
		expect(taken.length).toBeGreaterThan(100);
		expect(taken.every((t) => t.tint === undefined)).toBe(true);
	});
});

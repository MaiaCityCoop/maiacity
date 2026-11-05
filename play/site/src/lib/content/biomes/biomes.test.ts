// The biomes as they were before the tired land's surfaces and rows came (play/SPEC.md §4.11, contract v2's land part):
// every one of the existing floors must still be painted and laid exactly as before. Each biome's surfaces, sampled
// over its ground, and its cover, tile by tile, are held to fingerprints taken from the code as it was (main at
// df4faee); and the new surfaces and rows are checked on their own.
import { describe, expect, it } from 'vitest';
// @ts-ignore — plain JS
import { BIOMES, SURFACES, surfacesAt } from './index.js';
// @ts-ignore — plain JS
import { coverTile } from './stream.js';

/** FNV-1a over the bytes of some floats: a fingerprint that changes if any of them does */
function fingerprint(arrays: Float32Array[]) {
	let h = 0x811c9dc5;
	for (const a of arrays) {
		const bytes = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
		for (const b of bytes) h = Math.imul(h ^ b, 0x01000193) >>> 0;
		h = Math.imul(h ^ 0xff, 0x01000193) >>> 0;
	}
	return h.toString(16).padStart(8, '0');
}

/** a biome as it is laid: its surfaces at 400 points over 60 m, and its cover in nine tiles, as fingerprints */
function laid(recipe: any) {
	const s: number[] = [];
	for (let i = 0; i < 20; i++)
		for (let j = 0; j < 20; j++) {
			const at: any = surfacesAt(recipe.surface, i * 3.1 - 30, j * 2.9 - 30);
			for (const k of ['litter', 'humus', 'needles', 'moss', 'green', 'soil']) s.push(at[k]);
		}
	const tiles: Float32Array[] = [];
	for (let ix = -1; ix <= 1; ix++)
		for (let iz = -1; iz <= 1; iz++) for (const t of coverTile(recipe, ix, iz, { tile: 8, seed: 707 })) tiles.push(t.m, t.rank);
	return { surfaces: fingerprint([new Float32Array(s)]), cover: fingerprint(tiles) };
}

/** taken from the code before the change */
const BEFORE: Record<string, { surfaces: string; cover: string }> = {
	'food-forest': { surfaces: '6536c71c', cover: '8e42ae65' },
	'warm-food-forest': { surfaces: '3039d54c', cover: '160d10b7' },
	'beech-forest': { surfaces: '7b7d8bec', cover: '99169c20' },
	'spruce-forest': { surfaces: '6ec70bdb', cover: '03f06b3d' },
	'meadow': { surfaces: '000de99a', cover: 'd980ca91' },
	'clover-lawn': { surfaces: '84c6bbd9', cover: '5f19d769' }
};

describe('the biomes that were', () => {
	it('are all still there', () => {
		expect(BIOMES.map((b: any) => b.id).sort()).toEqual(Object.keys(BEFORE).sort());
	});
	for (const b of BIOMES as any[])
		it(`${b.id}: surfaces and cover laid exactly as before`, () => {
			expect(laid(b)).toEqual(BEFORE[b.id]);
		});
	it('the six surfaces keep their places', () => {
		expect(SURFACES.slice(0, 6)).toEqual(['litter', 'humus', 'needles', 'moss', 'green', 'soil']);
	});
});

// @ts-ignore — plain JS
import { SURFACE, inTrack } from './surfaces.js';
// @ts-ignore — plain JS
import { biomeCatalog, biomeOfCard } from './card.js';

/** a field of the tired land: tilled soil and stubble, one kind sown in rows, tramlines every 24 m */
const FIELD: any = {
	id: 'field',
	label: 'A field',
	note: '',
	from: '',
	surface: { stubble: 8, tilled: 2, dust: 1 },
	density: 6,
	tramlines: { every: 24, gauge: 1.8, tyre: 0.48 },
	cover: [
		{ kind: 'grass', ref: 'f'.repeat(64) + '?kind=1&seed=7203', share: 10, colony: 40, spread: 0.98, fill: 1, rows: { spacing: 0.25, along: 0.3, jitter: 0.02 } },
		{ kind: 'stones', ref: 'e'.repeat(64) + '?kind=6&seed=7333', share: 2, colony: 3, spread: 0.4 }
	]
};

describe('the tired land: surfaces in rows, cover in rows, tramlines', () => {
	it('has its three surfaces after the six, two of them in rows', () => {
		expect(SURFACES.slice(6)).toEqual(['tilled', 'stubble', 'dust']);
		expect(SURFACE.tilled.rows).toBe(0.36);
		expect(SURFACE.stubble.rows).toBe(0.125);
		expect(SURFACE.dust.rows).toBeUndefined();
		// a whole number of rows to a texture's tile, so its repeat keeps them
		for (const s of ['tilled', 'stubble']) {
			const it: any = (SURFACE as any)[s];
			expect(Math.abs(it.tile / it.rows - Math.round(it.tile / it.rows))).toBeLessThan(1e-9);
		}
	});
	it('reads its card back as it wrote it', () => {
		const card = { group: 'biomes', id: 'field', version: 1, label: 'A field', catalog: biomeCatalog(FIELD, { ref: (_: string, i: number) => FIELD.cover[i].ref, label: (k: string) => k }) };
		const back = biomeOfCard(card);
		expect(back.surface).toEqual(FIELD.surface);
		expect(back.tramlines).toEqual(FIELD.tramlines);
		expect(back.cover[0].rows).toEqual(FIELD.cover[0].rows);
		expect(back.cover[1].rows).toBeUndefined();
		expect(back.cover[0].ref).toBe(FIELD.cover[0].ref);
	});
	it('presses its tramlines a gauge apart, every so many metres', () => {
		expect(inTrack(FIELD.tramlines, 0.9)).toBe(1);
		expect(inTrack(FIELD.tramlines, 24 - 0.9)).toBe(1);
		expect(inTrack(FIELD.tramlines, 0)).toBe(0);
		expect(inTrack(FIELD.tramlines, 6)).toBe(0);
		expect(inTrack(null, 0.9)).toBe(0);
	});
	for (const deg of [0, 30, 90])
		it(`stands its sown kind on its rows, turned ${deg}°, none in the tramlines, each plant in one tile only`, () => {
			const a = (deg * Math.PI) / 180, dx = Math.cos(a), dz = Math.sin(a);
			const seen = new Set<string>();
			let n = 0;
			for (let ix = -2; ix <= 1; ix++)
				for (let iz = -2; iz <= 1; iz++) {
					const t = coverTile(FIELD, ix, iz, { tile: 8, seed: 707, rows: a })[0];
					for (let i = 0; i < t.rank.length; i++) {
						const x = t.m[i * 16 + 12], z = t.m[i * 16 + 14];
						// within its tile, give or take its jitter
						expect(x).toBeGreaterThanOrEqual(ix * 8 - 0.011);
						expect(x).toBeLessThan(ix * 8 + 8 + 0.011);
						const across = -dz * x + dx * z, on = dx * x + dz * z;
						const offRow = Math.abs(across - 0.25 * Math.round(across / 0.25)), offStep = Math.abs(on - 0.3 * Math.round(on / 0.3));
						expect(offRow).toBeLessThan(0.0145);
						expect(offStep).toBeLessThan(0.0145);
						expect(inTrack(FIELD.tramlines, 0.25 * Math.round(across / 0.25))).toBeLessThanOrEqual(0.2);
						const key = `${Math.round(across / 0.25)},${Math.round(on / 0.3)}`;
						expect(seen.has(key)).toBe(false);
						seen.add(key);
						n++;
					}
				}
			// 32 m × 32 m at 0.25 × 0.3 m, less the tramlines' rows: most of 13,653
			expect(n).toBeGreaterThan(11000);
			expect(n).toBeLessThan(13700);
		});
	it('scatters its other kinds as before, never the sown one', () => {
		const t = coverTile(FIELD, 0, 0, { tile: 8, seed: 707 });
		expect(t[1].rank.length).toBeGreaterThan(0);
		const scattered = coverTile({ ...FIELD, cover: [{ ...FIELD.cover[0], rows: undefined }, FIELD.cover[1]] }, 0, 0, { tile: 8, seed: 707 });
		// with rows, the sown kind takes no share of the scatter: the stones stand where they would alone
		const alone = coverTile({ ...FIELD, cover: [{ ...FIELD.cover[0], rows: undefined }, FIELD.cover[1]] }, 0, 0, { tile: 8, seed: 707, hidden: new Set([0]) });
		expect(Array.from(t[1].m)).toEqual(Array.from(alone[1].m));
		expect(scattered[0].rank.length).toBeGreaterThan(0);
	});
});

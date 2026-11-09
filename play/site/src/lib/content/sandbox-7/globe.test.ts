// Sandbox 7 is the old planet (intent 8d683ad6, c5 and c6): the same cards, the same twelve pentagons and as many cards
// of each biome as the old code drew from the same maps; and each biome the old one's colours, height and trees, every
// card standing where its biome puts it.
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { BIOMES, census, WATER } from './globe';
import { biomes, planet, tiles } from './fixture';
import { colourOf, topOf, treesOn } from './scene';

/**
 * The old planet, measured once (2026-11-09) by running the old code (the old Sandbox 2's globe and maps, its mountain
 * ranges drawn on a 2048 × 1024 canvas in Chromium) on its own maps: its cards per biome, land cards and trees.
 */
const OLD = {
	cards: 51842,
	counts: { sea: 32105, shallow: 2589, ice: 2058, sand: 2363, earth: 2066, grass: 1813, forest: 3523, taiga: 1936, mountain: 2052, snow: 1337 },
	land: 15090,
	trees: 14195
};

/** the old planet's biomes table and its tree, as its code wrote them */
const OLD_BIOMES = {
	sea: { shades: ['#4fc1c8', '#2a93a8', '#154e6b'], lift: -0.6, trees: 0 },
	shallow: { shades: ['#a9e6e6', '#7fd6db', '#5cc7d1'], lift: -0.35, trees: 0 },
	ice: { shades: ['#f4f9fc', '#e3eef5', '#cfe0ec'], lift: -0.3, trees: 0 },
	sand: { shades: ['#f2d9a4', '#e9c98c', '#dcb87a'], lift: 0.05, trees: 0 },
	earth: { shades: ['#d2bf9c', '#bfa780', '#a89066'], lift: 0.1, trees: 0.06 },
	grass: { shades: ['#a9d98a', '#8fc773', '#79b45f'], lift: 0.12, trees: 0.4 },
	forest: { shades: ['#6fae6a', '#4f9459', '#3d7d4a'], lift: 0.2, trees: 2.4 },
	taiga: { shades: ['#5f9a7e', '#43816a', '#336655'], lift: 0.22, trees: 2.0 },
	mountain: { shades: ['#bdb5a8', '#9e968a', '#7f776c'], lift: 0.6, trees: 0.5 },
	snow: { shades: ['#fbfdff', '#eef4f9', '#d9e6f0'], lift: 0.28, trees: 0 }
};
const OLD_TREE = { trunk: '#8b5e3c', canopy: ['#3f8f5a', '#5aa66a', '#2f7a4c'], fruit: '#e0524a', trunkHeight: 0.55, canopyRadius: 0.42, fruited: 0.35 };

describe('the same planet', () => {
	const T = tiles();
	test('51,842 cards at frequency 72: twelve pentagons, the rest hexagons', () => {
		expect(planet.frequency).toBe(72);
		expect(T).toHaveLength(10 * 72 * 72 + 2);
		expect(T).toHaveLength(OLD.cards);
		expect(T.filter((t) => t.corners.length === 5)).toHaveLength(12);
		expect(T.filter((t) => t.corners.length === 6)).toHaveLength(T.length - 12);
	});
	test('every card’s neighbours share an edge with it, each across one of its edges, and it theirs', () => {
		T.forEach((t, i) => {
			expect(t.edges).toHaveLength(t.corners.length);
			expect([...t.edges].sort((a, b) => a - b)).toEqual([...t.neighbours].sort((a, b) => a - b));
			for (const [k, j] of t.edges.entries()) {
				const o = T[j]!;
				expect(o.edges).toContain(i);
				// the two share the edge's two corners
				const a = t.corners[k]!, b = t.corners[(k + 1) % t.corners.length]!;
				const has = (p: number[]) => o.corners.some((c) => Math.hypot(c[0] - p[0]!, c[1] - p[1]!, c[2] - p[2]!) < 1e-9);
				expect(has(a) && has(b)).toBe(true);
			}
		});
	});
	test('as many cards of each biome as the old planet, within 1 %, and its land cards within 0.5 %', () => {
		const now = census(T);
		console.log('the planet’s cards by biome:', JSON.stringify(now));
		for (const b of BIOMES) expect(`${b}: ${Math.abs(now[b] - OLD.counts[b]) <= OLD.counts[b] * 0.01}`).toBe(`${b}: true`);
		const land = T.filter((t) => !WATER.has(t.biome)).length;
		console.log(`land cards: ${land} (the old planet: ${OLD.land})`);
		expect(Math.abs(land - OLD.land)).toBeLessThanOrEqual(OLD.land * 0.005);
	});
});

describe('heights and paint', () => {
	const T = tiles();
	test('every biome keeps the old planet’s shades, lift and trees, and the tree its look', () => {
		expect(biomes.kinds).toEqual(OLD_BIOMES as typeof biomes.kinds);
		expect(biomes.tree).toEqual(OLD_TREE);
	});
	test('a card stands at the radius and its biome’s lift; a sea card lower the deeper it is', () => {
		for (const [i, t] of T.entries()) {
			const want = planet.radius + OLD_BIOMES[t.biome].lift - (t.biome === 'sea' ? t.value * 0.25 : 0);
			if (Math.abs(topOf(t, planet, biomes) - want) > 1e-9) throw new Error(`card ${i} (${t.biome}) stands at ${topOf(t, planet, biomes)}, not ${want}`);
		}
		const seas = T.filter((t) => t.biome === 'sea');
		const deep = seas.reduce((a, t) => (t.value > a.value ? t : a)), shelf = seas.reduce((a, t) => (t.value < a.value ? t : a));
		expect(topOf(deep, planet, biomes)).toBeLessThan(topOf(shelf, planet, biomes));
		// the highest land is the mountains, the lowest the deep sea
		expect(Math.max(...Object.values(biomes.kinds).map((k) => k.lift))).toBe(biomes.kinds.mountain.lift);
	});
	test('a card’s colour is its biome’s shade by its height band, the sea ramped by depth', () => {
		const c = new THREE.Color(), s = new THREE.Color();
		for (const [i, t] of T.entries()) {
			colourOf(t, i, biomes, c);
			const shades = OLD_BIOMES[t.biome].shades;
			if (t.biome === 'sea') {
				const d = Math.min(1, t.value) * 2;
				s.set(shades[d < 1 ? 0 : 1]!).lerp(new THREE.Color(shades[d < 1 ? 1 : 2]!), d < 1 ? d : d - 1);
			} else s.set(shades[t.value < 0.3 ? 0 : t.value < 0.65 ? 1 : 2]!);
			// the jitter is ±1.5 % of lightness
			const hc = { h: 0, s: 0, l: 0 }, hs = { h: 0, s: 0, l: 0 };
			c.getHSL(hc);
			s.getHSL(hs);
			if (Math.abs(hc.l - hs.l) > 0.0151) throw new Error(`card ${i} (${t.biome}) is painted ${c.getHexString()}, not near ${s.getHexString()}`);
		}
	});
	test('the trees grow by their biome’s rate, as many as on the old planet', () => {
		const trees = T.reduce((a, t, i) => a + treesOn(i, biomes.kinds[t.biome].trees), 0);
		console.log(`trees: ${trees} (the old planet: ${OLD.trees})`);
		expect(Math.abs(trees - OLD.trees)).toBeLessThanOrEqual(OLD.trees * 0.01);
		// no tree on the water
		expect(T.every((t, i) => !WATER.has(t.biome) || treesOn(i, biomes.kinds[t.biome].trees) === 0)).toBe(true);
	});
});

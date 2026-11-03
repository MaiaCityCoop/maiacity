import { describe, expect, it } from 'vitest';
import { BIOMES, PLOTS, UNBUILDABLE, generateMap, type Biome } from './map';

describe('the world map', () => {
	it('grows the same map from the same seed', () => {
		const json = (seed: string) => JSON.stringify(generateMap(seed));
		expect(json('rio-1234')).toBe(json('rio-1234'));
		expect(json('rio-1234')).not.toBe(json('rio-1235'));
	});

	it('has plots of every buildable biome only, each one a sensible size, and mountains, lakes and forests', () => {
		for (const seed of ['rio-1234', 'serra-77', 'duna-4410']) {
			const { plots, lakes, features } = generateMap(seed);
			expect(lakes.length).toBeGreaterThanOrEqual(1);
			expect(features.filter((f) => f.kind === 'conifer').length).toBeGreaterThan(1000);
			expect(plots.length).toBe(PLOTS);
			for (const b of Object.keys(BIOMES)) expect(plots.some((p) => p.biome === b)).toBe(!UNBUILDABLE.includes(b as Biome));
			expect(generateMap(seed).massif.peaks.length).toBeGreaterThan(10);
			for (const p of plots) {
				expect(p.area).toBeGreaterThan(4000);
				expect(p.area).toBeLessThan(60000);
			}
		}
	});
});

import { describe, expect, it } from 'vitest';
import { BIOMES, generateMap } from './map';

describe('the world map', () => {
	it('grows the same map from the same seed', () => {
		expect(generateMap('rio-1234').svg).toBe(generateMap('rio-1234').svg);
		expect(generateMap('rio-1234').svg).not.toBe(generateMap('rio-1235').svg);
	});

	it('has plots of every biome, each one a sensible size', () => {
		for (const seed of ['rio-1234', 'serra-77', 'duna-4410']) {
			const { plots } = generateMap(seed);
			expect(plots.length).toBeGreaterThan(100);
			for (const b of Object.keys(BIOMES)) expect(plots.some((p) => p.biome === b)).toBe(true);
			for (const p of plots) {
				expect(p.area).toBeGreaterThan(4000);
				expect(p.area).toBeLessThan(60000);
			}
		}
	});
});

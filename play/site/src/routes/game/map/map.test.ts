import { describe, expect, it } from 'vitest';
import { BIOMES, M2_PER_PERSON, PEOPLE, PLOTS, SEED, UNBUILDABLE, generateMap, mulberry32, nearLine, type Biome } from './map';

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
			// every plot a village of hundreds to a few thousand, all of them together exactly PEOPLE at M2_PER_PERSON each
			for (const p of plots) {
				expect(p.people).toBeGreaterThan(300);
				expect(p.people).toBeLessThan(5000);
				expect(Math.abs(p.area / p.people - M2_PER_PERSON)).toBeLessThan(5);
			}
			expect(plots.reduce((t, p) => t + p.people, 0)).toBe(PEOPLE);
			expect(Math.abs(plots.reduce((t, p) => t + p.area, 0) - PEOPLE * M2_PER_PERSON)).toBeLessThan(PLOTS);
		}
	});

	it('measures how far a point is from the river as the whole river would, up to its reach', () => {
		const { river } = generateMap(SEED), reach = 282, near = nearLine(river, reach), rand = mulberry32(7);
		for (let k = 0; k < 4000; k++) {
			const x = -400 + rand() * 7500, y = -400 + rand() * 5300;
			let d = Infinity;
			for (let i = 1; i < river.length; i++) {
				const [ax, ay] = river[i - 1], [bx, by] = river[i], vx = bx - ax, vy = by - ay;
				const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
				d = Math.min(d, Math.hypot(x - (ax + vx * t), y - (ay + vy * t)));
			}
			expect(near(x, y)).toBe(Math.min(d, reach));
		}
	});
});

import { describe, expect, it } from 'vitest';
import { buildCity, byRiver, TOWER } from './city';
import { generateMap, inside } from './map';

describe('the city view', () => {
	const map = generateMap('rio-1234');
	const city = buildCity(map);

	it('grows the same city from the same map', () => {
		expect(JSON.stringify(buildCity(generateMap('rio-1234')))).toBe(JSON.stringify(city));
	});

	it('stands one tower at the centre of every plot, with its master dome and domes round it, all on the plot and clear of each other', () => {
		const towers = city.domes.filter((d) => d.kind === 'tower');
		expect(towers.length).toBe(map.plots.length);
		for (const t of towers) {
			const p = map.plots.find((q) => q.id === t.plot)!;
			expect(t.x).toBe(p.centre[0]);
			expect(t.y).toBe(p.centre[1]);
			expect(t.r).toBe(TOWER);
		}
		expect(city.domes.filter((d) => d.kind === 'master').length).toBeGreaterThan(map.plots.length * 0.8);
		expect(city.domes.length).toBeGreaterThan(map.plots.length * 10);
		const byPlot = new Map<number, typeof city.domes>();
		for (const d of city.domes) (byPlot.get(d.plot) ?? byPlot.set(d.plot, []).get(d.plot)!).push(d);
		for (const [id, list] of byPlot) {
			const p = map.plots.find((q) => q.id === id)!;
			for (const d of list) expect(inside(p.outline, d.x, d.y)).toBe(true);
			for (let i = 0; i < list.length; i++)
				for (let j = i + 1; j < list.length; j++) expect(Math.hypot(list[i].x - list[j].x, list[i].y - list[j].y)).toBeGreaterThan(list[i].r + list[j].r);
		}
	});

	it('plants fruit trees on the plots and deep jungle only between them, never in water', () => {
		expect(city.trees.length).toBeGreaterThan(map.plots.length * 40);
		expect(city.trees.every((t) => t.plot)).toBe(true);
		expect(city.jungle.length).toBeGreaterThan(10000);
		for (const t of city.jungle.filter((_, i) => i % 50 === 0)) {
			expect(t.plot).toBe(false);
			expect(map.plots.some((p) => inside(p.outline, t.x, t.y))).toBe(false);
			expect(byRiver(map, t.x, t.y)).toBe(false);
			expect(map.lakes.some((ring) => inside(ring, t.x, t.y))).toBe(false);
		}
	});
});

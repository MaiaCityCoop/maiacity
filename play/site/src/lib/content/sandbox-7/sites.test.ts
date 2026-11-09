// The candidate regions on the planet (intent 8d683ad6, c9): at least six, each at least 2,000 km² with no town of
// 10,000 people or more, each with its people, climate, the land as it is, water, legal route, access and risks, scored
// 1 to 5 on water, land, legal, access and climate, each standing on a land card of the globe, and every one with its
// sources kept in play's Artifacts (each source an artifact's UUID). The scene pins each where it is.
import { describe, expect, test } from 'bun:test';
import { WATER } from './globe';
import { biomes, planet, sites, tiles } from './fixture';
import { buildPlanet, tileAt, topOf } from './scene';
import { unitAt } from './maps';
import { ranked, SCORES } from './sites';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('the sites', () => {
	const R = sites.regions;
	test('at least six regions, said what they are chosen by', () => {
		expect(R.length).toBeGreaterThanOrEqual(6);
		expect(sites.note.length).toBeGreaterThan(20);
		expect(sites.criteria.length).toBeGreaterThanOrEqual(3);
	});
	test('each at least 2,000 km², no town of 10,000 or more, its density and the year it was counted', () => {
		for (const s of R) {
			expect(`${s.name}: ${s.area_km2 >= 2000}`).toBe(`${s.name}: true`);
			expect(`${s.name}: ${s.largest_settlement.population < 10_000}`).toBe(`${s.name}: true`);
			expect(s.largest_settlement.name.length).toBeGreaterThan(1);
			expect(s.density_per_km2).toBeGreaterThan(0);
			expect(s.density_year).toBeGreaterThanOrEqual(2015);
			expect(s.population).toBeGreaterThan(0);
		}
	});
	test('each with its climate, the land as it is, water, legal route, access, risks and what was done nearby', () => {
		for (const s of R) {
			expect(s.rain_mm).toBeGreaterThan(0);
			expect(s.koppen).toMatch(/^[A-E][A-Za-z]{1,2}/);
			expect(s.temp_c).toHaveLength(2);
			expect(s.temp_c[0]).toBeLessThan(s.temp_c[1]);
			for (const k of ['land_state', 'water', 'legal_route', 'access', 'risks', 'precedents'] as const) expect(`${s.name} ${k}: ${s[k].length > 20}`).toBe(`${s.name} ${k}: true`);
		}
	});
	test('scored 1 to 5 on water, land, legal, access, climate, restoration and precedent, listed best first', () => {
		for (const s of R) for (const k of SCORES) expect(`${s.name} ${k}: ${Number.isInteger(s.scores[k]) && s.scores[k] >= 1 && s.scores[k] <= 5}`).toBe(`${s.name} ${k}: true`);
		const totals = ranked(sites).map((r) => r.total);
		expect(totals).toEqual([...totals].sort((a, b) => b - a));
	});
	test('its box holds its centre, and its centre falls on a land card of the globe', () => {
		const T = tiles();
		for (const s of R) {
			const [south, west, north, east] = s.bbox;
			expect(`${s.name}: ${s.lat >= south && s.lat <= north && s.lon >= west && s.lon <= east}`).toBe(`${s.name}: true`);
			const t = T[tileAt(T, unitAt(s.lat, s.lon))]!;
			expect(`${s.name}: ${t.biome} ${WATER.has(t.biome)}`).toBe(`${s.name}: ${t.biome} false`);
		}
	});
	test('every one with its sources, each an artifact play keeps (by its UUID), its title and its link', () => {
		for (const s of R) {
			expect(`${s.name}: ${s.sources.length >= 1}`).toBe(`${s.name}: true`);
			for (const src of s.sources) {
				expect(src.artifact).toMatch(UUID);
				expect(src.title.length).toBeGreaterThan(3);
				expect(src.url).toMatch(/^https?:\/\//);
			}
		}
	});
	test('the scene pins each site at its centre, on its card’s top', () => {
		const T = tiles();
		const built = buildPlanet(T, planet, biomes, R.map((s) => ({ lat: s.lat, lon: s.lon })));
		expect(built.markers.count).toBe(R.length);
		R.forEach((s, i) => {
			const up = unitAt(s.lat, s.lon);
			const pin = built.pins[i]!;
			expect(pin.up.toArray().map((x) => Number(x.toFixed(9)))).toEqual(up.map((x) => Number(x.toFixed(9))));
			expect(pin.at.length()).toBeCloseTo(topOf(T[tileAt(T, up)]!, planet, biomes), 9);
		});
		built.dispose();
	});
});

/**
 * SANDBOX 7 · THE SITES — the candidate regions where a new food-forest city could grow (Samuel 2026-11-09: 2,000 km²
 * or more, only villages of under 10,000 people, barren or degraded land that can be brought back), as the planet's
 * `sites` config holds them: each with its numbers, its scores and its sources, every source an artifact play keeps.
 */
/** each 1 to 5: water, land to be had, the legal path, access and the climate for a food forest; and how well building
 * there restores (degraded land, nobody displaced, no intact habitat cleared) and what restoration nearby already shows */
export type Score = { water: number; land: number; legal: number; access: number; climate: number; restoration: number; precedent: number };
export type Source = { artifact: string; title: string; url: string };
export type Site = {
	name: string;
	country: string;
	lat: number;
	lon: number;
	/** south, west, north, east */
	bbox: [number, number, number, number];
	area_km2: number;
	population: number;
	density_per_km2: number;
	density_year: number;
	largest_settlement: { name: string; population: number };
	koppen: string;
	rain_mm: number;
	/** the coldest and the warmest month's mean, °C */
	temp_c: [number, number];
	land_state: string;
	water: string;
	/** euros a hectare, low and high, where known */
	land_price_eur_ha: [number, number] | null;
	legal_route: string;
	access: string;
	risks: string;
	precedents: string;
	scores: Score;
	/** how a number is known where it is not plain: an estimate, a range, a part of a whole */
	notes: Partial<Record<'area' | 'density' | 'rain' | 'temp' | 'land_price', string>>;
	sources: Source[];
};
export type Sites = { note: string; criteria: string[]; regions: Site[] };

export const SCORES: (keyof Score)[] = ['water', 'land', 'legal', 'access', 'climate', 'restoration', 'precedent'];
export const total = (s: Site) => SCORES.reduce((a, k) => a + s.scores[k], 0);

/** the regions best first (the sum of their scores), each with its place in the config */
export const ranked = (sites: Sites) => sites.regions.map((site, index) => ({ site, index, total: total(site) })).sort((a, b) => b.total - a.total || a.index - b.index);

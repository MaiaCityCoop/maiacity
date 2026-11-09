// Sandbox 7 is a page of play (intent 8d683ad6, c4): a tile on the dashboard with the old planet's picture, its route on
// the world kit's page, the places list pointing at it; the page reads its planet, biomes and sites from its sandbox's
// config, and the code under src/lib/content/sandbox-7 and src/routes/sandbox-7 holds none of their values (no shade, no
// lift, no map's hash, no site's place), nor anything of the old repository.
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLACES } from '../game/places.js';
import { biomes, planet, sites } from './fixture';

const SITE = join(import.meta.dir, '../../../..');
const read = (p: string) => readFileSync(join(SITE, p), 'utf8');
const ROUTE = 'src/routes/sandbox-7/+page.svelte';
const COVER = '88528c9521de8682f676c3e2539c3a19ffd2a4731a2343410761025e27fde55e';
const code = () => {
	const dir = 'src/lib/content/sandbox-7';
	return [ROUTE, ...readdirSync(join(SITE, dir)).filter((f) => !/\.test\.ts$/.test(f)).map((f) => `${dir}/${f}`)].map((p) => ({ p, text: read(p) }));
};

describe('Sandbox 7 on play', () => {
	test('a tile on the dashboard with the old planet’s picture', () => {
		const tile = /\{ href: '\/sandbox-7\/', label: 'Sandbox 7', note: '[^']+', cover: '([0-9a-f]{64})\.jpg' \}/.exec(read('src/routes/+page.svelte'));
		expect(tile?.[1]).toBe(COVER);
	});
	test('its page is the world kit’s WorldPage', () => {
		const page = read(ROUTE);
		expect(page).toContain("import { WorldPage } from '$lib/content/sandbox-kit'");
		expect(page).toContain('<WorldPage');
	});
	test('the places list points the planet at /sandbox-7/', () => {
		const place = PLACES.find((p) => p.id === 'sandbox-2');
		expect(place?.route).toBe('/sandbox-7/');
		expect(place?.label).toBe('Sandbox 7');
	});
});

describe('data', () => {
	test('the page reads its planet, biomes and sites from its sandbox’s config', () => {
		const page = read(ROUTE);
		expect(page).toContain('loadConfig(SANDBOX.seven)');
		for (const c of ['planet', 'biomes', 'sites']) expect(page).toMatch(new RegExp(`configs\\.${c}`));
	});
	test('no shade, lift, map hash or site’s place of the configs is written in the code', () => {
		const shades = [...Object.values(biomes.kinds).flatMap((k) => k.shades), biomes.tree.trunk, biomes.tree.fruit, ...biomes.tree.canopy].map((s) => s.toLowerCase());
		const hashes = Object.values(planet.maps).map((m) => m.file.slice(0, 64));
		const places = sites.regions.flatMap((s) => [`${s.lat}, ${s.lon}`, `lat: ${s.lat}`, `lon: ${s.lon}`]);
		for (const { p, text } of code()) {
			const t = text.toLowerCase();
			for (const s of shades) expect(`${p}: ${s} ${t.includes(s)}`).toBe(`${p}: ${s} false`);
			for (const h of hashes) expect(`${p}: ${h} ${t.includes(h)}`).toBe(`${p}: ${h} false`);
			for (const s of places) expect(`${p}: ${s} ${text.includes(s)}`).toBe(`${p}: ${s} false`);
			// a lift is the config's: no biome is given a height in the code
			expect(`${p}: ${/\blift\s*[:=]\s*-?\d/.test(text)}`).toBe(`${p}: false`);
		}
	});
	test('nothing of the old repository is named', () => {
		// the names written in pieces, so this file is not itself a match for the check's grep
		const old = new RegExp([['SNAPSHOT', '2611101'].join('_'), ['maia', 'content'].join('/'), ['maia', 'site'].join('/')].join('|'));
		for (const { p, text } of code()) expect(`${p}: ${old.test(text)}`).toBe(`${p}: false`);
	});
});

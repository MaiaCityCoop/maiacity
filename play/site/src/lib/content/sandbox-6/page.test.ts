// Sandbox 6 is a page of play (intent 67f0404a, c4) and its village is play's data (c10): a tile on the dashboard,
// its route on the world kit's page, the places list pointing at it; the page reads its village and audit from its
// sandbox's config, and the code under src/lib/content/sandbox-6 and src/routes/sandbox-6 holds no site of the village
// and no input of its audit, nor anything of the old repository.
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import village from '../../../../../api/import/sandboxes/sandbox-6/village.json';
import audit from '../../../../../api/import/sandboxes/sandbox-6/audit.json';
import { PLACES } from '../game/places.js';

const SITE = join(import.meta.dir, '../../../..');
const read = (p: string) => readFileSync(join(SITE, p), 'utf8');
const ROUTE = 'src/routes/sandbox-6/+page.svelte';
const code = () => {
	const dir = 'src/lib/content/sandbox-6';
	return [ROUTE, ...readdirSync(join(SITE, dir)).filter((f) => !/\.test\.ts$/.test(f)).map((f) => `${dir}/${f}`)].map((p) => ({ p, text: read(p) }));
};

describe('Sandbox 6 on play', () => {
	test('a tile on the dashboard with its cover', () => {
		const tile = /\{ href: '\/sandbox-6\/', label: 'Sandbox 6', note: '[^']+', cover: '([0-9a-f]{64})\.jpg' \}/.exec(read('src/routes/+page.svelte'));
		expect(tile).not.toBeNull();
	});
	test('its page is the world kit’s WorldPage', () => {
		const page = read(ROUTE);
		expect(page).toContain("import { WorldPage } from '$lib/content/sandbox-kit'");
		expect(page).toContain('<WorldPage');
	});
	test('the places list points at /sandbox-6/', () => {
		expect(PLACES.find((p) => p.id === 'sandbox-6')?.route).toBe('/sandbox-6/');
	});
});

describe('data', () => {
	test('the page reads its village and audit from its sandbox’s config', () => {
		const page = read(ROUTE);
		expect(page).toContain('loadConfig(SANDBOX.six)');
		expect(page).toMatch(/configs\.village/);
		expect(page).toMatch(/configs\.audit/);
	});
	test('no site of the village and no input of the audit is written in the code', () => {
		// every site's coordinates, and every audited value, as they would be written
		const sites = Object.values(village.plans).flatMap((p) => p.sites.filter((s) => s.x !== 0 || s.z !== 0).map((s) => [String(s.x), String(s.z)]));
		const inputs = Object.values(audit.inputs).map((i) => i.value).filter((x): x is number => typeof x === 'number' && x > 10).map(String);
		for (const { p, text } of code()) {
			for (const [x, z] of sites) expect(`${p}: ${text.includes(`${x}, ${z}`) || text.includes(`x: ${x}, z: ${z}`)}`).toBe(`${p}: false`);
			for (const v of inputs) expect(`${p}: ${new RegExp(`(?<![\\w.])${v.replace('.', '\\.')}(?![\\w.])`).test(text)}`).toBe(`${p}: false`);
		}
	});
	test('nothing of the old repository is named', () => {
		for (const { p, text } of code()) expect(`${p}: ${/SNAPSHOT_2611101|maia\/content|maia\/site/.test(text)}`).toBe(`${p}: false`);
	});
});

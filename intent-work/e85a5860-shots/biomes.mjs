#!/usr/bin/env node
/*
 * INTENT e85a5860'S LOOK (c5), EACH GRASS BIOME — the grass alone (play/site/scripts/grass-shots/harness.js `?biome=`)
 * on WebGPU, chosen on the card, in avenBOX's Chromium in software: each biome's own grass where its recipe grows it,
 * from the eye (1.65 m, looking a little down) and in c4's view (looking 0.3 rad down).
 *
 *   node intent-work/e85a5860-shots/biomes.mjs --head http://localhost:5192 --out <dir>
 * Out: <out>/<biome>-eye.png, <biome>-down.png, biomes.json (blades by level).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');
const { chromium } = createRequire(join(REPO, 'play/site/package.json'))('playwright');
const HARNESS = readFileSync(join(REPO, 'play/site/scripts/grass-shots/harness.js'), 'utf8');
const argv = process.argv.slice(2);
const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined);
const HEAD = arg('--head'), OUT = arg('--out') ?? join(HERE, 'out');
// --device small: a phone's budget at 390 × 844; else a desktop's at --size (1280x720)
const DEVICE = arg('--device') ?? 'desktop', [VW, VH] = (arg('--size') ?? (DEVICE === 'small' ? '390x844' : '1280x720')).split('x').map(Number);
const ONLY = arg('--biomes')?.split(',');
if (!HEAD) throw new Error('give --head <this branch’s dev server>');
mkdirSync(OUT, { recursive: true });
const log = (s) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);
const browser = await chromium.launch({ args: ['--disable-gpu-watchdog', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--ignore-gpu-blocklist'] });
const png = (name, url) => writeFileSync(join(OUT, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
const results = {};
for (const biome of ONLY ?? ['meadow', 'roadside-verge', 'clover-lawn', 'food-forest']) {
	const page = await browser.newPage({ viewport: { width: VW, height: VH } });
	page.setDefaultTimeout(10 * 60e3);
	page.on('pageerror', (e) => log(`${biome}: page error: ${String(e).slice(0, 200)}`));
	await page.goto(`${HEAD}/robots.txt`);
	await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
	await page.evaluate(([b, d]) => history.replaceState(null, '', `/?backend=webgpu&biome=${b}&device=${d}`), [biome, DEVICE]);
	await page.addScriptTag({ type: 'module', content: HARNESS });
	await page.waitForFunction(() => window.__h);
	await page.evaluate(() => window.__h.ready);
	for (const [view, pitch] of [['eye', -0.12], ['down', -0.3]]) {
		await page.evaluate(async (p) => {
			window.__h.look(0.3, 1.65, 0.2, 0, p);
			for (let i = 0; i < 4; i++) await window.__h.frame(100 + i / 24);
		}, pitch);
		png(`${biome}-${DEVICE}-${view}`, await page.evaluate(() => window.__h.snap()));
	}
	results[biome] = { backend: await page.evaluate(() => window.__rendererBackend), grass: await page.evaluate(() => window.__h.field.mode), blades: await page.evaluate(async () => window.__h.field.readBack()) };
	log(`${biome}: ${JSON.stringify(results[biome])}`);
	await page.close();
}
writeFileSync(join(OUT, 'biomes.json'), JSON.stringify(results, null, 1));
await browser.close();

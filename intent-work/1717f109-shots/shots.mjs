#!/usr/bin/env node
/*
 * INTENT 1717f109'S LOOK (c3), THE VERGE AND THE LAWN — each biome's grass alone (play/site/scripts/grass-shots/harness.js
 * `?biome=`) on WebGPU in avenBOX's Chromium in software, main against head: each side's own harness (its pins of the
 * biome's grass and cover) on its own dev server, from the eye (1.65 m, looking a little down) and in c1's view (0.3 rad
 * down); then each view main | head side by side.
 *
 *   node intent-work/1717f109-shots/shots.mjs --main <url> --main-tree <checkout> --head <url> --out <dir>
 * Out: <out>/<side>-<biome>-<view>.png and <out>/<biome>-<view>.png (main left, head right).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');
const req = createRequire(join(REPO, 'play/site/package.json'));
const { chromium } = req('playwright');
const argv = process.argv.slice(2);
const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined);
const MAIN = arg('--main'), TREE = arg('--main-tree'), HEAD = arg('--head'), OUT = arg('--out') ?? join(HERE, 'out');
if (!MAIN || !TREE || !HEAD) throw new Error('give --main <url> --main-tree <checkout> --head <url>');
mkdirSync(OUT, { recursive: true });
const HARNESS = { main: readFileSync(join(TREE, 'play/site/scripts/grass-shots/harness.js'), 'utf8'), head: readFileSync(join(REPO, 'play/site/scripts/grass-shots/harness.js'), 'utf8') };
const log = (s) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);
const browser = await chromium.launch({ args: ['--disable-gpu-watchdog', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--ignore-gpu-blocklist'] });
const VIEWS = [['eye', -0.12], ['down', -0.3]];
const shots = {};
for (const [side, url] of [['main', MAIN], ['head', HEAD]])
	for (const biome of ['roadside-verge', 'clover-lawn']) {
		const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
		page.setDefaultTimeout(15 * 60e3);
		page.on('pageerror', (e) => log(`${side} ${biome}: page error: ${String(e).slice(0, 200)}`));
		await page.goto(`${url}/robots.txt`);
		await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
		await page.evaluate((b) => history.replaceState(null, '', `/?backend=webgpu&biome=${b}`), biome);
		await page.addScriptTag({ type: 'module', content: HARNESS[side] });
		await page.waitForFunction(() => window.__h);
		await page.evaluate(() => window.__h.ready);
		for (const [view, pitch] of VIEWS) {
			await page.evaluate(async (p) => {
				window.__h.look(0.3, 1.65, 0.2, 0, p);
				for (let i = 0; i < 4; i++) await window.__h.frame(100 + i / 24);
			}, pitch);
			const png = await page.evaluate(() => window.__h.snap());
			writeFileSync(join(OUT, `${side}-${biome}-${view}.png`), Buffer.from(png.split(',')[1], 'base64'));
			(shots[`${biome}-${view}`] ??= {})[side] = png;
		}
		log(`${side} ${biome}: shot`);
		await page.close();
	}
// each view main | head, labelled, in the browser's own canvas
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
for (const [name, { main, head }] of Object.entries(shots)) {
	const png = await page.evaluate(async ([a, b]) => {
		const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
		const [A, B] = await Promise.all([load(a), load(b)]);
		const c = document.createElement('canvas');
		(c.width = 2560), (c.height = 720);
		const g = c.getContext('2d');
		g.drawImage(A, 0, 0);
		g.drawImage(B, 1280, 0);
		g.font = 'bold 36px sans-serif';
		g.fillStyle = '#fff';
		g.fillText('main', 24, 52);
		g.fillText('head', 1304, 52);
		return c.toDataURL('image/png');
	}, [main, head]);
	writeFileSync(join(OUT, `${name}.png`), Buffer.from(png.split(',')[1], 'base64'));
}
await browser.close();
log(`out: ${OUT}`);

#!/usr/bin/env node
// c3 of intent 0b4c007b in avenBOX: Sandbox 1, Sandbox 3 (the Old City) and Sandbox 5 at noon, from avenBOX's Chromium
// (SwiftShader, software rendering; no Mac, no GPU), on main and on the fix's head, each served by vite dev with
// PLAY_API on the read-only proxy (scripts/macjob/proxy.mjs). The hour pinned (window.__interiorHour = 12) and every
// Math.random one sequence (SEEDED_RANDOM), each world left until QUIET (nothing building, no picture being kept).
//   node play/shots/0b4c007b/shoot.mjs --site main=http://localhost:5191 --site head=http://localhost:5192 [--out dir]
// A software frame takes seconds, so a shot may take minutes (960×540). Writes <out>/<world>-<tree>.png and <out>/numbers.json: each picture's mean R, G, B and its red-to-blue ratio.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEEDED_RANDOM, QUIET } from '../../site/scripts/macjob/determinism.js';
const HERE = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(resolve(HERE, '../../site/package.json'))('playwright');
const argv = process.argv.slice(2);
const sites = argv.flatMap((a, i) => (a === '--site' ? [argv[i + 1].split('=')] : []));
const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : HERE;
mkdirSync(out, { recursive: true });
const WORLDS = [['sandbox-1', '/sandbox-1/'], ['sandbox-3', '/sandbox-3/'], ['sandbox-5', '/sandbox-5/']];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const numbers = {};
for (const [world, path] of WORLDS)
	for (const [tree, site] of sites) {
		const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
		await page.addInitScript({ content: SEEDED_RANDOM });
		await page.addInitScript(() => { window.__interiorHour = 12; });
		const errors = [];
		page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
		const t0 = Date.now();
		await page.goto(site + path, { waitUntil: 'load', timeout: 180_000 });
		// QUIET twice in a row (0), at most 6 minutes on the CPU
		let zeros = 0;
		while (Date.now() - t0 < 360_000 && zeros < 2) {
			await page.waitForTimeout(2000);
			zeros = (await page.evaluate(QUIET).catch(() => null)) === 0 ? zeros + 1 : 0;
		}
		await page.waitForTimeout(3000);
		const file = `${world}-${tree}.png`;
		const png = await page.screenshot({ path: resolve(out, file), timeout: 600_000 });
		const mean = await page.evaluate(async (src) => {
			const img = new Image(); img.src = src; await img.decode();
			const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d'); g.drawImage(img, 0, 0);
			const d = g.getImageData(0, 0, img.width, img.height).data; let r = 0, gr = 0, b = 0, n = 0;
			for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; n++; }
			return [r / n, gr / n, b / n].map((v) => +v.toFixed(1));
		}, 'data:image/png;base64,' + png.toString('base64'));
		numbers[file] = { rgb: mean, redToBlue: +(mean[0] / mean[2]).toFixed(3), quiet: zeros >= 2, seconds: Math.round((Date.now() - t0) / 1000), hour: await page.evaluate(() => window.__interiorHour), errors: errors.slice(0, 5) };
		console.log(file, JSON.stringify(numbers[file]));
		await page.close();
	}
await browser.close();
writeFileSync(resolve(out, 'numbers.json'), JSON.stringify(numbers, null, '\t') + '\n');

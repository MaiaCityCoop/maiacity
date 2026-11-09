#!/usr/bin/env node
/*
 * INTENT e85a5860'S LOOK (c4), IN avenBOX — the meadow of Sandbox 1 on main and on this branch, and a path walked
 * through it springing back, shot by avenBOX's own Chromium in software (SwiftShader: WebGL, and WebGPU on its
 * SwiftShader adapter), no Mac (Samuel 2026-11-09: looks are judged on avenBOX screenshots; speed is the Mac's smoke
 * run after the deploy, never these frames).
 *
 *   node intent-work/e85a5860-shots/shots.mjs --main http://localhost:5191 --head http://localhost:5192 --out <dir>
 *
 * Two dev servers (run.sh): main's tree and this branch's, each with PLAY_API at the read-only proxy this script starts
 * on 127.0.0.1:3911 (play/site/scripts/macjob/proxy.mjs; PLAY_MCP_TOKEN reads play). Every page gets the tree's
 * determinism (play/site/scripts/macjob/determinism.js: SEEDED_RANDOM, QUIET), the hour pinned at noon and the world's
 * clock pinned (`__worldTime`), stepped by hand, so the grass's wind, its trample map's decay and every frame follow the
 * steps, not how slowly software draws.
 *
 * The meadow: the most grassy 12 m round Sandbox 1's near view, from this branch's grass mask (intent 7's job's
 * search), the same place and view on every page:
 *   - main.png: main's grass (the cover's clumps), `?renderer` its own;
 *   - tiles.png: this branch on WebGL 2 (`?renderer=webgl2`): intent 7's blades in tiles, the fallback;
 *   - compute.png: this branch on WebGPU (`?renderer=webgpu`): the blades chosen on the card, three indirect draws.
 * The trample, on WebGPU: the walker crosses 12 m of the meadow (stamping the trample map as it goes), the camera then
 * flown 5 m to its side at 2.2 m, looking across the path; stills at 0, 3, 6 and 10 s of the world's clock after the
 * walk (trample-<s>s.png), and the map read back along the path each time (`readTrodden`): how trodden it is.
 * Out: <out>/*.png and <out>/shots.json (each page's backend and grass mode, the blades drawn, the trample's numbers).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');
const { chromium } = createRequire(join(REPO, 'play/site/package.json'))('playwright');
const { SEEDED_RANDOM, QUIET } = await import(join(REPO, 'play/site/scripts/macjob/determinism.js'));
const { playProxy } = await import(join(REPO, 'play/site/scripts/macjob/proxy.mjs'));

const argv = process.argv.slice(2);
const arg = (k) => {
	const i = argv.indexOf(k);
	return i >= 0 ? argv[i + 1] : undefined;
};
const MAIN = arg('--main'), HEAD = arg('--head'), OUT = arg('--out') ?? join(HERE, 'out');
if (!MAIN || !HEAD) throw new Error('give --main <main’s dev server> --head <this branch’s dev server>');
mkdirSync(OUT, { recursive: true });
const proxy = await playProxy(3911);

// software: WebGL by SwiftShader through ANGLE, WebGPU on Dawn's SwiftShader adapter
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
page.setDefaultTimeout(20 * 60e3);
await page.addInitScript({ content: SEEDED_RANDOM });
await page.addInitScript(() => {
	window.__interiorHour = 12;
	window.__worldTime = 100;
});
const log = (s) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);
const quiet = async (ms) => {
	for (const end = Date.now() + ms; Date.now() < end; await page.waitForTimeout(3000)) if ((await page.evaluate(QUIET).catch(() => null)) === 0) return true;
	return false;
};
/** n frames drawn (requestAnimationFrame twice each), the world's clock stepped `dt` a frame */
const frames = async (n, dt = 0) => {
	for (let i = 0; i < n; i++)
		await page.evaluate((dt) => new Promise((ok) => {
			window.__worldTime += dt;
			requestAnimationFrame(() => requestAnimationFrame(ok));
		}), dt);
};
/** a dev server's first load can fail while vite optimises its dependencies ("Failed to fetch dynamically imported
 *  module"): such a page is loaded again, up to three times */
let broken = false;
page.on('pageerror', (e) => /Failed to fetch dynamically imported module|Importing a module script failed/.test(String(e)) && (broken = true));
page.on('console', (m) => m.type() === 'error' && /Failed to fetch dynamically imported module/.test(m.text()) && (broken = true));
const open = async (url) => {
	for (let attempt = 1; ; attempt++) {
		broken = false;
		log(`open ${url} (attempt ${attempt})`);
		await page.goto(url, { waitUntil: 'domcontentloaded' });
		// the world is up once its cover is gone (sandbox-kit/WorldPage.svelte: its bar shown while it loads)
		const up = await page
			.waitForFunction(() => window.__walker && window.__assets && !document.querySelector('.progress'), null, { timeout: 25 * 60e3, polling: 2000 })
			.then(() => true)
			.catch(() => false);
		if (up && !broken) break;
		const step = await page.evaluate(() => document.querySelector('.step')?.textContent ?? null).catch(() => null);
		log(`not up (${broken ? 'a module failed to load' : 'timed out'}; at "${step}")`);
		if (attempt >= 3) throw new Error(`${url} never came up: ${step}`);
	}
	return page.evaluate(() => ({ backend: window.__rendererBackend ?? null, grass: window.__grass ? (window.__grass.mode ?? 'tiles') : 'none' }));
};
/** the walker at the meadow, the view settled, its picture */
const meadow = async (name, spot) => {
	await page.evaluate(({ x, z }) => window.__walker.place(x, z, 0, -0.12), spot);
	await frames(12, 1 / 24);
	const settled = await quiet(4 * 60e3);
	await frames(4, 1 / 24);
	await page.screenshot({ path: join(OUT, `${name}.png`) });
	const blades = await page.evaluate(async () => (window.__grass?.readBack ? window.__grass.readBack() : window.__grass?.count?.() ?? null));
	log(`${name}: settled ${settled}; blades by level ${JSON.stringify(blades)}`);
	return { settled, blades };
};

const results = { pages: {}, trample: [] };
const t0 = Date.now();

/* this branch on WebGPU first: it finds the meadow from its own mask */
results.pages.compute = await open(`${HEAD}/sandbox-1/?renderer=webgpu`);
log(`head on WebGPU: ${JSON.stringify(results.pages.compute)} after ${Math.round((Date.now() - t0) / 1000)} s`);
if (results.pages.compute.grass !== 'indirect') throw new Error(`?renderer=webgpu drew the grass as ${results.pages.compute.grass}, not on the card`);
await page.evaluate(() => window.__walker.place(0, 95, 0, -0.05));
await frames(20, 1 / 24);
await quiet(4 * 60e3);
const spot = await page.evaluate(() => {
	const m = window.__grass.mask, N = m.size, s = m.texel, best = { x: 0, z: 95, g: -1 };
	for (let x = -50; x <= 50; x += 4)
		for (let z = 45; z <= 145; z += 4) {
			let sum = 0, n = 0;
			for (let dx = -6; dx <= 6; dx += 1.5)
				for (let dz = -6; dz <= 6; dz += 1.5) {
					const gx = Math.floor((x + dx) / s), gz = Math.floor((z + dz) / s), i = (((gz % N) + N) % N) * N + (((gx % N) + N) % N);
					if (m.col[i] === gx && m.row[i] === gz) (sum += m.grass[i]), n++;
				}
			if (n && sum / n > best.g) Object.assign(best, { x, z, g: sum / n });
		}
	return best;
});
results.spot = spot;
log(`the meadow at ${spot.x}, ${spot.z} (grass ${spot.g.toFixed(2)})`);
Object.assign(results.pages.compute, await meadow('compute', spot));

/* the trample: 12 m walked through the meadow at 1.3 m/s (the clock stepped with it), then seen from its side */
const z0 = spot.z + 6, z1 = spot.z - 6;
for (let z = z0; z >= z1; z -= 0.4) {
	await page.evaluate(({ x, z }) => window.__walker.place(x, z, 0, -0.1), { x: spot.x, z });
	await frames(1, 0.4 / 1.3);
}
await page.evaluate(({ x, z }) => window.__walker.fly(x + 5, 2.2, z, Math.PI / 2, -0.32), { x: spot.x, z: spot.z });
for (const s of [0, 3, 6, 10]) {
	// the clock stepped to s seconds after the walk, half a second a frame
	const at = results.trample.length ? results.trample[results.trample.length - 1].s : 0;
	await frames(Math.round((s - at) / 0.5), 0.5);
	await frames(2, 0);
	await page.screenshot({ path: join(OUT, `trample-${s}s.png`) });
	const along = await page.evaluate(async ({ x, z0, z1 }) => {
		const t = await window.__grass.readTrodden(), N = t.size;
		let most = 0, sum = 0, n = 0;
		for (let z = z1; z <= z0; z += t.texel) {
			const gx = Math.floor(x / t.texel), gz = Math.floor(z / t.texel), v = t.data[(((gz % N) + N) % N) * N + (((gx % N) + N) % N)];
			(most = Math.max(most, v)), (sum += v), n++;
		}
		return { most: +most.toFixed(3), mean: +(sum / n).toFixed(3) };
	}, { x: spot.x, z0: z0 - 1, z1: z1 + 1 });
	results.trample.push({ s, ...along });
	log(`trample ${s} s after the walk: the path at most ${along.most}, on average ${along.mean}`);
}

/* this branch on WebGL 2: intent 7's tiles, the fallback */
results.pages.tiles = await open(`${HEAD}/sandbox-1/?renderer=webgl2`);
log(`head on WebGL 2: ${JSON.stringify(results.pages.tiles)}`);
Object.assign(results.pages.tiles, await meadow('tiles', spot));

/* main, as it draws today */
results.pages.main = await open(`${MAIN}/sandbox-1/`);
log(`main: ${JSON.stringify(results.pages.main)}`);
Object.assign(results.pages.main, await meadow('main', spot));

results.verdict = {
	denser: (results.pages.compute.blades ?? []).reduce((a, b) => a + b, 0) > (results.pages.tiles.blades ?? []).reduce?.((a, b) => a + b, 0),
	trodden: (results.trample[0]?.most ?? 0) >= 0.5,
	springsBack: (results.trample.find((t) => t.s === 10)?.most ?? 1) <= 0.06
};
log(`verdict ${JSON.stringify(results.verdict)} in ${Math.round((Date.now() - t0) / 1000)} s`);
writeFileSync(join(OUT, 'shots.json'), JSON.stringify(results, null, 1));
await browser.close();
proxy.close();

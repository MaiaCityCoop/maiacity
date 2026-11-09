#!/usr/bin/env node
/*
 * INTENT e85a5860'S LOOK (c4), IN avenBOX — the grass on this branch, chosen on the graphics card (WebGPU) against
 * intent 7's tiles (its WebGL 2 fallback), and a path walked through it springing back; main's meadow as it is today
 * beside them. Shot by avenBOX's own Chromium in software (SwiftShader), no Mac (Samuel 2026-11-09: looks are judged
 * on avenBOX screenshots; speed is the Mac's smoke run after the deploy, never these frames).
 *
 *   node intent-work/e85a5860-shots/shots.mjs --main http://localhost:5191 --head http://localhost:5192 --out <dir>
 *
 * Why not Sandbox 1 itself on WebGPU: in avenBOX's headless Chromium a WebGPU canvas never presents (its device is
 * destroyed at the first frame shown, on SwiftShader, old and new headless alike; a raw WebGPU clear read back works),
 * so a world page on WebGPU can't be shot. The grass is shot alone instead (play/site/scripts/grass-shots/harness.js:
 * a ground, a sky's colour, a sun and the site's own grass, `grassFieldOn`, drawn into a target and read back), on
 * both backends alike, from this branch's dev server:
 *   - tiles.png: `webgl2`, intent 7's blades in tiles; compute.png: `webgpu`, the blades chosen on the card;
 *   - trample-<s>s.png: on WebGPU, a walker (a pusher) crossing 12 m of it at 1.3 m/s, then seen from its side at 0, 3,
 *     6 and 10 s of the world's clock after (`frame(t)`, half a second a frame), the trample map read back each time;
 *   - main.png: main's Sandbox 1 at the meadow (14, 81) on WebGL, its own grass, as a page (WebGL canvases present).
 * Out: <out>/*.png and <out>/shots.json (blades by level, the trample's numbers, the verdict).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');
const { chromium } = createRequire(join(REPO, 'play/site/package.json'))('playwright');
const { SEEDED_RANDOM, QUIET } = await import(join(REPO, 'play/site/scripts/macjob/determinism.js'));
const { playProxy } = await import(join(REPO, 'play/site/scripts/macjob/proxy.mjs'));
const HARNESS = readFileSync(join(REPO, 'play/site/scripts/grass-shots/harness.js'), 'utf8');

const argv = process.argv.slice(2);
const arg = (k) => {
	const i = argv.indexOf(k);
	return i >= 0 ? argv[i + 1] : undefined;
};
const MAIN = arg('--main'), HEAD = arg('--head'), OUT = arg('--out') ?? join(HERE, 'out');
if (!MAIN || !HEAD) throw new Error('give --main <main’s dev server> --head <this branch’s dev server>');
mkdirSync(OUT, { recursive: true });
const proxy = await playProxy(3911);
const log = (s) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);

// software: WebGL by SwiftShader through ANGLE, WebGPU on Dawn's SwiftShader adapter; no GPU watchdog (a frame of a
// million blades' choice on the CPU may outlast the 10 s it allows a GPU process)
const browser = await chromium.launch({ args: ['--disable-gpu-watchdog', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--ignore-gpu-blocklist'] });
const results = { harness: {}, trample: [], main: null };
const png = (name, url) => writeFileSync(join(OUT, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'));

/** the grass alone on a backend: its page, up */
async function harness(backend) {
	const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
	page.setDefaultTimeout(10 * 60e3);
	page.on('pageerror', (e) => log(`page error: ${String(e).slice(0, 200)}`));
	// any page of the dev server's origin, emptied, with the harness inlined (the dev server serves modules from src/)
	await page.goto(`${HEAD}/robots.txt`);
	await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
	await page.evaluate((b) => history.replaceState(null, '', `/?backend=${b}`), backend);
	await page.addScriptTag({ type: 'module', content: HARNESS });
	await page.waitForFunction(() => window.__h);
	await page.evaluate(() => window.__h.ready);
	const mode = await page.evaluate(() => ({ backend: window.__rendererBackend, grass: window.__h.field.mode ?? 'tiles' }));
	log(`${backend}: ${JSON.stringify(mode)}`);
	return { page, mode };
}
const blades = (page) => page.evaluate(async () => (window.__h.field.readBack ? window.__h.field.readBack() : window.__h.field.count()));

/* the meadow, the same view on both: eye 1.65 m, looking a little down */
for (const backend of ['webgl2', 'webgpu']) {
	const { page, mode } = await harness(backend);
	await page.evaluate(async () => {
		window.__h.look(0, 1.65, 0, 0, -0.12);
		for (let i = 0; i < 6; i++) await window.__h.frame(100 + i / 24);
	});
	const name = backend === 'webgpu' ? 'compute' : 'tiles';
	png(name, await page.evaluate(() => window.__h.snap()));
	results.harness[name] = { ...mode, blades: await blades(page) };
	log(`${name}: blades by level ${JSON.stringify(results.harness[name].blades)}`);
	if (backend !== 'webgpu') {
		await page.close();
		continue;
	}

	/* the trample: 12 m walked along x = 0 from z = −4 to −16 at 1.3 m/s, seen from 5 m to its side at 2.2 m */
	const side = () => page.evaluate(() => window.__h.look(5, 2.2, -10, Math.PI / 2, -0.32));
	await side();
	await page.evaluate(async () => {
		for (let i = 0; i < 6; i++) await window.__h.frame(110 + i / 24);
	});
	png('trample-before', await page.evaluate(() => window.__h.snap()));
	let t = 111;
	for (let z = -4; z >= -16; z -= 0.4) {
		await page.evaluate(async ({ z, t }) => {
			window.__h.look(0, 1.65, z, 0, -0.1);
			await window.__h.frame(t, [[0, z, 0.6, 1]]);
		}, { z, t });
		t += 0.4 / 1.3;
	}
	await side();
	let at = 0;
	for (const s of [0, 3, 6, 10]) {
		// the world's clock on to s seconds after the walk, half a second a frame
		for (; at < s; at += 0.5) await page.evaluate((t) => window.__h.frame(t), t + at + 0.5);
		await page.evaluate((t) => window.__h.frame(t), t + s);
		png(`trample-${s}s`, await page.evaluate(() => window.__h.snap()));
		const along = await page.evaluate(async () => {
			const m = await window.__h.field.readTrodden(), N = m.size;
			let most = 0, sum = 0, n = 0;
			for (let z = -15; z <= -5; z += m.texel) {
				const gx = Math.floor(0 / m.texel), gz = Math.floor(z / m.texel), v = m.data[(((gz % N) + N) % N) * N + (((gx % N) + N) % N)];
				(most = Math.max(most, v)), (sum += v), n++;
			}
			return { most: +most.toFixed(3), mean: +(sum / n).toFixed(3) };
		});
		results.trample.push({ s, ...along });
		log(`trample ${s} s after the walk: the path at most ${along.most}, on average ${along.mean}`);
	}
	await page.close();
}

/* main's meadow, as a page on WebGL (its own grass; a WebGL canvas presents) */
try {
	const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
	page.setDefaultTimeout(25 * 60e3);
	await page.addInitScript({ content: SEEDED_RANDOM });
	await page.addInitScript(() => {
		window.__interiorHour = 12;
		window.__worldTime = 100;
	});
	let broken = false;
	page.on('pageerror', (e) => /Failed to fetch dynamically imported module/.test(String(e)) && (broken = true));
	for (let attempt = 1; attempt <= 3; attempt++) {
		broken = false;
		log(`main: open (attempt ${attempt})`);
		await page.goto(`${MAIN}/sandbox-1/`, { waitUntil: 'domcontentloaded' });
		let up = false;
		for (const end = Date.now() + 25 * 60e3; !up && !broken && Date.now() < end; await page.waitForTimeout(3000))
			up = await page.evaluate(() => !!(window.__walker && !document.querySelector('.progress'))).catch(() => false);
		if (up) break;
		if (attempt === 3) throw new Error('main never came up');
	}
	await page.evaluate(() => window.__walker.place(14, 81, 0, -0.12));
	for (const end = Date.now() + 4 * 60e3; Date.now() < end; await page.waitForTimeout(3000)) if ((await page.evaluate(QUIET).catch(() => null)) === 0) break;
	await page.screenshot({ path: join(OUT, 'main.png') });
	results.main = { backend: await page.evaluate(() => window.__rendererBackend ?? 'webgl') };
	log(`main: shot (${results.main.backend})`);
} catch (e) {
	results.main = { error: String(e).slice(0, 300) };
	log(`main: not shot (${results.main.error})`);
}

const sum = (b) => (Array.isArray(b) ? b.reduce((a, x) => a + x, 0) : 0);
results.verdict = {
	computeOnCard: results.harness.compute?.grass === 'indirect' && results.harness.compute?.backend === 'webgpu',
	trodden: (results.trample[0]?.most ?? 0) >= 0.5,
	springsBack: (results.trample.find((x) => x.s === 10)?.most ?? 1) <= 0.06,
	bladesComputeVsTiles: [sum(results.harness.compute?.blades), sum(results.harness.tiles?.blades)]
};
log(`verdict ${JSON.stringify(results.verdict)}`);
writeFileSync(join(OUT, 'shots.json'), JSON.stringify(results, null, 1));
await browser.close();
proxy.close();

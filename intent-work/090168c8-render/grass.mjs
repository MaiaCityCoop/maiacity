#!/usr/bin/env node
/*
 * INTENT 090168c8'S MAC JOB — real grass in Sandbox 1, on a real GPU (Metal), for its looks c7 and c8.
 *
 *   node intent-work/090168c8-render/grass.mjs --site head=http://localhost:5182 --out <dir> [--small]
 *
 * One dev server of this branch (PLAY_API at the read-only proxy this script starts on 127.0.0.1:3911, as
 * play/site/scripts/selector-shots.mjs does; PLAY_MCP_TOKEN reads play). Every page gets the render box's determinism
 * (intent-work/main-baseline/determinism.mjs on intent-work/main-baseline-render: SEEDED_RANDOM, settled by QUIET), the
 * frame meter (play/site/src/lib/content/render/meter.js) and the hour and the world's clock pinned
 * (`__interiorHour`, `__worldTime`), so two runs draw the same frames.
 *
 * In Sandbox 1 it finds the most grassy open spot near its near view (the grass's own mask, `__grass.mask`) and there:
 *   - stills at 12:00 and with a sun of 8° (19.44 on the sky's day, the sun in the west, the camera facing it so the
 *     tips are backlit), each at walking height (eye 1.65 m) and 2 m higher (eye 3.65 m, flown);
 *   - at each, the meter's 4 s with the grass and 4 s without it (`__grass.object.visible`): the grass's own GPU ms;
 *     and how many blades it draws at each level (`__grass.count()`);
 *   - a 20 s walking film at 24 fps at each light: the walker 1.3 m/s straight through the meadow, the world's clock
 *     stepped 1/24 s a frame (the gusts roll), a frame shot each step.
 * --small: the same at 390 × 844 with the small device's budget (`?budget=small`), stills and meter only (c8).
 * Out: <out>/<light>-<height>.png, <out>/film-<light>/%04d.jpg, <out>/results.json.
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');
const { chromium } = createRequire(join(REPO, 'play/site/package.json'))('playwright');

const argv = process.argv.slice(2);
let site = null, out = join(HERE, 'out'), small = false, determinism = process.env.DETERMINISM ?? join(REPO, 'intent-work/main-baseline/determinism.mjs');
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === '--site') site = argv[++i].split('=')[1].replace(/\/$/, '');
	else if (argv[i] === '--out') out = argv[++i];
	else if (argv[i] === '--small') small = true;
}
if (!site) throw new Error('give --site head=<url of this branch’s dev server>');
const TOKEN = process.env.PLAY_MCP_TOKEN;
if (!TOKEN) throw new Error('PLAY_MCP_TOKEN: the admin token the proxy reads play with');
mkdirSync(out, { recursive: true });
const { SEEDED_RANDOM, QUIET } = await import(determinism);

// the read-only proxy to play (selector-shots.mjs's)
const proxy = createServer(async (req, res) => {
	if (!['GET', 'HEAD'].includes(req.method ?? '') || !req.url?.startsWith('/api/')) return res.writeHead(405).end('read-only');
	try {
		const r = await fetch('https://play.maia.city' + req.url, { method: req.method, headers: { authorization: `Bearer ${TOKEN}`, accept: req.headers.accept ?? '*/*', ...(req.headers.range ? { range: req.headers.range } : {}) } });
		const h = Object.fromEntries([...r.headers].filter(([k]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(k)));
		res.writeHead(r.status, h);
		res.end(Buffer.from(await r.arrayBuffer()));
	} catch (err) {
		res.writeHead(502).end(String(err));
	}
});
await new Promise((ok) => proxy.listen(3911, '127.0.0.1', ok));

const meterScript = readFileSync(join(REPO, 'play/site/src/lib/content/render/meter.js'), 'utf8').replace(/^export /gm, '') + '\nwindow.__meter = installMeter(window);\n';
/** a sun of 8°: the sky's sunAt (sandbox-kit/sky.js) gives sin((h − 5) / 15 · π) · 68° = 8° at h = 19.44, in the west */
const LIGHTS = [{ name: 'noon', hour: 12 }, { name: 'sun8', hour: 19.44 }];
const HEIGHTS = [{ name: 'walk', eye: null }, { name: 'up2', eye: 3.65 }];

const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : { args: ['--ignore-gpu-blocklist'] });
const ctx = await browser.newContext(small ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const gpu = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g?.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
console.log('renderer:', gpu);
if (process.platform === 'darwin' && !/metal|apple/i.test(gpu)) throw new Error(`not Apple's Metal (${gpu}): nothing drawn`);
await page.addInitScript({ content: SEEDED_RANDOM });
await page.addInitScript({ content: meterScript });
await page.addInitScript(() => {
	window.__interiorHour = 12;
	window.__worldTime = 100;
});
// every settle capped at a few minutes: since intent 2, Sandbox 1 keeps taking far-tree pictures for minutes and never
// counts as quiet (the Mac render box, 2026-11-09); a view is shot when it is quiet or when its wait is up
const quiet = async (ms = 4 * 60e3) => {
	for (const end = Date.now() + ms; Date.now() < end; await page.waitForTimeout(2000)) if ((await page.evaluate(QUIET).catch(() => null)) === 0) return true;
	return false;
};
const t0 = Date.now();
await page.goto(`${site}/sandbox-1/${small ? '?budget=small' : ''}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__walker && window.__assets && window.__grass, null, { timeout: 10 * 60e3 });
// the near view first, then the most grassy spot in reach of it (the mask's 0.6 m texels, averaged over 12 m)
await page.evaluate(() => window.__walker.place(0, 95, 0, -0.05));
await quiet();
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
console.log(`up after ${Math.round((Date.now() - t0) / 1000)} s; the meadow at ${spot.x}, ${spot.z} (grass ${spot.g.toFixed(2)})`);

const results = { gpu, small, spot, views: [], films: [] };
for (const light of LIGHTS) {
	// facing the sun at 8° (west, yaw π/2 looks to −x), so the tips are backlit; at noon looking south as the views do
	const yaw = light.name === 'sun8' ? Math.PI / 2 : 0;
	for (const h of HEIGHTS) {
		await page.evaluate(({ hour }) => (window.__interiorHour = hour), light);
		await page.evaluate(({ x, z, yaw, eye }) => (eye === null ? window.__walker.place(x, z, yaw, -0.08) : window.__walker.fly(x, eye, z, yaw, -0.18)), { ...spot, yaw, eye: h.eye });
		await page.waitForTimeout(1500);
		const settled = await quiet(3 * 60e3);
		await page.waitForTimeout(2000);
		const png = join(out, `${small ? 'small-' : ''}${light.name}-${h.name}.png`);
		await page.screenshot({ path: png });
		const withGrass = await page.evaluate(() => window.__meter.sample(4));
		const blades = await page.evaluate(() => window.__grass.count());
		await page.evaluate(() => (window.__grass.object.visible = false));
		const without = await page.evaluate(() => window.__meter.sample(4));
		await page.evaluate(() => (window.__grass.object.visible = true));
		const grassGpu = withGrass.gpu_ms != null && without.gpu_ms != null ? +(withGrass.gpu_ms - without.gpu_ms).toFixed(2) : null;
		results.views.push({ light: light.name, hour: light.hour, height: h.name, settled, blades, withGrass, without, grassGpuMs: grassGpu, png });
		console.log(`${light.name} ${h.name}: frame ${withGrass.frame_ms} ms (gpu ${withGrass.gpu_ms}, bound ${withGrass.bound}); without grass gpu ${without.gpu_ms}: the grass ${grassGpu} ms; blades by level ${blades.join(' / ')}`);
	}
	if (small) continue;
	// the walking film: 20 s at 24 fps, 1.3 m/s through the meadow towards where it looks, the clock stepped a frame
	const dir = join(out, `film-${light.name}`);
	mkdirSync(dir, { recursive: true });
	const fx = yaw === 0 ? 0 : -1, fz = yaw === 0 ? -1 : 0;
	const x0 = spot.x - fx * 13, z0 = spot.z - fz * 13;
	await page.evaluate(({ hour, x, z, yaw }) => {
		window.__interiorHour = hour;
		window.__worldTime = 100;
		window.__walker.place(x, z, yaw, -0.06);
	}, { hour: light.hour, x: x0, z: z0, yaw });
	await page.waitForTimeout(1500);
	await quiet(3 * 60e3);
	const times = [];
	for (let f = 0; f < 480; f++) {
		const d = (f / 24) * 1.3;
		await page.evaluate(({ x, z, yaw, t }) => {
			window.__worldTime = t;
			window.__walker.place(x, z, yaw, -0.06);
		}, { x: x0 + fx * d, z: z0 + fz * d, yaw, t: 100 + f / 24 });
		// two frames drawn at this step (the grass's tiles and mask follow the eye), then its picture
		await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
		const s = Date.now();
		await page.screenshot({ path: join(dir, `${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 88 });
		times.push(Date.now() - s);
	}
	results.films.push({ light: light.name, frames: 480, dir, shotMs: times.sort((a, b) => a - b)[240] });
	console.log(`film ${light.name}: 480 frames`);
}
writeFileSync(join(out, small ? 'results-small.json' : 'results.json'), JSON.stringify(results, null, 1));
await browser.close();
proxy.close();

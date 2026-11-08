#!/usr/bin/env node
/*
 * INTENT db87a28f's LOOKS AND COST ON A MAC'S METAL (c7, c8; run by ./run.sh): main (`base`) and the pull request's
 * head (`head`), one after the other, each a dev server whose API is the read-only proxy this starts on 127.0.0.1:3913.
 * The proxy serves `/api/files/<hash>` from the head's play/media where it has the file (the ground's KTX2 scans,
 * which play keeps only once the pull request is deployed), and forwards every other GET or HEAD of /api/… to
 * play.maia.city with PLAY_MCP_TOKEN (sent to play and nowhere else).
 *
 *   Sandbox 1 near and mid (bba9c796's views), 1440×900, at 12:00 and with the sun 10° up (__interiorHour 5.7):
 *     a screenshot each, and at 12:00 the meter's frame, CPU and GPU ms, calls, triangles and bound over 3 s, and the
 *     probe's texture_mib (compressed textures at their real size: ./probe.js)
 *   the food forest and the beech forest's patch in the viewer (/biomes/#<asset>), 1440×900, a screenshot each
 *   head only: Sandbox 1 near at 390×844 with the small-device budget (?budget=small): screenshot, texture_mib, frame
 *
 *   node shots.mjs --site base=http://localhost:5191 --site head=http://localhost:5192 --meter <meter.js> --media <dir> --out <dir>
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// the Mac render box's determinism (intent-work/main-baseline): a seeded Math.random, and a settle that waits for the far
// trees' pictures too
import { QUIET, SEEDED_RANDOM } from './determinism.mjs';

const { chromium } = createRequire(resolve(process.cwd(), 'package.json'))('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const sites = [];
for (let i = 0; i < argv.length; i++) if (argv[i] === '--site') { const [name, url] = argv[++i].split('='); sites.push({ name, url: url.replace(/\/$/, '') }); }
const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined);
const OUT = resolve(arg('--out') ?? 'out'), MEDIA = resolve(arg('--media')), METER = arg('--meter');
const TOKEN = process.env.PLAY_MCP_TOKEN;
if (!TOKEN || !METER || !MEDIA) throw new Error('PLAY_MCP_TOKEN, --meter and --media are needed');
mkdirSync(OUT, { recursive: true });

const W = 1440, H = 900, SAMPLE = 3;
const VIEWS = [
	{ view: 'near', x: 0, z: 95, yaw: 0, pitch: -0.05 },
	{ view: 'mid', x: 0, z: 235, yaw: 0, pitch: -0.05 }
];
const HOURS = [['noon', 12], ['sun10', 5.7]];
const BIOMES = [['food-forest', '254102d4-eee8-5aea-90b4-ae442ca7b651'], ['beech-forest', '34095282-709a-5a59-ac03-697ac77b8047']];

const proxy = createServer(async (req, res) => {
	if (!['GET', 'HEAD'].includes(req.method ?? '') || !req.url?.startsWith('/api/')) return res.writeHead(405).end('read-only');
	const f = /^\/api\/files\/([0-9a-f]{64})$/.exec(req.url);
	if (f && existsSync(join(MEDIA, `${f[1]}.ktx2`))) {
		res.writeHead(200, { 'content-type': 'image/ktx2', 'cache-control': 'max-age=31536000' });
		return res.end(req.method === 'HEAD' ? undefined : readFileSync(join(MEDIA, `${f[1]}.ktx2`)));
	}
	try {
		const r = await fetch('https://play.maia.city' + req.url, { method: req.method, headers: { authorization: `Bearer ${TOKEN}`, accept: req.headers.accept ?? '*/*', ...(req.headers.range ? { range: req.headers.range } : {}) } });
		const h = Object.fromEntries([...r.headers].filter(([k]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(k)));
		res.writeHead(r.status, h);
		res.end(Buffer.from(await r.arrayBuffer()));
	} catch (err) {
		res.writeHead(502).end(String(err));
	}
});
await new Promise((ok) => proxy.listen(3913, '127.0.0.1', ok));

const meterScript = readFileSync(METER, 'utf8').replace(/^export /gm, '') + '\nwindow.__meter = installMeter(window);\nwindow.__interiorHour = 12;\n';
const probeScript = readFileSync(resolve(here, 'probe.js'), 'utf8');
const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : { args: ['--ignore-gpu-blocklist'] });
let gpu = 'unknown';
{
	const p = await browser.newPage();
	gpu = await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g?.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
	const timer = await p.evaluate(() => !!document.createElement('canvas').getContext('webgl2')?.getExtension('EXT_disjoint_timer_query_webgl2'));
	console.log(`GPU: ${gpu} · GPU timer ${timer ? 'offered' : 'NOT offered: gpu_ms will be null'}`);
	await p.close();
}

async function open(url, vw = W, vh = H) {
	const ctx = await browser.newContext({ viewport: { width: vw, height: vh } });
	const page = await ctx.newPage();
	const errors = [];
	page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)));
	await page.addInitScript({ content: SEEDED_RANDOM });
	await page.addInitScript({ content: meterScript });
	await page.addInitScript({ content: probeScript });
	await page.goto(url, { waitUntil: 'domcontentloaded' });
	return { ctx, page, errors };
}
const sample = (page) =>
	page.evaluate(async (sec) => {
		window.__probe.reset();
		const m = await window.__meter.sample(sec);
		return { frame_ms: m.frame_ms, frame_p95: m.frame_p95, cpu_ms: m.cpu_ms, gpu_ms: m.gpu_ms, calls: m.calls, tris: m.triangles, bound: m.bound, texture_mib: window.__probe.read().texture_mib };
	}, SAMPLE);
async function sandbox1(page) {
	await page.waitForFunction(() => window.__walker && window.__assets, null, { timeout: 10 * 60e3 });
	const building = () => page.evaluate(QUIET).catch(() => null);
	return async (ms) => { for (const end = Date.now() + ms; Date.now() < end; await page.waitForTimeout(2000)) if ((await building()) === 0) return true; return false; };
}
const ms = (x) => (x == null ? '–' : x.toFixed(2));
const line = (s) => `frame ${ms(s.frame_ms)} (p95 ${ms(s.frame_p95)}) · cpu ${ms(s.cpu_ms)} · gpu ${ms(s.gpu_ms)} · ${s.calls} calls · ${s.tris?.toLocaleString('en')} tris · bound ${s.bound} · textures ${s.texture_mib} MiB`;

const results = { intent: 'db87a28f-2d3a-41d9-8a2b-40314fdb2d40', gpu, at: new Date().toISOString(), commits: { base: process.env.BASE_COMMIT, head: process.env.HEAD_COMMIT }, sites: {} };
for (const site of sites) {
	const r = (results.sites[site.name] = { views: {}, biomes: {}, errors: [] });
	{
		const { ctx, page, errors } = await open(`${site.url}/sandbox-1/`);
		const settle = await sandbox1(page);
		console.log(`${site.name} sandbox-1 ${(await settle(10 * 60e3)) ? 'settled' : 'still building'}`);
		for (const v of VIEWS)
			for (const [when, hour] of HOURS) {
				await page.evaluate(([v, hour]) => ((window.__interiorHour = hour), window.__walker.place(v.x, v.z, v.yaw, v.pitch)), [v, hour]);
				await page.waitForTimeout(1500);
				const settled = await settle(3 * 60e3);
				await page.waitForTimeout(3000);
				const s = when === 'noon' ? await sample(page) : null;
				const png = `${site.name}-sandbox-1-${v.view}-${when}.png`;
				await page.screenshot({ path: resolve(OUT, png) });
				r.views[`${v.view}-${when}`] = { settled, ...s, png };
				console.log(`  ${site.name} ${v.view} ${when}: ${s ? line(s) : png}`);
			}
		r.errors.push(...errors);
		await ctx.close();
	}
	for (const [name, id] of BIOMES) {
		const { ctx, page, errors } = await open(`${site.url}/biomes/#${id}`);
		await page.waitForTimeout(45000);
		const png = `${site.name}-biome-${name}.png`;
		await page.screenshot({ path: resolve(OUT, png) });
		r.biomes[name] = { png, texture_mib: await page.evaluate(() => window.__probe.read().texture_mib) };
		r.errors.push(...errors);
		await ctx.close();
	}
	if (site.name === 'head') {
		const { ctx, page, errors } = await open(`${site.url}/sandbox-1/?budget=small`, 390, 844);
		const settle = await sandbox1(page);
		await settle(10 * 60e3);
		const v = VIEWS[0];
		await page.evaluate((v) => window.__walker.place(v.x, v.z, v.yaw, v.pitch), v);
		await settle(3 * 60e3);
		await page.waitForTimeout(3000);
		const s = await sample(page);
		await page.screenshot({ path: resolve(OUT, 'head-sandbox-1-near-small.png') });
		r.small = { ...s, png: 'head-sandbox-1-near-small.png' };
		console.log(`  head small near: ${line(s)}`);
		r.errors.push(...errors);
		await ctx.close();
	}
	if (r.errors.length) console.log(`  ${site.name} errors:\n    ${[...new Set(r.errors)].slice(0, 12).join('\n    ')}`);
}
// the references: Poly Haven's CC0 scans the spec names, their colour at 1k
for (const id of ['forrest_ground_01', 'forest_leaves_02', 'brown_mud_leaves_01']) {
	try {
		const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
		writeFileSync(resolve(OUT, `ref-${id}.jpg`), Buffer.from(await (await fetch(files.Diffuse['1k'].jpg.url)).arrayBuffer()));
	} catch (e) {
		console.log(`ref ${id}: ${e}`);
	}
}
const b = results.sites.base?.views['near-noon'], h = results.sites.head?.views['near-noon'];
if (b && h) console.log(`near at noon: head ${ms(h.frame_ms)} ms vs base ${ms(b.frame_ms)} ms (+${ms(h.frame_ms - b.frame_ms)}; at most +1.5) · textures head ${h.texture_mib} MiB (at most 330), base ${b.texture_mib} MiB`);
writeFileSync(resolve(OUT, 'results.json'), JSON.stringify(results, null, 1));
await browser.close();
proxy.close();

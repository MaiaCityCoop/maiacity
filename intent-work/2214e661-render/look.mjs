#!/usr/bin/env node
/*
 * INTENT 2214e661's LOOK AND FRAME TIME (c8), on a Mac's Metal (run by ./run.sh): one sky that lights every world like
 * the real sun. For each site (base: main; head: the intent's pull request), one after the other, never side by side:
 *   Sandbox 1 (/sandbox-1/) at noon (12:00) and at a sun of 8° (19:26, golden hour), from 6295a650's near, mid and
 *            far (`__walker.place`), each once nothing is being built (`__assets.stats()`), the hour pinned with
 *            `window.__interiorHour`;
 *   Sandbox 3 (/sandbox-3/, the old city) as it opens.
 * Each view: the frame meter's line over SAMPLE s (play/site/src/lib/content/render/meter.js, injected whole: frame,
 * CPU and GPU ms, calls, triangles, the bound), the probe's split (shadow, blend, offscreen, screen) and a screenshot
 * at 1440×900; every console error and page error is kept (a TSL shader that fails to compile shows there).
 * Poly Haven's CC0 skies autumn_meadow (afternoon) and evening_field (low sun) are fetched beside them.
 *
 *   node look.mjs --site base=http://localhost:5191 --site head=http://localhost:5192 --meter <meter.js> --out <dir>
 *
 * Each site is a dev server of one tree, its API at the read-only proxy this starts on 127.0.0.1:3913 (GET and HEAD
 * of /api/… only, to play.maia.city with PLAY_MCP_TOKEN, sent to play and nowhere else).
 * Out: <dir>/results.json, <dir>/<site>-<world>-<hour>-<view>.png, <dir>/polyhaven-*.jpg, a table on stdout.
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(resolve(process.cwd(), 'package.json'))('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const sites = [];
for (let i = 0; i < argv.length; i++) if (argv[i] === '--site') { const [name, url] = argv[++i].split('='); sites.push({ name, url: url.replace(/\/$/, '') }); }
const OUT = resolve(arg('--out', 'out'));
const METER = arg('--meter');
if (!sites.length || !METER) throw new Error('--site name=url (one or more) and --meter <meter.js>');
const TOKEN = process.env.PLAY_MCP_TOKEN;
if (!TOKEN) throw new Error('PLAY_MCP_TOKEN: the admin token the proxy reads play with');
mkdirSync(OUT, { recursive: true });

const SAMPLE = 3, OPEN = Number(arg('--open', 60)), W = 1440, H = 900;
/** noon, and the sun at 8° on its way down (the sky's sun: 68° · sin((h − 5) / 15 · π) = 8° at 19.437) */
const HOURS = [['noon', 12], ['sun8', 19.437]];
const S1 = [
	{ view: 'near', x: 0, z: 95, yaw: 0, pitch: -0.05 },
	{ view: 'mid', x: 0, z: 235, yaw: 0, pitch: -0.05 },
	{ view: 'far', x: 0, z: 370, yaw: 0, pitch: -0.12 }
];

const PLAY = 'https://play.maia.city';
const proxy = createServer(async (req, res) => {
	if (!['GET', 'HEAD'].includes(req.method ?? '') || !req.url?.startsWith('/api/')) return res.writeHead(405).end('read-only');
	try {
		const r = await fetch(PLAY + req.url, { method: req.method, headers: { authorization: `Bearer ${TOKEN}`, accept: req.headers.accept ?? '*/*', ...(req.headers.range ? { range: req.headers.range } : {}) } });
		const h = Object.fromEntries([...r.headers].filter(([k]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(k)));
		res.writeHead(r.status, h);
		res.end(Buffer.from(await r.arrayBuffer()));
	} catch (err) {
		res.writeHead(502).end(String(err));
	}
});
await new Promise((ok) => proxy.listen(3913, '127.0.0.1', ok));

// Poly Haven's two skies, for the look beside ours (CC0)
for (const id of ['autumn_meadow', 'evening_field']) {
	try {
		const info = await (await fetch(`https://api.polyhaven.com/info/${id}`)).json();
		const url = info.thumbnail_url ?? `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=1440`;
		writeFileSync(resolve(OUT, `polyhaven-${id}.jpg`), Buffer.from(await (await fetch(url)).arrayBuffer()));
	} catch (err) {
		console.log(`poly haven ${id}: ${err}`);
	}
}

const meterScript = readFileSync(METER, 'utf8').replace(/^export /gm, '') + '\nwindow.__meter = installMeter(window);\n';
const probeScript = readFileSync(resolve(here, 'probe.js'), 'utf8');
const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : { args: ['--ignore-gpu-blocklist'] });
let gpu = 'unknown';
{
	const p = await browser.newPage();
	gpu = await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g?.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
	console.log(`GPU: ${gpu}`);
	await p.close();
}

async function open(site, path, errors) {
	const ctx = await browser.newContext({ viewport: { width: W, height: H } });
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 600)}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text().slice(0, 600)}`));
	await page.addInitScript({ content: meterScript });
	await page.addInitScript({ content: probeScript });
	await page.goto(`${site.url}${path}`, { waitUntil: 'domcontentloaded' });
	return { ctx, page };
}

async function sample(page) {
	return page.evaluate(async (sec) => {
		window.__probe.reset();
		const m = await window.__meter.sample(sec);
		const p = window.__probe.read();
		const per = (x) => Math.round(x / Math.max(1, p.frames));
		const buckets = Object.fromEntries(Object.entries(p.buckets).map(([k, v]) => [k, { calls: per(v.calls), tris: per(v.tris) }]));
		return { ...m, tris: m.triangles, line: typeof meterLine === "function" ? meterLine(m) : undefined, buckets };
	}, SAMPLE);
}

const views = [];
const ms = (x) => (x == null ? '–' : x.toFixed(2));
async function measure(page, site, world, hour, view, extra = {}) {
	await page.waitForTimeout(3000);
	const s = await sample(page);
	const png = `${site.name}-${world}-${hour}-${view}.png`;
	await page.screenshot({ path: resolve(OUT, png) });
	const r = { site: site.name, world, hour, view, ...extra, ...s, png };
	delete r.triangles;
	console.log(`${site.name} ${world} ${hour} ${view}: frame ${ms(r.frame_ms)} (p95 ${ms(r.frame_p95)}) · cpu ${ms(r.cpu_ms)} · gpu ${ms(r.gpu_ms)} · ${r.calls} calls · ${r.tris.toLocaleString('en')} tris · bound ${r.bound}`);
	console.log(`    split: ${Object.entries(r.buckets).map(([k, v]) => `${k} ${v.calls}/${v.tris.toLocaleString('en')}`).join(' · ')}`);
	views.push(r);
}

const t0 = Date.now();
const errors = {};
for (const site of sites) {
	errors[site.name] = [];
	{
		const { ctx, page } = await open(site, '/sandbox-1/', errors[site.name]);
		await page.waitForFunction(() => window.__walker && window.__assets, null, { timeout: 10 * 60e3 });
		const building = () => page.evaluate(() => { const s = window.__assets?.stats?.(); return s ? ['out', 'in', 'library'].reduce((a, k) => a + (s[k]?.building ?? 0), 0) : null; }).catch(() => null);
		const settle = async (t) => { for (const end = Date.now() + t; Date.now() < end; await page.waitForTimeout(2000)) if ((await building()) === 0) return true; return false; };
		await settle(10 * 60e3);
		for (const [hour, h] of HOURS) {
			await page.evaluate((h) => (window.__interiorHour = h), h);
			for (const v of S1) {
				await page.evaluate((v) => window.__walker.place(v.x, v.z, v.yaw, v.pitch), v);
				await page.waitForTimeout(1500);
				const settled = await settle(3 * 60e3);
				await measure(page, site, 'sandbox-1', hour, v.view, { settled, at: [v.x, v.z, v.yaw, v.pitch], h });
			}
		}
		await ctx.close();
	}
	{
		const { ctx, page } = await open(site, '/sandbox-3/', errors[site.name]);
		await page.waitForTimeout(OPEN * 1000);
		await measure(page, site, 'sandbox-3', 'own', 'open');
		await ctx.close();
	}
	console.log(`${site.name}: ${errors[site.name].length} errors`);
	for (const e of errors[site.name].slice(0, 20)) console.log(`    ${e}`);
}

// the frame time at each view, head against base: c8 holds head's mean to at most base's + 1.0 ms
const key = (v) => `${v.world} ${v.hour} ${v.view}`;
const base = Object.fromEntries(views.filter((v) => v.site === 'base').map((v) => [key(v), v]));
const delta = views.filter((v) => v.site === 'head' && base[key(v)]).map((v) => ({ view: key(v), base_ms: base[key(v)].frame_ms, head_ms: v.frame_ms, delta_ms: v.frame_ms - base[key(v)].frame_ms, base_bound: base[key(v)].bound, head_bound: v.bound, within: v.frame_ms <= base[key(v)].frame_ms + 1.0 }));
for (const d of delta) console.log(`${d.view}: base ${ms(d.base_ms)} (${d.base_bound}) → head ${ms(d.head_ms)} (${d.head_bound}) · Δ ${ms(d.delta_ms)} ms ${d.within ? 'within' : 'OVER'} +1.0`);
writeFileSync(resolve(OUT, 'results.json'), JSON.stringify({ intent: '2214e661-65d1-48d6-9b2c-a3293a79d9e5', commits: { base: process.env.BASE_COMMIT ?? null, head: process.env.HEAD_COMMIT ?? null }, gpu, viewport: [W, H], sample_s: SAMPLE, at: new Date().toISOString(), views, delta, errors }, null, 1));
console.log(`done in ${Math.round((Date.now() - t0) / 1000)} s: ${resolve(OUT, 'results.json')}`);
await browser.close();
proxy.close();

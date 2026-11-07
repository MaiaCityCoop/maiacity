#!/usr/bin/env node
/*
 * THE AUDIT OF SANDBOX 1 AND SANDBOX 3 — intent bba9c796's c7, on a Mac's Metal (run by ./run.sh).
 *
 * Each view is measured with the frame meter (play/site/src/lib/content/render/meter.js, from the intent's pull
 * request, injected whole) and the probe (./probe.js), over SAMPLE seconds once nothing is being built:
 *   base       the view as it is: frame, CPU and GPU ms, draw calls, triangles, the bound, the probe's split
 *   noshadow   the same, the shadow maps' draws not made: what shadows cost
 *   noblend    blended (transparent) draws not made: what transparency costs
 *   half       at 720×450, a quarter of the pixels: GPU ms that falls with it is fill (fragments, overdraw), what stays
 *              is geometry and draw calls
 * Views:
 *   Sandbox 1 (/sandbox-1/, the village of sandbox-2/interior): 6295a650's near, mid and far on the line x = 0
 *             looking to the master dome, placed with `__walker.place`, settled by `__assets.stats()`
 *   Sandbox 3 (/sandbox-3/, the old city): as it opens (after OPEN s), then after walking forward (W held) 5 s and
 *             another 10 s (walk5, walk15); it has no hook to place its camera
 * Noon pinned (`window.__interiorHour`), 1440×900, one context at a time.
 *
 *   node audit.mjs --site http://localhost:5183 --meter <meter.js> --out <dir> [--only sandbox-1|sandbox-3] [--open <s>]
 *
 * The site is a dev server of main, its API pointed at the read-only proxy this starts on 127.0.0.1:3912 (GET and
 * HEAD of /api/… only, to play.maia.city with PLAY_MCP_TOKEN, sent to play and nowhere else). Out: <dir>/audit.json
 * (the views; `wins` left empty for the builder to rank from them), <dir>/<world>-<view>.png, a table on stdout.
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Playwright as play/site has it: run from play/site (run.sh does)
const { chromium } = createRequire(resolve(process.cwd(), 'package.json'))('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const SITE = arg('--site', 'http://localhost:5183').replace(/\/$/, '');
const OUT = resolve(arg('--out', 'out'));
const METER = arg('--meter');
/** --only sandbox-1|sandbox-3: one world (a trial run); --open <s>: Sandbox 3's wait as it opens */
const ONLY = arg('--only', null);
if (!METER) throw new Error('--meter: the path of meter.js from the intent branch');
const TOKEN = process.env.PLAY_MCP_TOKEN;
if (!TOKEN) throw new Error('PLAY_MCP_TOKEN: the admin token the proxy reads play with');
mkdirSync(OUT, { recursive: true });

const SAMPLE = 3;
const OPEN = Number(arg('--open', 60));
const W = 1440, H = 900;
const S1 = [
	{ view: 'near', x: 0, z: 95, yaw: 0, pitch: -0.05 },
	{ view: 'mid', x: 0, z: 235, yaw: 0, pitch: -0.05 },
	{ view: 'far', x: 0, z: 370, yaw: 0, pitch: -0.12 }
];

// the read-only proxy to play
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
await new Promise((ok) => proxy.listen(3912, '127.0.0.1', ok));

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

async function open(path) {
	const ctx = await browser.newContext({ viewport: { width: W, height: H } });
	const page = await ctx.newPage();
	page.on('pageerror', (e) => console.log(`  page error: ${String(e).slice(0, 200)}`));
	await page.addInitScript({ content: meterScript });
	await page.addInitScript({ content: probeScript });
	await page.goto(`${SITE}${path}`, { waitUntil: 'domcontentloaded' });
	return { ctx, page };
}

/** one sample of the page as it is: the meter's and the probe's, per frame */
async function sample(page) {
	return page.evaluate(async (sec) => {
		window.__probe.reset();
		const m = await window.__meter.sample(sec);
		const p = window.__probe.read();
		const per = (x) => Math.round(x / Math.max(1, p.frames));
		const buckets = Object.fromEntries(Object.entries(p.buckets).map(([k, v]) => [k, { calls: per(v.calls), tris: per(v.tris) }]));
		return { ...m, tris: m.triangles, timed: window.__meter.timed(), buckets, shaders: p.shaders.slice(0, 12).map(([n, c, t]) => [n, per(c), per(t)]), texture_mib: p.texture_mib };
	}, SAMPLE);
}

/** the view measured as it is, then with each part left out, then at half size */
async function measure(page, world, view, extra = {}) {
	await page.waitForTimeout(3000);
	const base = await sample(page);
	const experiments = {};
	for (const k of ['shadow', 'blend']) {
		await page.evaluate((k) => (window.__probe.skip[k] = true), k);
		await page.waitForTimeout(1500);
		const s = await sample(page);
		await page.evaluate((k) => (window.__probe.skip[k] = false), k);
		experiments[`no${k}`] = { frame_ms: s.frame_ms, cpu_ms: s.cpu_ms, gpu_ms: s.gpu_ms, calls: s.calls, tris: s.tris };
	}
	await page.setViewportSize({ width: W / 2, height: H / 2 });
	await page.waitForTimeout(2500);
	const half = await sample(page);
	experiments.half = { frame_ms: half.frame_ms, cpu_ms: half.cpu_ms, gpu_ms: half.gpu_ms, calls: half.calls, tris: half.tris };
	await page.setViewportSize({ width: W, height: H });
	await page.waitForTimeout(2500);
	const png = `${world}-${view}.png`;
	await page.screenshot({ path: resolve(OUT, png) });
	const r = { world, view, ...extra, ...base, experiments, png };
	delete r.triangles;
	const ms = (x) => (x == null ? '–' : x.toFixed(1));
	console.log(`${world} ${view}: frame ${ms(r.frame_ms)} (p95 ${ms(r.frame_p95)}) · cpu ${ms(r.cpu_ms)} · gpu ${ms(r.gpu_ms)} · ${r.calls} calls · ${r.tris.toLocaleString('en')} tris · bound ${r.bound}`);
	console.log(`    split: ${Object.entries(r.buckets).map(([k, v]) => `${k} ${v.calls} calls/${v.tris.toLocaleString('en')} tris`).join(' · ')} · textures ~${r.texture_mib} MiB`);
	console.log(`    no shadow draws: gpu ${ms(experiments.noshadow.gpu_ms)} · no blended: gpu ${ms(experiments.noblend.gpu_ms)} · half size: gpu ${ms(experiments.half.gpu_ms)}`);
	console.log(`    materials: ${r.shaders.slice(0, 6).map(([n, c, t]) => `${n} ${c}/${t.toLocaleString('en')}`).join(', ')}`);
	return r;
}

const views = [];
const t0 = Date.now();

// Sandbox 1
if (ONLY !== 'sandbox-3') {
	const { ctx, page } = await open('/sandbox-1/');
	await page.waitForFunction(() => window.__walker && window.__assets, null, { timeout: 10 * 60e3 });
	const building = () => page.evaluate(() => { const s = window.__assets?.stats?.(); return s ? ['out', 'in', 'library'].reduce((a, k) => a + (s[k]?.building ?? 0), 0) : null; }).catch(() => null);
	const settle = async (ms) => {
		for (const end = Date.now() + ms; Date.now() < end; await page.waitForTimeout(2000)) if ((await building()) === 0) return true;
		return false;
	};
	console.log(`sandbox-1 up, ${(await settle(10 * 60e3)) ? 'settled' : 'still building'} after ${Math.round((Date.now() - t0) / 1000)} s`);
	for (const v of S1) {
		await page.evaluate((v) => window.__walker.place(v.x, v.z, v.yaw, v.pitch), v);
		await page.waitForTimeout(1500);
		const settled = await settle(3 * 60e3);
		views.push(await measure(page, 'sandbox-1', v.view, { settled, at: [v.x, v.z, v.yaw, v.pitch] }));
	}
	await ctx.close();
}

// Sandbox 3
if (ONLY !== 'sandbox-1') {
	const { ctx, page } = await open('/sandbox-3/');
	await page.waitForTimeout(OPEN * 1000);
	views.push(await measure(page, 'sandbox-3', 'open'));
	for (const [view, s] of [['walk5', 5], ['walk15', 10]]) {
		await page.mouse.click(W / 2, H / 2).catch(() => {});
		await page.keyboard.down('w');
		await page.waitForTimeout(s * 1000);
		await page.keyboard.up('w');
		await page.waitForTimeout(5000);
		views.push(await measure(page, 'sandbox-3', view, { walked_s: view === 'walk5' ? 5 : 15 }));
	}
	await ctx.close();
}

const commit = process.env.AUDIT_COMMIT ?? null;
writeFileSync(resolve(OUT, 'audit.json'), JSON.stringify({ intent: 'bba9c796-5126-4175-8ea5-466c84372459', commit, gpu, viewport: [W, H], sample_s: SAMPLE, at: new Date().toISOString(), views, wins: [] }, null, 1));
console.log(`done in ${Math.round((Date.now() - t0) / 1000)} s: ${resolve(OUT, 'audit.json')}`);
await browser.close();
proxy.close();

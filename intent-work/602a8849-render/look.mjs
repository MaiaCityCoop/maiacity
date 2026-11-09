#!/usr/bin/env node
/*
 * INTENT 602a8849's LOOK AND FRAME TIME (c8), on a Mac's Metal (run by ./run.sh): every other shader in TSL. For each
 * site (base: main at the merge base; head: the intent's pull request), one after the other, with the render box's
 * determinism (./determinism.mjs: SEEDED_RANDOM in every page, QUIET polled until 0):
 *   s1-water-*     Sandbox 1 (/sandbox-1/) at noon, looking at a pond and at the river from 14 m (the water: TSL, a
 *                  Fresnel term; expected to differ, judged by eye: it should reflect the sky and the sun)
 *   s1-dome-*      inside two domes (the glass's sheen, the meadow)
 *   s1-near/mid/far  6295a650's views (frame time)
 *   s3-open        the old city (/sandbox-3/) as it opens
 *   world-oldcity  the Old City world (/worlds/#43420c0b-…), its guests' lights and glows (instanced sprites now)
 *   plant-look     Sandbox 5 (/sandbox-5/): a plant picked, its card's turning plant on its soil disc (TSL); the plant
 *                  turns, so SSIM is of the card at one moment only
 *   factories      /factories/ (TILT, GRADE and FINITE as TSL passes)
 *   game-map       /game/map/
 *   lab            /sandbox-2/ (the Lab's contact dots as sprites)
 * Each view: the frame meter over SAMPLE s (render/meter.js, injected whole), a 1440×900 screenshot, every console and
 * page error (a node material that fails to compile shows there). SSIM head against base per view (ffmpeg's ssim).
 *
 *   node look.mjs --site base=http://localhost:5191 --site head=http://localhost:5192 --meter <meter.js> --out <dir>
 *
 * Each site is a dev server of one tree, its API at the read-only proxy this starts on 127.0.0.1:3913 (GET and HEAD of
 * /api/… only, to play.maia.city with PLAY_MCP_TOKEN, sent to play and nowhere else).
 */
import { createServer } from 'node:http';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUIET, SEEDED_RANDOM } from './determinism.mjs';

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
const OLD_CITY = '43420c0b-675b-4e50-98b5-c461b9432fc0';
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
	// a software GPU (avenBOX's SwiftShader) draws a frame of Sandbox 1 in more than 30 s: a screenshot waits for one
	ctx.setDefaultTimeout(15 * 60e3);
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`${path} pageerror: ${String(e).slice(0, 600)}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`${path} console: ${m.text().slice(0, 600)}`));
	await page.addInitScript({ content: SEEDED_RANDOM });
	// every sky held at noon from its first frame (the in-game clock runs thirty times the wall clock: a view shot twenty
	// minutes later was another hour; run 2's Old City on head was in a dawn haze)
	await page.addInitScript({ content: 'window.__interiorHour = 12;' });
	await page.addInitScript({ content: meterScript });
	await page.addInitScript({ content: probeScript });
	await page.goto(`${site.url}${path}`, { waitUntil: 'domcontentloaded' });
	return { ctx, page };
}
/** QUIET polled every 2 s until 0 (true), or `t` ms gone (false), never more than 3.5 min (since cb16b7a5 Sandbox 1
 *  keeps photographing for minutes and never counts as quiet); a page with no __assets settles by time alone */
const QUIET_MAX = 3.5 * 60e3;
async function quiet(page, t) {
	t = Math.min(t, QUIET_MAX);
	const log = [];
	const t0 = Date.now();
	for (const end = Date.now() + t; Date.now() < end; await page.waitForTimeout(2000)) {
		const q = await page.evaluate(QUIET).catch(() => null);
		// what keeps it busy: each part's building (and its parts: queue, loads, compiling, lowering), keeping, taken
		const busy = await page.evaluate(BUSY).catch((e) => String(e));
		log.push({ s: Math.round((Date.now() - t0) / 1000), q, busy });
		if (q === 0) return { settled: true, log };
	}
	return { settled: false, log };
}
const BUSY = `(() => {
	const s = window.__assets?.stats?.();
	if (!s) return null;
	const parts = Object.fromEntries(['out', 'in', 'library'].filter((k) => s[k]).map((k) => [k, s[k]]));
	const all = Object.keys(parts).length ? parts : { all: s };
	return Object.fromEntries(Object.entries(all).map(([k, p]) => [k, { building: p.building, busy: p.busy, keeping: p.keeping, taken: p.taken, kinds: p.kinds, loaded: p.loaded, pages: p.pages }]));
})()`;

async function sample(page) {
	return page.evaluate(async (sec) => {
		window.__probe?.reset();
		const m = await window.__meter.sample(sec);
		const p = window.__probe?.read() ?? { frames: 1, buckets: {} };
		const per = (x) => Math.round(x / Math.max(1, p.frames));
		const buckets = Object.fromEntries(Object.entries(p.buckets).map(([k, v]) => [k, { calls: per(v.calls), tris: per(v.tris) }]));
		return { ...m, tris: m.triangles, buckets };
	}, SAMPLE);
}

const views = [];
const ms = (x) => (x == null ? '–' : x.toFixed(2));
async function measure(page, site, view, extra = {}, clip) {
	await page.waitForTimeout(2000);
	const s = await sample(page).catch((e) => ({ error: String(e) }));
	const png = `${site.name}-${view}.png`;
	await page.screenshot({ path: resolve(OUT, png), ...(clip ? { clip } : {}) });
	const r = { site: site.name, view, ...extra, ...s, png };
	delete r.triangles;
	console.log(`${site.name} ${view}: frame ${ms(r.frame_ms)} (p95 ${ms(r.frame_p95)}) · cpu ${ms(r.cpu_ms)} · gpu ${ms(r.gpu_ms)} · ${r.calls} calls · ${(r.tris ?? 0).toLocaleString('en')} tris · bound ${r.bound}`);
	views.push(r);
}
/** the walker placed `d` m from (x, z), looking at it */
const facing = (x, z, d, from) => {
	const ax = x + Math.sin(from) * d, az = z + Math.cos(from) * d;
	return { x: ax, z: az, yaw: Math.atan2(ax - x, az - z), pitch: -0.32 };
};

const t0 = Date.now();
const errors = {};
for (const site of sites) {
	const err = (errors[site.name] = []);
	try {
		// Sandbox 1: the water, two domes inside, near/mid/far, at noon
		const { ctx, page } = await open(site, '/sandbox-1/', err);
		await page.waitForFunction(() => window.__walker && window.__assets && window.__village, null, { timeout: 10 * 60e3 });
		// the first settle's log kept whole (out/quiet-<site>.json): which counter stays busy where it never settles
		const first = await quiet(page, 10 * 60e3);
		writeFileSync(resolve(OUT, `quiet-${site.name}.json`), JSON.stringify(first, null, 1));
		await page.evaluate(() => (window.__interiorHour = 12));
		const places = await page.evaluate(() => {
			const v = window.__village;
			const water = v.water ?? v.extra?.water ?? [];
			const domes = (v.domes ?? []).map((d) => ({ x: d.x, z: d.z, R: d.R }));
			return { water, domes };
		});
		// a pond (the first creek's end, about 104 m out) and the river (305 m out): the water point nearest each
		const near = (r) => places.water.reduce((b, p) => (Math.abs(Math.hypot(p.x, p.z) - r) < Math.abs(Math.hypot(b.x, b.z) - r) ? p : b), places.water[0]);
		const shots = [];
		if (places.water.length) {
			const pond = near(104), river = near(305);
			shots.push(['s1-water-pond', { ...facing(pond.x, pond.z, 14, Math.atan2(pond.x, pond.z) + Math.PI), y: undefined }, pond]);
			shots.push(['s1-water-river', { ...facing(river.x, river.z, 14, Math.atan2(river.x, river.z) + Math.PI) }, river]);
		}
		for (const [i, d] of places.domes.slice(0, 2).entries()) shots.push([`s1-dome-${i}`, { x: d.x + d.R * 0.35, z: d.z + d.R * 0.35, yaw: Math.atan2(0.35, 0.35), pitch: 0.12 }, d]);
		// the looks alone (LOOKS=1, avenBOX): near, mid and far only fed the Mac's frame times
		if (!process.env.LOOKS) for (const v of S1) shots.push([`s1-${v.view}`, v]);
		for (const [view, v, target] of shots) {
			await page.evaluate((v) => window.__walker.place(v.x, v.z, v.yaw, v.pitch), v);
			await page.waitForTimeout(1500);
			const { settled, log } = await quiet(page, 3 * 60e3);
			await measure(page, site, view, { settled, quiet: [log[0], ...log.slice(-3)], at: [v.x, v.z, v.yaw, v.pitch], target });
		}
		await ctx.close();
	} catch (e) {
		err.push(`sandbox-1: ${e}`);
	}
	for (const [view, path, wait] of [
		['s3-open', '/sandbox-3/', OPEN],
		['world-oldcity', `/worlds/#${OLD_CITY}`, OPEN],
		['factories', '/factories/', 20],
		['game-map', '/game/map/', 20],
		['lab', '/sandbox-2/', 20]
	]) {
		try {
			const { ctx, page } = await open(site, path, err);
			await page.waitForTimeout(wait * 1000);
			await quiet(page, 60e3);
			await measure(page, site, view);
			// the world lights' glows show only after dark: the Old City again at 22:00
			if (view === 'world-oldcity') {
				await page.evaluate(() => (window.__interiorHour = 22));
				await page.waitForTimeout(5000);
				await measure(page, site, 'world-oldcity-night');
			}
			await ctx.close();
		} catch (e) {
			err.push(`${view}: ${e}`);
		}
	}
	try {
		// Sandbox 5: a plant picked by a click on the canvas (a grid of clicks until a card shows), its card shot
		const { ctx, page } = await open(site, '/sandbox-5/', err);
		await page.waitForFunction(() => window.__walker && window.__assets, null, { timeout: 10 * 60e3 }).catch(() => {});
		await quiet(page, 5 * 60e3);
		let card = null;
		for (const [fx, fy] of [[0.5, 0.55], [0.4, 0.6], [0.6, 0.6], [0.5, 0.7], [0.3, 0.55], [0.7, 0.55], [0.5, 0.45], [0.35, 0.7], [0.65, 0.7]]) {
			await page.mouse.click(W * fx, H * fy);
			await page.waitForTimeout(1500);
			card = await page.$('.look');
			if (card) break;
		}
		if (card) {
			await page.waitForTimeout(15000);
			const box = await card.boundingBox();
			await measure(page, site, 'plant-look', {}, box ?? undefined);
		} else err.push('plant-look: no plant picked by the grid of clicks');
		await ctx.close();
	} catch (e) {
		err.push(`plant-look: ${e}`);
	}
	console.log(`${site.name}: ${err.length} errors`);
	for (const e of err.slice(0, 30)) console.log(`    ${e}`);
}

// SSIM head against base per view (ffmpeg), and the frame time as the spec has it (c8, Samuel 2026-11-08): at near,
// head's mean at most base's + 8 ms and never above 33.4 ms; at every other view at most base's + 5 % (noise)
const ssim = (a, b) => {
	// ffmpeg prints its summary on stderr, whether it exits 0 or not (stdout alone gave NaN on the 09:41 run)
	const p = spawnSync('ffmpeg', ['-hide_banner', '-i', a, '-i', b, '-lavfi', 'ssim', '-f', 'null', '-'], { encoding: 'utf8' });
	return Number(/All:([0-9.]+)/.exec(`${p.stderr}${p.stdout}`)?.[1] ?? NaN);
};
const base = Object.fromEntries(views.filter((v) => v.site === 'base').map((v) => [v.view, v]));
const compare = views
	.filter((v) => v.site === 'head' && base[v.view])
	.map((v) => {
		const b = base[v.view];
		const s = existsSync(resolve(OUT, b.png)) && existsSync(resolve(OUT, v.png)) ? ssim(resolve(OUT, b.png), resolve(OUT, v.png)) : NaN;
		const water = v.view.startsWith('s1-water');
		return { view: v.view, ssim: s, ssim_ok: water || s >= 0.98, water, base_ms: b.frame_ms, head_ms: v.frame_ms, delta_ms: v.frame_ms - b.frame_ms, base_bound: b.bound, head_bound: v.bound, within: v.view === 's1-near' ? v.frame_ms <= b.frame_ms + 8 && v.frame_ms <= 33.4 : v.frame_ms <= b.frame_ms * 1.05 };
	});
for (const c of compare) console.log(`${c.view}: SSIM ${c.ssim?.toFixed(4)}${c.water ? ' (water: judged by eye)' : c.ssim_ok ? '' : ' UNDER 0.98'} · base ${ms(c.base_ms)} (${c.base_bound}) → head ${ms(c.head_ms)} (${c.head_bound}) · Δ ${ms(c.delta_ms)} ms ${c.within ? 'within' : 'OVER'} ${c.view === 's1-near' ? '+8 ms, ≤ 33.4' : '+5 %'}`);
writeFileSync(resolve(OUT, 'results.json'), JSON.stringify({ intent: '602a8849-50e4-4885-99b9-38353f951c9f', commits: { base: process.env.BASE_COMMIT ?? null, head: process.env.HEAD_COMMIT ?? null }, gpu, viewport: [W, H], sample_s: SAMPLE, at: new Date().toISOString(), views, compare, errors }, null, 1));
console.log(`done in ${Math.round((Date.now() - t0) / 1000)} s: ${resolve(OUT, 'results.json')}`);
await browser.close();
proxy.close();

#!/usr/bin/env node
/*
 * INTENT 3a8b135a's LOOK AND FRAME TIME (c5), on a Mac's Metal (run by ./run.sh): far trees as octahedral impostors lit
 * by the sky. For each site (base: intent 9's head; head: this intent's pull request), one after the other, with the
 * render box's determinism (./determinism.mjs: SEEDED_RANDOM in every page, QUIET polled until 0), Sandbox 1:
 *   far-<hour>     6295a650's far view (0, 370, yaw 0, pitch −0.12): the meter over SAMPLE s and a screenshot
 *   wood-<hour>    from the cell's east edge (370, 0) looking out east, low: the woods beyond seen across (the
 *                  canopy's shadow past the cascades, the far trees' sunlit and shaded sides, the low sun behind)
 *   orbit-<hour>   a slow 360° orbit at 370 m round the cell's middle, looking in, ORBIT stills (one each 360/ORBIT °)
 *                  joined into orbit-<hour>.mp4 at 12 fps, the meter over the whole orbit
 * at two hours: 5.56 (the sun 8° up in the east: sky.js `sunAt`) and 12:00. Every console and page error is kept.
 *
 *   node look.mjs --site base=http://localhost:5193 --site head=http://localhost:5194 --meter <meter.js> --out <dir>
 *
 * Each site is a dev server of one tree, its API at the read-only proxy this starts on 127.0.0.1:3913 (GET and HEAD of
 * /api/… only, to play.maia.city with PLAY_MCP_TOKEN, sent to play and nowhere else).
 */
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
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

const SAMPLE = 3, ORBIT = 72, W = 1440, H = 900;
const HOURS = [5.56, 12];
const FAR = { x: 0, z: 370, yaw: 0, pitch: -0.12 };

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
const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } : { args: ['--ignore-gpu-blocklist'] });
let gpu = 'unknown';
{
	const p = await browser.newPage();
	gpu = await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g?.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
	console.log(`GPU: ${gpu}`);
	await p.close();
}

/** QUIET polled every 2 s until 0 (true), or `t` ms gone (false), never more than 3.5 min */
async function quiet(page, t) {
	for (const end = Date.now() + Math.min(t, 3.5 * 60e3); Date.now() < end; await page.waitForTimeout(2000)) if ((await page.evaluate(QUIET).catch(() => null)) === 0) return true;
	return false;
}

const views = [];
const ms = (x) => (x == null ? '–' : x.toFixed(2));
const log = (r) => console.log(`${r.site} ${r.view}${r.backend ? ` [${r.backend}]` : ''}: frame ${ms(r.frame_ms)} (p95 ${ms(r.frame_p95)}) · cpu ${ms(r.cpu_ms)} · gpu ${ms(r.gpu_ms)} · ${r.calls} calls · ${(r.triangles ?? 0).toLocaleString('en')} tris · bound ${r.bound}`);
const place = (page, v) => page.evaluate((v) => window.__walker.place(v.x, v.z, v.yaw, v.pitch), v);

const t0 = Date.now();
const errors = {};
for (const site of sites) {
	const err = (errors[site.name] = []);
	const ctx = await browser.newContext({ viewport: { width: W, height: H } });
	const page = await ctx.newPage();
	page.on('pageerror', (e) => err.push(`pageerror: ${String(e).slice(0, 600)}`));
	page.on('console', (m) => m.type() === 'error' && err.push(`console: ${m.text().slice(0, 600)}`));
	await page.addInitScript({ content: SEEDED_RANDOM });
	await page.addInitScript({ content: meterScript });
	try {
		await page.goto(`${site.url}/sandbox-1/`, { waitUntil: 'domcontentloaded' });
		await page.waitForFunction(() => window.__walker && window.__assets && window.__village, null, { timeout: 10 * 60e3 });
		await place(page, FAR);
		await quiet(page, 10 * 60e3);
		for (const hour of HOURS) {
			await page.evaluate((h) => (window.__interiorHour = h), hour);
			for (const [view, v] of [
				[`far-${hour}`, FAR],
				[`wood-${hour}`, { x: 370, z: 0, yaw: -Math.PI / 2, pitch: -0.04 }]
			]) {
				await place(page, v);
				await page.waitForTimeout(1500);
				const settled = await quiet(page, 3 * 60e3);
				const s = await page.evaluate((sec) => window.__meter.sample(sec), SAMPLE).catch((e) => ({ error: String(e) }));
				const png = `${site.name}-${view}.png`;
				await page.screenshot({ path: resolve(OUT, png) });
				const backend = await page.evaluate(() => window.__rendererBackend ?? 'unknown').catch(() => 'unknown');
				const r = { site: site.name, view, hour, settled, at: v, backend, ...s, png };
				log(r);
				views.push(r);
			}
			// the orbit: still by still (each settled), then its frame time as it turns (a full turn in ORBIT steps)
			const dir = resolve(OUT, `${site.name}-orbit-${hour}`);
			mkdirSync(dir, { recursive: true });
			for (let k = 0; k < ORBIT; k++) {
				const a = (k / ORBIT) * Math.PI * 2;
				await place(page, { x: Math.sin(a) * 370, z: Math.cos(a) * 370, yaw: a, pitch: -0.12 });
				await page.waitForTimeout(k ? 250 : 2000);
				if (!k) await quiet(page, 60e3);
				await page.screenshot({ path: resolve(dir, `${String(k).padStart(3, '0')}.png`) });
			}
			const turn = await page.evaluate(async ({ n }) => {
				const run = (async () => {
					for (let k = 0; k < n; k++) {
						const a = (k / n) * Math.PI * 2;
						window.__walker.place(Math.sin(a) * 370, Math.cos(a) * 370, a, -0.12);
						await new Promise((r) => requestAnimationFrame(() => r()));
					}
				})();
				const m = await window.__meter.sample(n / 60);
				await run;
				return m;
			}, { n: 600 }).catch((e) => ({ error: String(e) }));
			try {
				execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '12', '-i', resolve(dir, '%03d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', resolve(OUT, `${site.name}-orbit-${hour}.mp4`)]);
			} catch (e) {
				err.push(`ffmpeg orbit-${hour}: ${e}`);
			}
			const r = { site: site.name, view: `orbit-${hour}`, hour, ...turn, film: `${site.name}-orbit-${hour}.mp4` };
			log(r);
			views.push(r);
		}
	} catch (e) {
		err.push(`sandbox-1: ${e}`);
	}
	await ctx.close();
	console.log(`${site.name}: ${err.length} errors`);
	for (const e of err.slice(0, 30)) console.log(`    ${e}`);
}

// head against base: the frame time at far (and over the orbit) at most base's; SSIM for reference only (the look
// is meant to change: judged by eye, base beside head)
const ssim = (a, b) => {
	try {
		const o = execFileSync('ffmpeg', ['-hide_banner', '-i', a, '-i', b, '-lavfi', 'ssim', '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
		return Number(/All:([0-9.]+)/.exec(o)?.[1]);
	} catch (e) {
		return Number(/All:([0-9.]+)/.exec(String(e.stderr))?.[1] ?? NaN);
	}
};
const base = Object.fromEntries(views.filter((v) => v.site === 'base').map((v) => [v.view, v]));
const compare = views
	.filter((v) => v.site === 'head' && base[v.view])
	.map((v) => {
		const b = base[v.view];
		const s = v.png && existsSync(resolve(OUT, b.png)) && existsSync(resolve(OUT, v.png)) ? ssim(resolve(OUT, b.png), resolve(OUT, v.png)) : null;
		return { view: v.view, ssim: s, base_ms: b.frame_ms, head_ms: v.frame_ms, delta_ms: v.frame_ms - b.frame_ms, base_bound: b.bound, head_bound: v.bound, within: v.frame_ms <= b.frame_ms };
	});
for (const c of compare) console.log(`${c.view}: base ${ms(c.base_ms)} (${c.base_bound}) → head ${ms(c.head_ms)} (${c.head_bound}) · Δ ${ms(c.delta_ms)} ms ${c.within ? 'within' : 'OVER'}${c.ssim == null ? '' : ` · SSIM ${c.ssim.toFixed(4)}`}`);
writeFileSync(resolve(OUT, 'results.json'), JSON.stringify({ intent: '3a8b135a-b7fd-4db8-b7e1-40b8afdc99f8', commits: { base: process.env.BASE_COMMIT ?? null, head: process.env.HEAD_COMMIT ?? null }, gpu, viewport: [W, H], sample_s: SAMPLE, at: new Date().toISOString(), views, compare, errors }, null, 1));
console.log(`done in ${Math.round((Date.now() - t0) / 1000)} s: ${resolve(OUT, 'results.json')}`);
await browser.close();
proxy.close();

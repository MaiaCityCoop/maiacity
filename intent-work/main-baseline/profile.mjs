// The Mac render box's CPU profile of one view (2026-11-08): where a frame's CPU time goes, by function.
//   node profile.mjs --site <url> --tree <play/site of that commit> --out <dir> [--view near|mid|far] [--ms 5000]
// Starts its own read-only proxy for the site's API on :3913 (GET/HEAD /api/… to play.maia.city with PLAY_MCP_TOKEN, and
// /api/files/<hash> from the tree's play/media first, as db87a28f's job does), opens /sandbox-1/ with the render box's
// determinism, places the walker, waits until quiet, then records a CDP CPU profile and prints the functions by self time.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { QUIET, SEEDED_RANDOM } from './determinism.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const SITE = arg('--site').replace(/\/$/, '');
const TREE = resolve(arg('--tree'));
const OUT = resolve(arg('--out', 'profile'));
const VIEW = arg('--view', 'near');
const MS = Number(arg('--ms', '5000'));
const VIEWS = { near: [0, 95, 0, -0.05], mid: [0, 235, 0, -0.05], far: [0, 370, 0, -0.12] };
mkdirSync(OUT, { recursive: true });
const token = process.env.PLAY_MCP_TOKEN;
if (!token) throw new Error('PLAY_MCP_TOKEN');
const media = join(TREE, '..', 'media');

const proxy = createServer(async (req, res) => {
	if (req.method !== 'GET' && req.method !== 'HEAD') return void res.writeHead(405).end();
	const m = req.url.match(/^\/api\/files\/([0-9a-f]{64})/);
	if (m) for (const ext of ['', '.ktx2', '.png', '.jpg']) {
		const f = join(media, m[1] + ext);
		if (existsSync(f)) return void res.writeHead(200, { 'content-type': ext === '.ktx2' ? 'image/ktx2' : 'application/octet-stream' }).end(readFileSync(f));
	}
	try {
		const r = await fetch('https://play.maia.city' + req.url, { method: req.method, headers: { authorization: `Bearer ${token}`, accept: req.headers.accept ?? '*/*' } });
		res.writeHead(r.status, { 'content-type': r.headers.get('content-type') ?? 'application/octet-stream' });
		res.end(Buffer.from(await r.arrayBuffer()));
	} catch (e) {
		res.writeHead(502).end(String(e));
	}
});
await new Promise((ok) => proxy.listen(3913, '127.0.0.1', ok));

const { chromium } = createRequire(join(TREE, 'package.json'))('playwright');
const browser = await chromium.launch({ channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript({ content: SEEDED_RANDOM });
await page.addInitScript(() => (window.__interiorHour = 12));
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${SITE}/sandbox-1/`);
await page.waitForFunction(() => window.__walker && window.__assets, null, { timeout: 10 * 60e3 });
const quiet = async (ms) => { for (const end = Date.now() + ms; Date.now() < end; await page.waitForTimeout(2000)) if ((await page.evaluate(QUIET).catch(() => null)) === 0) return true; return false; };
await quiet(10 * 60e3);
await page.evaluate((v) => window.__walker.place(...v), VIEWS[VIEW]);
await quiet(3 * 60e3);
await page.waitForTimeout(3000);

const cdp = await ctx.newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
const frames0 = await page.evaluate(() => new Promise((ok) => { let n = 0; const t0 = performance.now(); const f = () => (performance.now() - t0 < 1000 ? (n++, requestAnimationFrame(f)) : ok(n)); requestAnimationFrame(f); }));
await cdp.send('Profiler.start');
await page.waitForTimeout(MS);
const { profile } = await cdp.send('Profiler.stop');
writeFileSync(join(OUT, `cpu-${VIEW}.cpuprofile`), JSON.stringify(profile));

// self time by function (name, file, line)
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas;
profile.samples.forEach((id, i) => {
	const n = byId.get(id);
	const cf = n.callFrame;
	const key = `${cf.functionName || '(anonymous)'} ${cf.url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '')}:${cf.lineNumber + 1}`;
	self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0) / 1000);
});
const total = [...self.values()].reduce((a, b) => a + b, 0);
const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
const lines = [`view ${VIEW} · profile ${MS} ms · ${frames0} frames in the second before · total sampled ${total.toFixed(0)} ms`, ...top.map(([k, ms]) => `${ms.toFixed(1).padStart(8)} ms  ${((100 * ms) / total).toFixed(1).padStart(5)} %  ${k}`), ...(errors.length ? ['page errors:', ...errors.slice(0, 5)] : [])];
writeFileSync(join(OUT, `cpu-${VIEW}.txt`), lines.join('\n') + '\n');
console.log(lines.join('\n'));
await browser.close();
proxy.close();

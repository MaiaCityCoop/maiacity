#!/usr/bin/env node
// Intent 3a8b135a c5: Sandbox 1's far trees, main against head, in avenBOX's Chromium (software rendering). For each
// site: far at a sun 8° up (hour 5.56) and at 12:00, the woods beyond from the east edge at 5.56, and a slice of the
// orbit (9 stills, 370 m out, every 5° from 0° to 40°) at 5.56 for view jumps. The read-only proxy on 3913 reads play
// with PLAY_MCP_TOKEN (to play only).
//   node shoot.mjs --site main=http://localhost:5201 --site head=http://localhost:5202 --out <dir>
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { QUIET, SEEDED_RANDOM } from './determinism.mjs';

const { chromium } = createRequire(resolve(process.cwd(), 'package.json'))('playwright');
const argv = process.argv.slice(2);
const sites = [];
for (let i = 0; i < argv.length; i++) if (argv[i] === '--site') { const [name, url] = argv[++i].split('='); sites.push({ name, url }); }
const OUT = resolve(argv[argv.indexOf('--out') + 1]);
mkdirSync(OUT, { recursive: true });
const TOKEN = process.env.PLAY_MCP_TOKEN;
const proxy = createServer(async (req, res) => {
	if (!['GET', 'HEAD'].includes(req.method ?? '') || !req.url?.startsWith('/api/')) return res.writeHead(405).end('read-only');
	try {
		const r = await fetch('https://play.maia.city' + req.url, { method: req.method, headers: { authorization: `Bearer ${TOKEN}`, accept: req.headers.accept ?? '*/*' } });
		const h = Object.fromEntries([...r.headers].filter(([k]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(k)));
		res.writeHead(r.status, h);
		res.end(Buffer.from(await r.arrayBuffer()));
	} catch (e) {
		res.writeHead(502).end(String(e));
	}
});
await new Promise((ok) => proxy.listen(3913, '127.0.0.1', ok));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const FAR = { x: 0, z: 370, yaw: 0, pitch: -0.12 };
const log = [];
const say = (s) => (console.log(s), log.push(s));
async function quiet(page, t) {
	for (const end = Date.now() + t; Date.now() < end; await page.waitForTimeout(3000)) if ((await page.evaluate(QUIET).catch(() => null)) === 0) return true;
	return false;
}
for (const site of sites) {
	const t0 = Date.now();
	const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage();
	const errs = [];
	page.on('pageerror', (e) => errs.push(String(e).slice(0, 300)));
	page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 300)));
	await page.addInitScript({ content: SEEDED_RANDOM });
	await page.goto(`${site.url}/sandbox-1/`, { waitUntil: 'domcontentloaded', timeout: 300e3 });
	await page.waitForFunction(() => window.__walker && window.__assets && window.__village, null, { timeout: 30 * 60e3, polling: 5000 });
	const place = (v) => page.evaluate((v) => window.__walker.place(v.x, v.z, v.yaw, v.pitch), v);
	await page.evaluate(() => (window.__interiorHour = 5.56));
	await place(FAR);
	say(`${site.name}: loaded in ${Math.round((Date.now() - t0) / 1000)} s, backend ${await page.evaluate(() => window.__rendererBackend ?? 'webgl')}, settled ${await quiet(page, 6 * 60e3)} at ${Math.round((Date.now() - t0) / 1000)} s`);
	const shot = async (name, v, hour) => {
		await page.evaluate((h) => (window.__interiorHour = h), hour);
		await place(v);
		await page.waitForTimeout(8000);
		const q = await quiet(page, 60e3);
		await page.screenshot({ path: resolve(OUT, `${site.name}-${name}.png`), timeout: 5 * 60e3 });
		say(`${site.name} ${name}: settled ${q}`);
	};
	await shot('far-5.56', FAR, 5.56);
	await shot('far-12', FAR, 12);
	for (let k = 0; k <= 4; k++) {
		const a = (k * 5 * Math.PI) / 180;
		await shot(`orbit-${String(k * 5).padStart(2, '0')}`, { x: Math.sin(a) * 370, z: Math.cos(a) * 370, yaw: a, pitch: -0.12 }, 5.56);
	}
	say(`${site.name}: ${errs.length} errors${errs.length ? '\n  ' + [...new Set(errs)].slice(0, 15).join('\n  ') : ''}`);
	await page.context().close();
}
writeFileSync(resolve(OUT, 'log.txt'), log.join('\n') + '\n');
await browser.close();
proxy.close();

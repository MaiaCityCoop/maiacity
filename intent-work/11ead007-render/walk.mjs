#!/usr/bin/env node
// Intent 11ead007's c6 (README.md): the one cover stream, walked. For each --site: Sandbox 1 walked 30 m in from
// z = 160 toward the village over 12 s and the old city (Sandbox 3) walked forward 10 s, each recorded as a film at
// 1440x900 with the frame meter running over the walk (frame_ms, cpu_ms); and the walnut in the asset viewer standing
// on its biome's cover (a still). Run from a tree's play/site (Playwright as the site has it).
//   node walk.mjs --site base=http://localhost:5181 --site head=http://localhost:5182 --meter <meter.js> --out out/walk
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(`${process.cwd()}/package.json`)('playwright');
import { QUIET, SEEDED_RANDOM } from './determinism.mjs';
const argv = process.argv.slice(2), sites = [];
let out = 'out/walk', meterFile = null;
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === '--site') { const [name, url] = argv[++i].split('='); sites.push({ name, url }); }
	else if (argv[i] === '--out') out = argv[++i];
	else if (argv[i] === '--meter') meterFile = argv[++i];
}
mkdirSync(out, { recursive: true });
const TOKEN = process.env.PLAY_MCP_TOKEN;
if (!TOKEN) throw new Error('PLAY_MCP_TOKEN');
// play's read-only routes, the token sent to play only
const proxy = createServer(async (req, res) => {
	if (!['GET', 'HEAD'].includes(req.method ?? '') || !req.url?.startsWith('/api/')) return res.writeHead(405).end('read-only');
	try {
		const r = await fetch('https://play.maia.city' + req.url, { method: req.method, headers: { authorization: `Bearer ${TOKEN}`, accept: req.headers.accept ?? '*/*' } });
		res.writeHead(r.status, Object.fromEntries([...r.headers].filter(([k]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(k))));
		res.end(Buffer.from(await r.arrayBuffer()));
	} catch (e) { res.writeHead(502).end(String(e)); }
});
await new Promise((ok) => proxy.listen(3911, '127.0.0.1', ok));
const meter = meterFile ? readFileSync(meterFile, 'utf8').replace(/^export /gm, '') + '\nwindow.__meter = installMeter(window);\n' : null;
const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : { args: ['--ignore-gpu-blocklist'] });
const size = { width: 1440, height: 900 };
const settle = async (page, max = 10 * 60e3) => {
	const end = Date.now() + max;
	while (Date.now() < end) {
		if ((await page.evaluate(QUIET).catch(() => null)) === 0) return true;
		await page.waitForTimeout(2000);
	}
	return false;
};
/** a page recording its film; its errors told */
const open = async (site, film) => {
	const ctx = await browser.newContext({ viewport: size, ...(film && { recordVideo: { dir: `${out}/tmp-${site.name}`, size } }) });
	const page = await ctx.newPage();
	page.on('console', (m) => m.type() === 'error' && console.log(`[${site.name}] ${m.text().slice(0, 300)}`));
	page.on('pageerror', (e) => console.log(`[${site.name}] pageerror ${String(e).slice(0, 300)}`));
	await page.addInitScript({ content: SEEDED_RANDOM });
	if (meter) await page.addInitScript({ content: meter });
	return { ctx, page };
};
/** the film kept as <name>.webm once the page is closed */
const keep = async (ctx, page, name) => {
	const v = page.video();
	await ctx.close();
	if (v) renameSync(await v.path(), `${out}/${name}.webm`);
};
const results = [];
for (const site of sites) {
	// 1. Sandbox 1: settled at z = 160, then walked 30 m in over 12 s, the meter sampling the walk
	{
		const { ctx, page } = await open(site, true);
		await page.goto(`${site.url}/sandbox-1/`, { waitUntil: 'domcontentloaded' });
		await page.waitForFunction(() => window.__walker && window.__assets, null, { timeout: 10 * 60e3 });
		await page.evaluate(() => window.__walker.place(0, 160, 0, -0.05));
		const settled = await settle(page);
		await page.waitForTimeout(2000);
		const walk = page.evaluate(() => new Promise((ok) => { const t0 = performance.now(); const step = (now) => { const t = Math.min(1, (now - t0) / 12000); window.__walker.place(0, 160 - 30 * t, 0, -0.05); if (t < 1) requestAnimationFrame(step); else ok(); }; requestAnimationFrame(step); }));
		const m = meter ? await page.evaluate(() => window.__meter.sample(11.5)) : null;
		await walk;
		await page.waitForTimeout(1000);
		await page.screenshot({ path: `${out}/${site.name}-sandbox-1-end.png` });
		await keep(ctx, page, `${site.name}-sandbox-1`);
		results.push({ site: site.name, shot: 'sandbox-1 walk', settled, meter: m });
		console.log(`${site.name} sandbox-1 walk: ${JSON.stringify(m)}${settled ? '' : ' (still building)'}`);
	}
	// 2. the old city: as it opens (60 s), then walked forward 10 s
	{
		const { ctx, page } = await open(site, true);
		await page.goto(`${site.url}/sandbox-3/`, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(60e3);
		await page.mouse.click(720, 450).catch(() => {});
		await page.keyboard.down('w');
		const m = meter ? await page.evaluate(() => window.__meter.sample(9.5)) : null;
		await page.waitForTimeout(500);
		await page.keyboard.up('w');
		await page.screenshot({ path: `${out}/${site.name}-sandbox-3-end.png` });
		await keep(ctx, page, `${site.name}-sandbox-3`);
		results.push({ site: site.name, shot: 'sandbox-3 walk', meter: m });
		console.log(`${site.name} sandbox-3 walk: ${JSON.stringify(m)}`);
	}
	// 3. the walnut in the viewer, on its biome's cover (drawn now by the page's renderer, play's builds)
	{
		const { ctx, page } = await open(site, false);
		await page.goto(`${site.url}/plants/#34c5d8e0-48e4-541e-8e1d-3f7bfce8e1fe`, { waitUntil: 'domcontentloaded' });
		const ok = await page.waitForFunction(() => { const v = window.__vaultAsset; return v && v.hero && !v.building && !v.error; }, null, { timeout: 5 * 60e3 }).then(() => true, () => false);
		await page.waitForTimeout(8000);
		await page.screenshot({ path: `${out}/${site.name}-viewer-walnut.png` });
		const m = meter ? await page.evaluate(() => window.__meter.sample(4)) : null;
		await ctx.close();
		results.push({ site: site.name, shot: 'viewer walnut', ok, meter: m });
		console.log(`${site.name} viewer walnut: ${JSON.stringify(m)}`);
	}
}
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1));
await browser.close();
proxy.close();

#!/usr/bin/env node
// Intent cb16b7a5's c7, the asset viewer half (README.md): each --site's asset library opened on five assets (a machine
// with section caps, cut open too; a tree with levels; a skinned animal; a thing; a vehicle), settled, its frame time
// over 6 s (rAF deltas) and a screenshot at 1440x900. Then Sandbox 1 walked 30 m toward the village over 6 s, a frame
// every 0.5 s, for the level changes (dithered over BAND, no pop). Sites measured one after the other.
//   node assets.mjs --site base=http://localhost:5181 --site head=http://localhost:5182 --out out/assets
// The sites' API is selector-shots' read-only proxy (127.0.0.1:3911), started here the same way.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
// Playwright as the site has it (run from play/site, as run.sh does)
const { chromium } = createRequire(`${process.cwd()}/package.json`)('playwright');
import { QUIET, SEEDED_RANDOM } from './determinism.mjs';
const argv = process.argv.slice(2), sites = [];
let out = 'out/assets';
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === '--site') { const [name, url] = argv[++i].split('='); sites.push({ name, url }); }
	else if (argv[i] === '--out') out = argv[++i];
}
mkdirSync(out, { recursive: true });
const TOKEN = process.env.PLAY_MCP_TOKEN;
if (!TOKEN) throw new Error('PLAY_MCP_TOKEN');
const proxy = createServer(async (req, res) => {
	if (!['GET', 'HEAD'].includes(req.method ?? '') || !req.url?.startsWith('/api/')) return res.writeHead(405).end('read-only');
	try {
		const r = await fetch('https://play.maia.city' + req.url, { method: req.method, headers: { authorization: `Bearer ${TOKEN}`, accept: req.headers.accept ?? '*/*' } });
		res.writeHead(r.status, Object.fromEntries([...r.headers].filter(([k]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(k))));
		res.end(Buffer.from(await r.arrayBuffer()));
	} catch (e) { res.writeHead(502).end(String(e)); }
});
await new Promise((ok) => proxy.listen(3911, '127.0.0.1', ok));

const ASSETS = [
	{ name: 'walnut', group: 'plants', id: '34c5d8e0-48e4-541e-8e1d-3f7bfce8e1fe' },
	{ name: 'goat', group: 'animals', id: '15a2b380-38e8-5aff-9784-b41f234d7b89' },
	{ name: 'water-canister', group: 'things', id: '4d07974d-8bbc-5d32-95de-4ac7d78d1962' }
];
/** machines that may carry the kit's section caps: the first two that build here and have capped materials are cut open
 *  (chosen on the first site, the same two on the next; the Power Cube and the pickup name assets the token cannot read) */
const CUT_CANDIDATES = [
	{ name: 'batterypack', group: 'machines', id: 'bf1f3ce7-fdbb-5169-8306-a94cf7b600dd' },
	{ name: 'batterycube', group: 'machines', id: '05e6be57-cffa-500a-9321-b67aa361b522' },
	{ name: 'electrocube', group: 'machines', id: 'b432d49a-b3d4-51b6-aa6b-745b15fb3234' },
	{ name: 'forklift', group: 'machines', id: '08796f3c-17f2-5e10-928a-e3f2f11bedd4' },
	{ name: 'lifetrac', group: 'machines', id: '4548aeef-53b4-5d1d-abd6-cca7a0231761' },
	{ name: 'excavator-small', group: 'machines', id: '173058ac-c3ee-53f6-86a8-72bf86962201' },
	{ name: 'pod', group: 'machines', id: 'ebd58339-8d78-5fc4-bd70-7a3651861ba8' },
	{ name: 'powercube', group: 'machines', id: 'cb35a59a-e789-53af-b285-6ee0837dbb44' },
	{ name: 'pickup', group: 'machines', id: '5bf0a85d-2f01-5a78-acc5-84fd63d05731' }
];
let cutPicked = null;
const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : { args: ['--ignore-gpu-blocklist'] });
const clock = () => { const w = window; w.__dt = []; let last = 0; const t = (now) => { if (last) w.__dt.push(now - last); last = now; requestAnimationFrame(t); }; requestAnimationFrame(t); };
const timed = async (page, ms) => {
	await page.evaluate(() => (window.__dt.length = 0));
	await page.waitForTimeout(ms);
	return page.evaluate(() => { const d = window.__dt.slice(2).sort((a, b) => a - b); return { frames: d.length, frameMs: d.length ? +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(2) : null, frameP95: d[Math.floor(d.length * 0.95)] ?? null }; });
};
const results = [];
for (const site of sites) {
	const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await ctx.newPage();
	page.on('console', (m) => m.type() === 'error' && console.log(`[${site.name}] ${m.text().slice(0, 300)}`));
	page.on('pageerror', (e) => console.log(`[${site.name}] pageerror ${String(e).slice(0, 300)}`));
	await page.addInitScript({ content: SEEDED_RANDOM });
	await page.addInitScript(clock);
	// the cut-open machines: picked on the first site (built, with capped materials), the same ones after
	const capsOf = () => { let n = 0; window.__vaultAsset?.stage?.root?.traverse((o) => { for (const m of [o.material].flat()) if (m?.userData?.cap || m?.cap) n++; }); return n; };
	if (!cutPicked) {
		cutPicked = [];
		for (const c of CUT_CANDIDATES) {
			if (cutPicked.length === 2) break;
			await page.goto(`${site.url}/${c.group}/#${c.id}`, { waitUntil: 'domcontentloaded' });
			const built = await page.waitForFunction(() => { const v = window.__vaultAsset; return v && (v.error || (v.hero && !v.building)); }, null, { timeout: 3 * 60e3 }).then(async () => !(await page.evaluate(() => window.__vaultAsset?.error)), () => false);
			const caps = built ? await page.evaluate(capsOf) : 0;
			console.log(`cut candidate ${c.name}: built ${built}, capped materials ${caps}`);
			if (built && caps > 0) cutPicked.push({ ...c, cut: true });
		}
		console.log(`cut open: ${cutPicked.map((c) => c.name).join(', ') || 'none built with caps'}`);
	}
	for (const a of [...ASSETS, ...cutPicked]) {
		await page.goto(`${site.url}/${a.group}/#${a.id}`, { waitUntil: 'domcontentloaded' });
		const ok = await page.waitForFunction(() => { const v = window.__vaultAsset; return v && (v.error || (v.hero && !v.building)); }, null, { timeout: 5 * 60e3 }).then(async () => !(await page.evaluate(() => window.__vaultAsset?.error)), () => false);
		await page.waitForTimeout(4000);
		const m = await timed(page, 6000);
		const png = `${out}/${site.name}-${a.name}.png`;
		await page.screenshot({ path: png });
		results.push({ site: site.name, shot: a.name, ok, ...m, png });
		if (a.cut) {
			await page.evaluate(() => { const s = window.__vaultAsset.stage; s.target.cut = 1; });
			await page.waitForTimeout(5000);
			const mc = await timed(page, 6000);
			const pc = `${out}/${site.name}-${a.name}-cut.png`;
			await page.screenshot({ path: pc });
			results.push({ site: site.name, shot: `${a.name}-cut`, ok, ...mc, png: pc });
		}
	}
	// Sandbox 1: a walk in from mid toward the village, for the level changes
	await page.goto(`${site.url}/sandbox-1/`, { waitUntil: 'domcontentloaded' });
	await page.addInitScript(() => (window.__interiorHour = 12));
	await page.evaluate(() => (window.__interiorHour = 12));
	await page.waitForFunction(() => window.__walker && window.__assets, null, { timeout: 10 * 60e3 });
	// settled as the render box settles (./determinism.mjs QUIET: nothing building or kept, no new picture taken)
	for (let end = Date.now() + 10 * 60e3; Date.now() < end; await page.waitForTimeout(2000)) if ((await page.evaluate(QUIET)) === 0) break;
	await page.evaluate(() => window.__walker.place(0, 160, 0, -0.05));
	await page.waitForTimeout(2000);
	for (let end = Date.now() + 3 * 60e3; Date.now() < end; await page.waitForTimeout(2000)) if ((await page.evaluate(QUIET)) === 0) break;
	for (let i = 0; i <= 12; i++) {
		await page.evaluate((z) => window.__walker.place(0, z, 0, -0.05), 160 - i * 2.5);
		await page.waitForTimeout(500);
		await page.screenshot({ path: `${out}/${site.name}-walk-${String(i).padStart(2, '0')}.png` });
	}
	await ctx.close();
}
await browser.close();
proxy.close();
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1));
console.table(results.map(({ site, shot, ok, frameMs, frameP95 }) => ({ site, shot, ok, frameMs, frameP95 })));

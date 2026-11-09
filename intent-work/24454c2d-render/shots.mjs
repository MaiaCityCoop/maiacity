#!/usr/bin/env node
// Intent 24454c2d's c6 (README.md): Sandbox 1 from above and at walking height, its floor laid by its biomes' masks
// (head: the food forest's and the warm food forest's drafted versions, their cards swapped in by this proxy) against
// the same code with play's pinned v1 cards (base: no masks, laid exactly as before). One tree, two sites:
//   base  http://localhost:5181, play read through the plain proxy on 3911
//   head  http://localhost:5182, play read through the proxy on 3912, which hands /api/catalog with the two cards
//         of ./cards/<asset uuid>.json in place of their v1 cards
// For each site: every view settled (the render box's QUIET), its still at 1440x900, the meter over 6 s; then a 12 s
// walk filmed (pops, tile edges). Run from the tree's play/site:
//   node shots.mjs --meter <meter.js> --cards <dir> --out <dir>
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { QUIET, SEEDED_RANDOM } from './determinism.mjs';
const { chromium } = createRequire(`${process.cwd()}/package.json`)('playwright');
const argv = process.argv.slice(2), arg = (k) => (argv.indexOf(k) >= 0 ? argv[argv.indexOf(k) + 1] : undefined);
const out = arg('--out') ?? 'out/shots', meterFile = arg('--meter'), cardsDir = arg('--cards');
mkdirSync(out, { recursive: true });
const TOKEN = process.env.PLAY_MCP_TOKEN;
if (!TOKEN) throw new Error('PLAY_MCP_TOKEN');

/** each drafted biome's card catalog, by its asset's UUID */
const CARDS = Object.fromEntries(readdirSync(cardsDir).filter((f) => f.endsWith('.json')).map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(join(cardsDir, f), 'utf8'))]));
/** play's read-only routes, the token sent to play only; `swap`: the catalog's biome cards replaced by the drafted ones */
const proxy = (port, swap) =>
	new Promise((ok) => {
		const server = createServer(async (req, res) => {
			if (!['GET', 'HEAD'].includes(req.method ?? '') || !req.url?.startsWith('/api/')) return res.writeHead(405).end('read-only');
			try {
				const r = await fetch('https://play.maia.city' + req.url, { method: req.method, headers: { authorization: `Bearer ${TOKEN}`, accept: req.headers.accept ?? '*/*' } });
				const headers = Object.fromEntries([...r.headers].filter(([k]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(k)));
				let body = Buffer.from(await r.arrayBuffer());
				if (swap && r.ok && req.method === 'GET' && /^\/api\/catalog(\?|$)/.test(req.url)) {
					const rows = JSON.parse(body.toString('utf8'));
					let n = 0;
					for (const row of rows) if (CARDS[row.asset] && row.record?.card) (row.record.card.catalog = CARDS[row.asset]), n++;
					console.log(`[proxy ${port}] catalog: ${n} biome card(s) swapped for the drafted ones`);
					body = Buffer.from(JSON.stringify(rows));
				}
				res.writeHead(r.status, headers);
				res.end(body);
			} catch (e) {
				res.writeHead(502).end(String(e));
			}
		});
		server.listen(port, '127.0.0.1', () => ok(server));
	});
const proxies = [await proxy(3911, false), await proxy(3912, true)];
const sites = [
	{ name: 'base', url: 'http://localhost:5181' },
	{ name: 'head', url: 'http://localhost:5182' }
];

/** Sandbox 1's views (x, z in m from the master dome; yaw 0 looks to -z): walking height on the ground, and from above */
const VIEWS = [
	// at walking height: the forest garden by the village, a path crossing it; the cell further out, among the trees
	{ name: 'walk-near', place: [0, 95, 0, -0.18] },
	{ name: 'walk-edge', place: [40, 120, 0.9, -0.2] },
	// down on a tree of the forest garden from 8 m and another from 10 m (its guild and litter rings, the shade under
	// its crown, the gaps between colonies), and at walking height 2.5 m out from a crown's edge looking at its trunk
	{ name: 'top-trunk-8', trunk: 0, fly: (t) => [t.x, 8, t.z, 0, -1.55] },
	{ name: 'top-trunk-10', trunk: 1, fly: (t) => [t.x, 10, t.z, 0, -1.55] },
	{ name: 'walk-canopy-edge', trunk: 0, place: (t) => [t.x, t.z + t.r + 2.5, 0, -0.32] },
	// from above, 18 m up, the garden as a whole
	{ name: 'top-95', fly: [0, 18, 95, 0, -1.55] }
];
/**
 * Two trees of the forest garden to shoot (window.__floorTrunks, the head's code: the same in base and head): the
 * widest crowns standing most on their own near the village (their rings not run into a neighbour's), the same every run
 */
const TRUNKS = () => {
	const all = window.__floorTrunks ?? [];
	const alone = (t) => Math.min(...all.filter((u) => u !== t).map((u) => Math.hypot(u.x - t.x, u.z - t.z) - u.r - t.r));
	const near = all.filter((t) => Math.hypot(t.x, t.z - 110) < 70);
	return (near.length >= 2 ? near : all)
		.map((t) => ({ t, score: Math.min(4, alone(t)) + t.r }))
		.sort((a, b) => b.score - a.score || a.t.x - b.t.x || a.t.z - b.t.z)
		.slice(0, 2)
		.map(({ t }) => ({ x: t.x, z: t.z, r: t.r }));
};
const meter = meterFile ? readFileSync(meterFile, 'utf8').replace(/^export /gm, '') + '\nwindow.__meter = installMeter(window);\n' : null;
const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : { args: ['--ignore-gpu-blocklist'] });
const size = { width: 1440, height: 900 };
const settle = async (page, max) => {
	for (const end = Date.now() + max; Date.now() < end; await page.waitForTimeout(2000)) if ((await page.evaluate(QUIET).catch(() => null)) === 0) return true;
	return false;
};
const results = [];
for (const site of sites) {
	const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: `${out}/tmp-${site.name}`, size } });
	const page = await ctx.newPage();
	page.on('console', (m) => m.type() === 'error' && console.log(`[${site.name}] ${m.text().slice(0, 300)}`));
	page.on('pageerror', (e) => console.log(`[${site.name}] pageerror ${String(e).slice(0, 300)}`));
	await page.addInitScript({ content: SEEDED_RANDOM });
	// noon, the lamps out: the same hour for both
	await page.addInitScript(() => void (window.__interiorHour = 12));
	if (meter) await page.addInitScript({ content: meter });
	const t0 = Date.now();
	await page.goto(`${site.url}/sandbox-1/`, { waitUntil: 'domcontentloaded' });
	await page.waitForFunction(() => window.__walker && window.__assets, null, { timeout: 10 * 60e3 });
	const up = await settle(page, 4 * 60e3);
	console.log(`${site.name}: Sandbox 1 ${up ? 'settled' : 'still building'} after ${Math.round((Date.now() - t0) / 1000)} s`);
	const trunks = await page.evaluate(TRUNKS);
	console.log(`${site.name}: trees shot ${JSON.stringify(trunks)}`);
	for (const v of VIEWS) {
		const t = v.trunk === undefined ? null : trunks[v.trunk];
		if (v.trunk !== undefined && !t) {
			console.log(`${site.name} ${v.name}: no tree of the forest garden to shoot (window.__floorTrunks empty), skipped`);
			continue;
		}
		const at = { fly: typeof v.fly === 'function' ? v.fly(t) : v.fly, place: typeof v.place === 'function' ? v.place(t) : v.place };
		await page.evaluate((a) => (a.fly ? window.__walker.fly(...a.fly) : window.__walker.place(...a.place)), at);
		await page.waitForTimeout(1500);
		const ok = await settle(page, 2 * 60e3);
		await page.waitForTimeout(3000);
		const m = meter ? await page.evaluate(() => window.__meter.sample(6)) : null;
		const png = `${out}/${site.name}-${v.name}.png`;
		await page.screenshot({ path: png });
		// how much cover the floor holds there (the stream's copies), for the record
		results.push({ site: site.name, view: v.name, settled: ok, meter: m, png, ...(t ? { tree: t } : {}) });
		console.log(`${site.name} ${v.name}: ${JSON.stringify(m)}${ok ? '' : ' (still building)'}`);
	}
	// a 12 s walk at walking height, 30 m in from z = 160 (filmed: no plant pops, no tile edges in the cover)
	await page.evaluate(() => window.__walker.place(0, 160, 0, -0.18));
	await settle(page, 2 * 60e3);
	await page.waitForTimeout(2000);
	const walk = page.evaluate(() => new Promise((ok) => { const t0 = performance.now(); const step = (now) => { const t = Math.min(1, (now - t0) / 12000); window.__walker.place(0, 160 - 30 * t, 0, -0.18); if (t < 1) requestAnimationFrame(step); else ok(); }; requestAnimationFrame(step); }));
	const m = meter ? await page.evaluate(() => window.__meter.sample(11.5)) : null;
	await walk;
	results.push({ site: site.name, view: 'walk-30m', meter: m });
	console.log(`${site.name} walk-30m: ${JSON.stringify(m)}`);
	const video = page.video();
	await ctx.close();
	if (video) renameSync(await video.path(), `${out}/${site.name}-walk.webm`);
}
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1));
await browser.close();
for (const p of proxies) p.close();

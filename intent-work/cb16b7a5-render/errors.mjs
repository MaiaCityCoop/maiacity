#!/usr/bin/env node
// What head's Sandbox 1 throws (c7 found it drawing nothing once loaded): opens /sandbox-1/ on one site for 3 minutes
// and writes every page error, console error and warning (with its stack) to <out>/errors-<name>.txt, and whether
// the frame loop still draws (WebGL draw calls counted over the last 5 s). Run from play/site:
//   node <job>/errors.mjs --site head=http://localhost:5182 --out <job>/out
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SEEDED_RANDOM } from './determinism.mjs';
const { chromium } = createRequire(`${process.cwd()}/package.json`)('playwright');
const argv = process.argv.slice(2);
let site = null, out = 'out';
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === '--site') { const [name, url] = argv[++i].split('='); site = { name, url }; }
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
const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : { args: ['--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const lines = [];
const log = (s) => { lines.push(s); console.log(s); };
page.on('pageerror', (e) => log(`PAGEERROR ${e.stack ?? e}`));
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && log(`CONSOLE ${m.type()} ${m.text().slice(0, 4000)}`));
await page.addInitScript({ content: SEEDED_RANDOM });
await page.addInitScript(() => {
	window.__draws = 0;
	for (const C of [WebGL2RenderingContext]) for (const f of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) { const g = C.prototype[f]; C.prototype[f] = function (...a) { window.__draws++; return g.apply(this, a); }; }
	window.__interiorHour = 12;
});
await page.goto(`${site.url}/sandbox-1/`, { waitUntil: 'domcontentloaded' });
for (let t = 0; t < 180; t += 5) {
	const d0 = await page.evaluate(() => window.__draws);
	await page.waitForTimeout(5000);
	const d1 = await page.evaluate(() => window.__draws);
	log(`t=${t + 5}s draws in 5 s: ${d1 - d0}${await page.evaluate(() => (window.__assets ? ' (__assets up)' : ''))}`);
}
writeFileSync(`${out}/errors-${site.name}.txt`, lines.join('\n') + '\n');
await browser.close();
proxy.close();

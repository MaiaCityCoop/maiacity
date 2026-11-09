#!/usr/bin/env node
// Intent c1bee1f8's c8, the smoke (README.md): every page of play on the head, in Chrome (Chromium on Metal, WebGPU on)
// and in Safari's engine (WebKit), one after the other: opened, settled, its frame time over 3 s (rAF deltas, logged,
// not bounded), the backend that drew (`window.__rendererBackend`: webgpu, webgl2, or none on a page that draws
// nothing), a screenshot at 1440x900, and every console error and page error it logged.
//   node smoke.mjs --site http://localhost:5183 --out out/smoke
// Run from the head tree's play/site (Playwright and the job's determinism are that tree's). The site's API is the
// read-only proxy (scripts/macjob/proxy.mjs) on 127.0.0.1:3911.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const req = createRequire(`${process.cwd()}/package.json`);
const { chromium, webkit } = req('playwright');
const { SEEDED_RANDOM } = await import(pathToFileURL(`${process.cwd()}/scripts/macjob/determinism.js`).href);
const { playProxy } = await import(pathToFileURL(`${process.cwd()}/scripts/macjob/proxy.mjs`).href);

const argv = process.argv.slice(2);
let site = 'http://localhost:5183', out = 'out/smoke';
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === '--site') site = argv[++i].replace(/\/$/, '');
	else if (argv[i] === '--out') out = argv[++i];
}
mkdirSync(out, { recursive: true });
const proxy = await playProxy();

/** every page of play (src/routes), the viewers on an asset that draws: a rigged actor (the goat, skinned by dual
 *  quaternions) and a machine (the kit's caps); the pages with nothing to draw are opened for their console alone */
const PAGES = [
	['sandbox-1', '/sandbox-1/'], ['sandbox-2', '/sandbox-2/'], ['sandbox-3', '/sandbox-3/'], ['sandbox-4', '/sandbox-4/'],
	['sandbox-5', '/sandbox-5/'], ['sandbox-6', '/sandbox-6/'], ['sandbox-7', '/sandbox-7/'], ['worlds', '/worlds/'],
	['game-map', '/game/map/'], ['game', '/game/'], ['factories', '/factories/'], ['stories', '/stories/'],
	['animals-goat', '/animals/#15a2b380-38e8-5aff-9784-b41f234d7b89'], ['machines-batterypack', '/machines/#bf1f3ce7-fdbb-5169-8306-a94cf7b600dd'],
	['plants', '/plants/'], ['buildings', '/buildings/'], ['things', '/things/'], ['characters', '/characters/'], ['biomes', '/biomes/'],
	['assets', '/assets/'], ['pieces', '/pieces/'], ['library', '/library/'], ['sandboxes', '/sandboxes/'], ['game-editor', '/game-editor/'],
	['intents', '/intents/'], ['artifacts', '/artifacts/'], ['skills', '/skills/'], ['schemas', '/schemas/'], ['rules', '/rules/'],
	['delivery', '/delivery/'], ['profile', '/profile/'], ['admin', '/admin/']
];

const clock = () => { const w = window; w.__dt = []; if (typeof requestAnimationFrame !== 'function') return; let last = 0; const t = (now) => { if (last) w.__dt.push(now - last); last = now; requestAnimationFrame(t); }; requestAnimationFrame(t); };
const timed = async (page, ms) => {
	await page.evaluate(() => (window.__dt = [])).catch(() => {});
	await page.waitForTimeout(ms);
	return page.evaluate(() => { const d = (window.__dt ?? []).slice(2).sort((a, b) => a - b); return { frames: d.length, frameMs: d.length ? +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(2) : null, frameP95: d[Math.floor(d.length * 0.95)] ?? null }; }).catch(() => ({ frames: 0, frameMs: null, frameP95: null }));
};

// Chrome on a Mac's Metal with WebGPU on; Safari's engine as Playwright ships it (WebGPU where it has it, else its
// WebGL 2 backend: said as the backend)
const BROWSERS = [
	['chrome', () => chromium.launch(process.platform === 'darwin' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } : { args: ['--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] })],
	['safari', () => webkit.launch({ headless: true })]
];
const results = [];
for (const [bname, launch] of BROWSERS) {
	const browser = await launch().catch((e) => (console.log(`${bname}: not launched (${e.message.split('\n')[0]})`), null));
	if (!browser) { results.push({ browser: bname, page: '(launch)', ok: false, errors: ['the browser did not launch'] }); continue; }
	const adapter = await (async () => {
		const ctx = await browser.newContext(), p = await ctx.newPage();
		await p.goto(`${site}/`, { waitUntil: 'domcontentloaded' }).catch(() => {});
		const a = await p.evaluate(async () => { if (!navigator.gpu) return 'no navigator.gpu'; const x = await navigator.gpu.requestAdapter(); return x ? `${x.info?.vendor ?? ''} ${x.info?.architecture ?? ''}`.trim() || 'an adapter' : 'no adapter'; }).catch((e) => `unknown (${e.message})`);
		await ctx.close();
		return a;
	})();
	console.log(`${bname}: WebGPU adapter ${adapter}`);
	for (const [name, path] of PAGES) {
		const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const page = await ctx.newPage();
		const errors = [];
		page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 400)));
		page.on('pageerror', (e) => errors.push(`pageerror ${String(e).slice(0, 400)}`));
		await page.addInitScript({ content: SEEDED_RANDOM });
		await page.addInitScript(clock);
		const from = Date.now();
		await page.goto(`${site}${path}`, { waitUntil: 'domcontentloaded', timeout: 60e3 }).catch((e) => errors.push(`goto ${e.message.split('\n')[0]}`));
		// drawn: its renderer said its backend (or, a page with none, after 8 s), then 4 s to settle
		await page.waitForFunction(() => !!window.__rendererBackend, null, { timeout: 8e3 }).catch(() => {});
		await page.waitForTimeout(4000);
		const m = await timed(page, 3000);
		const backend = await page.evaluate(() => window.__rendererBackend ?? 'none').catch(() => 'unknown');
		const png = `${out}/${bname}-${name}.png`;
		await page.screenshot({ path: png }).catch((e) => errors.push(`screenshot ${e.message.split('\n')[0]}`));
		results.push({ browser: bname, page: name, ok: errors.length === 0, backend, ...m, seconds: +((Date.now() - from) / 1000).toFixed(1), errors, png });
		console.log(`${bname} ${name}: ${backend}, ${m.frameMs ?? '–'} ms, ${errors.length} errors${errors.length ? `: ${errors[0]}` : ''}`);
		await ctx.close();
	}
	await browser.close();
}
proxy.close?.();
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1));
console.table(results.map(({ browser, page, ok, backend, frameMs, frameP95, errors }) => ({ browser, page, ok, backend, frameMs, frameP95, errors: errors.length })));
const bad = results.filter((r) => !r.ok);
console.log(`c8: ${bad.length ? `FAIL, ${bad.length} page(s) with errors: ${bad.map((r) => `${r.browser}/${r.page}`).join(', ')}` : 'PASS, every page opened with no console error'}; backends: ${[...new Set(results.map((r) => `${r.browser} ${r.backend}`))].join(', ')}`);

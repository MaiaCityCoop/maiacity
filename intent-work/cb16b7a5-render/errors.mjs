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
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && log(`CONSOLE ${m.type()} ${m.text().slice(0, 20000)}`));
await page.addInitScript({ content: SEEDED_RANDOM });
await page.addInitScript(() => {
	window.__draws = 0;
	for (const C of [WebGL2RenderingContext]) for (const f of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) { const g = C.prototype[f]; C.prototype[f] = function (...a) { window.__draws++; return g.apply(this, a); }; }
	window.__interiorHour = 12;
	// a promise that failed and nobody waited for (an async world's mount): it never shows as a page error
	addEventListener('unhandledrejection', (e) => console.error(`UNHANDLED ${e.reason?.stack ?? e.reason}`));
	// the graphics card taking the context back (a shader that hangs it): three then draws nothing, and throws nothing
	{ const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (kind, ...a) { if (/webgl/.test(kind) && !this.__watched) { this.__watched = true; this.addEventListener('webglcontextlost', (e) => console.error(`CONTEXTLOST at ${(performance.now() / 1000).toFixed(1)} s ${e.statusMessage ?? ''}`)); this.addEventListener('webglcontextrestored', () => console.error('CONTEXTRESTORED')); } return gc.call(this, kind, ...a); }; }
	// whether the world's frame loop runs: its rAF callbacks counted by their source
	{ const raf = window.requestAnimationFrame.bind(window); window.__rafs = 0; window.requestAnimationFrame = (cb) => raf((t) => { window.__rafs++; cb(t); }); }
	// a vector uniform handed something no browser takes: what it was, and who handed it (then thrown as before)
	for (const f of ['uniform1fv', 'uniform2fv', 'uniform3fv', 'uniform4fv', 'uniformMatrix3fv', 'uniformMatrix4fv']) {
		const g = WebGL2RenderingContext.prototype[f];
		WebGL2RenderingContext.prototype[f] = function (loc, ...a) {
			const v = f.startsWith('uniformMatrix') ? a[1] : a[0];
			if (v === null || typeof v !== 'object' || typeof v.length !== 'number') {
				let desc;
				try { desc = `${typeof v} ${v?.constructor?.name ?? ''} ${JSON.stringify(v, (k, x) => (typeof x === 'object' && x && k ? '[obj]' : x))?.slice(0, 400)} keys ${v && typeof v === 'object' ? Object.keys(v).slice(0, 20).join(',') : ''}`; } catch (e) { desc = String(e); }
				const prog = this.getParameter(this.CURRENT_PROGRAM), names = [];
				if (prog) for (let i = 0; i < this.getProgramParameter(prog, this.ACTIVE_UNIFORMS); i++) { const u = this.getActiveUniform(prog, i); if (u && this.getUniformLocation(prog, u.name) && /vec2|FLOAT_VEC2/.test(String(u.type)) === false && u.type === this.FLOAT_VEC2) names.push(u.name); }
				const sh = prog ? this.getAttachedShaders(prog).map((s) => this.getShaderSource(s)) : [];
				console.error(`BADUNIFORM ${f}: ${desc}\n vec2 uniforms in program: ${names.join(', ')}\n program head: ${(sh[1] ?? '').slice(0, 300).replace(/\n/g, ' | ')}\n${new Error().stack}`);
			}
			return g.call(this, loc, ...a);
		};
	}
});
await page.goto(`${site.url}/sandbox-1/`, { waitUntil: 'domcontentloaded' });
for (let t = 0; t < 180; t += 5) {
	const d0 = await page.evaluate(() => window.__draws);
	await page.waitForTimeout(5000);
	const d1 = await page.evaluate(() => window.__draws);
	log(`t=${t + 5}s draws in 5 s: ${d1 - d0}${await page.evaluate(() => (window.__assets ? ' (__assets up)' : ''))}`);
	if ((t + 5) % 10 === 0)
		log(`  state: ${await page.evaluate(() => {
			const text = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && e.offsetParent !== null && /\S/.test(e.textContent ?? '')).map((e) => e.textContent.trim()).filter((x) => x.length < 120).slice(0, 8).join(' | ');
			let stats = null;
			try { stats = window.__assets?.stats?.(); } catch (e) { stats = String(e); }
			const brief = stats && typeof stats === 'object' ? Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, v && { building: v.building, keeping: v.keeping, compiling: v.compiling, levels: v.levels, copies: v.copies, calls: v.calls }])) : stats;
			const g = document.querySelector('canvas')?.getContext('webgl2'); return `lost ${g ? g.isContextLost() : '?'} · rafs ${window.__rafs} · text: ${text} · stats: ${JSON.stringify(brief)}`;
		})}`);
}
writeFileSync(`${out}/errors-${site.name}.txt`, lines.join('\n') + '\n');
await browser.close();
proxy.close();

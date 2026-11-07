// Drives page.js in Chromium on the Mac's GPU: every clip of both people beside its recording, front and side.
//   bun intent-work/b9e6ad45-render/render.mjs <out folder>      (from the repository's root; run.sh calls it)
// Out: <out>/frames/<who>/<clip>/NNNN.jpg (30 a second), and <out>/sheets/<who>-<clip>.jpg (four moments of each).
// It stops unless the GPU is the Mac's (Metal), never SwiftShader: SETUP_ONLY=1 builds both people and draws nothing.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const OUT = resolve(process.argv[2] ?? 'out');
const req = createRequire(import.meta.url);
let playwright;
for (const p of [join(ROOT, 'play/site/node_modules/playwright'), join(ROOT, 'play/site/node_modules/@playwright/test'), 'playwright']) {
	try { playwright = req(p); break; } catch {}
}
if (!playwright) throw new Error('Playwright is needed (npm i -g playwright && npx playwright install chromium)');
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.gz': 'application/gzip' };
const server = createServer(async (q, r) => {
	const path = join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
	if (!path.startsWith(ROOT)) return void r.writeHead(403).end();
	let body;
	try { body = await readFile(path); } catch { return void r.writeHead(404).end(); }
	r.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body);
}).listen(0, '127.0.0.1');
await new Promise((ok) => server.once('listening', ok));
const url = `http://127.0.0.1:${server.address().port}/intent-work/b9e6ad45-render/page.html`;
const browser = await playwright.chromium.launch({ channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.error('page:', e.message));
await page.goto(url);
await page.waitForFunction(() => typeof window.setup === 'function');
const save = (file, dataUrl) => writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
try {
	for (const who of ['stand-in', 'elder-woman']) {
		const { clips, plan, height } = await page.evaluate((w) => window.setup(w), who);
		console.log(who, `${height.toFixed(2)} m`, clips.join(', '));
		if (process.env.SETUP_ONLY) { await page.reload(); await page.waitForFunction(() => typeof window.setup === 'function'); continue; }
		if (who === 'stand-in') {
			const gpu = await page.evaluate(() => window.gpu());
			console.log('renderer:', gpu);
			if (!/metal|apple/i.test(gpu) || /swiftshader/i.test(gpu)) throw new Error(`not the Mac's GPU (${gpu}): stopped, nothing drawn`);
		} else await page.evaluate(() => window.gpu());
		for (const clip of clips) {
			const { len } = plan[clip], n = Math.round(Math.max(len, 1.6) * 30) + 1;
			const dir = join(OUT, 'frames', who, clip.replace(/ /g, '-'));
			await mkdir(dir, { recursive: true });
			for (let i = 0; i < n; i++) await save(join(dir, `${String(i).padStart(4, '0')}.jpg`), await page.evaluate(([c, t]) => window.frame(c, t), [clip, i / 30]));
			console.log(' ', clip, n, 'frames');
		}
		await page.reload();
		await page.waitForFunction(() => typeof window.setup === 'function');
	}
} finally {
	await browser.close();
	server.close();
}

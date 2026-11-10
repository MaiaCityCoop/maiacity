#!/usr/bin/env bun
/*
 * A WORLD ON A REAL GPU — a page of play's site opened in a real browser, on the machine's own GPU, and measured
 * (intent ba948167): the adapter it draws with, whether the world is shown, the time to the world, its frame time,
 * and a screenshot. In Chromium and in WebKit (Samuel uses Safari). It needs no token and reads no network: the
 * site's build (`bun run build`) served as play serves it (play/api/src/site.ts), and `/api` answered from the
 * census's pinned inputs (./census/inputs: play's routes and files by hash, as ./census/setup.ts reads them), the one
 * signed in an admin.
 *
 *   bun play/site/scripts/gpu.ts [--world /sandbox-5/] [--browser chromium,webkit] [--out <dir>]
 *                                [--timeout <seconds>] [--frames <n>] [--inputs <dir>] [--record]
 *
 * --record   pins what the page reads and the inputs lack (a world's ground textures, its cover), read from play with
 *            PLAY_MCP_TOKEN (the header to play only) and held to its hash; sound is never pinned (no picture needs it)
 *
 * Writes <out>/gpu.json (every measure) and <out>/<browser>.png, and prints one line a browser. On GitHub's macOS
 * runners this is Metal (.github/workflows/intents-pr.yml's gpu job); in avenBOX it is the software renderer, which
 * the report says by the adapter's name: nothing here pretends a CPU is a GPU.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { chromium, webkit, type Browser, type BrowserType } from 'playwright';
import { siteHandler } from '../../api/src/site.ts';
import { hashBytes } from '../src/lib/kernel/hash.js';

const argv = process.argv.slice(2);
const arg = (k: string, d?: string) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const SITE = resolve(import.meta.dir, '..');
const world = arg('--world', '/sandbox-5/')!;
const browsers = arg('--browser', 'chromium,webkit')!.split(',');
const out = resolve(arg('--out', 'gpu-out')!);
const timeout = Number(arg('--timeout', '300')) * 1000;
const frames = Number(arg('--frames', '300'));
const inputs = resolve(arg('--inputs', join(SITE, 'scripts/census/inputs'))!);
if (!existsSync(join(SITE, 'build/200.html'))) throw new Error('gpu: play/site has no build (bun run build)');
mkdirSync(out, { recursive: true });

/** `/api` from the pinned inputs: a file by its hash, a route by its URL; what is not pinned is a 404, and named */
const unpinned = new Set<string>();
const ME = { id: '00000000-0000-4000-8000-000000000000', name: 'gpu', level: 'admin', may: { read: ['*'] } };
const record = argv.includes('--record');
const routeAt = (route: string) => join(inputs, `${createHash('sha256').update(route).digest('hex').slice(0, 20)}.json.gz`);
async function api(u: URL): Promise<Response> {
	if (u.pathname === '/api/me') return Response.json(ME);
	const route = u.pathname + u.search;
	const file = /^\/api\/files\/([0-9a-f]{64})(\.\w+)?$/.exec(u.pathname)?.[1];
	const at = file ? join(inputs, 'files', `${file}.gz`) : routeAt(route);
	if (!existsSync(at) && record) {
		const r = await fetch(`https://play.maia.city${route}`, { headers: { authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}` } });
		const type = r.headers.get('content-type') ?? 'application/octet-stream';
		const bytes = new Uint8Array(await r.arrayBuffer());
		if (file && r.ok && !type.startsWith('audio/') && hashBytes(bytes) === file) writeFileSync(at, gzipSync(bytes, { level: 9 }));
		else if (!file && r.ok) writeFileSync(at, gzipSync(JSON.stringify({ route, status: r.status, type, blake3: hashBytes(bytes), body: new TextDecoder().decode(bytes) }), { level: 9 }));
	}
	if (existsSync(at)) {
		if (file) return new Response(gunzipSync(readFileSync(at)), { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' } });
		const p = JSON.parse(gunzipSync(readFileSync(at)).toString('utf8'));
		return new Response(p.body, { status: p.status, headers: { 'content-type': p.type } });
	}
	unpinned.add(route);
	return Response.json({ error: 'not pinned' }, { status: 404 });
}
const site = siteHandler(join(SITE, 'build'));
const server = Bun.serve({
	port: 0,
	hostname: '127.0.0.1',
	fetch(req) {
		const u = new URL(req.url);
		if (u.pathname.startsWith('/api/')) return req.method === 'GET' || req.method === 'HEAD' ? api(u) : new Response('read-only', { status: 405 });
		return site(req);
	}
});
const origin = `http://127.0.0.1:${server.port}`;

/** a Mac's Metal for Chromium, WebGPU asked for; WebKit as it comes */
const LAUNCH: Record<string, [BrowserType, object]> = {
	chromium: [chromium, { channel: 'chromium', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : [])] }],
	webkit: [webkit, { headless: true }]
};

type Measure = {
	browser: string;
	version: string;
	/** WebGPU's adapter as the browser names it, or none */
	webgpu: string;
	/** WebGL's renderer as the browser names it, or none */
	webgl: string;
	/** what the page's renderer drew with: webgpu, webgl2 (WebGPURenderer's fallback) or none */
	backend: string | null;
	/** the cover gone and a canvas drawn into: the world is shown */
	shown: boolean;
	/** seconds from the navigation to the world (the page's mount answered) */
	world_s: number | null;
	/** the frame time over `frames` frames once the world is up: median and 95th percentile, ms */
	frame_ms: number | null;
	frame_p95: number | null;
	/** the share of the screenshot's pixels that are not its most frequent colour: a blank picture is near 0 */
	painted: number | null;
	errors: string[];
};

async function measure(name: string): Promise<Measure> {
	const m: Measure = { browser: name, version: '', webgpu: 'none', webgl: 'none', backend: null, shown: false, world_s: null, frame_ms: null, frame_p95: null, painted: null, errors: [] };
	let browser: Browser | undefined;
	try {
		const [type, options] = LAUNCH[name] ?? (() => { throw new Error(`no browser ${name} (chromium, webkit)`); })();
		browser = await type.launch(options);
		m.version = browser.version();
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		page.on('pageerror', (e) => m.errors.push(String(e.message).slice(0, 300)));
		// a route not pinned is named once, below, not as each 404 it made
		page.on('console', (c) => c.type() === 'error' && !c.text().startsWith('Failed to load resource') && m.errors.push(c.text().slice(0, 300)));
		const t0 = performance.now();
		await page.goto(origin + world, { waitUntil: 'commit' });
		[m.webgpu, m.webgl] = await page.evaluate(async () => {
			const a = await (navigator as any).gpu?.requestAdapter?.().catch(() => null);
			const i = a?.info;
			const g = document.createElement('canvas').getContext('webgl2');
			const e = g?.getExtension('WEBGL_debug_renderer_info');
			return [a ? [i?.vendor, i?.architecture, i?.device, i?.description].filter(Boolean).join(' ') || 'an adapter' : 'none', g ? String(e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)) : 'none'];
		});
		// the world is up once its cover opens (WorldPage.svelte: `mount` answered) or, on a page without one, its pill is gone
		await page.waitForFunction(() => !!document.querySelector('.world canvas') && !document.querySelector('.world .loading:not(.opening)') && !document.querySelector('.world .status'), null, { timeout, polling: 100 });
		m.world_s = Math.round((performance.now() - t0) / 100) / 10;
		await page.waitForFunction(() => !document.querySelector('.world .loading'), null, { timeout: 10_000 }).catch(() => {});
		m.backend = await page.evaluate(() => (window as any).__rendererBackend ?? null);
		const dts = await page.evaluate(
			(n) =>
				new Promise<number[]>((ok) => {
					const dts: number[] = [];
					let last = 0;
					const end = performance.now() + 30_000;
					const tick = (now: number) => {
						if (last) dts.push(now - last);
						last = now;
						dts.length < n && now < end ? requestAnimationFrame(tick) : ok(dts);
					};
					requestAnimationFrame(tick);
				}),
			frames
		);
		const sorted = [...dts].sort((a, b) => a - b);
		const q = (p: number) => (sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] * 10) / 10 : null);
		[m.frame_ms, m.frame_p95] = [q(0.5), q(0.95)];
		const png = await page.screenshot({ path: join(out, `${name}.png`) });
		// how much of the picture is painted, counted in the page (its own decoder): a white or one-colour world is near 0
		m.painted = await page.evaluate(async (b64) => {
			const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
			const c = Object.assign(document.createElement('canvas'), { width: 144, height: 90 });
			const g = c.getContext('2d')!;
			g.drawImage(img, 0, 0, 144, 90);
			const d = g.getImageData(0, 0, 144, 90).data;
			const seen = new Map<number, number>();
			for (let i = 0; i < d.length; i += 4) {
				const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
				seen.set(k, (seen.get(k) ?? 0) + 1);
			}
			return Math.round((1 - Math.max(...seen.values()) / (d.length / 4)) * 1000) / 1000;
		}, png.toString('base64'));
		m.shown = m.painted > 0.2;
	} catch (e: any) {
		m.errors.push(String(e?.message ?? e).split('\n')[0].slice(0, 300));
	} finally {
		await browser?.close().catch(() => {});
	}
	return m;
}

const got: Measure[] = [];
for (const b of browsers) {
	const m = await measure(b);
	got.push(m);
	console.log(`${m.browser} ${m.version} · WebGPU ${m.webgpu} · WebGL ${m.webgl} · drew with ${m.backend ?? 'nothing'} · world ${m.shown ? 'shown' : 'NOT shown'} in ${m.world_s ?? '—'} s · frame ${m.frame_ms ?? '—'} ms (p95 ${m.frame_p95 ?? '—'}) · painted ${m.painted ?? '—'}${m.errors.length ? ` · ${m.errors.length} errors: ${m.errors[0]}` : ''}`);
}
if (unpinned.size) console.log(`not pinned (answered 404): ${[...unpinned].slice(0, 12).join(' ')}${unpinned.size > 12 ? ` … ${unpinned.size} in all` : ''}`);
writeFileSync(join(out, 'gpu.json'), JSON.stringify({ world, platform: `${process.platform} ${process.arch}`, measures: got, unpinned: [...unpinned] }, null, '\t') + '\n');
server.stop(true);
process.exit(got.every((m) => m.shown) ? 0 : 1);

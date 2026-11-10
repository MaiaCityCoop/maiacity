#!/usr/bin/env bun
/*
 * A WORLD ON A REAL GPU — a page of play's site opened in real browsers on the machine's own GPU and measured (intent
 * ba948167): the adapter it draws with, whether the world is shown, the time to the world, its frame time (the frame
 * meter's: src/lib/content/render/meter.js) and a screenshot, in Chromium and in WebKit (Safari's engine). It needs
 * no token and reads no network: the site's build (`bun run build`) served as play serves it (play/api/src/site.ts),
 * `/api` answered from the pinned inputs (./census/pinned.ts), the one signed in an admin.
 *
 *   bun play/site/scripts/gpu.ts [--world /sandbox-5/] [--browser chromium,webkit] [--out <dir>]
 *        [--world-within <seconds>] [--frame-within <ms>] [--settle <seconds>] [--timeout <seconds>]
 *        [--inputs <dir>] [--software] [--record] [--steps] [--sky]
 *
 * --world          the page's route: a sandbox, or an asset's viewer
 * --world-within   the world is shown within that many seconds of the navigation, in every browser asked
 * --frame-within   a frame takes at most that many ms (the mean over 10 s once the world has settled)
 * --timeout        how long the world may take to come up (600: GitHub's runner needs 270 to 400 s for Sandbox 5)
 * --settle         how long the world may take to settle before its frames are measured and it is photographed (60)
 * --sky            the sky's pictures too (intent c929d52c): once the world is measured, the eye turned up where it
 *                  stands, at dawn, noon, dusk and night (the hour pinned as a film pins it), at 1440 × 900 and at a
 *                  phone's 390 × 844: <out>/<browser>-sky-<hour>-<width>x<height>.png. A world without them fails
 * --steps          prints what the page's cover said on the way to the world, each step with the second it began
 * --software       measure even where there is no GPU (the box's software renderer): for this script's own plumbing.
 *                  Without it a machine without a GPU measures nothing and fails, saying so: what needs a GPU is
 *                  not decided in a software renderer.
 * --record         pins what the page reads and the inputs lack (a world's ground textures, its cover), read from
 *                  play with PLAY_MCP_TOKEN (the header to play only); sound is never pinned (no picture needs it)
 *
 * Prints one line a browser and writes <out>/gpu.json and <out>/<browser>.png (--out, else a folder under $GPU_OUT or
 * the temp folder, named by the check and the world). Exit 0 only when the world is shown
 * in every browser, the graphics device was never lost, and every bound given holds. An intent's check asks for it by
 * this command as its `run`; on its pull request the box run measures it on GitHub's macOS runner, on Metal
 * (.github/workflows/intents-pr.yml's job `gpu`), and records what it printed as the check's evidence.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, webkit, type Browser, type BrowserType, type Page } from 'playwright';
import { siteHandler } from '../../api/src/site.ts';
import { fileOf, pinFile, pinRoute, pinnedFile, pinnedRoute } from './census/pinned';
import { quietness } from './lib/quiet.js';
import { SEEDED_RANDOM } from './macjob/determinism.js';
import { LAUNCH, gpuOf, webgpuOf } from './mac-page.mjs';

const SITE = resolve(import.meta.dir, '..');
const PLAY = 'https://play.maia.city';

/** whether a renderer's name, as a browser gives it, is a software one: no GPU */
export const software = (name: string) => /swiftshader|llvmpipe|softpipe|software|basic render|^none/i.test(name.trim());

/** the one signed in, where nobody is: an admin, so every page opens */
const ME = { id: '00000000-0000-4000-8000-000000000000', name: 'gpu', level: 'admin', may: { read: ['*'] } };

/**
 * `/api` from the pinned inputs: a file by its hash, a route by its URL, read-only. What is not pinned is a 404 and
 * kept in `unpinned`; with `live` (--record) it is read from play first and pinned.
 */
export function pinnedApi(inputs: string, unpinned: Set<string>, live?: (route: string) => Promise<Response>) {
	return async (req: Request): Promise<Response> => {
		if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('read-only', { status: 405 });
		const u = new URL(req.url);
		const route = u.pathname + u.search;
		if (u.pathname === '/api/me') return Response.json(ME);
		const file = fileOf(u.pathname);
		if (live && !(file ? pinnedFile(inputs, file) : pinnedRoute(inputs, route))) {
			const r = await live(route);
			const type = r.headers.get('content-type') ?? 'application/octet-stream';
			const bytes = new Uint8Array(await r.arrayBuffer());
			if (file && r.ok && !type.startsWith('audio/')) pinFile(inputs, file, bytes);
			else if (!file && r.ok) pinRoute(inputs, route, r.status, type, new TextDecoder().decode(bytes));
		}
		if (file) {
			const bytes = pinnedFile(inputs, file);
			if (bytes) return new Response(bytes, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' } });
		} else {
			const p = pinnedRoute(inputs, route);
			if (p) return new Response(p.body, { status: p.status, headers: { 'content-type': p.type } });
		}
		unpinned.add(route);
		return Response.json({ error: 'not pinned' }, { status: 404 });
	};
}

export type Measure = {
	browser: string;
	version: string;
	/** WebGPU's adapter and WebGL's renderer as the browser names them, or none */
	webgpu: string;
	webgl: string;
	/** what the page's renderer drew with: webgpu, webgl2 (WebGPURenderer's fallback) or null */
	backend: string | null;
	/** the world is up (its cover open) and the picture is not blank */
	shown: boolean;
	/** seconds from the navigation to the world */
	world_s: number | null;
	/** what the cover said on the way, each step with the second it began */
	steps: string[];
	/** seconds more until it had settled (./lib/quiet.js), or null where it had not within --settle */
	settled_s: number | null;
	/** the frame meter's 10 s once settled: the frames it saw, their mean and p95 interval, CPU and GPU ms a frame, draws, triangles */
	frames: number | null;
	frame_ms: number | null;
	frame_p95: number | null;
	cpu_ms: number | null;
	gpu_ms: number | null;
	calls: number | null;
	triangles: number | null;
	/** the share of the screenshot that is not its most frequent colour: a blank picture is near 0 */
	painted: number | null;
	/** --sky: the sky's pictures taken, by file name */
	sky?: string[];
	errors: string[];
};
export type Bounds = { worldWithin?: number; frameWithin?: number; sky?: boolean };

/** --sky: the hours of the world's day the sky is photographed at, and the sizes */
export const SKY_HOURS = { dawn: 5.35, noon: 12.5, dusk: 19.65, night: 23 };
export const SKY_VIEWS = [[1440, 900], [390, 844]];
/** how far up the eye looks for them (rad): the horizon stays in the picture's lower fifth */
const SKY_PITCH = 0.42;

/** The sky's pictures of the world a page shows (--sky), through the film camera's hold on it (`window.__world`). */
async function skyPictures(page: Page, name: string, out: string): Promise<string[]> {
	const files: string[] = [];
	for (const [width, height] of SKY_VIEWS) {
		await page.setViewportSize({ width, height });
		for (const [label, hour] of Object.entries(SKY_HOURS)) {
			await page.evaluate(([hour, pitch]) => {
				const w = (window as any).__world;
				if (!w?.camera || !w.fly) throw new Error('the world gives the film camera no hold (window.__world): no sky pictures');
				(window as any).__interiorHour = hour;
				w.sun?.(hour);
				const at = w.camera.getWorldPosition(new w.THREE.Vector3()), d = w.camera.getWorldDirection(new w.THREE.Vector3());
				w.fly(at.x, at.y, at.z, Math.atan2(-d.x, -d.z), pitch);
			}, [hour, SKY_PITCH]);
			await page.waitForTimeout(2500);
			const file = `${name}-sky-${label}-${width}x${height}.png`;
			await page.screenshot({ path: join(out, file) });
			files.push(file);
		}
	}
	return files;
}

/** why a measure fails: nothing when the world is shown, the device held and every bound given holds */
export function judge(m: Measure, b: Bounds = {}): string[] {
	const why: string[] = [];
	if (m.world_s === null) why.push(`the world never came up${m.errors[0] ? `: ${m.errors[0]}` : ''}`);
	else if (!m.shown) why.push(`the picture is blank (${m.painted} painted)`);
	if (m.errors.some((e) => /device was lost/i.test(e))) why.push('the graphics device was lost');
	if (b.worldWithin !== undefined && m.world_s !== null && m.world_s > b.worldWithin) why.push(`the world took ${m.world_s} s, more than ${b.worldWithin} s`);
	if (b.frameWithin !== undefined && (m.frame_ms === null || m.frame_ms > b.frameWithin)) why.push(`a frame took ${m.frame_ms ?? '—'} ms, more than ${b.frameWithin} ms`);
	if (b.sky && m.world_s !== null && !m.sky?.length) why.push('no sky pictures');
	return why;
}

/** one line a browser, as the check's evidence keeps it */
export const lineOf = (m: Measure, why: string[]) =>
	`${why.length ? '✗' : '✓'} ${m.browser} ${m.version} · WebGPU ${m.webgpu} · WebGL ${m.webgl} · drew with ${m.backend ?? 'nothing'} · world in ${m.world_s ?? '—'} s, settled ${m.settled_s === null ? 'not' : `in ${m.settled_s} s more`} · ${m.frames ?? '—'} frames in 10 s, ${m.frame_ms ?? '—'} ms each (p95 ${m.frame_p95 ?? '—'}, CPU ${m.cpu_ms ?? '—'}, GPU ${m.gpu_ms ?? '—'}) · ${m.calls ?? '—'} draws, ${m.triangles ?? '—'} triangles · ${m.painted ?? '—'} painted${m.sky?.length ? ` · ${m.sky.length} sky pictures` : ''}${why.length ? ` · ${why.join('; ')}` : ''}`;

const BROWSERS: Record<string, [BrowserType, object]> = { chromium: [chromium, LAUNCH], webkit: [webkit, { headless: true }] };

async function measure(name: string, origin: string, o: { world: string; out: string; timeout: number; settle: number; sky?: boolean }): Promise<Measure> {
	const m: Measure = { browser: name, version: '', webgpu: 'none', webgl: 'none', backend: null, shown: false, world_s: null, steps: [], settled_s: null, frames: null, frame_ms: null, frame_p95: null, cpu_ms: null, gpu_ms: null, calls: null, triangles: null, painted: null, errors: [] };
	let browser: Browser | undefined;
	try {
		browser = await BROWSERS[name][0].launch(BROWSERS[name][1]);
		m.version = browser.version();
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		// every page's Math.random one sequence, and the frame meter in before the page makes its renderer
		await page.addInitScript({ content: SEEDED_RANDOM });
		await page.addInitScript({ content: `${readFileSync(join(SITE, 'src/lib/content/render/meter.js'), 'utf8').replace(/^export /gm, '')};window.__meter = installMeter(window);` });
		page.on('pageerror', (e) => m.errors.push(String(e.message).slice(0, 300)));
		// a route not pinned is named once, at the end, not as each 404 it made
		page.on('console', (c) => c.type() === 'error' && !c.text().startsWith('Failed to load resource') && m.errors.push(c.text().slice(0, 300)));
		const t0 = performance.now();
		await page.goto(origin + o.world, { waitUntil: 'commit' });
		[m.webgpu, m.webgl] = [await webgpuOf(page), await gpuOf(page)];
		// up: a canvas drawn into, and the page's cover open (WorldPage.svelte: its `mount` answered) or its pill gone
		// each step the cover says on the way, with the second it began: where a slow load spends its time
		const secs = () => Math.round((performance.now() - t0) / 100) / 10;
		for (let said = ''; ; await page.waitForTimeout(200)) {
			const at = await page.evaluate(() => ({ up: !!document.querySelector('canvas') && !document.querySelector('.world .loading:not(.opening), .world .status'), step: document.querySelector('.world .loading .step, .world .status')?.textContent?.trim() ?? '' })).catch(() => ({ up: false, step: '' }));
			if (at.up) break;
			if (at.step && at.step !== said) m.steps.push(`${secs()} s ${(said = at.step)}`);
			if (performance.now() - t0 > o.timeout) throw new Error(`the world was not up within ${o.timeout / 1000} s (at: ${said || 'nothing said'})`);
		}
		m.world_s = secs();
		m.backend = await page.evaluate(() => (window as any).__rendererBackend ?? null);
		const t1 = performance.now();
		for (let zero = 0; performance.now() - t1 < o.settle * 1000 && zero < 2; await page.waitForTimeout(1000)) zero = (await page.evaluate(quietness).catch(() => null)) === 0 ? zero + 1 : 0;
		if ((await page.evaluate(quietness).catch(() => null)) === 0) m.settled_s = Math.round((performance.now() - t1) / 100) / 10;
		await page.waitForFunction(() => !document.querySelector('.world .loading'), null, { timeout: 10_000 }).catch(() => {});
		const s = await page.evaluate(() => (window as any).__meter.sample(10));
		Object.assign(m, { frames: s.frames, frame_ms: s.frames > 1 ? s.frame_ms : null, frame_p95: s.frame_p95, cpu_ms: s.cpu_ms, gpu_ms: s.gpu_ms, calls: s.calls, triangles: s.triangles });
		const png = await page.screenshot({ path: join(o.out, `${name}.png`) });
		// how much of the picture is painted, counted in the page (its own decoder)
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
		if (o.sky) m.sky = await skyPictures(page, name, o.out);
	} catch (e: any) {
		m.errors.push(String(e?.message ?? e).split('\n')[0].slice(0, 300));
	} finally {
		await browser?.close().catch(() => {});
	}
	return m;
}

/** the machine's GPU as Chromium's WebGL names it (a software renderer's name where there is none) */
async function machineGpu(): Promise<string> {
	const b = await chromium.launch(LAUNCH);
	try {
		const page = await b.newPage();
		await page.goto('about:blank');
		return await gpuOf(page);
	} finally {
		await b.close();
	}
}

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const arg = (k: string, d?: string) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
	const num = (k: string) => (arg(k) === undefined ? undefined : Number(arg(k)));
	const world = arg('--world', '/sandbox-5/')!;
	const browsers = arg('--browser', 'chromium,webkit')!.split(',');
	// its pictures: --out, else a folder a call under GPU_OUT (the gpu job's artifact) or the temp folder, named by its check and world
	const out = resolve(arg('--out') ?? join(process.env.GPU_OUT ?? join(tmpdir(), 'gpu-out'), `${process.env.INTENT_CHECK ?? 'world'}${world.replace(/\W+/g, '-').replace(/-$/, '')}`));
	const inputs = resolve(arg('--inputs', join(SITE, 'scripts/census/inputs'))!);
	const bounds: Bounds = { worldWithin: num('--world-within'), frameWithin: num('--frame-within'), sky: argv.includes('--sky') };
	const fail = (why: string): never => (console.log(`gpu: ${why}`), process.exit(1));
	for (const b of browsers) if (!BROWSERS[b]) fail(`no browser ${b} (chromium, webkit)`);

	const gpu = await machineGpu().catch((e) => `none (${String(e?.message ?? e).split('\n')[0]})`);
	if (software(gpu)) {
		if (!argv.includes('--software')) fail(`no GPU here (${gpu}): nothing measured. A world's look, load time and frame time are measured on a real GPU: on its pull request the box run takes this check on GitHub's macOS runner (intents-pr.yml's job gpu).`);
		console.log(`gpu: no GPU here (${gpu}): measured in the software renderer, as asked (--software)`);
	}
	if (!existsSync(join(SITE, 'build/200.html'))) fail('play/site has no build (cd play/site && bun run build)');
	mkdirSync(out, { recursive: true });

	const unpinned = new Set<string>();
	const token = process.env.PLAY_MCP_TOKEN;
	if (argv.includes('--record') && !token) fail('--record reads play with PLAY_MCP_TOKEN');
	const api = pinnedApi(inputs, unpinned, argv.includes('--record') ? (route) => fetch(PLAY + route, { headers: { authorization: `Bearer ${token}` } }) : undefined);
	const site = siteHandler(join(SITE, 'build'));
	const server = Bun.serve({ port: 0, hostname: '127.0.0.1', idleTimeout: 0, fetch: (req) => (new URL(req.url).pathname.startsWith('/api/') ? api(req) : site(req)) });

	console.log(`${world} on ${gpu} (${process.platform} ${process.arch}); pictures in ${out}`);
	const measures: (Measure & { why: string[] })[] = [];
	for (const b of browsers) {
		const m = await measure(b, `http://127.0.0.1:${server.port}`, { world, out, timeout: Number(arg('--timeout', '600')) * 1000, settle: Number(arg('--settle', '60')), sky: bounds.sky });
		const why = judge(m, bounds);
		measures.push({ ...m, why });
		console.log(lineOf(m, why));
		if (argv.includes('--steps')) for (const st of m.steps) console.log(`    ${st}`);
	}
	if (unpinned.size) console.log(`not pinned (answered 404; --record pins a picture's): ${[...unpinned].slice(0, 6).join(' ')}${unpinned.size > 6 ? ` … ${unpinned.size} in all` : ''}`);
	writeFileSync(join(out, 'gpu.json'), JSON.stringify({ world, gpu, platform: `${process.platform} ${process.arch}`, bounds, measures, unpinned: [...unpinned] }, null, '\t') + '\n');
	server.stop(true);
	process.exit(measures.every((m) => !m.why.length) ? 0 : 1);
}

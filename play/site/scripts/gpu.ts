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
 *        [--inputs <dir>] [--software] [--record] [--steps] [--walk] [--walk-within <ms>] [--views near,mid,far] [--sky]
 *
 * --world          the page's route: a sandbox, or an asset's viewer
 * --world-within   the world is shown within that many seconds of the navigation, in every browser asked
 * --frame-within   a frame takes at most that many ms (the mean over 10 s once the world has settled)
 * --walk           also measures the eye walking (intent 0356b0ea): from the census's near view (./census/run.ts VIEWS),
 *                  settled there first, then 1.5 m/s forward and 20° a second round by the clock (./census/frame.ts STEP),
 *                  the frame meter's 10 s of it after a second's start, and in Chromium 5 s more under its profiler (the
 *                  walk's JavaScript by function, printed with --steps); a world without a walker (Sandbox 3) has none and says so
 * --walk-within    a frame of the walk takes at most that many ms (it asks for --walk)
 * --stroll         also walks the world for that many seconds (intent 095bc67c, ./stroll.ts): dome to dome at the walker's
 *                  pace, first on the cold page (its first visit, right after it settled), then once more after a reload
 *                  (warm: the browser's and the device's caches kept), every frame's interval kept with the long tasks
 *                  and the page's `make:*` spans; the five worst frames of each are printed with what was being made
 * --stroll-max     no frame of either stroll over that many ms; --stroll-p99 their 99th percentile frame at most that
 *                  many ms; --stroll-per-minute at most that many frames over 33 ms in any minute of either (each asks for --stroll)
 * --views          also photographs the world from the census's views (./census/run.ts VIEWS), the eye put there and
 *                  the world left to settle: <out>/<browser>-<view>.png, so what is far is judged on a real GPU (intent 92fbecea)
 * --timeout        how long the world may take to come up (600: GitHub's runner needs 270 to 400 s for Sandbox 5)
 * --settle         how long the world may take to settle before its frames are measured and it is photographed (60)
 * --sky            the sky's pictures too (intent c929d52c): once the world is measured, the eye lifted 45 m where
 *                  it stands, turned round and up, at dawn, noon, dusk and night (the hour pinned as a film pins it), at 1440 × 900 and at a
 *                  phone's 390 × 844: <out>/<browser>-sky-<hour>-<width>x<height>.png. A world without them fails
 * --steps          prints what the page's cover said on the way to the world, each step with the second it began
 * --software       measure even where there is no GPU (the box's software renderer): for this script's own plumbing.
 *                  Without it a machine without a GPU measures nothing and fails, saying so: what needs a GPU is
 *                  not decided in a software renderer.
 * GPU_LOADS        (the environment) a folder of loads, each a gpu.json this script wrote, in subfolders (intent a35ccd33):
 *                  then it launches no browser and needs no build and no GPU, but reads each engine's measure from the
 *                  load of its world in that engine (./gpu-loads.ts: intents-pr.yml's gpu-load jobs, one a world and
 *                  engine), judges it by its own bounds, prints the same lines and copies the pictures; an engine with no
 *                  load, or a load not asked what this call asks, fails, saying so
 * --record         pins what the page reads and the inputs lack (a world's ground textures, its cover), read from
 *                  play with PLAY_MCP_TOKEN (the header to play only); sound is never pinned (no picture needs it)
 *
 * Prints one line a browser and writes <out>/gpu.json and <out>/<browser>.png (--out, else a folder under $GPU_OUT or
 * the temp folder, named by the check and the world). Exit 0 only when the world is shown
 * in every browser, the graphics device was never lost, and every bound given holds. An intent's check asks for it by
 * this command as its `run`; on its pull request the box run measures it on GitHub's macOS runner, on Metal
 * (.github/workflows/intents-pr.yml's job `gpu`), and records what it printed as the check's evidence.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, webkit, type Browser, type BrowserType, type Page } from 'playwright';
import { siteHandler } from '../../api/src/site.ts';
import { DEFAULTS, parseArgs, uncovered } from './gpu-loads';
import { fileOf, pinFile, pinRoute, pinnedFile, pinnedRoute } from './census/pinned';
import { quietness } from './lib/quiet.js';
import { SEEDED_RANDOM } from './macjob/determinism.js';
import { LAUNCH, gpuOf, webgpuOf } from './mac-page.mjs';
import { PACE, judgeStroll, routeOf, statsOf, strollLine, walkInPage, type StrollStats } from './stroll';

/** a walk's step a frame at 60 frames a second, and the census's views, where a walk starts (near) and --views photographs: (./census/frame.ts STEP, ./census/run.ts VIEWS), written here because those modules build a world as they load */
const STEP = { forward: 1.5 / 60, yaw: (20 * Math.PI) / 180 / 60 };
const VIEWS = { near: { x: 0, z: 95, yaw: 0, pitch: -0.05 }, mid: { x: 0, z: 235, yaw: 0, pitch: -0.05 }, far: { x: 0, z: 370, yaw: 0, pitch: -0.12 } } as const;

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
	/** the same 10 s with the eye walking (--walk): null where it was not asked for or the world has no walker */
	walk_ms: number | null;
	walk_p95: number | null;
	walk_cpu: number | null;
	walk_gpu: number | null;
	/** --stroll: the cold page's walk and the warm page's (./stroll.ts) */
	stroll_cold?: StrollStats | null;
	stroll_warm?: StrollStats | null;
	/** the share of the screenshot that is not its most frequent colour: a blank picture is near 0 */
	painted: number | null;
	/** --sky: the sky's pictures taken, by file name */
	sky?: string[];
	errors: string[];
};
export type Bounds = { worldWithin?: number; frameWithin?: number; walkWithin?: number; sky?: boolean; strollMax?: number; strollP99?: number; strollPerMinute?: number };

/** --sky: the hours of the world's day the sky is photographed at, and the sizes */
export const SKY_HOURS = { dawn: 5.35, noon: 12.5, dusk: 19.65, night: 23 };
export const SKY_VIEWS = [[1440, 900], [390, 844]];
/** how far up the eye looks for them (rad), and how far it is lifted (m): the land stays along the picture's foot */
const SKY_PITCH = 0.36, SKY_RISE = 45;

/** once: where the eye stands, turned round (a world opens facing what it is about, which hides the sky) and lifted over the trees */
const skyFrom = (rise: number) => {
	const w = (window as any).__world;
	if (!w?.camera) throw new Error('the world gives the film camera no hold (window.__world): no sky pictures');
	(window as any).__skyFrom ??= (() => {
		const at = w.camera.getWorldPosition(new w.THREE.Vector3()), d = w.camera.getWorldDirection(new w.THREE.Vector3());
		return [at.x, at.y + rise, at.z, Math.atan2(d.x, d.z)];
	})();
};

/** The sky's pictures of the world a page shows (--sky), through the film camera's hold on it (`window.__world`). */
async function skyPictures(page: Page, name: string, out: string): Promise<string[]> {
	const files: string[] = [];
	await page.evaluate(skyFrom, SKY_RISE);
	for (const [width, height] of SKY_VIEWS) {
		await page.setViewportSize({ width, height });
		for (const [label, hour] of Object.entries(SKY_HOURS)) {
			await page.evaluate(([hour, pitch, rise]) => {
				const w = (window as any).__world;
				if (!w?.camera || !w.fly) throw new Error('the world gives the film camera no hold (window.__world): no sky pictures');
				(window as any).__interiorHour = hour;
				w.sun?.(hour);
				const from = (window as any).__skyFrom;
				w.fly(from[0], from[1], from[2], from[3], pitch);
			}, [hour, SKY_PITCH]);
			await page.waitForTimeout(2500);
			const file = `${name}-sky-${label}-${width}x${height}.png`;
			await page.screenshot({ path: join(out, file), timeout: 120_000 });
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
	if (b.walkWithin !== undefined && (m.walk_ms === null || m.walk_ms > b.walkWithin)) why.push(`a frame walking took ${m.walk_ms ?? '—'} ms, more than ${b.walkWithin} ms`);
	if (b.sky && m.world_s !== null && !m.sky?.length) why.push('no sky pictures');
	const sb = { max: b.strollMax, p99: b.strollP99, perMinute: b.strollPerMinute };
	if (m.world_s !== null) for (const k of ['cold', 'warm'] as const) why.push(...judgeStroll(k, m[`stroll_${k}`] ?? null, sb));
	return why;
}

/** one line a browser, as the check's evidence keeps it */
export const lineOf = (m: Measure, why: string[]) =>
	`${why.length ? '✗' : '✓'} ${m.browser} ${m.version} · WebGPU ${m.webgpu} · WebGL ${m.webgl} · drew with ${m.backend ?? 'nothing'} · world in ${m.world_s ?? '—'} s, settled ${m.settled_s === null ? 'not' : `in ${m.settled_s} s more`} · ${m.frames ?? '—'} frames in 10 s, ${m.frame_ms ?? '—'} ms each (p95 ${m.frame_p95 ?? '—'}, CPU ${m.cpu_ms ?? '—'}, GPU ${m.gpu_ms ?? '—'})${m.walk_ms === null ? '' : `, walking ${m.walk_ms} ms (p95 ${m.walk_p95 ?? '—'}, CPU ${m.walk_cpu ?? '—'}, GPU ${m.walk_gpu ?? '—'})`} · ${m.calls ?? '—'} draws, ${m.triangles ?? '—'} triangles · ${m.painted ?? '—'} painted${m.sky?.length ? ` · ${m.sky.length} sky pictures` : ''}${m.stroll_cold !== undefined ? ` · ${strollLine('cold', m.stroll_cold)} · ${strollLine('warm', m.stroll_warm ?? null)}` : ''}${m.errors.length && m.world_s !== null ? ` · ${m.errors.length} error${m.errors.length > 1 ? 's' : ''} said, the first: ${m.errors[0]}` : ''}${why.length ? ` · ${why.join('; ')}` : ''}`;

type LoadFile = { world: string; gpu: string; platform: string; args?: string[]; measures: Measure[] };

/** every load in a folder of them: its gpu.json and the folder it is in */
export function loadsIn(dir: string): { at: string; load: LoadFile }[] {
	if (!existsSync(dir)) return [];
	const dirs = [dir, ...readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(dir, d.name))];
	return dirs.filter((d) => existsSync(join(d, 'gpu.json'))).map((at) => ({ at, load: JSON.parse(readFileSync(join(at, 'gpu.json'), 'utf8')) as LoadFile }));
}

/** a call's measure in one engine read from the one load of its world in it (GPU_LOADS): the load's measure and why it
 *  fails this call, or why no load answers it; the load's pictures copied into the call's own folder */
export function readLoad(loads: { at: string; load: LoadFile }[], world: string, browser: string, call: string[], out: string): { m: Measure; why: string[]; said: string } {
	const args = parseArgs(call);
	const mine = loads.filter((l) => l.load.world === world && l.load.measures.some((m) => m.browser === browser));
	const why = (l: (typeof loads)[number]) => uncovered(parseArgs(l.load.args ?? []), args);
	const found = mine.find((l) => !why(l).length);
	if (!found) {
		const reason = mine.length ? `its load does not answer this call: ${why(mine[0]).join('; ')}` : `no load of ${world} in ${browser}: the gpu-load job gave none`;
		const m: Measure = { browser, version: '', webgpu: 'none', webgl: 'none', backend: null, shown: false, world_s: null, steps: [], settled_s: null, frames: null, frame_ms: null, frame_p95: null, cpu_ms: null, gpu_ms: null, calls: null, triangles: null, walk_ms: null, walk_p95: null, walk_cpu: null, walk_gpu: null, painted: null, errors: [reason] };
		return { m, why: [reason], said: `${world} in ${browser}: ${reason}` };
	}
	const m = found.load.measures.find((x) => x.browser === browser)!;
	for (const f of readdirSync(found.at)) if (f.endsWith('.png') && f.startsWith(browser)) copyFileSync(join(found.at, f), join(out, f));
	const timeout = Number(args.get('--timeout') ?? 600);
	const late = m.world_s !== null && m.world_s > timeout ? [`the world was not up within ${timeout} s (it took ${m.world_s} s)`] : [];
	return { m, why: late, said: `${world} in ${browser} read from its one load (${found.at.split('/').pop()}: ${found.load.gpu}, ${found.load.platform}; asked ${(found.load.args ?? []).join(' ') || 'nothing more'})` };
}

const BROWSERS: Record<string, [BrowserType, object]> = { chromium: [chromium, LAUNCH], webkit: [webkit, { headless: true }] };

async function measure(name: string, origin: string, o: { world: string; out: string; timeout: number; settle: number; stroll?: number; walk?: boolean; views?: (keyof typeof VIEWS)[]; sky?: boolean }): Promise<Measure> {
	const m: Measure = { browser: name, version: '', webgpu: 'none', webgl: 'none', backend: null, shown: false, world_s: null, steps: [], settled_s: null, frames: null, frame_ms: null, frame_p95: null, cpu_ms: null, gpu_ms: null, calls: null, triangles: null, walk_ms: null, walk_p95: null, walk_cpu: null, walk_gpu: null, painted: null, errors: [] };
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
		// up: a canvas drawn into, and the page's cover open (WorldPage.svelte: its `mount` answered) or its pill gone
		// each step the cover says on the way, with the second it began: where a slow load spends its time
		const up = async (t0: number, label = '') => {
			const secs = () => Math.round((performance.now() - t0) / 100) / 10;
			for (let said = ''; ; await page.waitForTimeout(200)) {
				const at = await page.evaluate(() => ({ up: !!document.querySelector('canvas') && !document.querySelector('.world .loading:not(.opening), .world .status'), step: document.querySelector('.world .loading .step, .world .status')?.textContent?.trim() ?? '' })).catch(() => ({ up: false, step: '' }));
				if (at.up) return secs();
				if (at.step && at.step !== said) m.steps.push(`${label}${secs()} s ${(said = at.step)}`);
				if (performance.now() - t0 > o.timeout) throw new Error(`the world was not up${label ? ` ${label.trim()}` : ''} within ${o.timeout / 1000} s (at: ${said || 'nothing said'})`);
			}
		};
		/** settled (./lib/quiet.js) within --settle: the seconds it took, or null */
		const settled = async () => {
			const t1 = performance.now();
			for (let zero = 0; performance.now() - t1 < o.settle * 1000 && zero < 2; await page.waitForTimeout(1000)) zero = (await page.evaluate(quietness).catch(() => null)) === 0 ? zero + 1 : 0;
			return (await page.evaluate(quietness).catch(() => null)) === 0 ? Math.round((performance.now() - t1) / 100) / 10 : null;
		};
		const t0 = performance.now();
		await page.goto(origin + o.world, { waitUntil: 'commit' });
		[m.webgpu, m.webgl] = [await webgpuOf(page), await gpuOf(page)];
		m.world_s = await up(t0);
		m.backend = await page.evaluate(() => (window as any).__rendererBackend ?? null);
		m.settled_s = await settled();
		await page.waitForFunction(() => !document.querySelector('.world .loading'), null, { timeout: 10_000 }).catch(() => {});
		const s = await page.evaluate(() => (window as any).__meter.sample(10));
		Object.assign(m, { frames: s.frames, frame_ms: s.frames > 1 ? s.frame_ms : null, frame_p95: s.frame_p95, cpu_ms: s.cpu_ms, gpu_ms: s.gpu_ms, calls: s.calls, triangles: s.triangles });
		// a slow world (a few frames a second) is photographed all the same: its frame time says it is slow, not a blank
		const png = await page.screenshot({ path: join(o.out, `${name}.png`), timeout: 120_000 });
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
		if (o.stroll) {
			// the stroll first, while the page is cold (nothing met but where it opened), then again after a reload, warm
			const plan = await page.evaluate(() => {
				const w = (window as any).__walker, d = (window as any).__world?.domes;
				return w ? { start: { x: w.position.x, z: w.position.z }, domes: Array.isArray(d) ? d.map((x: any) => ({ x: x.x, z: x.z, ext: x.ext })) : [] } : null;
			});
			if (!plan) m.steps.push('no walker here: no stroll');
			else {
				const route = routeOf(plan.start, plan.domes, o.stroll);
				m.steps.push(`the stroll's route: ${route.length - 1} legs past ${plan.domes.length} domes from (${Math.round(plan.start.x)}, ${Math.round(plan.start.z)}), ${o.stroll} s at ${PACE} m/s`);
				const stroll = async (label: 'cold' | 'warm') => {
					const t = await page.evaluate(walkInPage, { route, seconds: o.stroll!, pace: PACE });
					const s = t ? statsOf(t) : null;
					for (const w of s?.worst ?? []) m.steps.push(`${label} stroll's worst: ${w}`);
					return s;
				};
				m.stroll_cold = await stroll('cold');
				const t2 = performance.now();
				await page.reload({ waitUntil: 'commit' });
				m.steps.push(`warm: the world up again in ${await up(t2, 'warm ')} s, settled ${(await settled()) ?? 'not'}`);
				await page.evaluate((p) => (window as any).__walker?.place(p.x, p.z, 0, -0.05), plan.start);
				m.stroll_warm = await stroll('warm');
			}
		}
		// the sky's standpoint where the world opened, before anything after this moves the eye
		if (o.sky) await page.evaluate(skyFrom, SKY_RISE).catch(() => {});
		// the census's views, each photographed once the world has settled round the eye there
		for (const view of o.views ?? []) {
			const placed = await page.evaluate((v) => ((window as any).__walker ? ((window as any).__walker.place(v.x, v.z, v.yaw, v.pitch), true) : false), VIEWS[view]);
			if (!placed) {
				m.steps.push(`no walker here: no ${view} view photographed`);
				continue;
			}
			const t2 = performance.now();
			for (let zero = 0; performance.now() - t2 < 30_000 && zero < 2; await page.waitForTimeout(1000)) zero = (await page.evaluate(quietness).catch(() => null)) === 0 ? zero + 1 : 0;
			await page.screenshot({ path: join(o.out, `${name}-${view}.png`), timeout: 120_000 });
			m.steps.push(`${view} view photographed after ${Math.round((performance.now() - t2) / 100) / 10} s`);
		}
		if (o.walk) {
			// the walk, after the picture: the eye put where it starts and the world left to settle there (what streams in
			// round a new place is no part of a walk), then placed each frame by the clock, so a slow frame walks as far
			// as a fast one
			const walking = (seconds: number) =>
				page.evaluate(
					async ({ v, step, seconds }) => {
						const walker = (window as any).__walker;
						if (!walker) return null;
						const t0 = performance.now();
						let on = true;
						const each = () => {
							if (!on) return;
							const t = (performance.now() - t0) / 1000;
							walker.place(v.x + Math.sin(v.yaw) * step.forward * 60 * t, v.z - Math.cos(v.yaw) * step.forward * 60 * t, v.yaw + step.yaw * 60 * t, v.pitch);
							requestAnimationFrame(each);
						};
						each();
						await new Promise((r) => setTimeout(r, 1000));
						const s = await (window as any).__meter.sample(seconds);
						on = false;
						walker.place(v.x, v.z, v.yaw, v.pitch);
						return s;
					},
					{ v: VIEWS.near, step: STEP, seconds }
				);
			const placed = await page.evaluate((v) => ((window as any).__walker ? ((window as any).__walker.place(v.x, v.z, v.yaw, v.pitch), true) : false), VIEWS.near);
			if (placed) {
				const t2 = performance.now();
				for (let zero = 0; performance.now() - t2 < Math.min(o.settle, 10) * 1000 && zero < 2; await page.waitForTimeout(1000)) zero = (await page.evaluate(quietness).catch(() => null)) === 0 ? zero + 1 : 0;
			}
			const w = await walking(10);
			// and where a walking frame's JavaScript goes, in Chromium (its own profiler; the build's names): 5 s more
			if (w && name === 'chromium') {
				try {
					const cdp = await page.context().newCDPSession(page);
					await cdp.send('Profiler.enable');
					await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
					await cdp.send('Profiler.start');
					await walking(5);
					const { profile } = (await cdp.send('Profiler.stop')) as { profile: { nodes: { id: number; callFrame: { functionName: string; url: string; lineNumber: number; columnNumber: number }; }[]; samples?: number[]; timeDeltas?: number[] } };
					const by = new Map<number, number>();
					let total = 0;
					(profile.samples ?? []).forEach((id, i) => {
						const d = profile.timeDeltas?.[i] ?? 0;
						by.set(id, (by.get(id) ?? 0) + d);
						total += d;
					});
					const named = new Map<string, number>();
					for (const n of profile.nodes) {
						const f = n.callFrame, k = `${f.functionName || '(anonymous)'} ${f.url.split('/').pop() || ''}:${f.lineNumber}:${f.columnNumber}`;
						named.set(k, (named.get(k) ?? 0) + (by.get(n.id) ?? 0));
					}
					m.steps.push(`a walking frame's JavaScript in Chromium, by function (its own time, of ${Math.round(total / 1000)} ms sampled): ${[...named].sort((a, b) => b[1] - a[1]).slice(0, 28).map(([k, v]) => `${((v / total) * 100).toFixed(1)}% ${k}`).join(' | ')}`);
				} catch (e: any) {
					m.steps.push(`no profile of the walk: ${String(e?.message ?? e).split('\n')[0]}`);
				}
			}
		if (w && w.frames > 1) Object.assign(m, { walk_ms: w.frame_ms, walk_p95: w.frame_p95, walk_cpu: w.cpu_ms, walk_gpu: w.gpu_ms });
			else m.steps.push(w ? 'the walk drew no frames' : 'no walker here: no walk measured');
		}
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
	const world = arg('--world', DEFAULTS.world)!;
	const browsers = arg('--browser', DEFAULTS.browser)!.split(',');
	// its pictures: --out, else a folder a call under GPU_OUT (the gpu job's artifact) or the temp folder, named by its check and world
	const out = resolve(arg('--out') ?? join(process.env.GPU_OUT ?? join(tmpdir(), 'gpu-out'), `${process.env.INTENT_CHECK ?? 'world'}${world.replace(/\W+/g, '-').replace(/-$/, '')}`));
	const inputs = resolve(arg('--inputs', join(SITE, 'scripts/census/inputs'))!);
	const bounds: Bounds = { worldWithin: num('--world-within'), frameWithin: num('--frame-within'), walkWithin: num('--walk-within'), sky: argv.includes('--sky'), strollMax: num('--stroll-max'), strollP99: num('--stroll-p99'), strollPerMinute: num('--stroll-per-minute') };
	const fail = (why: string): never => (console.log(`gpu: ${why}`), process.exit(1));
	for (const b of browsers) if (!BROWSERS[b]) fail(`no browser ${b} (chromium, webkit)`);

	if (process.env.GPU_LOADS) {
		// read from the loads: no browser, no build, no GPU (intent a35ccd33)
		mkdirSync(out, { recursive: true });
		const loads = loadsIn(resolve(process.env.GPU_LOADS));
		const measures: (Measure & { why: string[] })[] = [];
		for (const b of browsers) {
			const r = readLoad(loads, world, b, argv, out);
			const why = [...r.why, ...(r.m.world_s === null && r.why.length ? [] : judge(r.m, bounds))];
			measures.push({ ...r.m, why });
			console.log(`gpu: ${r.said}`);
			if (argv.includes('--steps')) for (const st of r.m.steps) console.log(`    ${st}`);
			console.log(lineOf(r.m, why));
		}
		writeFileSync(join(out, 'gpu.json'), JSON.stringify({ world, read: process.env.GPU_LOADS, bounds, measures }, null, '\t') + '\n');
		process.exit(measures.every((m) => !m.why.length) ? 0 : 1);
	}

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
		const m = await measure(b, `http://127.0.0.1:${server.port}`, { world, out, timeout: Number(arg('--timeout', '600')) * 1000, settle: Number(arg('--settle', '60')), stroll: num('--stroll'), walk: argv.includes('--walk') || argv.includes('--walk-within'), views: arg('--views') ? (arg('--views')!.split(',') as (keyof typeof VIEWS)[]) : undefined, sky: bounds.sky });
		const why = judge(m, bounds);
		measures.push({ ...m, why });
		// its steps and every error the page said (each once, with how often), then its line last: a check's evidence
		// keeps the tail of what it printed, so the line that decides it is never pushed out by what came before it
		if (argv.includes('--steps')) {
			for (const st of m.steps) console.log(`    ${st}`);
			const said = new Map<string, number>();
			for (const e of m.errors) said.set(e, (said.get(e) ?? 0) + 1);
			for (const [e, n] of said) console.log(`    error${n > 1 ? ` (${n} times)` : ''}: ${e}`);
		}
		console.log(lineOf(m, why));
	}
	if (unpinned.size) console.log(`not pinned (answered 404; --record pins a picture's): ${[...unpinned].slice(0, 6).join(' ')}${unpinned.size > 6 ? ` … ${unpinned.size} in all` : ''}`);
	writeFileSync(join(out, 'gpu.json'), JSON.stringify({ world, gpu, platform: `${process.platform} ${process.arch}`, args: argv, bounds, measures, unpinned: [...unpinned] }, null, '\t') + '\n');
	server.stop(true);
	process.exit(measures.every((m) => !m.why.length) ? 0 : 1);
}

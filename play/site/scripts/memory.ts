#!/usr/bin/env bun
/*
 * A WORLD'S MEMORY ON A FIRST VISIT (intent 1893a631) — a page of play's site opened in avenBOX's Chromium with a fresh
 * profile, and the memory of the page's process read every 2 s until the world has settled: the page, the asset boxes'
 * frames and every worker are in that one process, as a browser's tab holds them (what Safari ends a page for). The
 * graphics card is stood in for by the census's device that only answers (./census/fakegpu.js: the box's software
 * renderer loses the device under these worlds), so what the page hands the card is counted in bytes, not held.
 *
 *   bun play/site/scripts/memory.ts --world /sandbox-1/ [--peak-within <MB>] [--rest-within <MB>] [--card-within <MB>]
 *        [--timeout <seconds>] [--rest <seconds>] [--cores <n>] [--out <file.json>] [--budget small|full] [--steps]
 *
 * --peak-within   the most the page's process holds at any moment of the visit, MB
 * --rest-within   what it holds once the world has settled (--rest seconds after: 20), MB
 * --card-within   what the graphics card holds of the page's at rest (buffers and textures made and not destroyed), MB
 * --timeout       how long the world may take to settle (900)
 * --cores         the cores the page is told the device has (8: an M1's, what Safari says there), whatever the machine
 *                 running it has: a page builds on every core but one, and holds the more the more it builds at once
 *
 * Memory is the process's anonymous resident memory and its swap (/proc/<pid>/status: RssAnon, RssShmem, VmSwap): what
 * a tab's footprint is made of. It is Chromium's in this box, not Safari's on a Mac: a bound here holds the page's own
 * memory (its arrays, its workers, their heaps); the truth for Safari is a Mac's (play/SPEC.md §4.12). No token and
 * no network for the page: `/api` is answered from the pinned inputs. It provides what it needs where a machine has
 * not got it, as on GitHub's runner the box run checks on: the site's build (`bun run build`, when play/site has none)
 * and Playwright's Chromium (`playwright install`, when its browser is missing). Prints one line and exits 0 only when
 * the world settled, the page never crashed and every bound given holds.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { siteHandler } from '../../api/src/site.ts';
import { pinnedApi } from './gpu.ts';
import { quietness } from './lib/quiet.js';
import { SEEDED_RANDOM } from './macjob/determinism.js';

const SITE = resolve(import.meta.dir, '..');
const MB = (bytes: number) => Math.round(bytes / 1e6);

/** bytes a texture of `format` holds a pixel (compressed ones about one) */
const BPP: Record<string, number> = { rgba16float: 8, rgba32float: 16, r8unorm: 1, rg8unorm: 2, r16float: 2, rg16float: 4, r32float: 4, rg32float: 8, depth16unorm: 2 };

/** the stand-in device (./census/fakegpu.js), its buffers and textures counted on `window.__card` as they are made and destroyed */
export function countingDevice(fake: string): string {
	const made = ['createBuffer: buffer,', 'createTexture: texture,'];
	for (const m of made) if (!fake.includes(m)) throw new Error(`memory: scripts/census/fakegpu.js no longer holds "${m}"`);
	const counted = fake
		.replace(/^export /m, '')
		.replace(made[0], `createBuffer: (d) => { const b = buffer(d), C = window.__card; C.buffers += b.size; b.destroy = () => { if (!b.gone) { b.gone = true; C.buffers -= b.size; } }; return b; },`)
		.replace(
			made[1],
			`createTexture: (d) => { const t = texture(d), C = window.__card, f = String(t.format); const bytes = Math.round(t.width * t.height * t.depthOrArrayLayers * (/astc|bc\\d|etc|eac/.test(f) ? 1 : (window.__bpp[f] ?? 4)) * (t.sampleCount || 1) * (t.mipLevelCount > 1 ? 4 / 3 : 1)); C.textures += bytes; t.destroy = () => { if (!t.gone) { t.gone = true; C.textures -= bytes; } }; return t; },`
		);
	return `if (window === top) { window.__card = { buffers: 0, textures: 0 }; window.__bpp = ${JSON.stringify(BPP)}; ${counted}; const gpu = fakeGPU(); Object.defineProperty(Navigator.prototype, 'gpu', { get: () => gpu, configurable: true }); const real = HTMLCanvasElement.prototype.getContext; const made = new WeakMap(); HTMLCanvasElement.prototype.getContext = function (kind, ...a) { if (kind === 'webgpu') { if (!made.has(this)) made.set(this, gpu.context(this)); return made.get(this); } return real.call(this, kind, ...a); }; }`;
}

const field = (status: string, k: string) => Number(new RegExp(`${k}:\\s+(\\d+)`).exec(status)?.[1] ?? 0) * 1024;

/** the memory of the largest renderer process under the browser whose command line holds `mark`, bytes (0: none) */
export function pageProcess(mark: string, proc = '/proc'): number {
	const all = new Map<string, { parent: string; cmd: string; status: string }>();
	for (const pid of readdirSync(proc)) {
		if (!/^\d+$/.test(pid)) continue;
		try {
			const status = readFileSync(join(proc, pid, 'status'), 'utf8');
			all.set(pid, { parent: /PPid:\s+(\d+)/.exec(status)?.[1] ?? '', cmd: readFileSync(join(proc, pid, 'cmdline'), 'utf8'), status });
		} catch {
			// (a process that ended while it was read)
		}
	}
	const under = (pid: string): boolean => {
		for (let p = all.get(pid), n = 0; p && n < 8; p = all.get(p.parent), n++) if (p.cmd.includes(mark)) return true;
		return false;
	};
	let most = 0;
	for (const [pid, p] of all) if (p.cmd.includes('--type=renderer') && under(pid)) most = Math.max(most, field(p.status, 'RssAnon') + field(p.status, 'RssShmem') + field(p.status, 'VmSwap'));
	return most;
}

export type Memory = { world: string; cores: number; shown: boolean; settled: boolean; crashed: boolean; world_s: number | null; settled_s: number | null; peak: number; peak_s: number; peak_step: string; rest: number; card: { buffers: number; textures: number } | null; steps: string[]; samples: [number, number][]; errors: string[]; unpinned: string[] };

/** why a measure does not hold, each a line; none: it holds */
export function judge(m: Memory, b: { peak?: number; rest?: number; card?: number }): string[] {
	const why: string[] = [];
	if (m.crashed) why.push('the page crashed');
	if (!m.shown) why.push('the world was never shown');
	else if (!m.settled) why.push('the world never settled');
	if (b.peak !== undefined && MB(m.peak) > b.peak) why.push(`peak ${MB(m.peak)} MB is over ${b.peak} MB`);
	if (b.rest !== undefined && MB(m.rest) > b.rest) why.push(`at rest ${MB(m.rest)} MB is over ${b.rest} MB`);
	if (b.card !== undefined && (!m.card || MB(m.card.buffers + m.card.textures) > b.card)) why.push(`the graphics card holds ${m.card ? MB(m.card.buffers + m.card.textures) : '?'} MB, over ${b.card} MB`);
	return why;
}

/** a command in play/site, its output on stderr, true when it exits 0 */
const inSite = (cmd: string[]) => spawnSync(cmd[0]!, cmd.slice(1), { cwd: SITE, stdio: ['ignore', 2, 2] }).status === 0;

/** Chromium launched; where Playwright's browser is missing (a fresh runner), installed first, once */
async function launch(args: string[]) {
	try {
		return await chromium.launch({ args });
	} catch (e) {
		if (!/Executable doesn't exist|playwright install/i.test(String((e as Error)?.message ?? e))) throw e;
		console.error("memory: Playwright's Chromium is missing here: installing it");
		if (!inSite(['bunx', 'playwright', 'install', '--only-shell', 'chromium']) && !inSite(['bunx', 'playwright', 'install', 'chromium'])) throw e;
		return await chromium.launch({ args });
	}
}

export async function measure(base: string, o: { world: string; timeout: number; rest: number; cores: number; budget?: string }): Promise<Memory> {
	const mark = `--play-memory-${process.pid}-${Date.now().toString(36)}`;
	const browser = await launch(['--ignore-gpu-blocklist', mark]);
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
	await page.addInitScript({ content: SEEDED_RANDOM });
	await page.addInitScript({ content: `Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => ${Math.floor(o.cores)}, configurable: true });` });
	// a frame four times a second: the cores build the world, as on a device whose frames are slow while it loads
	await page.addInitScript({ content: `if (window === top) { window.requestAnimationFrame = (f) => setTimeout(() => f(performance.now()), 250); window.cancelAnimationFrame = (i) => clearTimeout(i); }` });
	await page.addInitScript({ content: countingDevice(readFileSync(join(SITE, 'scripts/census/fakegpu.js'), 'utf8')) });
	const m: Memory = { world: o.world, cores: Math.floor(o.cores), shown: false, settled: false, crashed: false, world_s: null, settled_s: null, peak: 0, peak_s: 0, peak_step: '', rest: 0, card: null, steps: [], samples: [], errors: [], unpinned: [] };
	page.on('pageerror', (e) => m.errors.length < 20 && m.errors.push(String(e.message).slice(0, 200)));
	page.on('crash', () => (m.crashed = true));
	const t0 = performance.now();
	const secs = () => Math.round((performance.now() - t0) / 100) / 10;
	const late = <T>(p: Promise<T>, ms = 8000) => Promise.race([p, new Promise<null>((ok) => setTimeout(() => ok(null), ms))]).catch(() => null);
	await page.goto(base + o.world + (o.budget ? `?budget=${o.budget}` : ''), { waitUntil: 'commit' });
	let said = '', quiet = 0, flat = 0, last = 0, until = Infinity;
	while (!m.crashed && secs() < o.timeout && secs() < until) {
		await page.waitForTimeout(2000);
		const at = await late(page.evaluate(() => ({ up: !!document.querySelector('canvas') && !document.querySelector('.world .loading:not(.opening), .world .status'), step: document.querySelector('.world .loading .step, .world .status')?.textContent?.trim() ?? '', card: (window as any).__card ?? null })));
		if (at?.step && at.step !== said) m.steps.push(`${secs()} s ${(said = at.step)}`);
		if (at?.up && m.world_s === null) (m.world_s = secs()), (m.shown = true);
		if (at?.card) m.card = at.card;
		const bytes = pageProcess(mark);
		m.samples.push([secs(), MB(bytes)]);
		if (bytes > m.peak) (m.peak = bytes), (m.peak_s = secs()), (m.peak_step = said);
		m.rest = bytes;
		// settled: the one rule (./lib/quiet.js), three looks; a world without asset renderers once its memory stands still for 30 s
		const q = await late(page.evaluate(quietness));
		quiet = q === 0 ? quiet + 1 : 0;
		flat = q === null && m.shown && Math.abs(bytes - last) < 16e6 ? flat + 1 : 0;
		last = bytes;
		if ((quiet >= 3 || flat >= 15) && m.settled_s === null) (m.settled_s = secs()), (m.settled = true), (until = secs() + o.rest);
	}
	await Promise.race([browser.close(), new Promise((ok) => setTimeout(ok, 15e3))]);
	return m;
}

export const lineOf = (m: Memory, why: string[]) =>
	`${m.world}: peak ${MB(m.peak)} MB at ${m.peak_s} s (${m.peak_step || 'no step'}) · at rest ${MB(m.rest)} MB · world ${m.world_s ?? '—'} s, settled ${m.settled_s ?? '—'} s · the graphics card handed ${m.card ? `${MB(m.card.buffers)} MB of buffers, ${MB(m.card.textures)} MB of textures` : 'nothing counted'} · the page's process in avenBOX's Chromium, told ${m.cores} cores, the card stood in for${why.length ? ` · NOT HELD: ${why.join('; ')}` : ''}`;

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const arg = (k: string, d?: string) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
	const num = (k: string) => (arg(k) === undefined ? undefined : Number(arg(k)));
	const fail = (why: string): never => (console.log(`memory: ${why}`), process.exit(1));
	if (process.platform !== 'linux') fail("it reads a process's memory from /proc: run it in avenBOX");
	if (!existsSync(join(SITE, 'build/200.html'))) {
		console.error('memory: play/site has no build: building it');
		if (!inSite(['bun', 'run', 'build']) || !existsSync(join(SITE, 'build/200.html'))) fail('play/site could not be built (cd play/site && bun run build)');
	}
	const world = arg('--world', '/sandbox-1/')!;
	const unpinned = new Set<string>();
	const api = pinnedApi(join(SITE, 'scripts/census/inputs'), unpinned);
	const site = siteHandler(join(SITE, 'build'));
	const server = Bun.serve({ port: 0, hostname: '127.0.0.1', idleTimeout: 0, fetch: (req) => (new URL(req.url).pathname.startsWith('/api/') ? api(req) : site(req)) });
	const m = await measure(`http://127.0.0.1:${server.port}`, { world, timeout: Number(arg('--timeout', '900')), rest: Number(arg('--rest', '20')), cores: Number(arg('--cores', '8')), budget: arg('--budget') });
	m.unpinned = [...unpinned];
	const why = judge(m, { peak: num('--peak-within'), rest: num('--rest-within'), card: num('--card-within') });
	console.log(lineOf(m, why));
	if (argv.includes('--steps')) for (const s of m.steps) console.log(`    ${s}`);
	if (arg('--out')) writeFileSync(resolve(arg('--out')!), JSON.stringify(m, null, '\t') + '\n');
	server.stop(true);
	process.exit(why.length ? 1 : 0);
}

/*
 * A MAC JOB'S BROWSER — how every Mac job opens a world (intent 7af6e162): Chromium on the Mac's Metal (SwiftShader
 * elsewhere), one profile per site kept on the device between jobs, so the asset cache a page keeps (its builds, their
 * levels and pictures by hash: src/lib/content/assets/cache.js, OPFS) is there at the next load. A fresh profile per
 * load built, simplified and photographed every kind again each time: Sandbox 1's 6–10 minutes before it was quiet.
 * The cache's keys are content hashes (the recipe, the engine, the values, the maker's version), so a profile shared
 * by every commit hands none of them anything stale. A site's origin (its port) is part of its cache: keep each
 * site's port from job to job.
 *
 *   const site = await serveBuilt(treeSite, { port: 5193 }); // its production build (`node mac-page.mjs serve 5193`)
 *   const ctx = await openSite('base');       // ~/.cache/maiacity-render/profiles/base (MAC_PROFILES to move it)
 *   const s = await settle(page, 10 * 60e3);  // { quiet, seconds, taken } by ./quiet.js
 */
import { spawn, spawnSync } from 'node:child_process';
import { openSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { quietness, taken } from './quiet.js';
import { SEEDED_RANDOM } from './macjob/determinism.js';
const { chromium } = createRequire(import.meta.url)('playwright');

/** a Mac's Metal, as the render box runs it (the GPU named first); elsewhere the browser as it comes */
// WebGPU on Metal too (intent c1bee1f8), where the page draws with WebGPURenderer
export const LAUNCH = process.platform === 'darwin' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } : { args: ['--ignore-gpu-blocklist'] };


/** where a site's profile is kept @param {string} name @param {string} [root] */
export const profileOf = (name, root = process.env.MAC_PROFILES ?? join(homedir(), '.cache/maiacity-render/profiles')) => {
	if (!/^[\w.-]+$/.test(name)) throw new Error(`mac-page: a site's name is a plain word, not ${name}`);
	return join(root, name);
};

/**
 * The browser for one site, in its own profile kept between jobs (one open at a time a profile: close it before the
 * next). @param {string} name @param {{ root?: string, viewport?: { width: number, height: number } }} [o]
 */
export async function openSite(name, o = {}) {
	const ctx = await chromium.launchPersistentContext(profileOf(name, o.root), { ...LAUNCH, viewport: o.viewport ?? { width: 1440, height: 900 } });
	await ctx.addInitScript({ content: SEEDED_RANDOM });
	return ctx;
}

/** the GPU a page draws with, as WebGL names it */
export const gpuOf = (page) => page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g?.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
/** the WebGPU adapter the page would draw with, or 'none' (intent c1bee1f8) */
export const webgpuOf = (page) => page.evaluate(async () => { const a = await navigator.gpu?.requestAdapter?.(); return a ? `${a.info?.vendor ?? ''} ${a.info?.architecture ?? ''} ${a.info?.description ?? ''}`.trim() || 'an adapter' : 'none'; }).catch(() => 'none');

/**
 * Polls ./quiet.js every 2 s until the world has settled (0 twice running: nothing moved between two looks), at most
 * `ms`. Gives whether it did, the seconds it took and the pictures the page has taken.
 */
export async function settle(page, ms) {
	const t0 = Date.now();
	let quiet = false;
	for (let zero = 0; Date.now() - t0 < ms && !quiet; await page.waitForTimeout(2000)) {
		const q = await page.evaluate(quietness).catch(() => null);
		zero = q === 0 ? zero + 1 : 0;
		quiet = zero >= 2;
	}
	return { quiet, seconds: Math.round((Date.now() - t0) / 1000), taken: await page.evaluate(taken).catch(() => null) };
}

/**
 * A site served as visitors get it: its production build (`bun run build` once), served as play-api serves it
 * (./serve-built.ts: play/api/src/site.ts's handler), not the dev server, whose first load transforms hundreds of
 * modules on demand, nor `vite preview`, under which the asset box never built. `/api` goes to `api`. Gives its URL
 * and a way to stop it.
 * @param {string} dir a tree's play/site @param {{ port: number, api?: string, build?: boolean, log?: string }} o
 */
export async function serveBuilt(dir, o) {
	const out = o.log ? openSync(o.log, 'a') : 'ignore';
	if (o.build !== false) {
		const b = spawnSync('bun', ['run', 'build'], { cwd: dir, stdio: ['ignore', out, out] });
		if (b.status !== 0) throw new Error(`mac-page: ${dir}'s build failed (${b.status})`);
	}
	const server = spawn('bun', ['scripts/serve-built.ts', String(o.port), o.api ?? 'http://localhost:3911'], { cwd: dir, stdio: ['ignore', out, out] });
	const url = `http://localhost:${o.port}`;
	for (const end = Date.now() + 60e3; ; await new Promise((r) => setTimeout(r, 300))) {
		if (server.exitCode !== null) throw new Error(`mac-page: the build's server stopped (${server.exitCode})`);
		if (await fetch(url).then((r) => r.ok, () => false)) break;
		if (Date.now() > end) throw new Error(`mac-page: nothing served at ${url}`);
	}
	return { url, stop: () => server.kill() };
}

// as a command, for a job's shell script: `node scripts/mac-page.mjs serve <port> [api]` from a tree's play/site serves
// its build until stopped
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === 'serve') {
	const s = await serveBuilt(process.cwd(), { port: Number(process.argv[3]), api: process.argv[4] });
	console.log(`mac-page: ${s.url} serves ${process.cwd()}'s build`);
	for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => (s.stop(), process.exit(0)));
}

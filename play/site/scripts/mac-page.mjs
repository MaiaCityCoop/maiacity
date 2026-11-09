/*
 * A MAC JOB'S BROWSER — how every Mac job opens a world (intent 7af6e162): Chromium on the Mac's Metal (SwiftShader
 * elsewhere), one profile per site kept on the device between jobs, so the asset cache a page keeps (its builds, their
 * levels and pictures by hash: src/lib/content/assets/cache.js, OPFS) is there at the next load. A fresh profile per
 * load built, simplified and photographed every kind again each time: Sandbox 1's 6–10 minutes before it was quiet.
 * The cache's keys are content hashes (the recipe, the engine, the values, the maker's version), so a profile shared
 * by every commit hands none of them anything stale. A site's origin (its port) is part of its cache: keep each
 * site's port from job to job.
 *
 *   const ctx = await openSite('base');       // ~/.cache/maiacity-render/profiles/base (MAC_PROFILES to move it)
 *   const s = await settle(page, 10 * 60e3);  // { quiet, seconds, taken } by ./quiet.js
 */
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { quietness, taken } from './quiet.js';
const { chromium } = createRequire(import.meta.url)('playwright');

/** a Mac's Metal, as the render box runs it (the GPU named first); elsewhere the browser as it comes */
export const LAUNCH = process.platform === 'darwin' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : { args: ['--ignore-gpu-blocklist'] };

/** a seeded Math.random, as an init script: two runs of one commit draw the same (the old city's visitor) */
export const SEEDED_RANDOM = `(() => { let s = 0x2545f491; Math.random = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;

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

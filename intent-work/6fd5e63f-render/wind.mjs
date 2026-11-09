#!/usr/bin/env node
/*
 * Intent 6fd5e63f's c7 on a Mac's Metal (README.md): one wind for everything that grows, and light through leaves.
 *
 *   node wind.mjs --site main=http://localhost:5181 --site head=http://localhost:5183 \
 *        --meter <head tree>/play/site/src/lib/content/render/meter.js --determinism determinism.mjs --out out [--film head]
 *
 * For each --site, one after the other (never side by side), in Sandbox 1 with Math.random seeded and every view settled
 * by the render box's QUIET (determinism.mjs):
 *   1. frame time at the selector's near, mid and far views (noon pinned), the wind running on the page's own clock:
 *      the frame meter's 4 s sample (mean, p95, cpu, gpu, bound) and the triangles drawn;
 * and for the --film site only (head):
 *   2. a low sun behind the plants: the hour whose sun stands 8° up in the evening, the camera at a stand of trees
 *      (the outdoor renderer's kinds, the copies nearest a point 25 m from the near view) looking toward the sun;
 *   3. a 20 s film at 24 fps, 1440×900, the clock pinned frame by frame (window.__worldTime = t, so the wind, the sky
 *      and everything else stand at t), written as PNGs and joined into out/film-<site>.mp4 by run.sh;
 *   4. the same t twice: t = 7.25 s drawn, then 3.0 s and 15.5 s, then 7.25 s again: the two PNGs' bytes compared;
 *   5. one still of the same pose at the same hour on every other site (for the backlight: base against head).
 * Out: <out>/results.json, <out>/<site>-<view>.png, <out>/film-<site>/0000.png …, <out>/same-t-{a,b}.png.
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');

const argv = process.argv.slice(2);
const sites = [];
let out = 'out', meterFile = null, detFile = null, filmSite = 'head';
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === '--site') {
		const [name, url] = argv[++i].split('=');
		sites.push({ name, url: url.replace(/\/$/, '') });
	} else if (argv[i] === '--out') out = argv[++i];
	else if (argv[i] === '--meter') meterFile = argv[++i];
	else if (argv[i] === '--determinism') detFile = argv[++i];
	else if (argv[i] === '--film') filmSite = argv[++i];
}
if (!sites.length || !meterFile || !detFile) throw new Error('give --site name=url (one or more), --meter and --determinism');
const TOKEN = process.env.PLAY_MCP_TOKEN;
if (!TOKEN) throw new Error('PLAY_MCP_TOKEN: the admin token the proxy reads play with');
mkdirSync(out, { recursive: true });
const { SEEDED_RANDOM, QUIET } = await import(pathToFileURL(resolve(detFile)).href);

// the read-only proxy to play (as scripts/selector-shots.mjs): GET and HEAD of /api/… only, the token sent to play only
const PLAY = 'https://play.maia.city';
const proxy = createServer(async (req, res) => {
	if (!['GET', 'HEAD'].includes(req.method ?? '') || !req.url?.startsWith('/api/')) return res.writeHead(405).end('read-only');
	try {
		const r = await fetch(PLAY + req.url, { method: req.method, headers: { authorization: `Bearer ${TOKEN}`, accept: req.headers.accept ?? '*/*', ...(req.headers.range ? { range: req.headers.range } : {}) } });
		const h = Object.fromEntries([...r.headers].filter(([k]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(k)));
		res.writeHead(r.status, h);
		res.end(Buffer.from(await r.arrayBuffer()));
	} catch (err) {
		res.writeHead(502).end(String(err));
	}
});
await new Promise((ok) => proxy.listen(3911, '127.0.0.1', ok));

/** the selector's views of Sandbox 1 (scripts/selector-shots.mjs): x, z, yaw (0 looks to -z), pitch */
const VIEWS = [
	{ name: 'near', x: 0, z: 95, yaw: 0, pitch: -0.05 },
	{ name: 'mid', x: 0, z: 235, yaw: 0, pitch: -0.05 },
	{ name: 'far', x: 0, z: 370, yaw: 0, pitch: -0.12 }
];
const NOON = 12;
const FPS = 24, SECONDS = 20, SAME_T = 7.25;

const meterScript = readFileSync(meterFile, 'utf8').replace(/^export /gm, '') + '\nwindow.__meter = installMeter(window);\n';
const quiet = async (page, ms) => {
	for (const end = Date.now() + ms; Date.now() < end; await page.waitForTimeout(2000)) if ((await page.evaluate(QUIET).catch(() => null)) === 0) return true;
	return false;
};
const frames = (page, n = 2) => page.evaluate((n) => new Promise((ok) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : ok()); f(n); }), n);

const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : { args: ['--ignore-gpu-blocklist'] });
{
	const p = await browser.newPage();
	console.log('GPU:', await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g?.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; }));
	await p.close();
}

const results = { views: [], pose: null, film: null, sameT: null, stills: [] };

/** Sandbox 1 open and settled on `site`, the hour pinned */
async function open(site) {
	const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await ctx.newPage();
	await page.addInitScript({ content: SEEDED_RANDOM });
	await page.addInitScript({ content: meterScript });
	await page.addInitScript((h) => (window.__interiorHour = h), NOON);
	const t0 = Date.now();
	await page.goto(`${site.url}/sandbox-1/`, { waitUntil: 'domcontentloaded' });
	await page.waitForFunction(() => window.__walker && window.__assets && window.__world, null, { timeout: 10 * 60e3 });
	const ok = await quiet(page, 4 * 60e3); // capped: since intent 2 Sandbox 1 keeps taking pictures for minutes
	console.log(`${site.name}: Sandbox 1 up and ${ok ? 'quiet' : 'still building'} after ${Math.round((Date.now() - t0) / 1000)} s`);
	return { ctx, page };
}

/** the evening hour whose sun stands `deg` up, and where it stands (the sky's sun light, read off the scene) */
async function lowSun(page, deg) {
	return page.evaluate((deg) => {
		const w = window.__world, T = w.THREE;
		// the sky's sun: three's SunLight since the one sky (its direction its position, no target), else a directional light
		let sun = null;
		w.scene.traverse((o) => { if ((o.isSunLight || o.isDirectionalLight) && (!sun || o.intensity > sun.intensity)) sun = o; });
		const at = (h) => {
			window.__interiorHour = h;
			w.sun?.(h);
			if (!sun) return null;
			const d = sun.target ? new T.Vector3().subVectors(sun.position, sun.target.position) : sun.position.clone();
			if (d.lengthSq() === 0) return null;
			d.normalize();
			return { h, up: (Math.asin(d.y) * 180) / Math.PI, x: d.x, z: d.z };
		};
		let best = null;
		for (let h = 15; h <= 21; h += 1 / 60) {
			const s = at(h);
			if (s && s.up > 0 && (!best || Math.abs(s.up - deg) < Math.abs(best.up - deg))) best = s;
		}
		// no sun found on the page: a fixed evening (19:30, the sun in the west, `deg` up), said so in the summary
		if (!best) {
			const r = (deg * Math.PI) / 180;
			best = { h: 19.5, up: deg, x: -Math.cos(r), z: 0, fallback: sun ? 'the sun never stood up between 15 and 21' : 'no sun light in the scene' };
		}
		at(best.h);
		return best;
	}, deg);
}

/** a stand of the outdoor renderer's plants near the near view, and a pose looking through it toward the sun */
async function poseToward(page, sun) {
	return page.evaluate((sun) => {
		const all = window.__assets.kinds?.()?.out ?? [];
		const want = { x: 0, z: 70 };
		let best = null;
		for (const k of all) {
			if (!k.ok) continue;
			for (let i = 0; i < k.n; i++) {
				if (!k.alive[i]) continue;
				const x = k.M[i * 16 + 12], z = k.M[i * 16 + 14], d = Math.hypot(x - want.x, z - want.z);
				if (k.radius > 1 && (!best || d < best.d)) best = { x, z, d, label: k.label ?? k.key, r: k.radius };
			}
		}
		const c = best ?? { ...want, label: 'none found', r: 3 };
		// stand on the side away from the sun, 3 crowns back, looking at the stand and the sun beyond it
		const back = Math.max(8, c.r * 3), len = Math.hypot(sun.x, sun.z) || 1, sx = sun.x / len, sz = sun.z / len;
		const x = c.x - sx * back, z = c.z - sz * back;
		const yaw = Math.atan2(-sx, -sz);
		return { x, z, yaw, pitch: 0.05, stand: c };
	}, sun);
}

for (const site of sites) {
	const { ctx, page } = await open(site);
	// 1. frame time at the three views, the wind on the page's own clock
	for (const v of VIEWS) {
		await page.evaluate((v) => window.__walker.place(v.x, v.z, v.yaw, v.pitch), v);
		await page.waitForTimeout(1500);
		const ok = await quiet(page, 3 * 60e3); // capped likewise
		await page.waitForTimeout(3000);
		const meter = await page.evaluate(() => window.__meter.sample(4));
		const png = `${out}/${site.name}-${v.name}.png`;
		await page.screenshot({ path: png });
		results.views.push({ site: site.name, view: v.name, quiet: ok, meter, png });
		console.log(`${site.name} ${v.name}: ${meter?.frame_ms} ms (p95 ${meter?.frame_p95}), cpu ${meter?.cpu_ms}, gpu ${meter?.gpu_ms}, bound ${meter?.bound}`);
	}
	// 2. the low sun behind a stand of plants (found on the film's site; the same pose and hour on every other)
	if (site.name === filmSite || results.pose) {
		const sun = results.pose?.sun ?? (await lowSun(page, 8));
		if (results.pose) await page.evaluate((h) => { window.__interiorHour = h; window.__world.sun(h); }, sun.h);
		const pose = results.pose ?? { sun, ...(await poseToward(page, sun)) };
		results.pose = pose;
		await page.evaluate((p) => window.__walker.place(p.x, p.z, p.yaw, p.pitch), pose);
		await page.waitForTimeout(1500);
		await quiet(page, 3 * 60e3); // capped likewise
		await page.waitForTimeout(2000);
		// the world brought to t by its film (the clock, the sky, the shadows drawn again); where the page's film can't
		// (main before 6fd5e63f: village.ts read the SunLight's missing target), the clock alone pinned, said in `stills`
		const still = async (t, path) => {
			const how = await page.evaluate((t) => {
				window.__worldTime = t;
				try {
					window.__world.film.advance(t);
					return 'film.advance';
				} catch (e) {
					return `__worldTime only (film.advance: ${String(e?.message ?? e).slice(0, 120)})`;
				}
			}, t);
			if (how !== 'film.advance') (results.advance ??= {})[site.name] = how;
			await frames(page, 3);
			await page.screenshot({ path });
			return createHash('sha256').update(readFileSync(path)).digest('hex');
		};
		results.stills.push({ site: site.name, png: `${out}/${site.name}-golden.png`, sha256: await still(SAME_T, `${out}/${site.name}-golden.png`) });
		console.log(`${site.name}: sun ${sun.up.toFixed(1)}° up at ${sun.h.toFixed(2)} h, standing at ${pose.x.toFixed(1)}, ${pose.z.toFixed(1)} before ${pose.stand.label}`);
		if (site.name === filmSite) {
			// 3. the film, frame by frame on the pinned clock
			const dir = `${out}/film-${site.name}`;
			mkdirSync(dir, { recursive: true });
			const t0 = Date.now();
			for (let f = 0; f < FPS * SECONDS; f++) await still(f / FPS, `${dir}/${String(f).padStart(4, '0')}.png`);
			results.film = { site: site.name, dir, fps: FPS, seconds: SECONDS, took_s: Math.round((Date.now() - t0) / 1000) };
			// 4. the same t twice, other moments between
			const a = await still(SAME_T, `${out}/same-t-a.png`);
			await still(3.0, `${out}/same-t-between-1.png`);
			await still(15.5, `${out}/same-t-between-2.png`);
			const b = await still(SAME_T, `${out}/same-t-b.png`);
			const moved = (await still(SAME_T + 0.5, `${out}/same-t-plus-half.png`)) !== a;
			results.sameT = { t: SAME_T, a, b, identical: a === b, movedHalfASecondLater: moved };
			console.log(`same t twice: ${a === b ? 'identical' : 'DIFFERENT'}; half a second later ${moved ? 'moved' : 'did NOT move'}`);
		}
		await page.evaluate(() => { delete window.__worldTime; });
	}
	await ctx.close();
}
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1));
console.table(results.views.map(({ site, view, quiet, meter }) => ({ site, view, quiet, ms: meter?.frame_ms, p95: meter?.frame_p95, cpu: meter?.cpu_ms, gpu: meter?.gpu_ms, bound: meter?.bound })));
await browser.close();
proxy.close();

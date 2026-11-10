#!/usr/bin/env node
/*
 * A WORLD'S COST AT FIXED VIEWS, BEFORE AND AFTER — intent 6295a650's c4 and c5 (every world draws by the one
 * selector): Sandbox 1 (the village of $content/sandbox-2/interior, its forest and domes) placed at fixed views
 * (`__walker.place`), each measured once the world is quiet (./quiet.js): its frame time
 * and the triangles the page drew per frame (every draw call counted in WebGL), and a screenshot; Sandbox 3 (the old
 * city) photographed as it opens. Run on a real GPU (a Mac's Metal): software rendering's frame times say nothing.
 *
 *   node scripts/selector-shots.mjs --site base=http://localhost:5181 --site head=http://localhost:5182 [--out shots]
 *        [--census far]
 *
 * --meter <file>: the frame meter ($content/render/meter.js) injected into every page (its `export ` taken out, then
 * `window.__meter = installMeter(window)`), each view's 4 s sampled by it too: its frame time, p95, CPU and GPU time and
 * what bounds the frame (`meter` in results.json; intent b03f9fb4's c9).
 *
 * --census <view>: that view alone, and with it the census of every copy the renderers hold there (`__assets.kinds()`:
 * Sandbox 1's outdoor forest `out`, the domes' `in`, the library): each copy's distance from the eye, its size on screen,
 * the level the selector chose for it (a shape's index, or `picture`) and that level's triangles, in
 * <out>/<site>-census.json, and a table on stdout of each site's kinds by what they cost there. Level choice and
 * triangle counts are the page's own numbers; the census adds no drawing of its own.
 *
 * Each --site is a dev server (bun run dev) of one tree, its API pointed at the read-only proxy this script starts
 * on 127.0.0.1:3911 (PLAY_API=http://localhost:3911 bunx vite dev --port …): GET and HEAD of /api/… only, sent to
 * play.maia.city with the admin token in PLAY_MCP_TOKEN (the header goes to play and nowhere else). The sites are
 * measured one after the other, never side by side, each in its own profile kept between jobs (./mac-page.mjs): Sandbox 1
 * is opened once to warm the page's asset cache, and measured on the next load (`--cold`: the first), each quiet by
 * ./quiet.js. Out: <out>/<site>-<world>-<view>.png and <out>/results.json, and
 * a table on stdout.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { openSite, gpuOf, settle, webgpuOf } from './mac-page.mjs';
import { playProxy } from './macjob/proxy.mjs';

const argv = process.argv.slice(2);
const sites = [];
let out = 'shots';
/** the view whose copies are counted, alone (`--census`) */
let census = null;
/** the frame meter's source, injected whole (`--meter`) */
let meterFile = null;
/** measure Sandbox 1's first load, not the next (`--cold`): what a fresh profile draws */
let cold = false;
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === '--site') {
		const [name, url] = argv[++i].split('=');
		sites.push({ name, url: url.replace(/\/$/, '') });
	} else if (argv[i] === '--out') out = argv[++i];
	else if (argv[i] === '--census') census = argv[++i];
	else if (argv[i] === '--meter') meterFile = argv[++i];
	else if (argv[i] === '--cold') cold = true;
}
if (!sites.length) throw new Error('give at least one --site name=url');
mkdirSync(out, { recursive: true });

/** Sandbox 1's views: x, z (m, the cell's middle the master dome), yaw (0 looks to -z), pitch */
const VIEWS = [
	{ name: 'near', x: 0, z: 95, yaw: 0, pitch: -0.05 },
	{ name: 'mid', x: 0, z: 235, yaw: 0, pitch: -0.05 },
	{ name: 'far', x: 0, z: 370, yaw: 0, pitch: -0.12 }
];

// the read-only proxy to play (./macjob/proxy.mjs)
const proxy = await playProxy();

/** the world's hour, the same for every site and view (the sky's film hook, sandbox-kit/sky.js): noon, lamps out */
const HOUR = 12;

/** counts every triangle the page draws, per frame (window.__tri.frames: [time, triangles]); and pins the hour */
function countTriangles(hour) {
	const w = /** @type {any} */ (window);
	w.__interiorHour = hour;
	w.__tri = { now: 0, frames: [] };
	for (const C of [WebGL2RenderingContext, WebGLRenderingContext]) {
		const P = C.prototype, TRIANGLES = 4;
		const add = (mode, count, n = 1) => void (mode === TRIANGLES && (w.__tri.now += (count / 3) * n));
		const wrap = (name, at, inst) => {
			const f = P[name];
			if (f) P[name] = function (...a) { add(a[0], a[at], inst === undefined ? 1 : a[inst]); return f.apply(this, a); };
		};
		wrap('drawArrays', 2);
		wrap('drawElements', 1);
		wrap('drawArraysInstanced', 2, 3);
		wrap('drawElementsInstanced', 1, 4);
	}
	const raf = w.requestAnimationFrame.bind(w);
	const tick = (t) => {
		w.__tri.frames.push([t, w.__tri.now]);
		if (w.__tri.frames.length > 600) w.__tri.frames.shift();
		w.__tri.now = 0;
		raf(tick);
	};
	raf(tick);
}

/** the meter as an init script, or none */
const meterScript = meterFile ? readFileSync(meterFile, 'utf8').replace(/^export /gm, '') + '\nwindow.__meter = installMeter(window);\n' : null;
/** the meter's sample of the next `s` seconds, or null without it */
const metered = (page, s = 4) => (meterScript ? page.evaluate((s) => window.__meter.sample(s), s) : Promise.resolve(null));

const results = [];

/**
 * Every copy the page's renderers hold at view v, as the selector drew it last (`k.was`), and each kind's cost there.
 * @param {any} page @param {{ name: string }} site @param {{ name: string, x: number, z: number }} v
 */
async function takeCensus(page, site, v) {
	const got = await page.evaluate((v) => {
		const all = window.__assets.kinds?.();
		if (!all) throw new Error('this tree has no __assets.kinds(): apply the census hook (intent-work/6295a650-render/README.md)');
		const tan = Math.tan((68 * Math.PI) / 360);
		const out = {};
		for (const [renderer, list] of Object.entries(all)) {
			if (!list) continue;
			out[renderer] = list.filter((k) => k.ok).map((k) => {
				const copies = [];
				for (let i = 0; i < k.n; i++) {
					if (!k.alive[i]) continue;
					const x = k.M[i * 16 + 12], z = k.M[i * 16 + 14], d = Math.hypot(x - v.x, z - v.z), L = k.was[i];
					const tris = L < 0 ? 0 : L >= k.levels.length ? 2 : (k.levels[L].level?.tris ?? null);
					copies.push({ d: +d.toFixed(1), size: +((k.radius * k.S[i]) / (Math.max(d, 1e-3) * tan)).toFixed(4), level: L < 0 ? 'unseen' : L >= k.levels.length ? 'picture' : L, tris });
				}
				return { label: k.label, key: k.key, radius: +k.radius.toFixed(2), picture: k.picture, thresholds: k.thresholds.map((t) => +t.toFixed(4)), levels: k.levels.map((l) => l.level?.tris ?? null), copies };
			});
		}
		return out;
	}, v);
	writeFileSync(`${out}/${site.name}-census.json`, JSON.stringify(got));
	const rows = [];
	for (const [renderer, kinds] of Object.entries(got))
		for (const k of kinds) {
			const shapes = k.copies.filter((c) => typeof c.level === 'number');
			const tris = shapes.reduce((a, c) => a + (c.tris ?? 0), 0);
			if (!shapes.length && renderer !== 'out') continue;
			const far = shapes.length ? Math.max(...shapes.map((c) => c.d)) : 0;
			rows.push({ renderer, kind: (k.label ?? k.key).slice(0, 40), radius: k.radius, thresholds: k.thresholds.join('/'), shapes: shapes.length, pictures: k.copies.filter((c) => c.level === 'picture').length, tris, farthestShape: +far.toFixed(0) });
		}
	rows.sort((a, b) => b.tris - a.tris);
	console.log(`${site.name} census at ${v.name}: ${rows.reduce((a, r) => a + r.tris, 0).toLocaleString('en')} triangles in shapes, the costliest kinds:`);
	console.table(rows.slice(0, 40));
}
for (const site of sites) {
	const ctx = await openSite(site.name);
	const page = await ctx.newPage();
	await page.addInitScript(countTriangles, HOUR);
	if (meterScript) await page.addInitScript(meterScript);
	console.log(`${site.name}: GPU ${await gpuOf(page)}, WebGPU ${await webgpuOf(page)}`);
	// opened once to warm the page's asset cache (a profile's first load builds and photographs every kind), then measured
	for (const load of cold ? ['first'] : ['first', 'measured']) {
		const t0 = Date.now();
		await page.goto(`${site.url}/sandbox-1/`, { waitUntil: 'domcontentloaded' });
		await page.waitForFunction(() => window.__walker && window.__assets, null, { timeout: 10 * 60e3 });
		const s = await settle(page, 10 * 60e3);
		console.log(`${site.name}: Sandbox 1's ${load} load up and ${s.quiet ? 'quiet' : 'still building'} after ${Math.round((Date.now() - t0) / 1000)} s (${s.taken} pictures taken)`);
	}
	for (const v of census ? VIEWS.filter((v) => v.name === census) : VIEWS) {
		await page.evaluate((v) => window.__walker.place(v.x, v.z, v.yaw, v.pitch), v);
		await page.waitForTimeout(1500);
		const { quiet: ok } = await settle(page, 3 * 60e3);
		await page.waitForTimeout(3000);
		await page.evaluate(() => (window.__tri.frames.length = 0));
		await page.waitForTimeout(8000);
		const m = await page.evaluate(() => {
			const f = window.__tri.frames.slice(1), d = f.slice(1).map((x, i) => x[0] - f[i][0]).sort((a, b) => a - b);
			const tris = f.map((x) => x[1]).filter((x) => x > 0).sort((a, b) => a - b);
			const s = window.__assets.stats(), of = (r) => r && { tris: r.tris, calls: r.calls, levels: r.levels, pictures: r.pictures, copies: r.copies };
			return { frames: d.length, frameMs: d.length ? +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1) : null, frameP95: d[Math.floor(d.length * 0.95)] ?? null, tris: Math.round(tris[tris.length >> 1] ?? 0), trisMax: Math.round(tris[tris.length - 1] ?? 0), assets: { out: of(s.out), in: of(s.in), library: of(s.library) } };
		});
		const meter = await metered(page);
		const png = `${out}/${site.name}-sandbox-1-${v.name}.png`;
		await page.screenshot({ path: png });
		results.push({ site: site.name, world: 'sandbox-1', view: v.name, settled: ok, ...m, meter, png });
		if (census) await takeCensus(page, site, v);
		console.log(`${site.name} sandbox-1 ${v.name}: ${m.frameMs} ms/frame (p95 ${m.frameP95?.toFixed?.(1)}), ${m.tris.toLocaleString('en')} tris drawn (max ${m.trisMax.toLocaleString('en')})${ok ? '' : ', still building'}`);
	}
	await ctx.close();
	if (census) continue;
	// Sandbox 3, the old city, as it opens (c5: the same things there, nothing missing far off)
	const ctx3 = await openSite(site.name);
	const p3 = await ctx3.newPage();
	await p3.addInitScript(countTriangles, HOUR);
	if (meterScript) await p3.addInitScript(meterScript);
	await p3.goto(`${site.url}/sandbox-3/`, { waitUntil: 'domcontentloaded' });
	await p3.waitForTimeout(60e3);
	const meter3 = await metered(p3);
	const png3 = `${out}/${site.name}-sandbox-3-open.png`;
	await p3.screenshot({ path: png3 });
	const t3 = await p3.evaluate(() => { const t = window.__tri.frames.map((x) => x[1]).filter((x) => x > 0).sort((a, b) => a - b); return Math.round(t[t.length >> 1] ?? 0); });
	results.push({ site: site.name, world: 'sandbox-3', view: 'open', tris: t3, meter: meter3, png: png3 });
	console.log(`${site.name} sandbox-3 open: ${t3.toLocaleString('en')} tris drawn`);
	await ctx3.close();
}
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1));
console.table(results.map(({ site, world, view, frameMs, frameP95, tris, trisMax }) => ({ site, world, view, frameMs, frameP95, tris, trisMax })));
proxy.close();

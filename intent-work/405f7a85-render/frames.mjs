// The frame baseline on production (intent 405f7a85), Chromium on Metal, WebGPU, a fresh profile:
//   node frames.mjs <path, e.g. /sandbox-1/> <out dir> <tag>
// the admin token added to play.maia.city's requests only. Once the world is shown (its title card gone) and 30 s more:
// 20 s standing still, 20 s walking forward, then the census's views (near, mid, far) 5 s each: the meter's sample
// (meter.js, injected whole as an init script), the rAF gaps' median and p95, and each frame's passes (passes.js).
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
const [PATH, OUT, TAG] = process.argv.slice(2);
const pw = createRequire(join(process.cwd(), 'package.json'))('playwright');
const { LAUNCH } = await import(join(process.cwd(), 'scripts/mac-page.mjs'));
const meter = readFileSync(join(process.cwd(), 'src/lib/content/render/meter.js'), 'utf8').replace(/^export /gm, '') + '\nwindow.__meter = installMeter(window);\n';
const passes = readFileSync(join(OUT, '..', 'passes.js'), 'utf8');
const browser = await pw.chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const T = process.env.PLAY_MCP_TOKEN;
await ctx.route(/^https:\/\/play\.maia\.city\//, (r) => r.continue({ headers: { ...r.request().headers(), authorization: `Bearer ${T}` } }));
await ctx.addInitScript({ content: meter });
await ctx.addInitScript({ content: passes });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().split('\n')[0].slice(0, 300)));
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).split('\n')[0].slice(0, 300)));
const t0 = Date.now();
await page.goto(`https://play.maia.city${PATH}`, { waitUntil: 'domcontentloaded', timeout: 90e3 });
const sec = () => Math.round((Date.now() - t0) / 1000);
let shown = null;
while (sec() < 480) {
	await page.waitForTimeout(5000);
	const card = await Promise.race([page.evaluate(() => !!document.querySelector('div.loading[role="status"]')?.getBoundingClientRect().height), new Promise((ok) => setTimeout(() => ok('busy'), 10e3))]).catch(() => 'err');
	if (card === false) { shown = sec(); break; }
}
console.log(`${TAG}: shown ${shown ?? 'NOT'} s`);
const res = { tag: TAG, path: PATH, shown_s: shown, steps: [] };
if (shown) {
	await page.waitForTimeout(30000);
	const info = await page.evaluate(() => ({ backend: window.__rendererBackend ?? null, canvas: [...document.querySelectorAll('canvas')].map((c) => [c.width, c.height]), dpr: devicePixelRatio, walker: !!window.__walker, gpuTimer: window.__meter?.timed?.() ?? null }));
	res.info = info;
	const measure = async (name, seconds, before) => {
		const g0 = await page.evaluate(() => { window.__passes.frames = []; return window.__gaps.length; });
		if (before) await before();
		const m = await page.evaluate((s) => window.__meter.sample(s), seconds).catch((e) => ({ error: String(e).slice(0, 120) }));
		const r = await page.evaluate(([g0, canvas]) => {
			const gaps = window.__gaps.slice(g0).sort((a, b) => a - b);
			const q = (p) => (gaps.length ? +gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))].toFixed(1) : null);
			const [cw, ch] = canvas;
			const frames = window.__passes.frames.slice(-60);
			const per = frames.map((f) => {
				const o = { passes: f.length, screen: { passes: 0, draws: 0, tris: 0 }, shadow: { passes: 0, draws: 0, tris: 0 }, offscreen: { passes: 0, draws: 0, tris: 0 } };
				for (const p of f) { const k = p.w === cw && p.h === ch ? 'screen' : !p.colour && p.depth ? 'shadow' : 'offscreen'; o[k].passes++; o[k].draws += p.draws; o[k].tris += p.tris; }
				return o;
			});
			const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
			const agg = (k, f) => med(per.map((o) => o[k][f]));
			const sizes = {}; for (const f of frames.slice(-1)) for (const p of f) { const key = `${p.w}x${p.h}${p.colour ? '' : ' depth-only'}`; sizes[key] = sizes[key] ? { n: sizes[key].n + 1, draws: sizes[key].draws + p.draws, tris: sizes[key].tris + p.tris } : { n: 1, draws: p.draws, tris: p.tris }; }
			return { gaps: gaps.length, gap_median: q(0.5), gap_p95: q(0.95), frames_logged: frames.length, passes_median: med(per.map((o) => o.passes)),
				screen: { passes: agg('screen', 'passes'), draws: agg('screen', 'draws'), tris: agg('screen', 'tris') },
				shadow: { passes: agg('shadow', 'passes'), draws: agg('shadow', 'draws'), tris: agg('shadow', 'tris') },
				offscreen: { passes: agg('offscreen', 'passes'), draws: agg('offscreen', 'draws'), tris: agg('offscreen', 'tris') }, last_frame_passes: sizes };
		}, [g0, info.canvas[0] ?? [0, 0]]);
		const step = { name, seconds, meter: m, ...r };
		res.steps.push(step);
		console.log(`${TAG} ${name}: rAF median ${r.gap_median} p95 ${r.gap_p95} ms (${r.gaps} gaps) · meter mean ${m.frame_ms} p95 ${m.frame_p95} cpu ${m.cpu_ms} gpu ${m.gpu_ms} calls ${m.calls} tris ${m.triangles} bound ${m.bound} · screen ${JSON.stringify(r.screen)} shadow ${JSON.stringify(r.shadow)} offscreen ${JSON.stringify(r.offscreen)}`);
		await Promise.race([page.screenshot({ path: join(OUT, `${TAG}-${name}.png`), timeout: 20e3 }), new Promise((ok) => setTimeout(ok, 25e3))]).catch(() => {});
	};
	await measure('standing', 20);
	await measure('walking', 20, async () => { const ok = await page.evaluate(() => (window.__walker ? (window.__walker.move(0, 1, false), true) : false)); if (!ok) { await page.mouse.click(720, 450); await page.keyboard.down('w'); } });
	await page.evaluate(() => window.__walker?.move(0, 0, false)).catch(() => {}); await page.keyboard.up('w').catch(() => {});
	for (const [v, at] of [['near', [0, 95, 0, -0.05]], ['mid', [0, 235, 0, -0.05]], ['far', [0, 370, 0, -0.12]]]) {
		await page.evaluate((a) => window.__walker?.place(...a), at).catch(() => {});
		await page.waitForTimeout(8000);
		await measure(v, 5);
	}
}
res.errors = [...new Set(errors)].slice(0, 20);
res.long_tasks = await page.evaluate(() => window.__long).catch(() => null);
writeFileSync(join(OUT, `${TAG}.json`), JSON.stringify(res, null, 1));
console.log(`${TAG} done · ${errors.length} errors`);
await Promise.race([browser.close(), new Promise((ok) => setTimeout(ok, 15e3))]);
process.exit(0);

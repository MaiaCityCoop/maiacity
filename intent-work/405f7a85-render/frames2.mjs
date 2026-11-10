// MAC JOB 2, parts A, B and C (intent 405f7a85): production's world in one engine, a fresh profile, the token to
// play.maia.city only.   node frames2.mjs <path> <out dir> <tag> <chromium|webkit>
// C: the loading line every 10 s until the world shows (its title card gone; a world with none: 40 s). Then 30 s, and
// A: the meter (meter.js) over 20 s standing and 20 s walking, the API wrapper off; B: 10 s standing and 10 s walking
// with apicalls.js on: each WebGPU call's count and time a frame, and the frame's own JS.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
const [PATH, OUT, TAG, BROWSER] = process.argv.slice(2);
const pw = createRequire(join(process.cwd(), 'package.json'))('playwright');
const { LAUNCH } = await import(join(process.cwd(), 'scripts/mac-page.mjs'));
const meter = readFileSync(join(process.cwd(), 'src/lib/content/render/meter.js'), 'utf8').replace(/^export /gm, '') + '\nwindow.__meter = installMeter(window);\n';
const api = readFileSync(join(OUT, '..', 'apicalls.js'), 'utf8');
const browser = BROWSER === 'webkit' ? await pw.webkit.launch({ headless: true }) : await pw.chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const T = process.env.PLAY_MCP_TOKEN;
await ctx.route(/^https:\/\/play\.maia\.city\//, (r) => r.continue({ headers: { ...r.request().headers(), authorization: `Bearer ${T}` } }));
await ctx.addInitScript({ content: meter });
await ctx.addInitScript({ content: api });
const page = await ctx.newPage();
const msgs = new Map();
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && msgs.set(m.text().split('\n')[0].slice(0, 240), (msgs.get(m.text().split('\n')[0].slice(0, 240)) ?? 0) + 1));
page.on('pageerror', (e) => msgs.set('pageerror: ' + String(e).split('\n')[0].slice(0, 240), 1));
const t0 = Date.now(); const sec = () => Math.round((Date.now() - t0) / 1000);
await page.goto(`https://play.maia.city${PATH}`, { waitUntil: 'domcontentloaded', timeout: 90e3 });
const res = { tag: TAG, browser: BROWSER, path: PATH, lines: [], shown_s: null };
const look = () => Promise.race([page.evaluate(() => { const b = document.querySelector('div.loading[role="status"]'); return { card: !!b?.getBoundingClientRect().height, line: b?.querySelector('.step')?.textContent?.trim() ?? null, backend: window.__rendererBackend ?? null }; }), new Promise((ok) => setTimeout(() => ok({ busy: true }), 8e3))]).catch(() => ({ err: true }));
let seenCard = false;
for (let k = 1; k <= 48; k++) {
	await page.waitForTimeout(Math.max(0, k * 10e3 - (Date.now() - t0)));
	const st = await look(); res.lines.push({ t: sec(), ...st });
	if (st.card) seenCard = true;
	if (st.card === false && (seenCard || k >= 4)) { res.shown_s = sec(); break; }
}
console.log(`${TAG}: shown ${res.shown_s ?? 'NOT'} s (${BROWSER})`);
const walk = async (on) => { if (await page.evaluate((on) => (window.__walker ? (window.__walker.move(0, on ? 1 : 0, false), true) : false), on).catch(() => false)) return; if (on) { await page.mouse.click(720, 600); await page.keyboard.down('w'); } else await page.keyboard.up('w'); };
if (res.shown_s) {
	await page.waitForTimeout(30000);
	res.info = await page.evaluate(() => ({ backend: window.__rendererBackend ?? null, walker: !!window.__walker, canvas: [...document.querySelectorAll('canvas')].map((c) => [c.width, c.height]) })).catch(() => null);
	const meterOf = (s) => page.evaluate((s) => window.__meter.sample(s), s).catch((e) => ({ error: String(e).slice(0, 100) }));
	res.A = { standing: await meterOf(20) };
	await walk(true); res.A.walking = await meterOf(20); await walk(false);
	const apiWin = async (name, s, moving) => {
		await page.evaluate(() => { window.__api.frames = []; window.__api.on = true; });
		if (moving) await walk(true);
		await page.waitForTimeout(s * 1000);
		if (moving) await walk(false);
		return page.evaluate(() => {
			window.__api.on = false; const F = window.__api.frames; const n = F.length || 1;
			const keys = {}; let api = 0;
			for (const f of F) for (const [k, [c, ms]] of Object.entries(f.api)) { const o = (keys[k] ??= { calls: 0, ms: 0 }); o.calls += c; o.ms += ms; api += ms; }
			const js = F.map((f) => f.js).sort((a, b) => a - b); const q = (p) => (js.length ? +js[Math.min(js.length - 1, Math.floor(p * js.length))].toFixed(2) : null);
			const table = Object.entries(keys).map(([k, o]) => ({ call: k, calls_per_frame: +(o.calls / n).toFixed(1), ms_per_frame: +(o.ms / n).toFixed(3) })).sort((a, b) => b.ms_per_frame - a.ms_per_frame);
			const jsMean = js.reduce((a, b) => a + b, 0) / n;
			return { frames: F.length, js_ms_mean: +jsMean.toFixed(2), js_ms_median: q(0.5), js_ms_p95: q(0.95), api_ms_per_frame: +(api / n).toFixed(2), js_outside_api_ms: +(jsMean - api / n).toFixed(2), table };
		});
	};
	res.B = { standing: await apiWin('standing', 10, false), walking: await apiWin('walking', 10, true) };
	await Promise.race([page.screenshot({ path: join(OUT, `${TAG}.png`), timeout: 20e3 }), new Promise((ok) => setTimeout(ok, 25e3))]).catch(() => {});
	for (const w of ['standing', 'walking']) { const m = res.A[w]; console.log(`${TAG} A ${w}: frame ${m.frame_ms} (p95 ${m.frame_p95}) cpu ${m.cpu_ms} gpu ${m.gpu_ms} calls ${m.calls} tris ${m.triangles} bound ${m.bound}`); }
	for (const w of ['standing', 'walking']) { const b = res.B[w]; console.log(`${TAG} B ${w}: ${b.frames} frames, js ${b.js_ms_mean} ms (median ${b.js_ms_median}, p95 ${b.js_ms_p95}), api ${b.api_ms_per_frame} ms, outside ${b.js_outside_api_ms} ms; top: ${b.table.slice(0, 6).map((r) => `${r.call} ${r.calls_per_frame}x ${r.ms_per_frame}ms`).join(' · ')}`); }
}
res.console = [...msgs.entries()].sort((a, b) => b[1] - a[1]).map(([m, n]) => ({ n, m }));
writeFileSync(join(OUT, `${TAG}.json`), JSON.stringify(res, null, 1));
await Promise.race([browser.close(), new Promise((ok) => setTimeout(ok, 15e3))]);
process.exit(0);

// MAC JOB 4 (intent 405f7a85): one visit of a world, production or the load fix's head, in one engine and one profile.
//   node load4.mjs <prod|head> <path> <chromium|webkit> <profile dir> <tag> <out dir> <full|short>
// The hour pinned at noon (window.__interiorHour) so looks compare. Every 2 s: the card, its line, the renderers' stats;
// a 20 ms heartbeat finds every hold of the page's thread over 200 ms and whether the card was on before it. Shown =
// the card gone; for 30 s after, a shot every 5 s says whether the page is blank (its own dark green, nothing drawn).
// full: then until nothing builds (stats' building and keeping 0 in every renderer, three looks in a row, at most 300 s),
// shots at the views (Sandbox 1: the census's near, mid, far; Sandbox 5: where it opens, near, far), each after it is
// quiet again (at most 30 s), and the meter over 20 s standing at near. short: the stats once shown, 10 s, done.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const [TARGET, PATH, ENGINE, PROFILE, TAG, OUT, MODE] = process.argv.slice(2);
const pw = createRequire(join(process.cwd(), 'package.json'))('playwright');
const { LAUNCH } = await import(join(process.cwd(), 'scripts/mac-page.mjs'));
const meter = readFileSync('/Users/samuelandert/Documents/Development/probe-main/play/site/src/lib/content/render/meter.js', 'utf8').replace(/^export /gm, '') + '\nwindow.__meter = installMeter(window);\n';
const BASE = TARGET === 'prod' ? 'https://play.maia.city' : 'http://localhost:5178';
const opts = { viewport: { width: 1440, height: 900 } };
const ctx = ENGINE === 'webkit' ? await pw.webkit.launchPersistentContext(PROFILE, { headless: true, ...opts }) : await pw.chromium.launchPersistentContext(PROFILE, { ...LAUNCH, ...opts });
if (TARGET === 'prod') { const T = process.env.PLAY_MCP_TOKEN; await ctx.route(/^https:\/\/play\.maia\.city\//, (r) => r.continue({ headers: { ...r.request().headers(), authorization: `Bearer ${T}` } })); }
await ctx.addInitScript({ content: 'window.__interiorHour = 12;' });
await ctx.addInitScript({ content: meter });
await ctx.addInitScript({ content: `(() => { const H = (window.__hb = { holds: [] }); let prev = performance.now(), card = false; const beat = () => { const n = performance.now(), g = n - prev; if (g > 200) H.holds.push([Math.round(prev), Math.round(g), card]); prev = n; const b = document.querySelector('div.loading[role="status"]'); card = !!(b && b.getBoundingClientRect().height); setTimeout(beat, 20); }; setTimeout(beat, 20); })();` });
const page = ctx.pages()[0] ?? (await ctx.newPage());
const msgs = new Map();
page.on('console', (m) => m.type() === 'error' && msgs.set(m.text().split('\n')[0].slice(0, 240), (msgs.get(m.text().split('\n')[0].slice(0, 240)) ?? 0) + 1));
page.on('pageerror', (e) => msgs.set('pageerror: ' + String(e).split('\n')[0].slice(0, 240), 1));
const t0 = Date.now(); const sec = () => +((Date.now() - t0) / 1000).toFixed(1);
const snap = () => Promise.race([page.evaluate(() => { const b = document.querySelector('div.loading[role="status"]'); const s = window.__assets?.stats?.(); const sum = (f) => (s ? ['out', 'in', 'library'].reduce((a, k) => a + (s[k]?.[f] ?? 0), 0) : null); return { card: !!(b && b.getBoundingClientRect().height), line: b?.querySelector('.step')?.textContent?.trim() ?? null, kinds: sum('kinds'), loaded: sum('loaded'), building: sum('building'), keeping: sum('keeping'), boxed: sum('boxed'), builds: sum('builds'), keptLevels: sum('keptLevels'), keptPictures: sum('keptPictures'), taken: sum('taken'), backend: window.__rendererBackend ?? null }; }), new Promise((ok) => setTimeout(() => ok({ busy: true }), 6e3))]).catch(() => ({ err: true }));
const shot = async (name) => { const buf = await Promise.race([page.screenshot({ type: 'png', timeout: 20e3 }), new Promise((_, no) => setTimeout(() => no(new Error('hung')), 25e3))]).catch(() => null); if (!buf) return null; if (name) writeFileSync(join(OUT, `${TAG}-${name}.png`), buf); const v = String(spawnSync('python3', ['-I', join(OUT, '..', 'bg.py')], { input: buf }).stdout).trim().split(' ').map(Number); return { mean: v.slice(0, 3), bg: v[3] }; };
await page.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded', timeout: 90e3 });
const res = { tag: TAG, target: TARGET, path: PATH, engine: ENGINE, mode: MODE, samples: [], shown_s: null, blank: [] };
let seen = false;
while (sec() < 480) {
	await page.waitForTimeout(2000);
	const s = await snap(); res.samples.push({ t: sec(), ...s });
	if (s.card) seen = true;
	if (s.card === false && !s.busy && !s.err && (seen || sec() > 20)) { res.shown_s = sec(); break; }
}
res.at_shown = res.samples.at(-1);
console.log(`${TAG}: shown ${res.shown_s ?? 'NOT'} s · boxed ${res.at_shown?.boxed} builds ${res.at_shown?.builds} kept ${res.at_shown?.keptLevels}/${res.at_shown?.keptPictures} kinds ${res.at_shown?.kinds}`);
if (res.shown_s) {
	for (let k = 0; k < 6; k++) { const b = await shot(k === 0 ? 'shown' : null); res.blank.push({ t: sec(), ...b }); await page.waitForTimeout(5000); }
	if (MODE === 'full') {
		const quiet = async (cap) => { let n = 0; const from = Date.now(); while (Date.now() - from < cap * 1000) { const s = await snap(); if (s.building === 0 && s.keeping === 0) { if (++n >= 3) return +((Date.now() - from) / 1000).toFixed(0); } else n = 0; await page.waitForTimeout(2000); } return null; };
		res.grown_after_s = await quiet(300); res.grown_at_s = sec(); res.at_grown = await snap();
		console.log(`${TAG}: grown ${res.grown_after_s == null ? 'NOT in 300 s' : `after ${res.grown_after_s} s more`} (at ${res.grown_at_s} s) · ${JSON.stringify(res.at_grown)}`);
		const VIEWS = PATH.includes('sandbox-1') ? [['near', [0, 95, 0, -0.05]], ['mid', [0, 235, 0, -0.05]], ['far', [0, 370, 0, -0.12]]] : [['open', null], ['near', [0, 95, 0, -0.05]], ['far', [0, 370, 0, -0.12]]];
		res.views = {};
		for (const [v, at] of VIEWS) { if (at) await page.evaluate((a) => window.__walker?.place(...a), at).catch(() => {}); await page.waitForTimeout(4000); const q = await quiet(30); res.views[v] = { quiet_s: q, ...(await shot(v)) }; }
		await page.evaluate(() => window.__walker?.place(0, 95, 0, -0.05)).catch(() => {}); await page.waitForTimeout(6000);
		res.meter = await page.evaluate(() => window.__meter.sample(20)).catch((e) => ({ error: String(e).slice(0, 100) }));
		console.log(`${TAG}: meter ${JSON.stringify(res.meter)}`);
	} else await page.waitForTimeout(10000);
}
res.holds = await page.evaluate(() => window.__hb.holds).catch(() => null);
const hl = res.holds ?? []; const longest = hl.reduce((a, h) => (h[1] > (a?.[1] ?? 0) ? h : a), null);
res.longest_hold = longest ? { at_s: +(longest[0] / 1000).toFixed(1), ms: longest[1], card_on: longest[2] } : null;
res.holds_over_1s = hl.filter((h) => h[1] >= 1000).map((h) => ({ at_s: +(h[0] / 1000).toFixed(1), ms: h[1], card_on: h[2] }));
res.console = [...msgs.entries()].map(([m, n]) => ({ n, m }));
writeFileSync(join(OUT, `${TAG}.json`), JSON.stringify(res, null, 1));
console.log(`${TAG}: longest hold ${JSON.stringify(res.longest_hold)} · ${res.holds_over_1s.length} holds over 1 s · blank ${JSON.stringify(res.blank.map((b) => b.bg))}`);
await Promise.race([ctx.close(), new Promise((ok) => setTimeout(ok, 15e3))]);
process.exit(0);

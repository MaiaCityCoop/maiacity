// the every-core pool on production (intent 08d00b84): a first visit in Chromium on Metal (fresh profile, the token to
// play.maia.city only), the card looked at every 2 s until the world shows, a trace of every thread's top-level tasks
// (category toplevel) from navigation to 5 s after shown.   node pool.mjs <path> <out dir> <tag>
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
const [PATH, OUT, TAG] = process.argv.slice(2);
const pw = createRequire(join(process.cwd(), 'package.json'))('playwright');
const { LAUNCH } = await import(join(process.cwd(), 'scripts/mac-page.mjs'));
const browser = await pw.chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const T = process.env.PLAY_MCP_TOKEN;
await ctx.route(/^https:\/\/play\.maia\.city\//, (r) => r.continue({ headers: { ...r.request().headers(), authorization: `Bearer ${T}` } }));
const page = await ctx.newPage();
await browser.startTracing(page, { path: join(OUT, `${TAG}-trace.json`), categories: ['toplevel'] });
const t0 = Date.now(); const sec = () => +((Date.now() - t0) / 1000).toFixed(1);
await page.goto(`https://play.maia.city${PATH}`, { waitUntil: 'domcontentloaded', timeout: 90e3 });
const res = { tag: TAG, path: PATH, lines: [], shown_s: null };
let seen = false;
while (sec() < 480) {
	await page.waitForTimeout(2000);
	const s = await Promise.race([page.evaluate(() => { const b = document.querySelector('div.loading[role="status"]'); return { card: !!(b && b.getBoundingClientRect().height), line: b?.querySelector('.step')?.textContent?.trim() ?? null }; }), new Promise((ok) => setTimeout(() => ok({ busy: true }), 6e3))]).catch(() => ({ err: true }));
	res.lines.push({ t: sec(), ...s });
	if (s.card) seen = true;
	if (s.card === false && (seen || sec() > 20)) { res.shown_s = sec(); break; }
}
await page.waitForTimeout(5000);
res.cores = await page.evaluate(() => navigator.hardwareConcurrency).catch(() => null);
res.stats = await page.evaluate(() => { const s = window.__assets?.stats?.(); if (!s) return null; const o = {}; for (const k of ['out', 'in', 'library']) if (s[k]) o[k] = Object.fromEntries(Object.entries(s[k]).filter(([, v]) => typeof v === 'number' || (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length < 8))); return o; }).catch(() => null);
await browser.stopTracing();
writeFileSync(join(OUT, `${TAG}.json`), JSON.stringify(res, null, 1));
console.log(`${TAG}: shown ${res.shown_s ?? 'NOT'} s · cores ${res.cores}`);
await Promise.race([browser.close(), new Promise((ok) => setTimeout(ok, 15e3))]);
process.exit(0);

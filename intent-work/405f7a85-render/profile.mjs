// Where Sandbox 1's load goes (intent 405f7a85): production in Chromium on Metal (WebGPU), a fresh profile, the token
// to play.maia.city only. From "the plants near you" until 5 s after the world shows: a CPU profile of the page's main
// thread (the DevTools protocol's Profiler, 2 ms samples), a Chromium trace (toplevel, gpu, devtools.timeline) of every
// process, and the page's long tasks.   node profile.mjs <out dir>
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
const [OUT] = process.argv.slice(2);
const pw = createRequire(join(process.cwd(), 'package.json'))('playwright');
const { LAUNCH } = await import(join(process.cwd(), 'scripts/mac-page.mjs'));
const browser = await pw.chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const T = process.env.PLAY_MCP_TOKEN;
await ctx.route(/^https:\/\/play\.maia\.city\//, (r) => r.continue({ headers: { ...r.request().headers(), authorization: `Bearer ${T}` } }));
await ctx.addInitScript({ content: `window.__long = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch {}` });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const t0 = Date.now();
const sec = () => +((Date.now() - t0) / 1000).toFixed(1);
await page.goto('https://play.maia.city/sandbox-1/', { waitUntil: 'domcontentloaded', timeout: 90e3 });
const look = () => Promise.race([page.evaluate(() => { const b = document.querySelector('div.loading[role="status"]'); return { card: !!b?.getBoundingClientRect().height, line: b?.querySelector('.step')?.textContent?.trim() ?? null }; }), new Promise((ok) => setTimeout(() => ok({ busy: true }), 5e3))]).catch(() => ({ err: true }));
let st;
while (sec() < 300) { st = await look(); if (/plants near you/i.test(st.line ?? '') || st.card === false) break; await page.waitForTimeout(1000); }
const from = sec();
console.log(`profiling from ${from} s (${st.line})`);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 2000 });
await cdp.send('Profiler.start');
await browser.startTracing(page, { path: join(OUT, 'trace.json'), categories: ['toplevel', 'gpu', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute', 'blink'] });
const pageT0 = await page.evaluate(() => performance.now()).catch(() => null);
let shown = null;
while (sec() < 480) { await page.waitForTimeout(2000); st = await look(); if (st.card === false) { shown = sec(); break; } }
await page.waitForTimeout(5000);
const to = sec();
const { profile } = await cdp.send('Profiler.stop');
await browser.stopTracing();
writeFileSync(join(OUT, 'cpu.cpuprofile'), JSON.stringify(profile));
const long = await page.evaluate(() => window.__long).catch(() => null);
const pageNow = await page.evaluate(() => performance.now()).catch(() => null);
writeFileSync(join(OUT, 'profile-meta.json'), JSON.stringify({ from_s: from, shown_s: shown, to_s: to, page_t_at_from_ms: pageT0, page_t_at_end_ms: pageNow, long_tasks: long }, null, 1));
console.log(`profiled ${from}–${to} s, shown at ${shown} s, ${long?.length ?? '?'} long tasks`);
await Promise.race([browser.close(), new Promise((ok) => setTimeout(ok, 15e3))]);
process.exit(0);

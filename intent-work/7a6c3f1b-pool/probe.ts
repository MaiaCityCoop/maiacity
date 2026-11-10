// one load of a world in this box's Chromium, its building counted: boxes, workers, each build's own times, the level
// workers' jobs, a toplevel trace (every thread's tasks) and the main thread's CPU profile.
//   bun probe.ts <world> <builds|0> <tag> [timeout s]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const SITE = '/home/user/maiacity/play/site';
const { chromium } = await import(`${SITE}/node_modules/playwright/index.mjs`);
const { siteHandler } = await import(`${SITE}/../api/src/site.ts`);
const { pinnedApi } = await import(`${SITE}/scripts/gpu.ts`);
const { quietness } = await import(`${SITE}/scripts/lib/quiet.js`);
const { SEEDED_RANDOM } = await import(`${SITE}/scripts/macjob/determinism.js`);
const [world, builds, tag, timeout = '900'] = process.argv.slice(2);
const OUT = import.meta.dir + '/out';
const unpinned = new Set<string>();
const api = pinnedApi(`${SITE}/scripts/census/inputs`, unpinned);
const site = siteHandler(process.env.BUILD ?? join(import.meta.dir, 'build'));
const server = Bun.serve({ port: 0, hostname: '127.0.0.1', idleTimeout: 0, fetch: (req) => (new URL(req.url).pathname.startsWith('/api/') ? api(req) : site(req)) });
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.VW ?? 320), height: Number(process.env.VH ?? 200) } });
await page.addInitScript({ content: SEEDED_RANDOM });
// the software renderer's frames kept few: a frame every RAF ms, so the cores count the building, not the picture
if (Number(process.env.RAF ?? 1000)) await page.addInitScript({ content: `if (window === top) { const ms = ${Number(process.env.RAF ?? 1000)}; window.requestAnimationFrame = (f) => setTimeout(() => f(performance.now()), ms); window.cancelAnimationFrame = (i) => clearTimeout(i); }` });
await page.addInitScript({ content: `
if (${Number(builds)}) globalThis.__builds = ${Number(builds)};
if (window === top) {
	const P = (window.__probe = { answers: [], levels: [], frames: 0, t0: performance.now() });
	const ids = new WeakMap(); let n = 0;
	addEventListener('message', (e) => {
		const [m, room] = Array.isArray(e.data) ? e.data : [];
		if (!m || typeof m !== 'object') return;
		if (!ids.has(e.source)) ids.set(e.source, ++n);
		if (m.op === 'ready') return P.answers.push({ t: performance.now() - P.t0, box: ids.get(e.source), ready: true });
		if (m.ms || m.ok === false) P.answers.push({ t: performance.now() - P.t0, box: ids.get(e.source), room, ok: m.ok, recipe: m.card?.recipe, label: m.card?.label ?? m.card?.name, ms: m.ms, error: m.error });
	}, true);
	const W = window.Worker;
	window.Worker = class extends W {
		constructor(...a) { super(...a); const me = { made: performance.now() - P.t0, url: String(a[0]).split('/').pop().slice(0, 40), jobs: [] }; P.levels.push(me); let at = 0, what = null;
			const post = this.postMessage.bind(this);
			this.postMessage = (...x) => { at = performance.now(); const m = x[0]; what = m && m.draws && m.plans ? { draws: m.draws.length, tris: m.draws.reduce((s, d) => s + (d.tris || 0), 0), copies: m.draws.reduce((s, d) => s + (d.n || 0), 0), plans: m.plans.map((q) => [q.every ? 'every' : 'lower', q.budget]) } : null; return post(...x); };
			this.addEventListener('message', () => me.jobs.push([Math.round(at - P.t0), Math.round(performance.now() - at), what])); }
	};
	new MutationObserver((l) => { for (const r of l) for (const x of r.addedNodes) if (x.tagName === 'IFRAME') P.frames++; }).observe(document, { childList: true, subtree: true });
}` });
// the graphics card stood in for by the census's device that only answers: the cores count the building, not a software picture
if (process.env.FAKEGPU !== '0') {
	const fake = (await Bun.file(`${SITE}/scripts/census/fakegpu.js`).text()).replace(/^export /m, '');
	await page.addInitScript({ content: `if (window === top) { ${fake}; const gpu = fakeGPU(); Object.defineProperty(Navigator.prototype, 'gpu', { get: () => gpu, configurable: true }); const real = HTMLCanvasElement.prototype.getContext; const made = new WeakMap(); HTMLCanvasElement.prototype.getContext = function (kind, ...a) { if (kind === 'webgpu') { if (!made.has(this)) made.set(this, gpu.context(this)); return made.get(this); } return real.call(this, kind, ...a); }; window.__fakegpu = gpu; }` });
}
let workers = 0;
page.on('worker', () => workers++);
const errors: string[] = [];
page.on('pageerror', (e: any) => errors.push(String(e.message).slice(0, 200)));
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
await cdp.send('Profiler.start');
await browser.startTracing(page, { path: join(OUT, `${tag}-trace.json`), categories: ['toplevel'] });
const t0 = performance.now(); const secs = () => Math.round((performance.now() - t0) / 100) / 10;
await page.goto(`http://127.0.0.1:${server.port}${world}`, { waitUntil: 'commit' });
const res: any = { tag, world, builds: Number(builds), steps: [], world_s: null, quiet_s: null };
let zero = 0, said = '';
while (secs() < Number(timeout)) {
	await page.waitForTimeout(2000);
	const at = await Promise.race([page.evaluate(() => ({ up: !!document.querySelector('canvas') && !document.querySelector('.world .loading:not(.opening), .world .status'), step: document.querySelector('.world .loading .step, .world .status')?.textContent?.trim() ?? '' })), new Promise((ok) => setTimeout(() => ok({ late: true }), 8000))]).catch(() => ({})) as any;
	if (at.step && at.step !== said) res.steps.push(`${secs()} s ${(said = at.step)}`);
	if (at.up && res.world_s === null) res.world_s = secs();
	const q = await Promise.race([page.evaluate(quietness), new Promise((ok) => setTimeout(() => ok(-1), 8000))]).catch(() => null);
	zero = q === 0 ? zero + 1 : 0;
	if (zero >= 3) { res.quiet_s = secs(); break; }
}
res.end_s = secs();
res.cores = await page.evaluate(() => navigator.hardwareConcurrency).catch(() => null);
res.stats = await page.evaluate(() => (window as any).__assets?.stats?.()).catch(() => null);
res.probe = await page.evaluate(() => (window as any).__probe).catch(() => null);
res.kinds = await page.evaluate(() => { const k = (window as any).__assets?.kinds?.(); const o: any = {}; for (const r of ['out', 'in', 'library']) o[r] = (k?.[r] ?? []).map((x: any) => ({ label: x.label, names: x.names, base: x.base, levels: x.levels.map((l: any) => ({ from: l.from, tris: l.level?.tris, named: !!l.name, state: l.state })) })); return o; }).catch(() => null);
res.backend = await page.evaluate(() => (window as any).__rendererBackend ?? null).catch(() => null);
res.workers_seen_by_playwright = workers;
res.errors = errors.slice(0, 20);
res.unpinned = [...unpinned].slice(0, 10);
const prof = await cdp.send('Profiler.stop').catch(() => null);
if (prof) writeFileSync(join(OUT, `${tag}-main.cpuprofile`), JSON.stringify(prof.profile));
await browser.stopTracing();
writeFileSync(join(OUT, `${tag}.json`), JSON.stringify(res));
console.log(`${tag}: world ${res.world_s} s · quiet ${res.quiet_s} s · end ${res.end_s} · answers ${res.probe?.answers?.length} · frames ${res.probe?.frames} · workers ${workers} · errors ${errors.length}`);
await Promise.race([browser.close(), new Promise((ok) => setTimeout(ok, 15e3))]);
process.exit(0);

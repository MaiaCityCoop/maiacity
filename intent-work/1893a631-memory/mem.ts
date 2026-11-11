// A first visit of a world in this box's Chromium, its memory counted over time: every Chromium process (anonymous
// resident memory: what a tab's footprint is made of), every target's JavaScript heap and array buffers (the page, the
// asset boxes' frames, every worker: CDP Runtime.getHeapUsage), what the renderers keep in the page (`__assets.kinds()`:
// each level's corners), what the graphics card was handed (the stand-in device's buffers and textures), and the
// cover's steps, the level workers' jobs and the boxes' answers to say which phase a peak falls in.
//   bun mem.ts <world> <tag> [timeout s]      env: BUILD (the site's build), FAKEGPU=0, VW VH DPR, BUDGET=small|full, AFTER (s kept on once quiet)
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const SITE = process.env.SITE ?? '/home/user/maiacity/play/site';
const { chromium } = await import(`${SITE}/node_modules/playwright/index.mjs`);
const { siteHandler } = await import(`${SITE}/../api/src/site.ts`);
const { pinnedApi } = await import(`${SITE}/scripts/gpu.ts`);
const { quietness } = await import(`${SITE}/scripts/lib/quiet.js`);
const { SEEDED_RANDOM } = await import(`${SITE}/scripts/macjob/determinism.js`);
const [world, tag, timeout = '900'] = process.argv.slice(2);
const OUT = import.meta.dir + '/out';
mkdirSync(OUT, { recursive: true });
const unpinned = new Set<string>();
const api = pinnedApi(`${SITE}/scripts/census/inputs`, unpinned);
const site = siteHandler(process.env.BUILD ?? `${SITE}/build`);
const server = Bun.serve({ port: 0, hostname: '127.0.0.1', idleTimeout: 0, fetch: (req) => (new URL(req.url).pathname.startsWith('/api/') ? api(req) : site(req)) });
const PORT = 9400 + Math.floor(Math.random() * 500);
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', `--remote-debugging-port=${PORT}`] });
const page = await browser.newPage({ viewport: { width: Number(process.env.VW ?? 1440), height: Number(process.env.VH ?? 900) }, deviceScaleFactor: Number(process.env.DPR ?? 2) });
await page.addInitScript({ content: SEEDED_RANDOM });
await page.addInitScript({ content: `Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { get: () => ${Number(process.env.CORES ?? 8)}, configurable: true });` });
if (Number(process.env.RAF ?? 250)) await page.addInitScript({ content: `if (window === top) { const ms = ${Number(process.env.RAF ?? 250)}; window.requestAnimationFrame = (f) => setTimeout(() => f(performance.now()), ms); window.cancelAnimationFrame = (i) => clearTimeout(i); }` });
await page.addInitScript({ content: `
if (window === top) {
	const P = (window.__probe = { answers: [], levels: [], frames: 0, t0: performance.now(), sent: 0, got: 0 });
	const ids = new WeakMap(); let n = 0;
	const sizeOf = (v, seen = new Set(), d = 0) => { let s = 0; if (!v || typeof v !== 'object' || d > 8) return 0; if (ArrayBuffer.isView(v)) v = v.buffer; if (v instanceof ArrayBuffer) { if (seen.has(v)) return 0; seen.add(v); return v.byteLength; } if (seen.has(v)) return 0; seen.add(v); for (const k in v) s += sizeOf(v[k], seen, d + 1); return s; };
	addEventListener('message', (e) => {
		const [m, room] = Array.isArray(e.data) ? e.data : [];
		if (!m || typeof m !== 'object') return;
		if (!ids.has(e.source)) ids.set(e.source, ++n);
		if (m.op === 'ready') return;
		if (m.ms || m.ok === false) P.answers.push({ t: Math.round(performance.now() - P.t0), box: ids.get(e.source), ok: m.ok, label: m.card?.label ?? m.card?.name, ms: m.ms, bytes: sizeOf(m.data), tris: m.data?.stats?.triangles ?? m.data?.stats?.tris });
	}, true);
	const W = window.Worker;
	window.Worker = class extends W {
		constructor(...a) { super(...a); const me = { made: Math.round(performance.now() - P.t0), url: String(a[0]).split('/').pop().slice(0, 40), jobs: [] }; P.levels.push(me); let at = 0, what = null;
			const post = this.postMessage.bind(this);
			this.postMessage = (...x) => { at = performance.now(); const m = x[0]; what = m && m.draws && m.plans ? { draws: m.draws.length, tris: m.draws.reduce((s, d) => s + (d.tris || 0), 0), bytes: sizeOf(m.draws), moved: (x[1]?.length ?? x[1]?.transfer?.length ?? 0), plans: m.plans.map((q) => [q.every ? 'every' : 'lower', q.budget]) } : { bytes: sizeOf(m) }; P.sent += what.bytes; return post(...x); };
			this.addEventListener('message', (e) => { const back = sizeOf(e.data); P.got += back; me.jobs.push([Math.round(at - P.t0), Math.round(performance.now() - at), what, back]); }); }
	};
	new MutationObserver((l) => { for (const r of l) for (const x of r.addedNodes) if (x.tagName === 'IFRAME') P.frames++; }).observe(document, { childList: true, subtree: true });
}` });
if (process.env.BUDGET) await page.addInitScript({ content: `if (window === top && !location.search.includes('budget=')) history.replaceState(null, '', location.pathname + '?budget=${process.env.BUDGET}');` });
if (process.env.FAKEGPU !== '0') {
	const BPP: Record<string, number> = { rgba16float: 8, rgba32float: 16, r8unorm: 1, rg8unorm: 2, r16float: 2, rg16float: 4, r32float: 4, rg32float: 8, depth16unorm: 2 };
	let fake = (await Bun.file(`${SITE}/scripts/census/fakegpu.js`).text()).replace(/^export /m, '');
	if (!fake.includes('createBuffer: buffer,') || !fake.includes('createTexture: texture,')) throw new Error('fakegpu.js changed: createBuffer/createTexture not found');
	fake = fake
		.replace('createBuffer: buffer,', `createBuffer: (d) => { const b = buffer(d), T = window.__gpuTally; T.buffers += b.size; { const h = b.size >= 16e6 ? '16MB+' : b.size >= 4e6 ? '4-16MB' : b.size >= 1e6 ? '1-4MB' : b.size >= 65536 ? '64KB-1MB' : 'under 64KB'; (T.bySize[h] ??= [0, 0]); T.bySize[h][0]++; T.bySize[h][1] += b.size; } T.nbuffers++; T.made += b.size; b.destroy = () => { if (!b.__gone) { b.__gone = 1; T.buffers -= b.size; T.nbuffers--; } }; return b; },`)
		.replace('createTexture: texture,', `createTexture: (d) => { const t = texture(d), T = window.__gpuTally; const f = String(t.format); const bpp = /astc|bc\\d|etc|eac/.test(f) ? 1 : (window.__BPP[f] ?? 4); const bytes = Math.round(t.width * t.height * t.depthOrArrayLayers * bpp * (t.sampleCount || 1) * (t.mipLevelCount > 1 ? 4 / 3 : 1)); T.textures += bytes; T.ntextures++; (window.__liveTex ??= new Set()).add(t); t.__bytes = bytes; t.__label = String(d?.label ?? ''); (T.byFormat[f + (t.sampleCount > 1 ? ' x' + t.sampleCount : '')] ??= [0, 0]); T.byFormat[f + (t.sampleCount > 1 ? ' x' + t.sampleCount : '')][0]++; T.byFormat[f + (t.sampleCount > 1 ? ' x' + t.sampleCount : '')][1] += bytes; if (bytes > 8e6) T.big.push([t.width, t.height, t.depthOrArrayLayers, f, t.sampleCount, t.mipLevelCount, bytes]); const old = t.destroy; t.destroy = () => { if (!t.__gone) { t.__gone = 1; window.__liveTex?.delete(t); T.textures -= bytes; T.ntextures--; T.byFormat[f + (t.sampleCount > 1 ? ' x' + t.sampleCount : '')][1] -= bytes; } }; return t; },`);
	await page.addInitScript({ content: `if (window === top) { window.__gpuTally = { bySize: {}, buffers: 0, nbuffers: 0, made: 0, textures: 0, ntextures: 0, byFormat: {}, big: [] }; window.__BPP = ${JSON.stringify(BPP)}; ${fake}; const gpu = fakeGPU(); Object.defineProperty(Navigator.prototype, 'gpu', { get: () => gpu, configurable: true }); const real = HTMLCanvasElement.prototype.getContext; const made = new WeakMap(); let canvases = 0; HTMLCanvasElement.prototype.getContext = function (kind, ...a) { if (kind === 'webgpu') { if (!made.has(this)) { made.set(this, gpu.context(this)); window.__gpuTally.canvases = ++canvases; } return made.get(this); } return real.call(this, kind, ...a); }; window.__fakegpu = gpu; }` });
}
const errors: string[] = [];
page.on('pageerror', (e: any) => errors.push(String(e.message).slice(0, 200)));
page.on('crash', () => errors.push('PAGE CRASHED'));

/* ── raw CDP beside Playwright's: every target's heap (pages, frames out of process, workers, workers' workers) ── */
const ws = new WebSocket((await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl);
await new Promise((ok) => (ws.onopen = ok));
let seq = 0;
const pending = new Map<number, (v: any) => void>();
const targets = new Map<string, { type: string; url: string; gone?: boolean }>();
const send = (method: string, params: any = {}, sessionId?: string) => new Promise<any>((ok) => { const id = ++seq; pending.set(id, ok); ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) })); setTimeout(() => pending.delete(id) && ok(null), 6000); });
const attach = (sessionId?: string) => send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sessionId);
ws.onmessage = (e) => {
	const m = JSON.parse(String(e.data));
	if (m.id) return void (pending.get(m.id)?.(m.result ?? null), pending.delete(m.id));
	if (m.method === 'Tracing.dataCollected') { for (const ev of m.params.value) if (ev.ph === 'v' || ev.ph === 'V') { if (process.env.RAWDUMP && ev.args?.dumps?.allocators && Object.keys(ev.args.dumps.allocators).length > 50 && !rawDone) { rawDone = true; writeFileSync(process.env.RAWDUMP, JSON.stringify(ev)); } dumps.push(reduceDump(ev)); } return; }
	if (m.method === 'Tracing.tracingComplete') return void traced?.();
	if (m.method === 'Target.attachedToTarget') { const { sessionId, targetInfo: t } = m.params; targets.set(sessionId, { type: t.type, url: String(t.url).split('/').pop()!.slice(0, 48) }); if (t.type !== 'browser') attach(sessionId); }
	if (m.method === 'Target.detachedFromTarget') { const t = targets.get(m.params.sessionId); if (t) t.gone = true; }
};
await attach();
/* ── Chromium's own memory dumps (memory-infra, detailed, every 10 s): each process's memory by its allocator ── */
const dumps: any[] = [];
let rawDone = false;
let traced: (() => void) | null = null;
const hex = (a: any, k: string) => (a?.attrs?.[k] ? parseInt(a.attrs[k].value, 16) : 0);
function reduceDump(ev: any) {
	const al = ev.args?.dumps?.allocators ?? {};
	const top: Record<string, number> = {};
	for (const [name, a] of Object.entries<any>(al)) {
		if (name.includes('/buckets')) continue;
		const parts = name.split('/');
		// the roots' own sizes, and one level below for the ones that matter
		if (parts.length === 1) top[name] = (top[name] ?? 0) + hex(a, 'size');
		else if ((parts.length === 2 || (parts.length === 3 && parts[0] === 'partition_alloc')) && /^(v8|blink_gc|partition_alloc|malloc|gpu|skia|cc|web_cache|shared_memory|mojo|discardable|font_caches|canvas|parkable_images|blink_objects)$/.test(parts[0])) top[name] = (top[name] ?? 0) + hex(a, 'size');
		else if (/array_buffer|ArrayBuffer|wasm|WebAssembly|ImageBitmap|image/i.test(name) && parts.length <= 5) top[name] = (top[name] ?? 0) + hex(a, 'size');
	}
	const pt = ev.args?.dumps?.process_totals ?? {};
	return { ts: ev.ts, pid: ev.pid, id: ev.id, level: ev.args?.dumps?.level_of_detail, footprint: pt.private_footprint_bytes ? parseInt(pt.private_footprint_bytes, 16) : undefined, resident: pt.resident_set_bytes ? parseInt(pt.resident_set_bytes, 16) : undefined, top: Object.fromEntries(Object.entries(top).filter(([, v]) => v > 2e6).sort((a, b) => b[1] - a[1]).slice(0, 60)) };
}
if (process.env.MEMINFRA !== '0') await send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['disabled-by-default-memory-infra'], excludedCategories: ['*'], memoryDumpConfig: { triggers: [{ mode: 'detailed', periodic_interval_ms: Number(process.env.DUMP_MS ?? 10000) }] } } });
const tracedAt = performance.now();

/* ── every Chromium process, by its kind ── */
const kB = (s: string, k: string) => Number(new RegExp(`${k}:\\s+(\\d+)`).exec(s)?.[1] ?? 0) * 1024;
function procs() {
	const out: Record<string, { n: number; anon: number; rss: number; pids: Record<string, number> }> = {};
	for (const pid of readdirSync('/proc')) {
		if (!/^\d+$/.test(pid)) continue;
		try {
			const cmd = readFileSync(`/proc/${pid}/cmdline`, 'utf8');
			if (!cmd.includes(`--remote-debugging-port=${PORT}`) && !cmd.includes('--type=')) continue;
			if (!cmd.includes('headless_shell') && !cmd.includes('chrom')) continue;
			const type = /--type=([a-z-]+)/.exec(cmd)?.[1] ?? 'browser';
			const st = readFileSync(`/proc/${pid}/status`, 'utf8');
			const o = (out[type] ??= { n: 0, anon: 0, rss: 0, pids: {} });
			const anon = kB(st, 'RssAnon') + kB(st, 'RssShmem') + kB(st, 'VmSwap');
			o.n++; o.anon += anon; o.rss += kB(st, 'VmRSS'); o.pids[pid] = anon;
		} catch {}
	}
	return out;
}

/** what the renderers keep in the page: each kind's levels' corners (their arrays still held), by where the level came from */
const keptInPage = () => {
	const all = (window as any).__assets?.kinds?.();
	if (!all) return null;
	const seen = new Set<ArrayBuffer>();
	const out: any = {};
	for (const r of ['out', 'in', 'library']) {
		const o: any = (out[r] = { kinds: 0, by: {} as any, top: [] as any[] });
		for (const k of all[r] ?? []) {
			o.kinds++;
			let mine = 0;
			k.levels.forEach((lv: any, L: number) => {
				if (!lv.level) return;
				let bytes = 0, tris = 0;
				for (const d of lv.level.draws ?? []) {
					tris += d.tris ?? 0;
					const g = d.geometry;
					for (const a of [...Object.values(g?.attributes ?? {}), g?.index] as any[]) { const b = a?.array?.buffer ?? a?.data?.array?.buffer; if (b && !seen.has(b)) { seen.add(b); bytes += b.byteLength; } }
					for (const x of [d.locals, d.colors]) if (x?.buffer && !seen.has(x.buffer)) { seen.add(x.buffer); bytes += x.buffer.byteLength; }
				}
				const key = `${L === k.base ? 'base' : 'L' + L}:${lv.from ?? lv.state}${lv.name ? ':named' : ''}`;
				const b = (o.by[key] ??= { levels: 0, bytes: 0, tris: 0 });
				b.levels++; b.bytes += bytes; b.tris += tris; mine += bytes;
			});
			o.top.push([k.label, mine, k.levels.map((l: any) => [l.from ?? l.state, l.level?.tris ?? null]), String(k.names?.[k.base] ?? '').slice(0, 12), k.copies?.length ?? k.n ?? null]);
		}
		o.top.sort((a: any, b: any) => b[1] - a[1]); if (!(window as any).__keptAll) o.top = o.top.slice(0, 12);
		o.bytes = Object.values(o.by).reduce((a: number, b: any) => a + b.bytes, 0);
	}
	return out;
};

const t0 = performance.now(); const secs = () => Math.round((performance.now() - t0) / 100) / 10;
const res: any = { tag, world, env: { BUDGET: process.env.BUDGET ?? null, FAKEGPU: process.env.FAKEGPU ?? '1', viewport: page.viewportSize(), dpr: Number(process.env.DPR ?? 2) }, steps: [], world_s: null, quiet_s: null, samples: [] };
await page.goto(`http://127.0.0.1:${server.port}${world}`, { waitUntil: 'commit' });
let zero = 0, said = '', flat = 0, last = 0, n = 0;
const late = <T>(p: Promise<T>, ms = 8000) => Promise.race([p, new Promise<null>((ok) => setTimeout(() => ok(null), ms))]).catch(() => null);
const AFTER = Number(process.env.AFTER ?? 20);
let until = Infinity;
while (secs() < Number(timeout) && secs() < until) {
	await page.waitForTimeout(2000);
	const at: any = (await late(page.evaluate(() => ({ up: !!document.querySelector('canvas') && !document.querySelector('.world .loading:not(.opening), .world .status'), step: document.querySelector('.world .loading .step, .world .status')?.textContent?.trim() ?? '', tally: (window as any).__gpuTally ? { ...(window as any).__gpuTally, big: undefined, byFormat: undefined, bySize: undefined } : null, sent: (window as any).__probe?.sent, got: (window as any).__probe?.got, stats: (() => { const s = (window as any).__assets?.stats?.(); if (!s) return null; const o: any = {}; for (const r in s) if (s[r]) o[r] = { building: s[r].building, busy: s[r].busy, builds: s[r].builds, made: s[r].made, boxed: s[r].boxed, keeping: s[r].keeping, tris: s[r].tris }; return o; })() })))) ?? { late: true };
	if (at.step && at.step !== said) res.steps.push(`${secs()} s ${(said = at.step)}`);
	if (at.up && res.world_s === null) res.world_s = secs();
	const live = [...targets.entries()].filter(([, t]) => !t.gone && t.type !== 'browser');
	const heaps = await Promise.all(live.map(async ([s, t]) => { const h = await send('Runtime.getHeapUsage', {}, s); return h ? { type: t.type, url: t.url, used: Math.round(h.usedSize), embedder: Math.round(h.embedderHeapUsedSize ?? 0), backing: Math.round(h.backingStorageSize ?? 0) } : { type: t.type, url: t.url, late: true }; }));
	const by: any = {};
	for (const h of heaps) { const k = h.type === 'worker' ? `worker:${h.url.replace(/[-.][A-Za-z0-9_-]{6,}\.js$/, '').replace(/^[0-9a-f-]{20,}$/, 'blob')}` : h.type; const o = (by[k] ??= { n: 0, used: 0, backing: 0, embedder: 0, late: 0, max: 0 }); o.n++; if ((h as any).late) o.late++; else { o.used += (h as any).used; o.backing += (h as any).backing; o.embedder += (h as any).embedder; o.max = Math.max(o.max, (h as any).used + (h as any).backing); } }
	const p = procs();
	const sample: any = { t: secs(), step: said, up: !!at.up, procs: Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { n: v.n, anon: v.anon, rss: v.rss, max: Math.max(...Object.values(v.pids)) }])), targets: by, gpu: at.tally, sent: at.sent, got: at.got, stats: at.stats };
	if (n++ % 5 === 0) sample.kept = await late(page.evaluate(keptInPage), 15000);
	res.samples.push(sample);
	const q = await late(page.evaluate(quietness));
	const total = (p.renderer?.anon ?? 0);
	if (q === null && at.up) { flat = Math.abs(total - last) < 16e6 ? flat + 1 : 0; last = total; }
	zero = q === 0 ? zero + 1 : 0;
	if ((zero >= 3 || flat >= 15) && res.quiet_s === null) { res.quiet_s = secs(); until = secs() + AFTER; }
	if (n % 15 === 0) console.error(`${tag} ${secs()} s · ${said} · renderers ${Math.round(total / 1e6)} MB in ${p.renderer?.n} · targets ${live.length}`);
}
res.end_s = secs();
await late(page.evaluate(() => void ((window as any).__keptAll = true)));
res.kept = await late(page.evaluate(keptInPage), 20000);
res.gpu = await late(page.evaluate(() => (window as any).__gpuTally ?? null));
res.liveTextures = await late(page.evaluate(() => { const g: any = {}; for (const t of (window as any).__liveTex ?? []) { const k = `${t.width}x${t.height}x${t.depthOrArrayLayers} ${t.format}${t.sampleCount > 1 ? ' x' + t.sampleCount : ''} mips ${t.mipLevelCount} ${t.__label}`; (g[k] ??= [0, 0]); g[k][0]++; g[k][1] += t.__bytes; } return Object.entries(g).sort((a: any, b: any) => b[1][1] - a[1][1]).slice(0, 40); }));
res.probe = await late(page.evaluate(() => (window as any).__probe));
res.stats = await late(page.evaluate(() => (window as any).__assets?.stats?.()));
if (process.env.MEMINFRA !== '0') { const done = new Promise<void>((ok) => (traced = ok)); ws.send(JSON.stringify({ id: ++seq, method: 'Tracing.end' })); await Promise.race([done, new Promise((ok) => setTimeout(ok, 60e3))]); const first = Math.min(...dumps.map((d) => d.ts)); res.dumps = dumps.map((d) => ({ ...d, t: Math.round((d.ts - first) / 1e5) / 10 + Math.round((tracedAt - t0) / 100) / 10 })); }
res.errors = errors.slice(0, 20);
res.unpinned = [...unpinned].slice(0, 20);
const peak = res.samples.reduce((a: any, s: any) => ((s.procs.renderer?.anon ?? 0) > (a?.procs.renderer?.anon ?? 0) ? s : a), null);
res.peak = peak && { t: peak.t, step: peak.step, renderer_anon: peak.procs.renderer?.anon, renderers: peak.procs.renderer?.n, largest_process: peak.procs.renderer?.max, targets: peak.targets };
const end = res.samples.at(-1);
res.settled = end && { t: end.t, renderer_anon: end.procs.renderer?.anon, largest_process: end.procs.renderer?.max, targets: end.targets };
writeFileSync(join(OUT, `${tag}.json`), JSON.stringify(res));
const MB = (x: number) => Math.round((x ?? 0) / 1e6);
console.log(`${tag}: world ${res.world_s} s · quiet ${res.quiet_s} s · peak ${MB(res.peak?.renderer_anon)} MB at ${res.peak?.t} s (${res.peak?.step}) · settled ${MB(res.settled?.renderer_anon)} MB · errors ${errors.length} · unpinned ${unpinned.size}`);
await Promise.race([browser.close(), new Promise((ok) => setTimeout(ok, 15e3))]);
process.exit(0);

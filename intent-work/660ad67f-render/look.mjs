#!/usr/bin/env node
// c6 of intent 660ad67f on the Mac (Metal): Sandbox 5's dome plants in Chromium and WebKit, and Sandbox 1's film stepped.
//   node intent-work/660ad67f-render/look.mjs --site http://localhost:5190 [--out <dir>] [--browser chromium|webkit]
// (run.sh runs it once per browser)
// Per browser: Sandbox 5 opened, left to build (until its renderers build nothing, at most 120 s), walked forward 12 s
// (W held), its programs linked counted (linkProgram) and every console error and page error kept; a screenshot after.
// Then Sandbox 1, built, its film advanced over 5 s (window.__world.film.advance at 0…5 s, 10 steps). Out: <out>/*.png
// and <out>/results[-<browser>].json; it exits 1 when any uniform error, "did not load" or film throw is seen.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium, webkit } = createRequire(process.cwd() + "/package.json")("playwright");
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const site = opt('--site', 'http://localhost:5190').replace(/\/$/, '');
const out = opt('--out', 'out');
const only = opt('--browser', null);
mkdirSync(out, { recursive: true });

const counting = () => {
	window.__links = 0;
	for (const C of [WebGL2RenderingContext, WebGLRenderingContext]) {
		const f = C.prototype.linkProgram;
		C.prototype.linkProgram = function (...a) {
			window.__links++;
			return f.apply(this, a);
		};
	}
};
const BAD = /uniform\dfv|@@iterator|did not load|cannot be converted to a sequence|uniform buffer that is too small|is not an object \(evaluating 'sky\.sun|reading 'position'/;
const VEHICLES = [['pickup', '5bf0a85d-2f01-5a78-acc5-84fd63d05731'], ['city-bus', 'edbd06d9-5a01-4e57-9fbc-d0d017bf8631'], ['delivery-van', '53d1af5a-bbcf-4eba-9fe0-3a147baedd34'], ['fiat-500', '33e29d24-08b9-40f7-b098-1ce81d37ef23']];
const results = [];
let failed = false, finished = false, overWalk = false;
// a job that ends before its results are written failed, whatever its exit code says
process.on('beforeExit', () => { if (!finished) { console.error('FAILED: the job ended before its results were written'); process.exit(1); } });
const step = (s) => console.error(`look: ${s}`);
for (const [name, type, opts] of [
	['chromium', chromium, { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] }],
	['webkit', webkit, {}]
].filter(([n]) => !only || n === only)) {
	step(`${name}: launch`);
	const browser = await type.launch({ headless: true, ...opts });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	await page.addInitScript(counting);
	const said = [];
	page.on('console', (m) => ['error', 'warning'].includes(m.type()) && said.push(m.text().slice(0, 300)));
	page.on('pageerror', (e) => said.push(`pageerror: ${String(e.message).slice(0, 300)}`));
	const ev = (f, d = null) => page.evaluate(f).catch(() => d);
	// Sandbox 5: built, then walked
	step(`${name}: Sandbox 5`);
	await page.goto(`${site}/sandbox-5/`, { waitUntil: 'load' });
	const t0 = Date.now();
	await page.waitForFunction(() => window.__assets?.stats && !['out', 'in', 'library'].some((k) => window.__assets.stats()[k]?.building), null, { timeout: 120_000, polling: 1000 }).catch(() => {});
	const built = (Date.now() - t0) / 1000;
	// the walk (the render box's wk5): 20 s after it is up, 24 m straight ahead through the dome over 12 s, every frame's
	// interval kept
	await page.waitForTimeout(20_000);
	const before = await ev(() => window.__links ?? 0, 0);
	const walk = await ev(
		() =>
			new Promise((done) => {
				const w = window.__walker;
				if (!w?.place) return done(null);
				const x0 = w.position.x, z0 = w.position.z, yaw = w.yaw(), dx = -Math.sin(yaw), dz = -Math.cos(yaw);
				const gaps = [];
				let t0 = null, last = null;
				const step = (t) => {
					if (t0 === null) t0 = t;
					if (last !== null) gaps.push(t - last);
					last = t;
					const k = Math.min(1, (t - t0) / 12000);
					w.place(x0 + dx * 24 * k, z0 + dz * 24 * k, yaw, 0);
					if (k < 1) requestAnimationFrame(step);
					else {
						const s = [...gaps].sort((a, b) => a - b), mean = gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length);
						done({ frames: gaps.length, mean: +mean.toFixed(1), p95: +(s[Math.floor(0.95 * (s.length - 1))] ?? 0).toFixed(1), over100: gaps.filter((g) => g > 100).length, max: +(s.at(-1) ?? 0).toFixed(1) });
					}
				};
				requestAnimationFrame(step);
			}),
		null
	);
	const walked = (await ev(() => window.__links ?? 0, 0)) - before;
	const gpu = await ev(() => { const g = document.querySelector('canvas')?.getContext('webgl2'); const e = g?.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; }, 'unknown');
	await page.screenshot({ path: `${out}/${name}-sandbox-5.png` });
	// the guard's clashes (index.js `install`): which materials met a program built from other source, and where
	const clashes = await ev(() => window.__clashes ?? [], []);
	const s5 = { said: said.splice(0), clashes };
	// Sandbox 1: its film stepped
	step(`${name}: Sandbox 1`);
	await page.goto(`${site}/sandbox-1/`, { waitUntil: 'load' });
	await page.waitForFunction(() => window.__world?.film?.advance, null, { timeout: 180_000, polling: 1000 });
	const film = await page.evaluate(async () => {
		try {
			for (let i = 0; i <= 10; i++) {
				window.__world.film.advance(i * 0.5);
				await new Promise((r) => setTimeout(r, 50));
			}
			return 'advanced 0…5 s';
		} catch (e) {
			return `threw: ${e.message}`;
		}
	});
	await page.screenshot({ path: `${out}/${name}-sandbox-1-film.png` });
	// evidence beside c6 (the Orchestrator, 10:03): the four vehicles Samuel saw not load in the asset viewer, each opened
	// once and given 40 s, its console kept; they do not decide OK (the CPU run found other causes: README.md)
	const vehicles = [];
	for (const [label, id] of VEHICLES) {
		said.splice(0);
		await page.goto(`${site}/machines/#${id}`, { waitUntil: 'load' }).catch(() => {});
		await page.waitForTimeout(40_000);
		await page.screenshot({ path: `${out}/${name}-viewer-${label}.png` }).catch(() => {});
		const errors = said.splice(0).filter((t) => !/toNonIndexed|TextureSource|did not grow/.test(t));
		vehicles.push({ label, id, uniformErrors: errors.filter((t) => BAD.test(t)).length, errors: errors.slice(0, 20) });
	}
	const r = { browser: name, gpu, vehicles, sandbox5: { builtSeconds: built, walk, programsLinkedWhileWalking: walked, programsLinkedTotal: await ev(() => window.__links ?? 0, 0), clashes: s5.clashes, errors: s5.said }, sandbox1: { film, errors: said.splice(0) } };
	const bad = [...r.sandbox5.errors, ...r.sandbox1.errors].filter((t) => BAD.test(t));
	// the Safari walk's bound (c6, as the render box judges it): 1.5 × main's 20.8 ms before the programme
	// (not walked counts as over it where a real GPU answers: only the dry run's empty page has no walker)
	const slow = name === 'webkit' && (walk ? walk.mean > 31.2 : gpu !== 'unknown');
	// reported only: the walk's bound is intent ed6694c3's (Samuel's split, 10:58); c6 is the draw fix
	if (bad.length || film.startsWith('threw')) failed = true;
	r.walkOverBound = slow;
	overWalk ||= slow;
	r.bad = bad;
	results.push(r);
	console.log(`${name} (${gpu}): Sandbox 5 built in ${built.toFixed(0)} s, walk ${walk ? `${walk.frames} frames, mean ${walk.mean} ms, p95 ${walk.p95}, ${walk.over100} over 100 ms, max ${walk.max}` : 'not walked'}, ${walked} programs linked walking, ${bad.length} uniform/load errors, ${s5.clashes.length} clashes caught; Sandbox 1's film ${film}`);
	for (const v of vehicles) console.log(`  viewer ${v.label}: ${v.uniformErrors} uniform errors, ${v.errors.length} errors${v.errors[0] ? `: ${v.errors[0].slice(0, 160)}` : ''}`);
	for (const c of s5.clashes.slice(0, 5)) console.log(`  clash ${c.a} ~ ${c.b}:\n    was …${c.was}…\n    is  …${c.at}…`);
	await browser.close();
}
finished = true;
writeFileSync(`${out}/results${only ? `-${only}` : ''}.json`, JSON.stringify(results, null, 2));
console.log(failed ? 'FAILED: see results.json' : `OK: no uniform error, no plant failed to load, the film advanced${overWalk ? ' (the walk over 31.2 ms: ed6694c3\'s)' : ''}`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
/*
 * INTENT e85a5860'S MAC JOB — grass by the million in Sandbox 1, on a real GPU (Metal, WebGPU), for c4 and c5, and c2
 * confirmed on the card.
 *
 *   node intent-work/e85a5860-render/grass.mjs --site head=http://localhost:5183 --out <dir> [--small]
 *
 * One dev server of this branch (PLAY_API at the read-only proxy this script starts on 127.0.0.1:3911; PLAY_MCP_TOKEN
 * reads play). Every page gets the tree's own determinism (play/site/scripts/macjob/determinism.js: SEEDED_RANDOM,
 * settled by QUIET), the frame meter
 * (play/site/src/lib/content/render/meter.js: on WebGPU its draws and its passes' timestamps, compute passes included)
 * and the hour and the world's clock pinned, so two runs draw the same frames. Intent 7's meadow (090168c8-render's
 * spot: the most grassy 12 m round the near view, from the grass's own mask) and its views, each drawn twice:
 *   - `tiles`: `?renderer=webgl2`, WebGPURenderer on its WebGL 2 backend, intent 7's instanced tiles (the fallback);
 *   - `compute`: `?renderer=webgpu`, the blades chosen on the graphics card into three indirect draws.
 * At each view: the meter's 4 s with the grass and without it (hidden, no compute pass runs): the grass's own GPU ms;
 * its draws; the blades drawn at each level (tiles: `__grass.count()`; compute: read back, `readBack()`); and on
 * `compute`, the card's choice read back (`readChosen()`) against the CPU's twin (grass-gpu.js `chooseOnCpu`, loaded
 * from the dev server) over every cell the compute ran: c2 on the card.
 * The trample: walking 12 m through the meadow, then turned round on the spot to look back along the path, a still
 * and the map read back (`readTrodden()`) at 0, 2, 5, 10 and 12 s: how trodden the path is, and that it springs back.
 * A 20 s walking film at noon on `compute`.
 * --small: 390 × 844 on the small device's budget (`?budget=small`), `compute` only: visible blades and frame time (c5).
 * Out: <out>/<renderer>-<light>-<height>.png, <out>/trample-<s>.png, <out>/film-noon/%04d.jpg, <out>/results*.json.
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');
const { chromium } = createRequire(join(REPO, 'play/site/package.json'))('playwright');

const argv = process.argv.slice(2);
let site = null, out = join(HERE, 'out'), small = false, determinism = process.env.DETERMINISM ?? join(REPO, 'play/site/scripts/macjob/determinism.js');
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === '--site') site = argv[++i].split('=')[1].replace(/\/$/, '');
	else if (argv[i] === '--out') out = argv[++i];
	else if (argv[i] === '--small') small = true;
}
if (!site) throw new Error('give --site head=<url of this branch’s dev server>');
const TOKEN = process.env.PLAY_MCP_TOKEN;
if (!TOKEN) throw new Error('PLAY_MCP_TOKEN: the admin token the proxy reads play with');
mkdirSync(out, { recursive: true });
const { SEEDED_RANDOM, QUIET } = await import(determinism);

// the read-only proxy to play (selector-shots.mjs's)
const proxy = createServer(async (req, res) => {
	if (!['GET', 'HEAD'].includes(req.method ?? '') || !req.url?.startsWith('/api/')) return res.writeHead(405).end('read-only');
	try {
		const r = await fetch('https://play.maia.city' + req.url, { method: req.method, headers: { authorization: `Bearer ${TOKEN}`, accept: req.headers.accept ?? '*/*', ...(req.headers.range ? { range: req.headers.range } : {}) } });
		const h = Object.fromEntries([...r.headers].filter(([k]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(k)));
		res.writeHead(r.status, h);
		res.end(Buffer.from(await r.arrayBuffer()));
	} catch (err) {
		res.writeHead(502).end(String(err));
	}
});
await new Promise((ok) => proxy.listen(3911, '127.0.0.1', ok));

const meterScript = readFileSync(join(REPO, 'play/site/src/lib/content/render/meter.js'), 'utf8').replace(/^export /gm, '') + '\nwindow.__meter = installMeter(window);\n';
/** a sun of 8°: the sky's sunAt gives it at h = 19.44, in the west (intent 7's job) */
const LIGHTS = [{ name: 'noon', hour: 12 }, { name: 'sun8', hour: 19.44 }];
const HEIGHTS = [{ name: 'walk', eye: null }, { name: 'up2', eye: 3.65 }];
const RENDERERS = small ? ['webgpu'] : ['webgl2', 'webgpu'];

const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } : { args: ['--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const ctx = await browser.newContext(small ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript({ content: SEEDED_RANDOM });
await page.addInitScript({ content: meterScript });
await page.addInitScript(() => {
	window.__interiorHour = 12;
	window.__worldTime = 100;
});
const adapter = await page.evaluate(async () => {
	const a = await navigator.gpu?.requestAdapter();
	const info = a?.info ?? (await a?.requestAdapterInfo?.());
	return a ? `${info?.vendor ?? '?'} ${info?.architecture ?? ''} ${info?.description ?? ''}`.trim() : 'no WebGPU';
});
console.log('WebGPU adapter:', adapter);
if (process.platform === 'darwin' && !/apple|metal/i.test(adapter)) throw new Error(`not Apple's GPU on WebGPU (${adapter}): nothing drawn`);

const quiet = async (ms = 4 * 60e3) => {
	for (const end = Date.now() + ms; Date.now() < end; await page.waitForTimeout(2000)) if ((await page.evaluate(QUIET).catch(() => null)) === 0) return true;
	return false;
};
const frames = (n = 2) => page.evaluate((n) => new Promise((ok) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : ok()); f(n); }), n);
/** the blades drawn at each level: the tiles' count, the compute's read back */
const blades = () => page.evaluate(async () => (window.__grass.readBack ? window.__grass.readBack() : window.__grass.count()));

/** the meadow: the most grassy 12 m round the near view (intent 7's job's search, on the grass's own mask) */
async function findSpot() {
	await page.evaluate(() => window.__walker.place(0, 95, 0, -0.05));
	await quiet();
	return page.evaluate(() => {
		const m = window.__grass.mask, N = m.size, s = m.texel, best = { x: 0, z: 95, g: -1 };
		for (let x = -50; x <= 50; x += 4)
			for (let z = 45; z <= 145; z += 4) {
				let sum = 0, n = 0;
				for (let dx = -6; dx <= 6; dx += 1.5)
					for (let dz = -6; dz <= 6; dz += 1.5) {
						const gx = Math.floor((x + dx) / s), gz = Math.floor((z + dz) / s), i = (((gz % N) + N) % N) * N + (((gx % N) + N) % N);
						if (m.col[i] === gx && m.row[i] === gz) (sum += m.grass[i]), n++;
					}
				if (n && sum / n > best.g) Object.assign(best, { x, z, g: sum / n });
			}
		return best;
	});
}

/** c2 on the card: the compute's choice read back against the CPU's twin over every cell it ran, per level */
const checkChoice = () =>
	page.evaluate(async () => {
		const G = await import('/src/lib/content/biomes/grass-gpu.js');
		const f = window.__grass;
		await new Promise((ok) => requestAnimationFrame(ok));
		const view = f.view(), got = await f.readChosen();
		const card = got.map((l) => new Set(l.map(([p, j]) => p * 4096 + j)));
		const cpu = [new Set(), new Set(), new Set()];
		let candidates = 0;
		for (const p of view.cells) {
			const [cx, cz] = G.unpackCell(p);
			for (let j = 0; j < view.n; j++) {
				candidates++;
				const l = G.chooseOnCpu(cx, cz, j, view);
				if (l >= 0) cpu[l].add(p * 4096 + j);
			}
		}
		const diff = card.map((s, l) => [...s].filter((k) => !cpu[l].has(k)).length + [...cpu[l]].filter((k) => !s.has(k)).length);
		const drawn = cpu.reduce((a, s) => a + s.size, 0);
		return { candidates, drawn, card: card.map((s) => s.size), cpu: cpu.map((s) => s.size), differ: diff, share: +(diff.reduce((a, b) => a + b, 0) / Math.max(1, drawn)).toFixed(5), neverVertex: +(1 - drawn / candidates).toFixed(3) };
	});

const t0 = Date.now();
const results = { adapter, small, spot: null, views: [], trample: null, films: [] };
for (const r of RENDERERS) {
	await page.goto(`${site}/sandbox-1/?renderer=${r}${small ? '&budget=small' : ''}`, { waitUntil: 'domcontentloaded' });
	await page.waitForFunction(() => window.__walker && window.__assets && window.__grass, null, { timeout: 10 * 60e3 });
	const mode = await page.evaluate(() => window.__grass.mode ?? 'tiles');
	// which backend drew (render/core.js `ready`, intent c1bee1f8): webgpu, its webgl2 fallback, or webgl
	const backend = await page.evaluate(() => window.__rendererBackend ?? null);
	console.log(`${r}: drawn by ${backend}, the grass's ${mode}`);
	// on the Mac a WebGPU page that fell back measures nothing of this intent's (the dry run in avenBOX has no GPU: it goes on)
	if (r === 'webgpu' && mode !== 'indirect' && process.platform === 'darwin') throw new Error('?renderer=webgpu did not choose the blades on the card: no WebGPU here?');
	const spot = results.spot ?? (results.spot = await findSpot());
	console.log(`up after ${Math.round((Date.now() - t0) / 1000)} s; the meadow at ${spot.x}, ${spot.z} (grass ${spot.g.toFixed(2)})`);
	for (const light of LIGHTS) {
		const yaw = light.name === 'sun8' ? Math.PI / 2 : 0;
		for (const h of HEIGHTS) {
			await page.evaluate(({ hour }) => (window.__interiorHour = hour), light);
			await page.evaluate(({ x, z, yaw, eye }) => (eye === null ? window.__walker.place(x, z, yaw, -0.08) : window.__walker.fly(x, eye, z, yaw, -0.18)), { ...spot, yaw, eye: h.eye });
			await page.waitForTimeout(1500);
			const settled = await quiet(3 * 60e3);
			await page.waitForTimeout(2000);
			const png = join(out, `${small ? 'small-' : ''}${r}-${light.name}-${h.name}.png`);
			await page.screenshot({ path: png });
			const withGrass = await page.evaluate(() => window.__meter.sample(4));
			const drawn = await blades();
			const choice = mode === 'indirect' && !small && light.name === 'noon' ? await checkChoice() : null;
			await page.evaluate(() => (window.__grass.object.visible = false));
			const without = await page.evaluate(() => window.__meter.sample(4));
			await page.evaluate(() => (window.__grass.object.visible = true));
			const grassGpuMs = withGrass.gpu_ms != null && without.gpu_ms != null ? +(withGrass.gpu_ms - without.gpu_ms).toFixed(2) : null;
			results.views.push({ renderer: r, backend, mode, light: light.name, height: h.name, settled, blades: drawn, total: drawn.reduce((a, b) => a + b, 0), withGrass, without, grassGpuMs, grassCalls: withGrass.calls - without.calls, choice, png });
			console.log(`${r} ${light.name} ${h.name}: frame ${withGrass.frame_ms} ms (gpu ${withGrass.gpu_ms}, bound ${withGrass.bound}); the grass ${grassGpuMs} GPU ms in ${withGrass.calls - without.calls} draws; blades ${drawn.join(' / ')}${choice ? `; card vs CPU differ ${choice.share} of ${choice.drawn} (never reach the vertex stage: ${choice.neverVertex})` : ''}`);
		}
	}
	if (mode !== 'indirect' || small) continue;

	/* the trample: 12 m walked through the meadow at 1.3 m/s, then turned round to look back along the path */
	const x0 = results.spot.x, z0 = results.spot.z + 6;
	await page.evaluate(({ x, z }) => (window.__interiorHour = 12, window.__walker.place(x, z, 0, -0.06)), { x: x0, z: z0 });
	await quiet(2 * 60e3);
	for (let f = 0; f <= 12 * 24 / 1.3; f++) {
		await page.evaluate(({ x, z }) => window.__walker.place(x, z, 0, -0.06), { x: x0, z: z0 - (f / 24) * 1.3 });
		await frames(1);
	}
	await page.evaluate(({ x, z }) => window.__walker.place(x, z, Math.PI, -0.25), { x: x0, z: z0 - 12 });
	const start = Date.now(), trample = [];
	for (const s of [0, 2, 5, 10, 12]) {
		await page.waitForTimeout(Math.max(0, start + s * 1000 - Date.now()));
		await page.screenshot({ path: join(out, `trample-${s}s.png`) });
		// how trodden the path is now: its texels from 1 m to 11 m behind the walker
		const along = await page.evaluate(async ({ x, z0, z1 }) => {
			const t = await window.__grass.readTrodden(), N = t.size;
			let most = 0, sum = 0, n = 0;
			for (let z = z1; z <= z0; z += t.texel) {
				const gx = Math.floor(x / t.texel), gz = Math.floor(z / t.texel), v = t.data[(((gz % N) + N) % N) * N + (((gx % N) + N) % N)];
				(most = Math.max(most, v)), (sum += v), n++;
			}
			return { most: +most.toFixed(3), mean: +(sum / n).toFixed(3) };
		}, { x: x0, z0: z0 - 1, z1: z0 - 11 });
		trample.push({ s, ...along });
		console.log(`trample at ${s} s: the path at most ${along.most}, on average ${along.mean}`);
	}
	results.trample = trample;

	/* the walking film at noon: 20 s at 24 fps, 1.3 m/s through the meadow, the clock stepped a frame */
	const dir = join(out, 'film-noon');
	mkdirSync(dir, { recursive: true });
	const fx0 = results.spot.x, fz0 = results.spot.z + 13;
	await page.evaluate(({ x, z }) => (window.__worldTime = 100, window.__walker.place(x, z, 0, -0.06)), { x: fx0, z: fz0 });
	await quiet(2 * 60e3);
	for (let f = 0; f < 480; f++) {
		await page.evaluate(({ x, z, t }) => (window.__worldTime = t, window.__walker.place(x, z, 0, -0.06)), { x: fx0, z: fz0 - (f / 24) * 1.3, t: 100 + f / 24 });
		await frames(2);
		await page.screenshot({ path: join(dir, `${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 88 });
	}
	results.films.push({ light: 'noon', frames: 480, dir });
	console.log('film noon: 480 frames');
}

/* the verdicts, for the README's checks */
const at = (r, l, h) => results.views.find((v) => v.renderer === r && v.light === l && v.height === h);
const gpuView = at('webgpu', 'noon', 'walk');
results.verdict = small
	? { c5: { visible: gpuView?.total, frameMs: gpuView?.withGrass.frame_ms, pass: gpuView ? gpuView.total >= 15000 && gpuView.total <= 30000 : false } }
	: {
			c4: {
				grassGpuMs: { tiles: at('webgl2', 'noon', 'walk')?.grassGpuMs, compute: gpuView?.grassGpuMs },
				noCostlier: LIGHTS.every((l) => HEIGHTS.every((h) => (at('webgpu', l.name, h.name)?.grassGpuMs ?? Infinity) <= (at('webgl2', l.name, h.name)?.grassGpuMs ?? -Infinity) * 1.05)),
				denser: (gpuView?.total ?? 0) > (at('webgl2', 'noon', 'walk')?.total ?? Infinity),
				recovered: results.trample ? results.trample[0].most > 0.5 && results.trample.find((t) => t.s === 10).most <= 0.06 : false,
				atMost3Draws: results.views.filter((v) => v.renderer === 'webgpu').every((v) => v.grassCalls <= 3)
			},
			c2: { share: gpuView?.choice?.share, pass: (gpuView?.choice?.share ?? 1) < 0.002 }
		};
console.log('verdict', JSON.stringify(results.verdict));
writeFileSync(join(out, small ? 'results-small.json' : 'results.json'), JSON.stringify(results, null, 1));
await browser.close();
proxy.close();

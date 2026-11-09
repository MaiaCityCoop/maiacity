#!/usr/bin/env node
// Intent c1bee1f8's c8, the viewer and a world (README.md): each --site's asset viewer on a rigged actor (the goat,
// skinned by dual quaternions) and on a machine with the kit's section caps, whole and cut open (`stage.target.cut = 1`),
// and the worlds view on play's first world; settled, frame time over 6 s (rAF deltas), the backend that drew
// (`window.__rendererBackend`: webgpu, webgl2 or webgl) and a screenshot at 1440x900. Sites one after the other.
//   node views.mjs --site main=http://localhost:5181 --site ref8=http://localhost:5182 --site head=http://localhost:5183 --out out/views
// Run from a tree's play/site (Playwright and the job's determinism are that tree's). The sites' API is the read-only
// proxy (scripts/macjob/proxy.mjs) on 127.0.0.1:3911.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const req = createRequire(`${process.cwd()}/package.json`);
const { chromium } = req('playwright');
const { QUIET, SEEDED_RANDOM } = await import(pathToFileURL(`${process.cwd()}/scripts/macjob/determinism.js`).href);
const { playProxy } = await import(pathToFileURL(`${process.cwd()}/scripts/macjob/proxy.mjs`).href);

const argv = process.argv.slice(2), sites = [];
let out = 'out/views';
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === '--site') { const [name, url] = argv[++i].split('='); sites.push({ name, url: url.replace(/\/$/, '') }); }
	else if (argv[i] === '--out') out = argv[++i];
}
mkdirSync(out, { recursive: true });
const proxy = await playProxy();

/** the actor (skinned: its joints bend by dual quaternions), and machines that may carry section caps (the first that
 *  builds with capped materials is cut open, picked on the first site, the same on the next) */
const ACTOR = { name: 'goat', group: 'animals', id: '15a2b380-38e8-5aff-9784-b41f234d7b89' };
const CUT_CANDIDATES = [
	{ name: 'batterypack', group: 'machines', id: 'bf1f3ce7-fdbb-5169-8306-a94cf7b600dd' },
	{ name: 'electrocube', group: 'machines', id: 'b432d49a-b3d4-51b6-aa6b-745b15fb3234' },
	{ name: 'forklift', group: 'machines', id: '08796f3c-17f2-5e10-928a-e3f2f11bedd4' },
	{ name: 'lifetrac', group: 'machines', id: '4548aeef-53b4-5d1d-abd6-cca7a0231761' },
	{ name: 'excavator-small', group: 'machines', id: '173058ac-c3ee-53f6-86a8-72bf86962201' }
];
/** play's first world, its newest version's recipe (the worlds view is opened at `#<recipe hash>`) */
async function firstWorld() {
	// through the proxy, at the port it took (a dry run gives it a free one)
	const get = async (r) => (await fetch(`http://127.0.0.1:${proxy.address().port}/api${r}`)).json();
	const id = (await get('/assets')).filter((a) => a.grp === 'worlds')[0]?.id;
	if (!id) return null;
	const v = (await get(`/assets/${id}`)).versions[0];
	return v.recipe ?? v.variants?.find((x) => x.name === v.defaultVariant)?.recipe ?? v.variants?.[0]?.recipe ?? null;
}

// a Mac's Metal, WebGPU on (a page on WebGPURenderer draws with it; a WebGL one as before)
const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } : { args: ['--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const clock = () => { const w = window; w.__dt = []; if (typeof requestAnimationFrame !== 'function') return; let last = 0; const t = (now) => { if (last) w.__dt.push(now - last); last = now; requestAnimationFrame(t); }; requestAnimationFrame(t); };
const timed = async (page, ms) => {
	await page.evaluate(() => (window.__dt.length = 0));
	await page.waitForTimeout(ms);
	return page.evaluate(() => { const d = window.__dt.slice(2).sort((a, b) => a - b); return { frames: d.length, frameMs: d.length ? +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(2) : null, frameP95: d[Math.floor(d.length * 0.95)] ?? null }; });
};
const backendOf = (page) => page.evaluate(() => window.__rendererBackend ?? 'webgl').catch(() => 'unknown');
const built = (page, ms) => page.waitForFunction(() => { const v = window.__vaultAsset; return v && (v.error || (v.hero && !v.building)); }, null, { timeout: ms }).then(async () => !(await page.evaluate(() => window.__vaultAsset?.error)), () => false);
const capsOf = () => { let n = 0; window.__vaultAsset?.stage?.root?.traverse((o) => { for (const m of [o.material].flat()) if (m?.userData?.cap || m?.cap) n++; }); return n; };

const world = await firstWorld().catch((e) => (console.log(`world: play's list not read (${e.message}); no world shot`), null));
console.log(`world: ${world ?? 'none listed'}`);
const results = [];
let cut = null;
for (const site of sites) {
	const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await ctx.newPage();
	page.on('console', (m) => m.type() === 'error' && console.log(`[${site.name}] ${m.text().slice(0, 300)}`));
	page.on('pageerror', (e) => console.log(`[${site.name}] pageerror ${String(e).slice(0, 300)}`));
	await page.addInitScript({ content: SEEDED_RANDOM });
	await page.addInitScript(clock);
	if (!cut) {
		for (const c of CUT_CANDIDATES) {
			await page.goto(`${site.url}/${c.group}/#${c.id}`, { waitUntil: 'domcontentloaded' });
			const ok = await built(page, 3 * 60e3);
			const caps = ok ? await page.evaluate(capsOf) : 0;
			console.log(`cut candidate ${c.name}: built ${ok}, capped materials ${caps}`);
			if (ok && caps > 0) { cut = c; break; }
		}
		console.log(`cut open: ${cut?.name ?? 'none built with caps'}`);
	}
	const shots = [{ ...ACTOR }, ...(cut ? [{ ...cut, cut: true }] : [])];
	for (const a of shots) {
		await page.goto(`${site.url}/${a.group}/#${a.id}`, { waitUntil: 'domcontentloaded' });
		const ok = await built(page, 5 * 60e3);
		await page.waitForTimeout(4000);
		const m = await timed(page, 6000);
		const png = `${out}/${site.name}-${a.name}.png`;
		await page.screenshot({ path: png });
		results.push({ site: site.name, shot: a.name, ok, backend: await backendOf(page), ...m, png });
		if (a.cut) {
			await page.evaluate(() => { window.__vaultAsset.stage.target.cut = 1; });
			await page.waitForTimeout(5000);
			const mc = await timed(page, 6000);
			const pc = `${out}/${site.name}-${a.name}-cut.png`;
			await page.screenshot({ path: pc });
			results.push({ site: site.name, shot: `${a.name}-cut`, ok, backend: await backendOf(page), ...mc, png: pc });
		}
	}
	if (world) {
		await page.goto(`${site.url}/worlds/#${encodeURIComponent(world)}`, { waitUntil: 'domcontentloaded' });
		await page.evaluate(() => (window.__interiorHour = 12)).catch(() => {});
		// settled (QUIET 0), or, a view with no asset renderers to ask (QUIET null), after its first 20 s
		const from = Date.now();
		for (let end = from + 5 * 60e3; Date.now() < end; await page.waitForTimeout(2000)) {
			const q = await page.evaluate(QUIET).catch(() => 1);
			if (q === 0 || (q === null && Date.now() - from > 20e3)) break;
		}
		await page.waitForTimeout(4000);
		const m = await timed(page, 6000);
		const png = `${out}/${site.name}-world.png`;
		await page.screenshot({ path: png });
		results.push({ site: site.name, shot: 'world', ok: true, backend: await backendOf(page), ...m, png });
	}
	await ctx.close();
}
await browser.close();
proxy.close?.();
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1));
console.table(results.map(({ site, shot, ok, backend, frameMs, frameP95 }) => ({ site, shot, ok, backend, frameMs, frameP95 })));

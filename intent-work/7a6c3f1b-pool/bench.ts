// what a box's worker pays to start, and what a recipe's second build costs in the worker that built it against a fresh one
const SITE = '/home/user/maiacity/play/site';
const { chromium } = await import(`${SITE}/node_modules/playwright/index.mjs`);
const { siteHandler } = await import(`${SITE}/../api/src/site.ts`);
const site = siteHandler(`${SITE}/build`);
const recipes = await Bun.file(import.meta.dir + '/recipes.json').text();
const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: (req) => { const p = new URL(req.url).pathname; return p === '/bench' ? new Response('<!doctype html><title>bench</title>', { headers: { 'content-type': 'text/html' } }) : p === '/recipes.json' ? new Response(recipes) : site(req); } });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.port}/bench`);
const out = await page.evaluate(async () => {
	const code = await (await fetch('/engines/engine-v5.js')).text();
	const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
	const recipes = await (await fetch('/recipes.json')).json();
	const fresh = () => new Promise<{ w: Worker; ms: number }>((ok, no) => { const t = performance.now(); const w = new Worker(url); w.onerror = (e) => no(new Error(e.message)); w.onmessage = (e) => e.data[0]?.op === 'ready' && ok({ w, ms: performance.now() - t }); });
	let id = 0;
	const build = (w: Worker, recipe: any) => new Promise<{ wall: number; ms: any; ok: boolean }>((ok) => { const mine = ++id, t = performance.now(); w.onmessage = (e) => e.data[0]?.id === mine && ok({ wall: performance.now() - t, ms: e.data[0].ms, ok: e.data[0].ok === true }); w.postMessage({ id: mine, op: 'build', recipe, given: undefined, engine: 5 }); });
	const starts: number[] = [];
	for (let i = 0; i < 20; i++) { const f = await fresh(); starts.push(f.ms); f.w.terminate(); }
	const rows: any[] = [];
	for (const r of recipes) {
		const f = await fresh();
		const first = await build(f.w, r.recipe);
		const again: number[] = [];
		for (let i = 0; i < 3; i++) again.push((await build(f.w, r.recipe)).wall);
		f.w.terminate();
		// and in a second fresh worker, as the pool builds its next level today
		const g = await fresh();
		const cold2 = await build(g.w, r.recipe);
		g.w.terminate();
		rows.push({ label: r.label, ok: first.ok, start: Math.round(f.ms), first: Math.round(first.wall), ms: first.ms, again: again.map(Math.round), cold2: Math.round(cold2.wall + g.ms) });
	}
	return { starts: starts.map(Math.round), rows };
});
const med = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
console.log('a worker of engine 5 from new Worker to ready, ms:', out.starts.join(' '), 'median', med(out.starts));
const R = out.rows.filter((r: any) => r.ok);
const sum = (f: (r: any) => number) => Math.round(R.reduce((a: number, r: any) => a + f(r), 0));
console.log(`${R.length} of ${out.rows.length} recipes built`);
console.log('first build in a fresh worker (start + build), ms total', sum((r) => r.start + r.first), '· the same again in a second fresh worker', sum((r) => r.cold2), '· the same again in the worker that built it (median of 3)', sum((r) => med(r.again)));
for (const r of R.slice(0, 24)) console.log(' ', r.label.slice(0, 40).padEnd(40), 'start', r.start, 'first', r.first, 'again', r.again.join('/'), 'fresh again', r.cold2, JSON.stringify(r.ms));
await browser.close(); process.exit(0);

#!/usr/bin/env bun
/*
 * A FRAME PART BY PART (intent 0356b0ea): Sandbox 1 in WebKit at 793 ms a frame on GitHub's macOS runner, Sandbox 5 at
 * 29 ms with more triangles; the page's own JavaScript is 85 ms of it. Which part of the world costs the rest is found
 * here: the world shown and settled, its frame measured whole (the frame meter, render/meter.js), then with each part of
 * its scene hidden in turn (each part's own picture and shadow gone, no shader made anew), and whole again at the end.
 *
 *   bun intent-work/0356b0ea-render/parts.ts [--browser webkit,chromium] [--world /sandbox-1/] [--each <s>]
 *
 * Prints, a browser: the frame whole, then a line a part: its meshes and triangles, the frame without it and the
 * milliseconds it costs. Run from play/site (its Playwright), the site built.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { siteHandler } from '../../play/api/src/site.ts';
import { pinnedApi } from '../../play/site/scripts/gpu.ts';
import { quietness } from '../../play/site/scripts/lib/quiet.js';
import { SEEDED_RANDOM } from '../../play/site/scripts/macjob/determinism.js';
import { LAUNCH } from '../../play/site/scripts/mac-page.mjs';

const SITE = resolve(import.meta.dir, '../../play/site');
// play/site's Playwright, required as the Mac jobs require it (so a dry run's CPU page stands in for it)
const { chromium, webkit } = createRequire(join(SITE, 'package.json'))('playwright');
const argv = process.argv.slice(2);
const arg = (k: string, d: string) => (argv.includes(k) ? argv[argv.indexOf(k) + 1]! : d);
const world = arg('--world', '/sandbox-1/'), each = Number(arg('--each', '4'));
const browsers = arg('--browser', 'webkit,chromium').split(',');

const site = siteHandler(join(SITE, 'build'));
const api = pinnedApi(join(SITE, 'scripts/census/inputs'), new Set());
const server = Bun.serve({ port: 0, hostname: '127.0.0.1', idleTimeout: 0, fetch: (req) => (new URL(req.url).pathname.startsWith('/api/') ? api(req) : site(req)) });
const meter = `${readFileSync(join(SITE, 'src/lib/content/render/meter.js'), 'utf8').replace(/^export /gm, '')};window.__meter = installMeter(window);`;

/** in the page: the scene's parts, each a list of objects hidden together and what they hold */
const PARTS = () => {
	const scene = (window as any).__world?.scene;
	if (!scene) return [];
	const held = (o: any) => {
		let meshes = 0, tris = 0, x = 0, z = 0, n = 0;
		o.updateWorldMatrix?.(true, false);
		o.traverse((m: any) => {
			if (m.isMesh && m.matrixWorld) (x += m.matrixWorld.elements[12]), (z += m.matrixWorld.elements[14]), n++;
		});
		o.traverse((m: any) => {
			if (!m.isMesh && !m.isPoints && !m.isLine) return;
			meshes++;
			const g = m.geometry, n = g?.index ? g.index.count : (g?.attributes?.position?.count ?? 0);
			tris += Math.round((n / 3) * (m.isInstancedMesh ? m.count : 1));
		});
		return { meshes, tris, at: n ? `${Math.round(x / n)}, ${Math.round(z / n)}` : '' };
	};
	const parts: { name: string; path: number[]; meshes: number; tris: number; at: string }[] = [];
	const loose: number[][] = [];
	const visit = (o: any, path: number[], depth: number) =>
		o.children.forEach((c: any, i: number) => {
			if (!c.visible) return;
			const p = [...path, i];
			// a scene inside the scene (a dome's inside): its own parts, one level down
			if (c.isScene && depth === 0) return visit(c, p, 1);
			const h = held(c);
			if (!h.meshes) return;
			if ((c.isMesh || c.isInstancedMesh) && !c.children.length && h.tris < 20000) return void loose.push(p);
			parts.push({ name: `${depth ? 'inside › ' : ''}${c.name || c.type}`, path: p, ...h });
		});
	visit(scene, [], 0);
	if (loose.length) parts.push({ name: `${loose.length} small meshes, each on its own`, path: [-1], meshes: loose.length, tris: 0, at: '' });
	(window as any).__loose = loose;
	return parts.sort((a, b) => b.tris - a.tris).slice(0, 28);
};
const SHOW = ([path, shown]: [number[], boolean]) => {
	const scene = (window as any).__world.scene;
	const at = (p: number[]) => p.reduce((o: any, i: number) => o.children[i], scene);
	const list = path[0] === -1 ? (window as any).__loose.map(at) : [at(path)];
	for (const o of list) o.visible = shown;
};

for (const name of browsers) {
	const browser = await (name === 'webkit' ? webkit.launch({ headless: true }) : chromium.launch(LAUNCH));
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	await page.addInitScript({ content: SEEDED_RANDOM });
	await page.addInitScript({ content: meter });
	const t0 = performance.now();
	await page.goto(`http://127.0.0.1:${server.port}${world}`, { waitUntil: 'commit' });
	// up: the world handed to the film camera and its walker placed (village.ts), then settled
	await page.waitForFunction(() => !!(window as any).__world?.scene && !!(window as any).__walker, null, { timeout: 900_000, polling: 500 });
	for (let zero = 0, t = performance.now(); performance.now() - t < 60_000 && zero < 2; await page.waitForTimeout(1000)) zero = (await page.evaluate(quietness).catch(() => null)) === 0 ? zero + 1 : 0;
	console.log(`${name} ${browser.version()} · ${world} up in ${Math.round((performance.now() - t0) / 1000)} s`);
	const sample = async () => {
		const s = await page.evaluate((n) => (window as any).__meter.sample(n), each);
		return { ms: s.frames > 1 ? s.frame_ms : null, cpu: s.cpu_ms, draws: s.calls, tris: s.triangles };
	};
	const whole = await sample();
	console.log(`  whole: ${whole.ms} ms a frame (CPU ${whole.cpu}), ${whole.draws} draws, ${whole.tris} triangles`);
	for (const part of await page.evaluate(PARTS)) {
		await page.evaluate(SHOW, [part.path, false] as [number[], boolean]);
		await page.waitForTimeout(1000);
		const w = await sample();
		await page.evaluate(SHOW, [part.path, true] as [number[], boolean]);
		await page.waitForTimeout(700);
		const cost = whole.ms !== null && w.ms !== null ? Math.round((whole.ms - w.ms) * 10) / 10 : null;
		console.log(`  without ${part.name} (${part.meshes} meshes, ${part.tris.toLocaleString('en')} triangles${part.at ? `, about ${part.at}` : ''}): ${w.ms} ms (CPU ${w.cpu}), ${w.draws} draws · it costs ${cost} ms`);
	}
	const again = await sample();
	console.log(`  whole again: ${again.ms} ms a frame (CPU ${again.cpu})`);
	await browser.close();
}
server.stop(true);

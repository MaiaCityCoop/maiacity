#!/usr/bin/env node
/*
 * RENDER A RECIPE AS PLAY SHOWS IT — pictures of an asset you are making, before you propose it, from the same asset
 * box, frozen engine, checks and studio play itself shows assets in (the render bench, /render, in the dev server:
 * src/lib/content/assets/RenderBench.svelte). For looking at your work stage by stage, for before-and-after pictures
 * against the version you started from, and for comparing them with photographs of the real thing.
 *
 *   node scripts/render.mjs --file apricot-v2.js --id apricot --v 2 [--file apricot-v1.js --id apricot --v 1]
 *        [--shots shots.json] [--out renders/] [--url http://localhost:5173] [--size 900] [--scale 1]
 *
 *   --file/--id/--v   a readable source (as proposed: module.exports.recipe = …) or a recipe file, its asset's slug
 *                     and version number; give several to see them side by side, each shot in a row (before | after)
 *   --shots           a JSON list of shots: { "name": "ripe-branch", "values": { "stage": 9, "fruit": 0, "seed": "maia" },
 *                     "camera": { "az": 40, "el": 6, "zoom": 0.4 } } — `az`/`el` degrees round what the viewer framed,
 *                     `zoom` × its distance, or `target` [x, y, z] (m) and `dist` (m). Without it: every stage of a
 *                     recipe that has stages, framed as the viewer frames them, else its default build
 *   --url             a dev server already running; without it one is started here (bun run dev) and stopped after
 *   --slack           on a machine too busy to keep the box's time (several renders at once), the box's 20 s
 *                     stretched this many times (at most 6), in development only; the build's own time is checked
 *                     elsewhere (a built site holds every build to 20 s)
 *   --guests          a JSON list of the assets a recipe names by hash and the page draws where it stands them (a
 *                     dome's plants): { "file", "id", "v", "variant"?, "as"? }, each a readable source handed to the
 *                     page's catalog; `as` the hash play holds it by, which the recipe names: every --file's code has
 *                     it replaced by the hash the guest is held by here (made here from its readable source, its
 *                     bytes and so its hash differ from play's minified file), so it draws the same plant;
 *                     `refs` what its card names by readable refs, each by the `as` of a guest listed before it
 *
 *   --play            the page's API is play's own (https://play.maia.city), read with the admin token in PLAY_MCP_TOKEN
 *                     (its read-only routes; the token is sent to play and nowhere else): with --world, the guests a world
 *                     names that are not handed in with --guests are play's accepted assets, from its catalog, and a
 *                     --guests entry whose `as` play already holds is taken from play too (its own file: the hash a
 *                     biome names its plants by, or a world its guests by, stays the one play holds)
 *   --world           the --file is a world (group `worlds`, play/SPEC.md §4.11): run as the Worlds page runs it, on the
 *                     world bench (/worlds/bench/): its guests (--guests, as above) drawn, lit and heard where it
 *                     stands them, and if it moves, kept running in the box. Its shots: { "name", "run": s of the
 *                     world's time before it, "eye": [x, y, z], "target": [x, y, z] (m) | "view": a view it names |
 *                     "mode": "orbit" | "walk" | "drive" }. Without --shots: the whole, then 10 s on, then each view
 *                     it names. A world's `values` are given by --values '{"cars": 40}'
 *
 * Out: one PNG per shot and file (<out>/<file>-<shot>.png), a contact sheet (<out>/sheet.png) with every shot's
 * values, triangles and build time under it, and shots.json of what was shown. Needs Playwright with a Chromium
 * (npx playwright install chromium where none is installed); WebGL runs on SwiftShader when there is no GPU.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, '..');

/** the command line: repeated --file/--id/--v make the list of recipes, in order */
function args(argv) {
	const o = { recipes: [], out: 'renders', size: 900, scale: 1 };
	for (let i = 0; i < argv.length; i++) {
		const [k, v] = [argv[i], argv[i + 1]];
		if (k === '--file') o.recipes.push({ file: v }), i++;
		else if (k === '--id') (o.recipes.at(-1).id = v), i++;
		else if (k === '--v') (o.recipes.at(-1).v = Number(v)), i++;
		else if (k === '--label') (o.recipes.at(-1).label = v), i++;
		else if (k === '--shots') (o.shots = v), i++;
		else if (k === '--guests') (o.guests = v), i++;
		else if (k === '--slack') (o.slack = Number(v)), i++;
		else if (k === '--world') o.world = true;
		else if (k === '--play') o.play = true;
		else if (k === '--values') (o.values = JSON.parse(v)), i++;
		else if (k === '--out') (o.out = v), i++;
		else if (k === '--url') (o.url = v), i++;
		else if (k === '--size') (o.size = Number(v)), i++;
		else if (k === '--scale') (o.scale = Number(v)), i++;
		else throw new Error(`what is ${k}? (see the top of scripts/render.mjs)`);
	}
	if (!o.recipes.length) throw new Error('give at least one --file (with its --id and --v)');
	for (const r of o.recipes) if (!r.id || !r.v) throw new Error(`${r.file}: give its --id (the asset's slug) and --v (its version number)`);
	return o;
}

/** Playwright, from this project or wherever this machine keeps it */
async function playwright() {
	for (const from of [site, process.cwd(), '/usr/lib/node_modules/', '/usr/local/lib/node_modules/']) {
		try {
			return createRequire(resolve(from, 'x.js'))('playwright');
		} catch {}
	}
	try {
		return await import('playwright');
	} catch {
		throw new Error('Playwright is needed: bun add -d playwright && bunx playwright install chromium');
	}
}

/** a dev server: the one given, or one started here, and how to stop it */
async function server(url) {
	if (url) return { url, stop: () => {} };
	const port = 5300 + Math.floor(Math.random() * 400);
	const dev = spawn('bun', ['run', 'dev', '--', '--port', String(port), '--strictPort'], { cwd: site, stdio: ['ignore', 'pipe', 'pipe'] });
	let log = '';
	dev.stdout.on('data', (d) => (log += d));
	dev.stderr.on('data', (d) => (log += d));
	const at = `http://localhost:${port}`;
	for (let i = 0; i < 240; i++) {
		await new Promise((r) => setTimeout(r, 500));
		try {
			if ((await fetch(`${at}/render/`)).ok) return { url: at, stop: () => dev.kill() };
		} catch {}
		if (dev.exitCode !== null) break;
	}
	dev.kill();
	throw new Error(`the dev server did not start:\n${log.slice(-2000)}`);
}

const o = args(process.argv.slice(2));
mkdirSync(o.out, { recursive: true });
const { chromium } = await playwright();
const dev = await server(o.url);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
try {
	for (const r of o.recipes) {
		const page = await browser.newPage({ viewport: { width: o.size, height: o.size }, deviceScaleFactor: o.scale });
		page.on('pageerror', (e) => console.error(`  page: ${e.message}`));
		const bench = o.world ? '__worldBench' : '__render';
		if (o.play) {
			if (!process.env.PLAY_MCP_TOKEN) throw new Error('--play reads play with the admin token in PLAY_MCP_TOKEN');
			// the page's API answered by play itself, read only, the token sent there and nowhere else
			await page.route(`${dev.url}/api/**`, async (route) => {
				const u = new URL(route.request().url());
				if (route.request().method() !== 'GET') return route.fulfill({ status: 405, body: 'read only' });
				const res = await route.fetch({ url: `https://play.maia.city${u.pathname}${u.search}`, headers: { accept: route.request().headers().accept ?? '*/*', authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}` } });
				await route.fulfill({ response: res });
			});
		}
		await page.goto(`${dev.url}${o.world ? '/worlds/bench/' : '/render/'}${o.slack ? `?slack=${o.slack}` : ''}`);
		await page.waitForFunction((b) => !!window[b], bench, { timeout: 120_000 });
		const name = basename(r.file).replace(/\.[^.]+$/, '');
		// the assets it names, handed to the page first; the hashes it names them by turned into theirs here
		let code = readFileSync(r.file, 'utf8');
		/** each guest's hash here, by the hash play holds it by */
		const here = {};
		// with --play, play's catalog first: a guest play already holds by the hash it is named by is play's own file
		// (a biome's oats named by play's hash stay that hash), never one made here from a readable source
		if (o.world && o.play) {
			const got = await page.evaluate(() => window.__worldBench.catalog());
			console.log(`  play's catalog: ${got.count} recipes${got.error ? ` (${got.error})` : ''}`);
		}
		for (const g of o.guests ? JSON.parse(readFileSync(o.guests, 'utf8')) : []) {
			if (o.world && o.play && g.as && (await page.evaluate((h) => window.__worldBench.holds(h), g.as))) {
				console.log(`  guest ${g.id} from play (${g.as.slice(0, 12)}…)`);
				continue;
			}
			const refs = g.refs ? Object.fromEntries(Object.entries(g.refs).map(([name, h]) => [name, here[h] ?? h])) : null;
			const got = await page.evaluate(([b, x]) => window[b].guest(x), [bench, { code: readFileSync(resolve(dirname(o.guests), g.file), 'utf8'), id: g.id, v: g.v, variant: g.variant ?? null, refs }]);
			if (g.as) (here[g.as] = got.hash), (code = code.replaceAll(g.as, got.hash));
			console.log(`  guest ${got.label} (${got.hash.slice(0, 12)}…${g.as ? ` for ${g.as.slice(0, 12)}…` : ''})`);
		}
		console.log(`${r.file}: building in the asset box …`);
		if (o.world) {
			const loaded = await page.evaluate((x) => window.__worldBench.load(x), { code, id: r.id, v: r.v, values: o.values ?? {} });
			console.log(`  ${loaded.label} (${loaded.hash.slice(0, 12)}…) · ${loaded.size.join(' × ')} m${loaded.moves ? ' · it moves' : ''}${loaded.views.length ? ` · views ${loaded.views.join(', ')}` : ''}`);
			const shots = o.shots ? JSON.parse(readFileSync(o.shots, 'utf8')) : [{ name: 'whole' }, { name: 'whole-10s', run: 10 }, ...loaded.views.map((v) => ({ name: `view-${v.replace(/[^a-z0-9]+/gi, '-')}`, view: v }))];
			const canvas = page.locator('canvas').first();
			for (const s of shots) {
				const got = await page.evaluate((x) => window.__worldBench.shot(x), s);
				const png = resolve(o.out, `${name}-${s.name}.png`);
				const box = await canvas.boundingBox();
				await page.screenshot({ path: png, clip: box ?? undefined, timeout: 120_000 });
				if (got.cut) console.log(`    drawings: world ${got.cut.world}, guests ${got.cut.guests} (${got.cut.kinds} kinds; most: ${got.cut.top.map(([k, n]) => `${k} ${n}`).join(', ')}), lights ${got.cut.lights}, other ${got.cut.other}`);
				results.push({ recipe: name, label: loaded.label, shot: s.name, png, values: { t: got.t, guests: got.guests, lit: got.lit }, ...got });
				console.log(`  ${s.name}: t ${got.t} s · ${got.guests} guests of ${got.kinds} kinds${got.missing ? ` (${got.missing} missing)` : ''} · ${got.lit} lit (${got.faces ?? 0} face drawings, ${got.glows ?? 0} glows) · ${got.live ? 'alive' : 'still'} · ${got.triangles.toLocaleString('en')} triangles, ${got.calls} calls · ${got.ms} ms`);
			}
			await page.close();
			continue;
		}
		const loaded = await page.evaluate((x) => window.__render.load(x), { code, id: r.id, v: r.v, label: r.label });
		console.log(`  ${loaded.card.label} (${loaded.hash.slice(0, 12)}…)`);
		const stage = loaded.params.find((p) => p.id === 'stage' && Array.isArray(p.names));
		const shots = o.shots ? JSON.parse(readFileSync(o.shots, 'utf8')) : stage ? stage.names.map((n, i) => ({ name: `${String(i).padStart(2, '0')}-${n.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, values: { stage: stage.min + i } })) : [{ name: 'default' }];
		const canvas = page.locator('canvas').first();
		for (const s of shots) {
			const got = await page.evaluate((x) => window.__render.shot(x), { values: s.values ?? {}, camera: s.camera ?? {} });
			const png = resolve(o.out, `${name}-${s.name}.png`);
			// the canvas as it is (no waiting for it to hold still: software rendering draws a frame a second)
			const box = await canvas.boundingBox();
			await page.screenshot({ path: png, clip: box ?? undefined, timeout: 120_000 });
			results.push({ recipe: name, label: loaded.card.label, shot: s.name, png, ...got });
			const planted = got.planted?.planted ? ` · ${got.planted.planted} planted (${got.planted.kinds} kinds${got.planted.missing ? `, ${got.planted.missing} missing` : ''})` : '';
			console.log(`  ${s.name}: ${got.triangles.toLocaleString('en')} triangles, ${got.ms} ms${planted}${got.note ? ` — ${got.note}` : ''}`);
		}
		await page.close();
	}
	writeFileSync(resolve(o.out, 'shots.json'), JSON.stringify(results, null, '\t'));
	// the contact sheet: a row per shot, a column per recipe (before | after)
	const names = [...new Set(results.map((x) => x.recipe))];
	const shotNames = [...new Set(results.map((x) => x.shot))];
	const cell = (x) => (x ? `<figure><img src="data:image/png;base64,${readFileSync(x.png).toString('base64')}"><figcaption><b>${x.shot}</b> · ${x.label}<br>${Object.entries(x.values).map(([k, v]) => `${k} ${v}`).join(' · ')} · ${x.triangles.toLocaleString('en')} tris · ${x.ms} ms</figcaption></figure>` : '<figure></figure>');
	const cols = names.length > 1 ? names.length : Math.min(4, shotNames.length);
	const cells = names.length > 1 ? shotNames.flatMap((s) => names.map((n) => cell(results.find((x) => x.recipe === n && x.shot === s)))) : results.map(cell);
	const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;font:13px system-ui;background:#fff}main{display:grid;grid-template-columns:repeat(${cols},420px);gap:6px;padding:6px}figure{margin:0}img{width:420px;height:420px;object-fit:cover;display:block}figcaption{padding:3px 2px;color:#333}</style><main>${cells.join('')}</main>`;
	const sheet = await browser.newPage({ viewport: { width: cols * 426 + 6, height: 600 } });
	await sheet.setContent(html);
	await sheet.screenshot({ path: resolve(o.out, 'sheet.png'), fullPage: true });
	console.log(`${results.length} pictures and the sheet in ${resolve(o.out)}`);
} finally {
	await browser.close();
	dev.stop();
}

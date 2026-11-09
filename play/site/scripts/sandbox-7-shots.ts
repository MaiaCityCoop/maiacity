/**
 * Intent 8d683ad6's c11: Sandbox 7 as its proposal would make it, shot to be looked at against the old planet's cover.
 * This branch's API runs on a scratch database on avenBOX's Postgres (TEST_DATABASE_URL, dropped at the end), Sandbox
 * 7's layout holding the planet, biomes and sites it proposes (play/api/import/sandboxes/sandbox-7) and its four maps
 * among its files (from play/media, as the deploy's import puts them); the built site is served by `vite preview` (its
 * /api proxied to the API at :3911) and shot as an admin: the whole globe over the Atlantic, Europe and Africa; the
 * sites' list; a flight to the best site and its card; the walk on the cards; at 1440×900 and 390×844. Nothing is
 * written on play.
 *
 *   bun run build && bun scripts/sandbox-7-shots.ts [out dir]
 */
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { app } from '../../api/src/app';
import { createHuman, initSessions, tokenFor } from '../../api/src/auth';
import { folderStore, keyOf } from '../../api/src/blobs';
import { seedSandboxLayouts } from '../../api/import/sandboxes';
import planet from '../../api/import/sandboxes/sandbox-7/planet.json';
import { Rate } from '../../api/src/limits';
import { migrate } from '../../api/src/migrations';
import { fromBunSql } from '../../api/src/pg';

const OUT = process.argv[2] ?? '../shots/8d683ad6-sandbox-7';
const DB = process.env.TEST_DATABASE_URL;
if (!DB) throw new Error('TEST_DATABASE_URL is set in avenBOX');
const PORT = 4173, BASE = `http://localhost:${PORT}`;
mkdirSync(OUT, { recursive: true });

const name = `play_sandbox7_shots_${Date.now()}`;
const root = new Bun.SQL(DB);
await root.unsafe(`CREATE DATABASE ${name}`);
const u = new URL(DB);
u.pathname = `/${name}`;
const sql = new Bun.SQL(u.toString());
const db = fromBunSql(sql);
let live: ReturnType<typeof Bun.serve> | null = null;
let preview: ReturnType<typeof Bun.spawn> | null = null;
try {
	await migrate(db);
	await initSessions(db);
	// the layout as the deploy's import makes it: its v1, the planet, biomes and sites kept in play/api/import/sandboxes
	await seedSandboxLayouts(db);
	const store = folderStore(mkdtempSync(join(tmpdir(), 'play-blobs-')));
	// the maps among play's files, as the import puts them (play/media/<hash>.json)
	for (const m of Object.values(planet.maps)) {
		const hash = m.file.slice(0, 64), bytes = new Uint8Array(readFileSync(join(import.meta.dir, '../../media', m.file)));
		await store.put(hash, bytes, 'application/json');
		await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, 'application/json', $3) ON CONFLICT DO NOTHING`, [hash, bytes.length, keyOf(hash)]);
	}
	const api = app({ db, store, rate: new Rate(0) });
	const samuel = await createHuman(db, 'Samuel');
	await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [samuel.id]);
	live = Bun.serve({ port: 3911, fetch: (req) => api.fetch(req) });
	preview = Bun.spawn(['bunx', 'vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: join(import.meta.dir, '..'), stdout: 'ignore', stderr: 'inherit' });
	for (let k = 0; k < 60; k++) {
		try {
			if ((await fetch(BASE)).ok) break;
		} catch {}
		await Bun.sleep(500);
	}
	const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
	for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
		const w = size.width;
		const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
		await ctx.addCookies([{ name: 'play_session', value: tokenFor(samuel.id), url: BASE }]);
		const p = await ctx.newPage();
		// a frame of the whole planet takes seconds in the box's software renderer: every shot may wait for one
		p.setDefaultTimeout(180_000);
		p.on('console', (m) => m.type() === 'error' && console.log('page:', m.text()));
		p.on('pageerror', (e) => console.log('page error:', e.message));
		// the hour pinned as a film pins it (the kit's sky clock), so every shot is lit alike: late morning where you look
		await p.addInitScript(() => ((window as unknown as { __interiorHour: number }).__interiorHour = 10.5));
		await p.goto(`${BASE}/sandbox-7/`, { waitUntil: 'networkidle' });
		const side = p.getByRole('complementary', { name: 'Where a city could grow' });
		await side.waitFor({ timeout: 90_000 }).catch(async (e) => {
			await p.screenshot({ path: `${OUT}/${w}-failed.png` });
			throw e;
		});
		await p.waitForTimeout(6000);
		// the whole globe, the sites' list beside it
		await p.screenshot({ path: `${OUT}/${w}-globe.png` });
		await side.screenshot({ path: `${OUT}/${w}-sites.png` });
		// the best site: the planet flies there, its card opens
		const best = side.locator('ol.list button').first();
		if (await best.count()) {
			await best.click();
			await p.waitForTimeout(4000);
			await p.screenshot({ path: `${OUT}/${w}-site.png` });
			await side.screenshot({ path: `${OUT}/${w}-card.png` });
		}
		// the globe alone, then down to the cards to walk
		await p.getByRole('button', { name: 'Hide the sites' }).click();
		await p.waitForTimeout(500);
		const stage = p.locator('.stage canvas');
		const box = (await stage.boundingBox())!;
		await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		for (let k = 0; k < 40; k++) await p.mouse.wheel(0, -400);
		await p.waitForTimeout(5000);
		await p.keyboard.press('Escape');
		await p.screenshot({ path: `${OUT}/${w}-walk.png` });
		await ctx.close();
	}
	await browser.close();
	console.log(`shots in ${OUT}`);
} finally {
	preview?.kill();
	live?.stop(true);
	await sql.close();
	await root.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
	await root.close();
}

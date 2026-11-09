/**
 * Intent 67f0404a's c12: Sandbox 6 as its proposal would make it, shot to be looked at against the old village's plan.
 * This branch's API runs on a scratch database on avenBOX's Postgres (TEST_DATABASE_URL, dropped at the end), Sandbox
 * 6's layout holding the village and audit configs it proposes (play/api/import/sandboxes/sandbox-6); the built site is served by
 * `vite preview` (its /api proxied to the API at :3911) and shot as an admin: the plan of the whole village, its
 * numbers, its inputs, and the 3D village from above, at 1440×900 and 390×844. Nothing is written on play.
 *
 *   bun run build && bun scripts/sandbox-6-shots.ts [out dir]
 */
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { app } from '../../api/src/app';
import { createHuman, initSessions, tokenFor } from '../../api/src/auth';
import { folderStore } from '../../api/src/blobs';
import { seedSandboxLayouts } from '../../api/import/sandboxes';
import { Rate } from '../../api/src/limits';
import { migrate } from '../../api/src/migrations';
import { fromBunSql } from '../../api/src/pg';

const OUT = process.argv[2] ?? '../shots/67f0404a-sandbox-6';
const DB = process.env.TEST_DATABASE_URL;
if (!DB) throw new Error('TEST_DATABASE_URL is set in avenBOX');
const PORT = 4173, BASE = `http://localhost:${PORT}`;
mkdirSync(OUT, { recursive: true });

const name = `play_sandbox6_shots_${Date.now()}`;
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
	// the layout as the deploy's import makes it: its v1, the village and audit kept in play/api/import/sandboxes
	await seedSandboxLayouts(db);
	const api = app({ db, store: folderStore(mkdtempSync(join(tmpdir(), 'play-blobs-'))), rate: new Rate(0) });
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
		const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
		await ctx.addCookies([{ name: 'play_session', value: tokenFor(samuel.id), url: BASE }]);
		const p = await ctx.newPage();
		p.on('console', (m) => m.type() === 'error' && console.log('page:', m.text()));
		p.on('pageerror', (e) => console.log('page error:', e.message));
		await p.goto(`${BASE}/sandbox-6/`, { waitUntil: 'networkidle' });
		await p.waitForSelector('aside.side svg[aria-label]', { timeout: 60_000 }).catch(async (e) => {
			await p.screenshot({ path: `${OUT}/${size.width}-failed.png` });
			throw e;
		});
		await p.waitForTimeout(4000);
		const w = size.width;
		await p.screenshot({ path: `${OUT}/${w}-village.png` });
		await p.getByRole('complementary', { name: 'The village’s plan and numbers' }).locator('svg[aria-label]').screenshot({ path: `${OUT}/${w}-plan.png` });
		for (const tab of ['Numbers', 'Inputs']) {
			await p.getByRole('tab', { name: tab }).click();
			await p.getByRole('complementary', { name: 'The village’s plan and numbers' }).screenshot({ path: `${OUT}/${w}-${tab.toLowerCase()}.png` });
		}
		await p.getByRole('button', { name: 'Hide the plan' }).click();
		await p.waitForTimeout(1000);
		await p.screenshot({ path: `${OUT}/${w}-world.png` });
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

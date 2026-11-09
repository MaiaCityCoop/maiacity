/**
 * Intent 1b2ebc8d's c2: the dashboard at 390×844 and 1440×900 as an admin, acting as themselves (a Library tile among
 * their apps, "Your own files, private to you", and the page it opens: their personal library) and acting as Maia City
 * (the Library tile among the city's, as before). Seeded as 732d8a38's ./library-shots.ts is. This branch's own
 * API is run against a scratch database on avenBOX's Postgres (TEST_DATABASE_URL), dropped at the end: the coop's
 * library holds images copied from play.maia.city's Library (read with PLAY_MCP_TOKEN, the header sent to play only),
 * and the admin's personal one two stills of the Stand-in (89f3ad37's own shots) and a brief, added over MCP with
 * `library: "personal"` as an agent adds them. Nothing is written on play.
 *
 *   bun run dev &                                   # the dev server, http://localhost:5173 (/api → :3911)
 *   bun scripts/dashboard-library-shots.ts [out dir]
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { app } from '../../api/src/app';
import { createHuman, initSessions, tokenFor } from '../../api/src/auth';
import { folderStore } from '../../api/src/blobs';
import { Rate } from '../../api/src/limits';
import { prepare } from '../../api/src/seed';
import { fromBunSql } from '../../api/src/kit/pg';

const BASE = process.env.SITE ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? '../shots/1b2ebc8d-library-tile';
const PLAY = 'https://play.maia.city';
const TOKEN = process.env.PLAY_MCP_TOKEN;
const DB = process.env.TEST_DATABASE_URL;
if (!TOKEN || !DB) throw new Error('PLAY_MCP_TOKEN and TEST_DATABASE_URL are set in avenBOX');
const SIZES = [
	{ width: 390, height: 844 },
	{ width: 1440, height: 900 }
];

// a scratch database, this branch's API on it at :3911
const name = `play_dashboard_shots_${Date.now()}`;
const root = new Bun.SQL(DB);
await root.unsafe(`CREATE DATABASE ${name}`);
const u = new URL(DB);
u.pathname = `/${name}`;
const sql = new Bun.SQL(u.toString());
const db = fromBunSql(sql);
const server = { stop: () => {} };
try {
	await prepare(db);
	await initSessions(db);
	const api = app({ db, store: folderStore(mkdtempSync(join(tmpdir(), 'play-blobs-'))), rate: new Rate(0) });
	const samuel = await createHuman(db, 'Samuel');
	await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [samuel.id]);
	const cookie = `play_session=${tokenFor(samuel.id)}`;
	const token = (await (await api.fetch(new Request('http://play.test/api/tokens', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: '{"name":"shots"}' }))).json()).token;
	let n = 0;
	const tool = async (tool: string, args: Record<string, unknown>) => {
		const r = await api.fetch(
			new Request('http://play.test/api/mcp', {
				method: 'POST',
				headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
				body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method: 'tools/call', params: { name: tool, arguments: args } })
			})
		);
		const out = (await r.json()).result;
		if (out.isError) throw new Error(`${tool}: ${out.content[0].text}`);
		return JSON.parse(out.content[0].text);
	};

	// the coop's library: images of play.maia.city's own, oldest first so the newest stays first
	const page = await (await fetch(`${PLAY}/api/library?kind=image&limit=6`, { headers: { authorization: `Bearer ${TOKEN}` } })).json();
	for (const f of [...page.files].reverse()) {
		const bytes = Buffer.from(await (await fetch(`${PLAY}/api/files/${f.hash}`, { headers: { authorization: `Bearer ${TOKEN}` } })).arrayBuffer());
		if (bytes.length > 4_000_000) continue;
		await tool('add_story_frame', { data: bytes.toString('base64'), media_type: f.media_type, label: f.label ?? undefined });
	}
	// the admin's own: the Stand-in's stills and a brief, into their personal library
	for (const [file, label] of [
		['1440x900-admin-characters-stand-in.png', 'My character · the Stand-in, as play draws it'],
		['390x844-admin-characters-stand-in.png', 'My character · the Stand-in, on a phone']
	]) {
		const data = readFileSync(join(import.meta.dir, '../../shots/89f3ad37-characters', file)).toString('base64');
		await tool('add_story_frame', { data, media_type: 'image/png', label, library: 'personal' });
	}
	await tool('add_document', { text: '# My character\n\nThe brief my character sheet is made from: my face front and side, my clothes, my height.\n', label: 'My character · the brief', library: 'personal' });

	const live = Bun.serve({ port: 3911, fetch: (req) => api.fetch(req) });
	server.stop = () => live.stop(true);

	const browser = await chromium.launch();
	for (const size of SIZES) {
		const w = `${size.width}x${size.height}`;
		for (const [as, file] of [['me', 'yourself'], ['maia-city', 'maia-city']] as const) {
			const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2 });
			await ctx.addCookies([{ name: 'play_session', value: cookie.split('=')[1], url: BASE }]);
			await ctx.addInitScript((a) => localStorage.setItem('play.acting', a), as);
			const p = await ctx.newPage();
			await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
			// the section the Library tile is in: your apps, or the city's
			const section = as === 'me' ? 'Your apps' : 'Maia City';
			await p.evaluate((t) => [...document.querySelectorAll('p.divider')].find((x) => x.textContent?.trim() === t)?.scrollIntoView({ block: 'start' }), section);
			await p.waitForTimeout(1000);
			await p.screenshot({ path: `${OUT}/${w}-dashboard-${file}.png` });
			const tiles = p.locator('a.tile[href="/library/"]');
			console.log(`${w} acting as ${as}: ${await tiles.count()} Library tile: ${(await tiles.first().textContent())?.trim()}`);
			// the page it opens
			await tiles.first().click();
			await p.locator('.owner b', { hasText: as === 'me' ? "Samuel's library" : "Maia City's library" }).waitFor({ timeout: 30000 });
			await p.waitForTimeout(1500);
			await p.screenshot({ path: `${OUT}/${w}-library-${file}.png` });
			await ctx.close();
		}
	}
	await browser.close();
} finally {
	server.stop();
	await sql.close();
	await root.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
	await root.close();
}

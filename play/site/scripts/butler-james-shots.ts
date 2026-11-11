/**
 * Intent a6ae861e's c8: Butler James at 1440×900 and 390×844 as an admin, on a scratch play: this branch's own API on a
 * scratch database on avenBOX's Postgres (TEST_DATABASE_URL), served at :3911 for the dev server's /api, dropped at the
 * end. Its leads are made-up test firms on example.com's domains, added over MCP as one intent's work and accepted, one
 * of them changed after (its History two versions). Nothing is written on play.
 *
 *   bun run dev &                                   # the dev server, http://localhost:5173 (/api → :3911)
 *   bun scripts/butler-james-shots.ts [out dir]
 */
import { mkdirSync, mkdtempSync } from 'node:fs';
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
const OUT = process.argv[2] ?? '../shots/a6ae861e-butler-james';
const SIZES = [
	{ width: 1440, height: 900 },
	{ width: 390, height: 844 }
];
const LEADS = [
	{ company: 'Beispiel Immobilien (test)', contact: 'Erika Beispiel', email: 'info@beispiel.example', website: 'https://beispiel.example', city: 'München', region: 'Bayern', firm: 'family', source: 'cold', segment: 'Verkauf, Häuser und Wohnungen ab €500k', notes: 'A made-up test firm.' },
	{ company: 'Seeblick Makler (test)', website: 'https://seeblick.example', city: 'Starnberg', region: 'Bayern', firm: 'solo', source: 'form', segment: 'Verkauf, Villen am See' },
	{ company: 'Nordlicht Immobilien (test)', email: 'kontakt@nordlicht.example', website: 'https://nordlicht.example', city: 'Hamburg', region: 'Hamburg', firm: 'partners', source: 'cold' },
	{ company: 'Alte Mühle Immobilien (test)', email: 'post@alte-muehle.example', website: 'https://alte-muehle.example', city: 'Heidelberg', region: 'Baden-Württemberg', firm: 'traditional', source: 'referral', stage: 'meeting', next_step: 'Show the demo', next_date: '2100-01-12' },
	{ company: 'Rhein Wohnen (test)', website: 'https://rhein-wohnen.example', city: 'Düsseldorf', region: 'Nordrhein-Westfalen', firm: 'owner_run', source: 'cold', stage: 'lost', lost_reason: 'Rents only', do_not_contact: true },
	{ company: 'Elbufer Makler (test)', email: 'hallo@elbufer.example', website: 'https://elbufer.example', city: 'Dresden', region: 'Sachsen', firm: 'solo', source: 'cold' }
];

const DB = process.env.TEST_DATABASE_URL;
if (!DB) throw new Error('TEST_DATABASE_URL is set in avenBOX');
const name = `play_butler_shots_${Date.now()}`;
const root = new Bun.SQL(DB);
await root.unsafe(`CREATE DATABASE ${name}`);
const u = new URL(DB);
u.pathname = `/${name}`;
const sql = new Bun.SQL(u.toString());
const db = fromBunSql(sql);
let stop = () => {};
try {
	await prepare(db);
	await initSessions(db);
	const api = app({ db, store: folderStore(mkdtempSync(join(tmpdir(), 'play-blobs-'))), rate: new Rate(0) });
	const samuel = await createHuman(db, 'Samuel');
	await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [samuel.id]);
	const session = tokenFor(samuel.id);
	const cookie = `play_session=${session}`;
	const http = async (method: string, path: string, body?: unknown) =>
		(await api.fetch(new Request(`http://play.test${path}`, { method, headers: { cookie, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }))).json();
	const token = (await http('POST', '/api/tokens', { name: 'shots' })).token;
	let n = 0;
	const tool = async (t: string, args: Record<string, unknown>) => {
		const r = await api.fetch(
			new Request('http://play.test/api/mcp', {
				method: 'POST',
				headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
				body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method: 'tools/call', params: { name: t, arguments: args } })
			})
		);
		const out = (await r.json()).result;
		if (out.isError) throw new Error(`${t}: ${out.content[0].text}`);
		return JSON.parse(out.content[0].text);
	};
	/** an intent in Build, its one must passed: ready for work */
	const ready = async (title: string) => {
		const i = await tool('add_intent', { title });
		await tool('specify_intent', { intent: i.id, goal: 'The test leads are kept.', scope: 'Test leads.', nothing_to_reduce: 'test data', checks: [{ check: 'They are kept', how: 'test', by: 'exit 0', run: 'true' }] });
		await http('POST', `/api/intents/${i.id}/approve`);
		await tool('check_intent', { intent: i.id, results: [{ check: 'c1', pass: true, evidence: 'exit 0' }] });
		return i.id as string;
	};
	const keep = await ready('Test leads for the shots');
	const ids: string[] = [];
	for (const l of LEADS) ids.push((await tool('add_lead', { ...l, intent: keep })).id);
	await http('POST', `/api/intents/${keep}/accept`);
	const move = await ready('A test lead called');
	await tool('update_lead', { lead: ids[0], stage: 'contacted_call', next_step: 'Call back after the holidays', next_date: '2100-01-08', intent: move });
	await http('POST', `/api/intents/${move}/accept`);

	const live = Bun.serve({ port: 3911, fetch: (req) => api.fetch(req) });
	stop = () => live.stop(true);
	mkdirSync(OUT, { recursive: true });
	const browser = await chromium.launch();
	for (const size of SIZES) {
		const w = `${size.width}x${size.height}`;
		const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2 });
		await ctx.addCookies([{ name: 'play_session', value: session, url: BASE }]);
		const p = await ctx.newPage();
		await p.goto(`${BASE}/butler-james/`, { waitUntil: 'networkidle' });
		await p.locator('tbody tr').first().waitFor({ timeout: 30000 });
		await p.waitForTimeout(800);
		await p.screenshot({ path: `${OUT}/${w}-table.png` });
		// sorted by stage, filtered to Bayern
		await p.locator('th button', { hasText: 'Stage' }).click();
		await p.goto(`${BASE}/butler-james/?region=Bayern`, { waitUntil: 'networkidle' });
		await p.locator('tbody tr').first().waitFor();
		await p.screenshot({ path: `${OUT}/${w}-filtered.png` });
		// a lead opened: its Info, then its History
		await p.goto(`${BASE}/butler-james/?lead=${ids[0]}`, { waitUntil: 'networkidle' });
		if (size.width < 720) await p.locator('tbody tr').first().click();
		await p.waitForTimeout(1200);
		await p.screenshot({ path: `${OUT}/${w}-lead-info.png` });
		const hist = p.getByRole('tab', { name: 'History' }).or(p.locator('button', { hasText: 'History' })).first();
		if (await hist.count()) await hist.click();
		await p.waitForTimeout(1000);
		await p.screenshot({ path: `${OUT}/${w}-lead-history.png` });
		console.log(`${w}: ${await p.locator('tbody tr').count()} rows`);
		await ctx.close();
	}
	await browser.close();
} finally {
	stop();
	await sql.close();
	await root.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
	await root.close();
}

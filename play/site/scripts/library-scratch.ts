/**
 * The Library's shots' play (./library-shots.ts, ./dashboard-library-shots.ts): this branch's own API on a scratch
 * database on avenBOX's Postgres (TEST_DATABASE_URL), served at :3911 for the dev server's /api, dropped at the end.
 * The coop's library holds `images` of play.maia.city's Library (read with PLAY_MCP_TOKEN, the header sent to play
 * only), the admin's personal one two stills of the Stand-in (89f3ad37's own shots) and a brief, added over MCP with
 * `library: "personal"` as an agent adds them. Nothing is written on play.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { app } from '../../api/src/app';
import { createHuman, initSessions, tokenFor } from '../../api/src/auth';
import { folderStore } from '../../api/src/blobs';
import { Rate } from '../../api/src/limits';
import { prepare } from '../../api/src/seed';
import { fromBunSql } from '../../api/src/kit/pg';

const PLAY = 'https://play.maia.city';

/** `shoot` run with the admin's session cookie value while the scratch play is up; `name` names the scratch database */
export async function withLibrary(o: { name: string; images: number }, shoot: (session: string) => Promise<void>) {
	const TOKEN = process.env.PLAY_MCP_TOKEN;
	const DB = process.env.TEST_DATABASE_URL;
	if (!TOKEN || !DB) throw new Error('PLAY_MCP_TOKEN and TEST_DATABASE_URL are set in avenBOX');
	const name = `${o.name}_${Date.now()}`;
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
		const session = tokenFor(samuel.id);
		const cookie = `play_session=${session}`;
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

		// oldest first, so the newest stays first
		const page = await (await fetch(`${PLAY}/api/library?kind=image&limit=${o.images}`, { headers: { authorization: `Bearer ${TOKEN}` } })).json();
		for (const f of [...page.files].reverse()) {
			const bytes = Buffer.from(await (await fetch(`${PLAY}/api/files/${f.hash}`, { headers: { authorization: `Bearer ${TOKEN}` } })).arrayBuffer());
			if (bytes.length > 4_000_000) continue;
			await tool('add_story_frame', { data: bytes.toString('base64'), media_type: f.media_type, label: f.label ?? undefined });
		}
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
		await shoot(session);
	} finally {
		server.stop();
		await sql.close();
		await root.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
		await root.close();
	}
}

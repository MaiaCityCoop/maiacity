#!/usr/bin/env bun
/*
 * THE FLYOVERS ONTO PLAY — the shots flyover.mjs rendered, put on a story over play's MCP server (play/api/src/mcp.ts:
 * stateless JSON-RPC by POST), with the admin token in PLAY_MCP_TOKEN (sent to play.maia.city and nowhere else). It
 * reads and uploads; a story changes only by the proposal it files, which an admin accepts on the Proposals page.
 *
 *   bun scripts/flyover/play.mjs list                          the stories: id, title, versions, length, shots
 *   bun scripts/flyover/play.mjs show <story>                  its timeline track by track: sections, shots, voice lines
 *                                                               (to plan which shots the flyovers take), and story-<id>.json
 *   bun scripts/flyover/play.mjs upload <film dir>             every shot in <film dir>/shots.json: its video
 *                                                               (add_story_video) and its still (add_story_frame) →
 *                                                               <film dir>/play.json, each shot's two hashes
 *   bun scripts/flyover/play.mjs propose <story> <plan.json>   propose_story_version with the plan's { base, note, edits }
 *                                                               (its set_clip edits naming the hashes from play.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const MCP = 'https://play.maia.city/api/mcp';
let n = 0;
async function call(name, args) {
	if (!process.env.PLAY_MCP_TOKEN) throw new Error('PLAY_MCP_TOKEN: an admin access token (play_…, made on play\'s profile page)');
	const r = await fetch(MCP, {
		method: 'POST',
		headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}` },
		body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method: 'tools/call', params: { name, arguments: args } })
	});
	if (!r.ok) throw new Error(`${name}: HTTP ${r.status} ${await r.text()}`);
	const j = await r.json();
	if (j.error) throw new Error(`${name}: ${j.error.message}`);
	if (j.result.isError) throw new Error(`${name}: ${j.result.content[0].text}`);
	return j.result.structuredContent;
}

const [cmd, a, b] = process.argv.slice(2);
const s2 = (x) => (x == null ? '' : Number(x).toFixed(2));
if (cmd === 'list') {
	for (const s of (await call('list_stories', {})).items) console.log(JSON.stringify(s));
} else if (cmd === 'show') {
	const s = await call('get_story', { story: a });
	writeFileSync(`story-${a}.json`, JSON.stringify(s, null, 2));
	const body = s.body ?? s;
	console.log(`${s.title} · head ${s.version} · ${body.format} · ${body.fps} fps · ${s2(body.duration)} s`);
	for (const t of body.tracks) {
		console.log(`\n[${t.id}] ${t.kind}`);
		for (const c of t.clips) {
			const what =
				t.kind === 'shots' ? `${c.video ? `video ${c.video.slice(0, 10)}${c.video_in != null ? ` from ${c.video_in}` : ''}` : 'still'} · ${c.transition ?? ''}`
				: t.kind === 'voice' ? `${c.who ?? ''}: ${c.line ?? ''}`
				: t.kind === 'notes' ? `§ ${c.section ?? ''} · ${c.emotion ?? ''} · ${c.camera ?? ''} ${c.mood ?? ''}`
				: t.kind === 'story' ? `→ ${c.story} at ${c.version}`
				: `${c.audio ? `audio ${c.audio.slice(0, 10)}` : ''}`;
			console.log(`  ${String(c.id).padEnd(16)} ${s2(c.at).padStart(7)} +${s2(c.duration).padStart(6)}  ${what}`);
		}
	}
} else if (cmd === 'upload') {
	const film = JSON.parse(readFileSync(`${a}/shots.json`, 'utf8')), out = {};
	for (const s of film.shots) {
		const video = await call('add_story_video', { data: readFileSync(s.video).toString('base64'), media_type: 'video/mp4', label: `World map flyover · ${s.name} · ${s.size ?? ''} (seed ${film.seed}, City view)` });
		const frame = await call('add_story_frame', { data: readFileSync(s.frame).toString('base64'), media_type: 'image/jpeg', label: `World map flyover · ${s.name} (still)` });
		out[s.name] = { video: video.hash, frame: frame.hash, dur: s.dur, size: s.size, note: s.note };
		console.log(`${s.name}: video ${video.hash} · frame ${frame.hash}`);
	}
	writeFileSync(`${a}/play.json`, JSON.stringify(out, null, 2));
} else if (cmd === 'propose') {
	console.log(JSON.stringify(await call('propose_story_version', { story: a, ...JSON.parse(readFileSync(b, 'utf8')) }), null, 2));
} else console.log('list | show <story> | upload <film dir> | propose <story> <plan.json>  (see the top of scripts/flyover/play.mjs)');

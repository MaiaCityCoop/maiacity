#!/usr/bin/env node
/*
 * PROPOSE A READABLE SOURCE TO PLAY — a new asset, or a new version of one, sent from a file to play's MCP server as an
 * agent would (play/SPEC.md §4.1: readable source, never minified; play wraps it into the recipe file itself), after the
 * checks play would make and one it can't: that every build the source names by hash (a dome's plants, `hash: '…'` or
 * `use:<hash>`) is a recipe play's catalog holds. A source of 80 kB and more is best sent this way than pasted into a
 * tool call.
 *
 *   PLAY_MCP_TOKEN=play_… node scripts/propose.mjs --file <source.js> --group <group> --label "<label>" --note <note.md>
 *        [--slug <slug>] [--sheet <image hash>]                           a new asset (propose_asset)
 *   PLAY_MCP_TOKEN=play_… node scripts/propose.mjs --file <source.js> --asset <uuid> --base <version id> --note <note.md>
 *                                                                          its next version (propose_version)
 *        [--check] only check (the source, and every hash it names against the catalog), propose nothing
 *        [--pending <file>] hashes proposed with it and not accepted yet (a JSON list, or an object whose values have
 *                  a `hash`): named builds among them pass the check (they draw once an admin accepts them)
 *        [--url https://play.maia.city]
 *
 * The token is an admin's (made on play's profile page) and is read from the environment only. Nothing is accepted
 * here: the proposal comes to play's Proposals page, where an admin sees it built in the asset box and decides.
 */
import { readFileSync } from 'node:fs';
import { HEX } from '../src/lib/kernel/hash.js';

const arg = (name) => {
	const i = process.argv.indexOf(`--${name}`);
	return i > 0 ? process.argv[i + 1] : undefined;
};
const flag = (name) => process.argv.includes(`--${name}`);
const fail = (why) => {
	console.error(why);
	process.exit(1);
};

const file = arg('file');
if (!file) fail('Give --file <source.js> (see the top of scripts/propose.mjs).');
const source = readFileSync(file, 'utf8');
const url = (arg('url') ?? 'https://play.maia.city').replace(/\/$/, '');
const token = process.env.PLAY_MCP_TOKEN;
if (!token) fail('PLAY_MCP_TOKEN is not set: an admin token made on play\'s profile page.');
const headers = { Authorization: `Bearer ${token}` };

/* ---- what play checks of a source (play/api/src/proposals.ts), here first ---- */
const lines = source.split('\n');
const longest = Math.max(...lines.map((l) => l.length));
if (longest > 1000) fail(`refused: a line is ${longest} characters long (play takes at most 1000)`);
if (source.length > 4000 && source.length / lines.length > 120) fail('refused: its lines are too long on average (more than 120)');
if (!/module\.exports\.recipe\s*=|exports\.recipe\s*=/.test(source)) fail('refused: it sets no module.exports.recipe');
if (Buffer.byteLength(source) > 16 * 1024 * 1024) fail('refused: over 16 MB');
const libs = [...new Set([...source.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]))];
console.log(`${file}: ${(source.length / 1024).toFixed(0)} kB, ${lines.length} lines (longest ${longest}), requires ${libs.join(', ')}`);

const named = [...new Set([...source.matchAll(new RegExp(`(?:hash:\\s*'|use:)(${HEX})`, 'g'))].map((m) => m[1]))];
if (named.length) {
	const res = await fetch(`${url}/api/catalog`, { headers });
	if (!res.ok) fail(`play's catalog could not be read (HTTP ${res.status})`);
	const rows = await res.json();
	const byHash = new Map(rows.map((r) => [r.hash, r]));
	let missing = 0;
	const pendingFile = arg('pending');
	const pending = new Set();
	if (pendingFile) {
		const p = JSON.parse(readFileSync(pendingFile, 'utf8'));
		for (const x of Array.isArray(p) ? p : Object.values(p)) pending.add(typeof x === 'string' ? x : x.hash);
	}
	for (const h of named) {
		const r = byHash.get(h);
		if (!r && pending.has(h)) {
			console.log(`  pending ${h.slice(0, 12)}… (proposed with it, not accepted yet)`);
			continue;
		}
		if (!r) {
			missing++;
			console.log(`  MISSING ${h}: no recipe of play's catalog`);
			continue;
		}
		const newest = rows.filter((x) => x.asset === r.asset && (x.variant ?? null) === (r.variant ?? null)).sort((a, b) => b.v - a.v)[0];
		console.log(`  ok ${h.slice(0, 12)}… ${r.group}/${r.id ?? r.slug} v${r.v}${r.variant ? `:${r.variant}` : ''} · ${r.label}${newest && newest.v > r.v ? ` (newest is v${newest.v}: ${newest.hash})` : ''}`);
	}
	if (missing) fail(`${missing} of the ${named.length} builds it names are not in play's catalog: not proposed`);
	console.log(`all ${named.length} builds it names are in play's catalog`);
}
if (flag('check')) process.exit(0);

const noteFile = arg('note');
if (!noteFile) fail('Give --note <note.md>: what it is, what changed, how it was checked.');
const note = readFileSync(noteFile, 'utf8').trim();
const asset = arg('asset');
const tool = asset ? 'propose_version' : 'propose_asset';
const args = asset
	? { asset, base: arg('base'), source, note, ...(arg('sheet') ? { sheet: arg('sheet') } : {}) }
	: { group: arg('group'), label: arg('label'), ...(arg('slug') ? { slug: arg('slug') } : {}), source, note, ...(arg('sheet') ? { sheet: arg('sheet') } : {}) };
if (asset && !args.base) fail('Give --base <version id>: the head the new version is made on (get_asset).');
if (!asset && (!args.group || !args.label)) fail('Give --group and --label for a new asset.');
const res = await fetch(`${url}/api/mcp`, {
	method: 'POST',
	headers: { ...headers, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
	body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool, arguments: args } })
});
const text = await res.text();
let out;
try {
	out = JSON.parse(text.startsWith('event:') || text.startsWith('data:') ? text.split('\n').find((l) => l.startsWith('data:')).slice(5) : text);
} catch {
	fail(`play answered HTTP ${res.status}: ${text.slice(0, 500)}`);
}
if (out.error || out.result?.isError) fail(`not proposed: ${JSON.stringify(out.error ?? out.result).slice(0, 2000)}`);
console.log(JSON.stringify(out.result.structuredContent ?? out.result.content?.[0]?.text, null, 2));

// keep a piece or an asset's source on play as an edit of this intent's variant: node draft.mjs piece <name> "<label>" "<note>" "<message>"
//   node draft.mjs asset <asset uuid> <file> "<message>"
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const [what, name, a, b, c] = process.argv.slice(2);
const docs = existsSync('pieces/out/docs.json') ? JSON.parse(readFileSync('pieces/out/docs.json')) : {};
let args;
if (what === 'piece') {
	const source = readFileSync(`pieces/out/${name}.js`, 'utf8');
	const whole = { schema: 'piece/1', label: a, note: b, source };
	args = docs[name] ? { intent: '99b612ec-afa2-4dad-820b-cd2e0aff6bf5', doc: docs[name].doc, variant: docs[name].variant, message: c, whole } : { intent: '99b612ec-afa2-4dad-820b-cd2e0aff6bf5', kind: 'piece', message: c, whole };
} else {
	const source = readFileSync(a, 'utf8');
	const key = `asset:${name}`;
	args = { intent: '99b612ec-afa2-4dad-820b-cd2e0aff6bf5', doc: name, message: b, edits: [{ op: 'set', path: ['source'], value: source }], ...(docs[key] ? { variant: docs[key].variant } : {}) };
	if (c) args.edits.push(...JSON.parse(c));
}
const res = await fetch('https://play.maia.city/api/mcp', { method: 'POST', headers: { Authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'doc_edit', arguments: args } }) });
const text = await res.text();
const j = JSON.parse(text.startsWith('event:') || text.startsWith('data:') ? text.split('\n').find((l) => l.startsWith('data:')).slice(5) : text);
const r = j.error ?? j.result?.structuredContent ?? j.result?.content?.[0]?.text;
if (!j.error && !j.result?.isError && r?.doc) { docs[what === 'piece' ? name : `asset:${name}`] = { doc: r.doc, variant: r.variant }; writeFileSync('pieces/out/docs.json', JSON.stringify(docs, null, 1)); }
console.log(name, j.error || j.result?.isError ? 'REFUSED' : 'ok', (typeof r === 'string' ? r : JSON.stringify(r)).slice(0, 400));

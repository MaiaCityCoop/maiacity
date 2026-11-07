// propose one piece (a new document of kind 'piece') for the intent: node propose-piece.mjs <name> "<label>" "<note>"
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const [name, label, note] = process.argv.slice(2);
const source = readFileSync(`pieces/out/${name}.js`, 'utf8');
const args = { intent: '99b612ec-afa2-4dad-820b-cd2e0aff6bf5', kind: 'piece', whole: { schema: 'piece/1', label, note, source }, note: `${label}: ${note}` };
const res = await fetch('https://play.maia.city/api/mcp', { method: 'POST', headers: { Authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'propose_doc_version', arguments: args } }) });
const text = await res.text();
const j = JSON.parse(text.startsWith('event:') || text.startsWith('data:') ? text.split('\n').find((l) => l.startsWith('data:')).slice(5) : text);
const r = j.error ?? j.result?.structuredContent ?? j.result?.content?.[0]?.text;
const out = typeof r === 'string' ? r : JSON.stringify(r);
const docs = existsSync('pieces/out/docs.json') ? JSON.parse(readFileSync('pieces/out/docs.json')) : {};
if (!j.result?.isError && !j.error) { docs[name] = r; writeFileSync('pieces/out/docs.json', JSON.stringify(docs, null, 1)); }
console.log(name, j.result?.isError || j.error ? 'REFUSED' : 'ok', out.slice(0, 600));

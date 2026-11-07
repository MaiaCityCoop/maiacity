// propose one drafted document's variant for the intent: node propose.mjs <key in docs.json> "<note>"
import { readFileSync } from 'node:fs';
const [key, note] = process.argv.slice(2);
const d = JSON.parse(readFileSync('pieces/out/docs.json'))[key];
const args = { intent: '99b612ec-afa2-4dad-820b-cd2e0aff6bf5', doc: d.doc, variant: d.variant, note };
const res = await fetch('https://play.maia.city/api/mcp', { method: 'POST', headers: { Authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'propose_doc_version', arguments: args } }) });
const text = await res.text();
const j = JSON.parse(text.startsWith('event:') || text.startsWith('data:') ? text.split('\n').find((l) => l.startsWith('data:')).slice(5) : text);
const r = j.error ?? j.result?.structuredContent ?? j.result?.content?.[0]?.text;
console.log(key, j.error || j.result?.isError ? 'REFUSED' : 'ok', (typeof r === 'string' ? r : JSON.stringify(r)).slice(0, 700));
if (j.error || j.result?.isError) process.exit(1);

// node mcp.mjs <tool> '<json args>' [outfile]  — calls play's MCP tool, prints/writes the text result
import { writeFileSync } from 'node:fs';
const [tool, a0, out] = process.argv.slice(2); const a = a0?.startsWith('@') ? (await import('node:fs')).readFileSync(a0.slice(1), 'utf8') : a0;
const res = await fetch('https://play.maia.city/api/mcp', { method: 'POST',
  headers: { Authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool, arguments: JSON.parse(a || '{}') } }) });
let t = await res.text();
if (t.startsWith('event:') || t.includes('\ndata:')) t = t.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5)).join('');
const j = JSON.parse(t);
if (j.error) { console.error(JSON.stringify(j.error)); process.exit(1); }
const txt = j.result.content.map(c => c.text).join('');
if (j.result.isError) { console.error(txt); process.exit(1); }
if (out) writeFileSync(out, txt); else console.log(txt);

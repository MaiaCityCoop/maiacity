// call a play MCP tool: node mcp.mjs <tool> '<json args>' [out.json]
import { writeFileSync } from 'node:fs';
const [tool, a = '{}', out] = process.argv.slice(2);
const res = await fetch('https://play.maia.city/api/mcp', { method: 'POST', headers: { Authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool, arguments: JSON.parse(a) } }) });
const text = await res.text();
const j = JSON.parse(text.startsWith('event:') || text.startsWith('data:') ? text.split('\n').find((l) => l.startsWith('data:')).slice(5) : text);
const r = j.error ?? j.result?.structuredContent ?? j.result?.content?.[0]?.text;
const s = typeof r === 'string' ? r : JSON.stringify(r, null, 1);
if (out) { writeFileSync(out, s); console.log(`${out}: ${s.length} chars${j.result?.isError ? ' ERROR' : ''}`); } else console.log(s);

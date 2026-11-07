// propose the Fiat's source to play over MCP, naming its intent, params and sheet: node tools/propose.mjs
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../source/fiat500.js', import.meta.url), 'utf8');
const note = readFileSync(new URL('../note.md', import.meta.url), 'utf8').trim();
const args = {
	group: 'machines', label: 'Fiat 500 F', slug: 'fiat500', source, note,
	intent: 'b9b38999-2d57-4be9-b864-df7af14aa5b8',
	sheet: 'fda28639be522b6601a7b84076cf07817ea8678ed022de1eb52ce070b469338a',
	params: [
		{ id: 'doors', label: 'Doors open', type: 'number', value: 0, min: 0, max: 1, step: 0.05 },
		{ id: 'roof', label: 'Rolltop folded back', type: 'number', value: 0, min: 0, max: 1, step: 0.05 },
		{ id: 'lid', label: 'Engine lid up', type: 'number', value: 0, min: 0, max: 1, step: 0.05 }
	]
};
const res = await fetch('https://play.maia.city/api/mcp', {
	method: 'POST',
	headers: { Authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
	body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'propose_asset', arguments: args } })
});
const text = await res.text();
const line = text.split('\n').find((l) => l.startsWith('data:'));
const out = JSON.parse(line ? line.slice(5) : text);
console.log(JSON.stringify(out.error ?? out.result?.structuredContent ?? out.result?.content?.[0]?.text ?? out, null, 1).slice(0, 3000));

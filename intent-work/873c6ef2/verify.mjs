import { readFileSync } from 'node:fs'; import { execFileSync } from 'node:child_process'; import { h } from './extract.mjs';
const ID = Object.fromEntries(readFileSync('ids.txt', 'utf8').trim().split('\n').map((l) => l.split(' ')));
for (const [n, id] of Object.entries(ID)) {
  const j = JSON.parse(execFileSync('node', ['mcp.mjs', 'doc_at', JSON.stringify({ doc: id, intent: '873c6ef2-2bbe-49a3-9470-705cf1702b58' })], { encoding: 'utf8', maxBuffer: 1 << 26 }));
  const mine = h(readFileSync(`out/hosts/${n}.js`, 'utf8'));
  console.log(n.padEnd(12), h(j.json.source) === mine ? 'MATCH' : 'DIFF', j.json.source.length, mine.slice(0, 12), /piece:[0-9a-f-]{36}/.test(j.json.note) ? 'note-ok' : 'note?');
}

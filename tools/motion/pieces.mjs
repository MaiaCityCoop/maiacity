// The mirror's hashes: each asset made to name the clip pieces as they are now, and proposed.json written, the BLAKE3
// hash of every file here (what this intent proposes to play), for check.ts to hold the files to.
//   node tools/motion/pieces.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { hash } from './box.mjs';
const HERE = new URL('.', import.meta.url).pathname;
const was = JSON.parse(readFileSync(`${HERE}proposed.json`, 'utf8').toString() || '{}');
const now = {};
for (const f of readdirSync(`${HERE}pieces`)) now[`pieces/${f}`] = hash(readFileSync(`${HERE}pieces/${f}`, 'utf8'));
for (const f of readdirSync(`${HERE}assets`)) {
	let text = readFileSync(`${HERE}assets/${f}`, 'utf8');
	for (const [k, h] of Object.entries(was.files ?? {})) if (k.startsWith('pieces/') && now[k] && h !== now[k]) text = text.split(h).join(now[k]);
	writeFileSync(`${HERE}assets/${f}`, text);
	now[`assets/${f}`] = hash(text);
}
writeFileSync(`${HERE}proposed.json`, JSON.stringify({ intent: 'b9e6ad45-3aa1-40d5-b11a-08101e4db9ea', files: now }, null, 1) + '\n');
for (const [k, h] of Object.entries(now)) console.log(k.padEnd(26), h, (was.files?.[k] ?? '') === h ? '' : '(new)');

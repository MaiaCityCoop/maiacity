import { piece, run } from './box.mjs';
import { readFileSync } from 'node:fs';
const { motionOf } = await import('/home/user/maiacity/play/site/src/lib/content/assets/box/clips.js');
const H = JSON.parse(readFileSync('pieces/out/hashes.json'));
for (const n of Object.keys(H)) piece(`pieces/out/${n}.js`);
const code = readFileSync(process.argv[2], 'utf8').replace(/require\('@piece:([a-z-]+)'\)/g, (_, n) => `require('${H[n]}')`);
const R = run(code).recipe('x', 12, null);
const cast = R.build(...JSON.parse(process.argv[3] ?? '[]'));
let calls = 0; for (const k of Object.keys(cast.clips)) { const f = cast.clips[k]; cast.clips[k] = (t, m) => (calls++, f(t, m)); }
const t0 = performance.now();
const m = motionOf(cast, 1);
const ms = performance.now() - t0;
let numbers = 0;
for (const [n, c] of Object.entries(m.clips)) { const k = c.base.length + c.t.reduce((a, T) => a + T.table.length, 0) + (c.d?.table.length ?? 0) + (c.turn?.length ?? 0); numbers += k; console.log(n.padEnd(10), 'channels', c.channels.length, c.gear ? `gait gear ${c.gear} paces ${c.paces.map((p) => p.toFixed(2)).join(' ')} stride ${c.stride?.toFixed(3)}` : '', 'numbers', k); }
console.log('baked in', Math.round(ms), 'ms,', calls, 'calls,', numbers, 'numbers');

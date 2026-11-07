// build an asset source as the box would and play its clips: node t-asset.mjs assets/stand-in.js [values json]
import { piece, run, THREE } from './box.mjs';
import { readFileSync } from 'node:fs';
const H = JSON.parse(readFileSync('pieces/out/hashes.json'));
for (const n of Object.keys(H)) piece(`pieces/out/${n}.js`);
const code = readFileSync(process.argv[2], 'utf8').replace(/require\('@piece:([a-z-]+)'\)/g, (_, n) => `require('${H[n]}')`);
export const R = run(code, process.argv[2]).recipe('x', 12, null);
const t0 = performance.now();
const vals = JSON.parse(process.argv[3] ?? '[]');
const cast = R.build(...vals);
console.log('build', Math.round(performance.now() - t0), 'ms', Object.keys(cast.clips).join(', '));
const t1 = performance.now();
let calls = 0;
for (const [name, clip] of Object.entries(cast.clips)) {
	for (let k = 0; k < 200; k++) { const p = clip(k * 0.05, { dist: k * 0.07, speed: 1.4, turn: 0 }); calls++; for (const v of Object.values(p)) for (const x of v) if (!Number.isFinite(x)) throw new Error(`${name}: NaN`); }
}
console.log(calls, 'calls in', Math.round(performance.now() - t1), 'ms', ((performance.now() - t1) / calls * 1000).toFixed(0), 'µs a call');

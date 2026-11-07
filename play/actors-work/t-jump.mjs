import { piece, run } from './box.mjs';
import { readFileSync } from 'node:fs';
const H = JSON.parse(readFileSync('pieces/out/hashes.json'));
for (const n of Object.keys(H)) piece(`pieces/out/${n}.js`);
const code = readFileSync('assets/stand-in.js', 'utf8').replace(/require\('@piece:([a-z-]+)'\)/g, (_, n) => `require('${H[n]}')`);
const cast = run(code).recipe('x', 12, null).build();
const [a, b] = process.argv.slice(2).map(Number);
for (let d = a; d <= b; d += (b - a) / 12) { const p = cast.clips.walk(0, { dist: d, speed: 1.4 }); console.log(d.toFixed(4), 'rLow', p.rightLowerLeg.map((x) => x.toFixed(3)).join(','), 'rUp', p.rightUpperLeg.map((x) => x.toFixed(3)).join(','), 'root', p.root.map((x) => x.toFixed(3)).join(',')); }

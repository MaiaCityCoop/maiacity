import { piece, run } from './box.mjs';
import { readFileSync } from 'node:fs';
const H = JSON.parse(readFileSync('pieces/out/hashes.json'));
for (const n of Object.keys(H)) piece(`pieces/out/${n}.js`);
const code = readFileSync('assets/stand-in.js', 'utf8').replace(/require\('@piece:([a-z-]+)'\)/g, (_, n) => `require('${H[n]}')`);
const cast = run(code).recipe('x', 12, null).build();
const L = 1.5 * 1.7 / 1.7978;
const walk = cast.clips.walk;
let worst = [0];
for (let d = 0; d < L; d += L / 97) {
	const a = walk(0, { dist: d, speed: 1.4 }), b = walk(0, { dist: d + L, speed: 1.4 });
	for (const k of Object.keys(a)) for (let c = 0; c < a[k].length; c++) { const x = Math.abs(a[k][c] - b[k][c]) % (2 * Math.PI); const dd = Math.min(x, 2 * Math.PI - x); if (dd > worst[0]) worst = [dd, k, c, d.toFixed(3)]; }
}
console.log('worst difference a stride apart', worst);
// continuity: the biggest jump between neighbouring samples
let jump = [0];
let prev = walk(0, { dist: 0, speed: 1.4 });
for (let d = L / 400; d < 2 * L; d += L / 400) { const p = walk(0, { dist: d, speed: 1.4 }); for (const k of Object.keys(p)) for (let c = 0; c < p[k].length; c++) { const x = Math.abs(p[k][c] - (prev[k]?.[c] ?? 0)) % (2 * Math.PI); const dd = Math.min(x, 2 * Math.PI - x); if (dd > jump[0]) jump = [dd, k, c, d.toFixed(3)]; } prev = p; }
console.log('biggest jump between samples L/400 apart', jump);
for (const d of [L - 0.01, L - 0.001, L - 1e-6, L, L + 1e-6, L + 0.001, L + 0.01, 0, 0.001]) { const p = walk(0, { dist: d, speed: 1.4 }); console.log(d.toFixed(6), 'rFoot', p.rightFoot.map((x) => x.toFixed(3)).join(' '), 'rLow', p.rightLowerLeg.map((x) => x.toFixed(3)).join(' '), 'rUp', p.rightUpperLeg.map((x) => x.toFixed(3)).join(' ')); }

import { piece, run } from './box.mjs';
import { readFileSync } from 'node:fs';
const H = JSON.parse(readFileSync('pieces/out/hashes.json'));
for (const n of Object.keys(H)) piece(`pieces/out/${n}.js`);
const P = run(`module.exports = require('${H.person}')`);
const t0 = performance.now();
const p = P.person({}, 1.7);
const g = p.rig.object.geometry;
console.log('built in', Math.round(performance.now() - t0), 'ms;', g.attributes.position.count, 'vertices,', g.index.count / 3, 'triangles;', p.rig.names.length, 'bones;', Object.keys(p.poses).join(', '));
g.computeBoundingBox(); console.log('size', g.boundingBox.min.toArray().map((x) => x.toFixed(3)), g.boundingBox.max.toArray().map((x) => x.toFixed(3)));
// every vertex's weights sum to 1 and name real bones
const sw = g.attributes.skinWeight, si = g.attributes.skinIndex; let bad = 0; const used = new Set();
for (let i = 0; i < sw.count; i++) { let s = 0; for (let c = 0; c < 4; c++) { s += sw.getComponent(i, c); if (sw.getComponent(i, c) > 0) used.add(si.getComponent(i, c)); } if (Math.abs(s - 1) > 1e-3) bad++; }
console.log('weights off', bad, '; bones carrying skin', used.size, 'of', p.rig.names.length, ':', p.rig.names.filter((n, i) => !used.has(i)).join(' '));

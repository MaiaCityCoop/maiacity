// node count.cjs <source.js> <id> <v> [stages] [seeds] [details] [variant]: triangles as card.js trianglesOf counts
const Module = require('module'); const path = require('path');
const SITE = '/home/user/maiacity/play/site';
const orig = Module._resolveFilename;
Module._resolveFilename = function (req, ...a) {
  if (req === 'three') return orig.call(this, path.join(SITE, 'node_modules/three/build/three.cjs'), ...a);
  if (req.startsWith('three/addons/')) return orig.call(this, path.join(SITE, 'node_modules/three/examples/jsm', req.slice(13)), ...a);
  return orig.call(this, req, ...a);
};
process.removeAllListeners('warning');
const [file, id, v, st, se, de, variant] = process.argv.slice(2);
const r = require(path.resolve(file)).recipe(id, Number(v), variant || undefined);
const sp = r.meta.params.find((p) => p.id === 'stage');
const stages = st ? st.split(',').map(Number) : sp.names.map((_, i) => i);
const seeds = (se || 'maia').split(','); const details = (de || '1').split(',').map(Number);
const tris = (o) => { let n = 0; o.traverse((m) => { if (!m.isMesh || !m.geometry) return; const g = m.geometry; const c = g.index ? g.index.count : g.attributes.position.count; n += c / 3 * (m.isInstancedMesh ? m.count : 1); }); return Math.round(n); };
let max = 0;
for (const d of details) for (const s of seeds) { const row = []; for (const stage of stages) { const t0 = performance.now(); const vals = { ...Object.fromEntries(r.meta.params.map((p) => [p.id, p.default])), stage, seed: s, detail: d }; const o = r.build.length >= 3 ? r.build(stage, s, d, 0, variant || undefined) : r.build(vals); const t = tris(o); max = Math.max(max, t); row.push(`${stage}:${t.toLocaleString('en-US')}(${((performance.now()-t0)/1000).toFixed(1)}s)`); } console.log(`detail ${d} seed ${s}: ${row.join(' ')}`); }
console.log('max', max.toLocaleString('en-US'));

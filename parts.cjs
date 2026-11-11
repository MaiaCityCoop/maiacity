const Module = require('module'); const path = require('path');
const SITE = '/home/user/maiacity/play/site'; const orig = Module._resolveFilename;
Module._resolveFilename = function (req, ...a) { if (req === 'three') return orig.call(this, path.join(SITE, 'node_modules/three/build/three.cjs'), ...a); if (req.startsWith('three/addons/')) return orig.call(this, path.join(SITE, 'node_modules/three/examples/jsm', req.slice(13)), ...a); return orig.call(this, req, ...a); };
process.removeAllListeners('warning');
const [file, id, v, stage, detail, variant] = process.argv.slice(2);
const r = require(path.resolve(file)).recipe(id, Number(v), variant || undefined);
const o = r.build(Number(stage), 'maia', Number(detail || 1), 0, variant || undefined);
const by = {}; o.traverse((m) => { if (!m.isMesh) return; const g = m.geometry; const c = g.index ? g.index.count : g.attributes.position.count; const k = (m.name || '?') + '/' + (Array.isArray(m.material) ? 'multi' : m.material.name || m.material.type); by[k] = (by[k] || 0) + Math.round(c / 3 * (m.isInstancedMesh ? m.count : 1)); });
console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}: ${n.toLocaleString('en-US')}`).join('\n'));

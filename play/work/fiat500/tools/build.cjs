// build a readable machine source headlessly (Bun): its outer box, wheels, parts and triangles
// bun play/work/fiat500/tools/build.cjs <source.js> [id] [json-values]
const path = require('path');
const Module = require('module');
const site = path.resolve(__dirname, '../../../site');
const req = Module.createRequire(path.join(site, 'x.js'));
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === 'getImageData' || k === 'createImageData' ? (x, y, w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4) }) : k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : () => {}), set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = globalThis.document || { createElement: () => ({ getContext: () => ctx, width: 0, height: 0, style: {} }) };
const THREE = req('three');
const src = require('fs').readFileSync(process.argv[2], 'utf8');
const m = { exports: {} };
new Function('module', 'exports', 'require', src)(m, m.exports, (n) => req(n));
const id = process.argv[3] || 'fiat500';
const values = process.argv[4] ? JSON.parse(process.argv[4]) : {};
const t0 = performance.now();
const r = m.exports.recipe(id, 1);
let obj = r.build(values);
const ms = performance.now() - t0;
const root = (obj.rig && obj.rig.object) || obj.root || obj;
const o = root.isObject3D ? root : obj;
o.updateMatrixWorld(true);
const box = new THREE.Box3();
let tris = 0, meshes = 0;
o.traverse((x) => { if (x.isMesh && x.visible !== false) { meshes++; const g = x.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; box.expandByObject(x); } });
const s = box.getSize(new THREE.Vector3());
console.log(JSON.stringify({ label: r.meta && r.meta.label, ms: Math.round(ms), meshes, tris: Math.round(tris), min: box.min.toArray().map((v) => +v.toFixed(4)), max: box.max.toArray().map((v) => +v.toFixed(4)), size: s.toArray().map((v) => +v.toFixed(4)) }));
module.exports = { o, THREE };
// with DUMP=<file>: every visible mesh's triangles in the root's frame, float32 x y z × 3 per triangle
if (process.env.DUMP) {
	const out = [];
	const v = new THREE.Vector3();
	o.traverse((x) => {
		if (!x.isMesh) return;
		let vis = true;
		for (let p = x; p; p = p.parent) if (p.visible === false) vis = false;
		if (!vis) return;
		const g = x.geometry, P = g.attributes.position, I = g.index;
		const n = I ? I.count : P.count;
		for (let i = 0; i < n; i++) {
			v.fromBufferAttribute(P, I ? I.getX(i) : i).applyMatrix4(x.matrixWorld);
			out.push(v.x, v.y, v.z);
		}
	});
	require('fs').writeFileSync(process.env.DUMP, Buffer.from(new Float32Array(out).buffer));
	console.log(`dumped ${out.length / 9} triangles to ${process.env.DUMP}`);
}

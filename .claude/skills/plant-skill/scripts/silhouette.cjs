#!/usr/bin/env node
/*
 * A WHOLE PLANT'S SILHOUETTE — for laying a grown tree on its row-1 panel of the reference sheet, where the organ bench
 * cannot: organ.mjs sends every mesh's arrays to a page, and a tree of hundreds of thousands of triangles is more than
 * the page holds (sapodilla v2's crashed it). This rasterises the triangles here, in node, from straight in front
 * (orthographic, from +Z), leaving out everything under the soil, and writes the silhouette as a picture with an alpha
 * that compare.py reads like the bench's (use its --close for a crown's envelope).
 *
 *   node .claude/skills/plant-skill/scripts/silhouette.cjs --file <source.js> --make "(o, THREE) => …" \
 *        [--ppm 150] [--out tree.png]
 *
 *   --make   a function of (organs, THREE) giving an Object3D, as organ.mjs's: e.g.
 *            "(o) => o.lite({ roots: false }, () => o.grow(10, 'maia'))"
 * Needs the play site's packages (three).
 */
const Module = require('module');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');

const SITE = path.resolve(process.env.PLAY_SITE ?? path.join(__dirname, '../../../../play/site'));
const arg = (k, d) => {
	const i = process.argv.indexOf(`--${k}`);
	return i > 0 ? process.argv[i + 1] : d;
};
const original = Module._resolveFilename;
Module._resolveFilename = function (req, ...a) {
	if (req === 'three') return original.call(this, path.join(SITE, 'node_modules/three/build/three.cjs'), ...a);
	if (req.startsWith('three/addons/')) return original.call(this, path.join(SITE, 'node_modules/three/examples/jsm', req.slice(13)), ...a);
	return original.call(this, req, ...a);
};
process.removeAllListeners('warning');
const THREE = require(path.join(SITE, 'node_modules/three/build/three.cjs'));
const recipe = require(path.resolve(arg('file')));
const make = eval(arg('make'));
const ppm = Number(arg('ppm', '150'));
const out = path.resolve(arg('out', 'silhouette.png'));

const obj = make(recipe.organs, THREE);
obj.updateMatrixWorld(true);
const v = new THREE.Vector3();
let minx = Infinity, maxx = -Infinity, maxy = -Infinity;
obj.traverse((m) => {
	if (!m.isMesh) return;
	const p = m.geometry.attributes.position;
	for (let i = 0; i < p.count; i++) {
		v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
		if (v.y < 0) continue;
		minx = Math.min(minx, v.x);
		maxx = Math.max(maxx, v.x);
		maxy = Math.max(maxy, v.y);
	}
});
const W = Math.ceil((maxx - minx) * ppm) + 4, H = Math.ceil(maxy * ppm) + 4;
const mask = new Uint8Array(W * H);
const X = (x) => (x - minx) * ppm + 2, Y = (y) => (maxy - y) * ppm + 2;
function tri(ax, ay, bx, by, cx, cy) {
	const d = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
	if (Math.abs(d) < 1e-9) return;
	const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
	const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
	for (let y = y0; y <= y1; y++)
		for (let x = x0; x <= x1; x++) {
			const px = x + 0.5, py = y + 0.5;
			const w1 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / d;
			const w2 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / d;
			if (w1 >= -0.02 && w2 >= -0.02 && w1 + w2 <= 1.02) mask[y * W + x] = 255;
		}
}
const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
obj.traverse((m) => {
	if (!m.isMesh) return;
	const p = m.geometry.attributes.position;
	const ix = m.geometry.index ? m.geometry.index.array : [...Array(p.count).keys()];
	for (let k = 0; k < ix.length; k += 3) {
		a.fromBufferAttribute(p, ix[k]).applyMatrix4(m.matrixWorld);
		b.fromBufferAttribute(p, ix[k + 1]).applyMatrix4(m.matrixWorld);
		c.fromBufferAttribute(p, ix[k + 2]).applyMatrix4(m.matrixWorld);
		if (a.y < 0 && b.y < 0 && c.y < 0) continue;
		tri(X(a.x), Y(a.y), X(b.x), Y(b.y), X(c.x), Y(c.y));
	}
});
const raw = `${out}.raw`;
fs.writeFileSync(raw, mask);
cp.execFileSync('python3', ['-I', '-c', `import numpy as np;from PIL import Image;m=np.fromfile(${JSON.stringify(raw)},dtype=np.uint8).reshape(${H},${W});a=np.zeros((${H},${W},4),np.uint8);a[...,1]=90;a[...,3]=m;Image.fromarray(a).save(${JSON.stringify(out)})`]);
fs.unlinkSync(raw);
console.log(`${out}  ${W}×${H} px at ${ppm} px/m  (${(maxx - minx).toFixed(2)} × ${maxy.toFixed(2)} m above the soil)`);

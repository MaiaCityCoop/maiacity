#!/usr/bin/env node
/*
 * THE ORGAN BENCH — one organ of a plant recipe drawn on its own as the reference sheet shows it: straight on with an
 * orthographic camera, in even shadowless light, on a transparent ground (its silhouette exact in the alpha), at a
 * known scale, so it can be laid beside its panel and measured (compare.py).
 *
 *   node tools/plant/organ.mjs --file banana-v2.js --make "o => o.bellView()" \
 *        --view front|side|top|bottom [--ppm 2000] [--flat] [--out bell.png]
 *
 *   --file   the recipe's readable source (module.exports.organs is what --make gets)
 *   --make   a function of (organs, THREE) giving an Object3D: the organ to draw
 *   --view   where the camera looks from: front (from +Z), side (from +X), top (from +Y), bottom
 *   --ppm    pixels per metre (the picture is sized to the organ)
 *   --flat   draw its colours as they are (unlit: albedo × its colour pictures), for comparing colours with the
 *            traced panel; without it, lit as a light box lights (a soft key from the camera, much fill)
 * Needs the play site's packages (three) and Playwright with its Chromium.
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { SITE } from '../site.cjs';
const arg = (k, d) => {
	const i = process.argv.indexOf(`--${k}`);
	return i > 0 ? process.argv[i + 1] : d;
};
const file = resolve(arg('file'));
const view = arg('view', 'front');
const ppm = Number(arg('ppm', '2000'));
const flat = process.argv.includes('--flat');
const out = resolve(arg('out', 'organ.png'));

// the recipe in node, its 'three' from the site
const require = createRequire(import.meta.url);
const Module = require('module');
const three = resolve(SITE, 'node_modules/three/build/three.cjs');
const original = Module._resolveFilename;
Module._resolveFilename = function (req, ...a) {
	if (req === 'three') return original.call(this, three, ...a);
	if (req.startsWith('three/addons/')) return original.call(this, resolve(SITE, 'node_modules/three/examples/jsm', req.slice(13)), ...a);
	return original.call(this, req, ...a);
};
process.removeAllListeners('warning');
const THREE = require(three);
const recipe = require(file);
const make = eval(arg('make'));
const obj = make(recipe.organs, THREE);
obj.updateMatrixWorld(true);

// what crosses to the page: each mesh's arrays, its material's kind and its colour picture
const meshes = [];
const pictures = new Map();
obj.traverse((m) => {
	if (!m.isMesh) return;
	const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
	const map = m.material.map;
	let pic = null;
	if (map?.image?.data) {
		if (!pictures.has(map)) pictures.set(map, { data: Array.from(map.image.data), width: map.image.width, height: map.image.height, srgb: map.colorSpace === THREE.SRGBColorSpace });
		pic = [...pictures.keys()].indexOf(map);
	}
	meshes.push({
		position: Array.from(g.attributes.position.array),
		normal: Array.from(g.attributes.normal.array),
		color: g.attributes.color ? Array.from(g.attributes.color.array) : null,
		uv: g.attributes.uv ? Array.from(g.attributes.uv.array) : null,
		index: g.index ? Array.from(g.index.array) : null,
		map: pic,
		double: m.material.side === THREE.DoubleSide,
	});
});
const box = new THREE.Box3().setFromObject(obj);
const payload = { meshes, pictures: [...pictures.values()], box: [box.min.toArray(), box.max.toArray()], view, ppm, flat };

const page = `<!doctype html><html><body style="margin:0;background:transparent"><script type="module">
import * as THREE from '/three.module.js';
const P = await (await fetch('/payload.json')).json();
const [min, max] = P.box.map((a) => new THREE.Vector3(...a));
const c = min.clone().add(max).multiplyScalar(0.5), s = max.clone().sub(min);
const axes = { front: [[0, 0, 1], s.x, s.y], side: [[1, 0, 0], s.z, s.y], top: [[0, 1, 0], s.x, s.z], bottom: [[0, -1, 0], s.x, s.z] }[P.view];
const pad = 1.04, w = Math.ceil(axes[1] * P.ppm * pad), h = Math.ceil(axes[2] * P.ppm * pad);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(w, h);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const tex = P.pictures.map((p) => { const t = new THREE.DataTexture(new Uint8Array(p.data), p.width, p.height); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = p.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true; return t; });
for (const m of P.meshes) {
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(m.position, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(m.normal, 3));
	if (m.color) g.setAttribute('color', new THREE.Float32BufferAttribute(m.color, 3));
	if (m.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(m.uv, 2));
	if (m.index) g.setIndex(m.index);
	const o = { vertexColors: !!m.color, side: THREE.DoubleSide, map: m.map == null ? null : tex[m.map] };
	scene.add(new THREE.Mesh(g, P.flat ? new THREE.MeshBasicMaterial(o) : new THREE.MeshStandardMaterial({ ...o, roughness: 0.8 })));
}
const dir = new THREE.Vector3(...axes[0]);
const half = [(axes[1] * pad) / 2, (axes[2] * pad) / 2];
const cam = new THREE.OrthographicCamera(-half[0], half[0], half[1], -half[1], 0.001, 100);
cam.position.copy(c).addScaledVector(dir, Math.max(s.x, s.y, s.z) * 2 + 1);
cam.up.set(...(P.view === 'top' ? [0, 0, -1] : P.view === 'bottom' ? [0, 0, 1] : [0, 1, 0]));
cam.lookAt(c);
// a light box: a big soft source over the camera and fill all round, nothing casting shadows
scene.add(new THREE.HemisphereLight(0xffffff, 0xf0f0f0, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.copy(cam.position).add(new THREE.Vector3(0, 1, 0));
scene.add(key);
renderer.render(scene, cam);
window.done = { w, h, data: renderer.domElement.toDataURL('image/png') };
</script></body></html>`;

let playwright;
for (const from of [SITE, process.cwd(), '/usr/lib/node_modules/', '/usr/local/lib/node_modules/'])
	try {
		playwright = createRequire(resolve(from, 'x.js'))('playwright');
		break;
	} catch {}
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage();
await tab.route('http://bench.local/**', (route) => {
	const path = new URL(route.request().url()).pathname;
	if (path === '/') return route.fulfill({ contentType: 'text/html', body: page });
	if (path === '/payload.json') return route.fulfill({ contentType: 'application/json', body: JSON.stringify(payload) });
	if (path === '/three.module.js' || path === '/three.core.js')
		return route.fulfill({ contentType: 'text/javascript', body: readFileSync(resolve(SITE, 'node_modules/three/build', path.slice(1))) });
	return route.fulfill({ status: 404 });
});
tab.on('pageerror', (e) => console.error('page:', e.message));
await tab.goto('http://bench.local/');
await tab.waitForFunction(() => window.done, null, { timeout: 120000 });
const { w, h, data } = await tab.evaluate(() => window.done);
writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
await browser.close();
console.log(`${out}  ${w}×${h} px at ${ppm} px/m  (${(w / ppm).toFixed(3)} × ${(h / ppm).toFixed(3)} m)`);

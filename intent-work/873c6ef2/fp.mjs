// node fp.mjs <source.js> [piecesDir] : builds every recipe a readable source holds (every version and variant it lists),
// pieces handed in by hash and run as the box runs them ("use strict", each once per build), and prints one geometry
// fingerprint per recipe: every mesh's name, path, world matrix, attributes' and index's bytes, groups, morphs, and its
// materials' settings (kind, colours, numbers, flags, texture sizes), hashed with BLAKE3; plus triangles, meshes, materials.
import { readFileSync, readdirSync } from 'node:fs';
import * as FS from 'node:fs';
const require_fs = () => FS;
import { blake3 } from '@noble/hashes/blake3';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
const T = '/home/user/maiacity/play/site/node_modules/three';
const THREE = await import(`${T}/build/three.module.js`);
const ADDONS = {};
for (const a of ['utils/BufferGeometryUtils.js', 'geometries/RoundedBoxGeometry.js']) ADDONS[`three/addons/${a}`] = await import(`${T}/examples/jsm/${a}`);
// a canvas that paints nothing but answers (textures are the same on both sides)
const ctx = new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') ? () => ({ addColorStop() {} }) : k === 'getImageData' || k === 'createImageData' ? (x, y, w, h) => ({ data: new Uint8ClampedArray((w || x?.width || 1) * (h || x?.height || 1) * 4), width: w, height: h }) : k === 'measureText' ? () => ({ width: 10 }) : typeof k === 'string' && /^[a-z]/.test(k) && !['canvas'].includes(k) ? (t[k] ?? (() => {})) : t[k], set: (t, k, v) => ((t[k] = v), true) });
globalThis.document = { createElement: () => ({ width: 1, height: 1, style: {}, getContext: () => ctx, toDataURL: () => '' }), createElementNS: () => ({ width: 1, height: 1, style: {}, getContext: () => ctx }) };
globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return ctx; } };
globalThis.self = globalThis;
const h = (s) => bytesToHex(blake3(typeof s === 'string' ? utf8ToBytes(s) : s));
const [file, dir = 'out/pieces'] = process.argv.slice(2);
const pieces = {};
for (const f of readdirSync(dir)) { const c = readFileSync(`${dir}/${f}`, 'utf8'); pieces[h(c)] = c; }
function load(code) {
  const made = {};
  const need = (name) => {
    if (/^[0-9a-f]{64}$/.test(name)) {
      if (!pieces[name]) throw new Error(`piece ${name.slice(0, 12)} not handed in`);
      if (!made[name]) { const m = { exports: {} }; made[name] = m; new Function('require', 'module', 'exports', '"use strict";\n' + pieces[name])(need, m, m.exports); }
      return made[name].exports;
    }
    if (name === 'three') return THREE;
    if (ADDONS[name]) return ADDONS[name];
    throw new Error(`require ${name}?`);
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(need, module, module.exports);
  return { exports: module.exports, used: Object.keys(made) };
}
const code = readFileSync(file, 'utf8');
const bytes = (a) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
function matKey(m) {
  const o = {};
  for (const [k, v] of Object.entries(m)) {
    if (k === 'uuid' || k === 'id' || k === 'version' || k.startsWith('_')) continue;
    if (v == null || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') o[k] = v;
    else if (v.isColor) o[k] = v.getHexString();
    else if (v.isTexture) o[k] = `tex ${v.image?.width}x${v.image?.height} ${v.repeat?.x},${v.repeat?.y} ${v.wrapS}`;
    else if (v.isVector2 || v.isVector3) o[k] = v.toArray().join(',');
    else if (Array.isArray(v)) o[k] = `[${v.length}]`;
  }
  return JSON.stringify(o);
}
function fingerprint(root) {
  root.updateMatrixWorld(true);
  const parts = []; let tris = 0, meshes = 0; const mats = new Set(), matKinds = new Set();
  root.traverse((o) => {
    const path = []; for (let p = o; p && p !== root; p = p.parent) path.unshift(p.name || p.type);
    let line = `${path.join('/')}|${o.type}|${o.visible}|${o.matrixWorld.elements.map((x) => x.toFixed(6)).join(',')}|${JSON.stringify(o.userData, (k, v) => (typeof v === 'object' && v && (v.isObject3D || v.isMaterial || v.isBufferGeometry) ? `<${v.type}>` : typeof v === 'function' ? 'fn' : v))?.length}`;
    if (o.geometry) {
      const g = o.geometry; meshes++;
      for (const [k, a] of Object.entries(g.attributes)) line += `|${k}:${a.itemSize}:${h(bytes(a.array))}`;
      if (g.index) line += `|idx:${h(bytes(g.index.array))}`;
      for (const [k, list] of Object.entries(g.morphAttributes ?? {})) for (const a of list) line += `|m${k}:${h(bytes(a.array))}`;
      line += `|groups:${JSON.stringify(g.groups)}`;
      const n = g.index ? g.index.count : g.attributes.position?.count ?? 0; if (o.isMesh) tris += n / 3;
      for (const m of [].concat(o.material ?? [])) { mats.add(m); const k = matKey(m); matKinds.add(k); line += `|mat:${h(k).slice(0, 16)}`; }
    }
    parts.push(line);
  });
  if (process.env.DUMP) require_fs().writeFileSync(process.env.DUMP, parts.join('\n'));
  return { hash: h(parts.join('\n')), tris, meshes, materials: mats.size, materialKinds: matKinds.size, nodes: parts.length };
}
const { exports: ex } = load(code);
let list;
if (ex.list) list = ex.list();
else { const ids = [...code.matchAll(/\bid:\s*'([\w-]+)'/g)].map((m) => m[1]); const names = [...new Set([...code.matchAll(/\bname:\s*'([\w-]+)'/g)].map((m) => m[1]))];
  list = []; for (const id of new Set(ids)) for (const variant of names) { try { ex.recipe(id, 1, variant); list.push({ id, v: 1, variant }); } catch {} } }
for (const r of list) {
  const fresh = load(code); let line;
  try {
    const rec = fresh.exports.recipe(r.id, r.v, r.variant);
    let b = rec.build({}); if (b && typeof b.then === 'function') b = await b;
    const root = b?.isObject3D ? b : b?.rig?.isObject3D ? b.rig : b?.rig?.object?.isObject3D ? b.rig.object : b?.rig?.root ?? b?.object ?? b?.root ?? b?.group ?? b?.scene ?? b; if (!root?.isObject3D) throw new Error("built: " + typeof b + " " + Object.keys(b ?? {}).join(",") + " rig: " + Object.keys(b?.rig ?? {}).join(",") + " " + b?.constructor?.name);
    const f = fingerprint(root);
    if (b && !b.isObject3D) { const safe = (k, v) => (typeof v === 'object' && v && (v.isObject3D || v.isMaterial || v.isBufferGeometry || v.isTexture) ? `<${v.type ?? 'tex'}:${v.name ?? ''}>` : typeof v === 'function' ? 'fn' : v); const extra = (JSON.stringify({ catalog: b.catalog, clips: b.clips && Object.keys(b.clips), poses: b.poses && Object.keys(b.poses), first: b.first, asset: b.asset, bones: b.rig?.bones?.length, names: b.rig?.names }, safe) ?? '').replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, 'uuid'); f.hash = h(f.hash + extra); if (process.env.DUMP) FS.writeFileSync(process.env.DUMP + '.extra', extra); f.extra = extra.length; }
    line = `${r.id}@${r.v}${r.variant ? ':' + r.variant : ''}\t${f.hash}\ttris ${f.tris}\tmeshes ${f.meshes}\tmaterials ${f.materials} (${f.materialKinds} kinds)\tnodes ${f.nodes}\tpieces ${fresh.used.length}`;
  } catch (e) { line = `${r.id}@${r.v}${r.variant ? ':' + r.variant : ''}\tERROR ${e.message.slice(0, 160)}`; }
  console.log(line);
}

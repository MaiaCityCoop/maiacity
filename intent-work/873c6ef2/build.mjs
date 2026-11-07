// Builds every piece's source and every host's next source (intent 873c6ef2). Out: out/pieces/<key>.js, out/hosts/<host>.js, out/plan.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as acorn from 'acorn';
import * as escope from 'eslint-scope';
import { h, region } from './extract.mjs';
const R = (f) => readFileSync(f, 'utf8');
mkdirSync('out/pieces', { recursive: true }); mkdirSync('out/hosts', { recursive: true });

function scope(code) {
  const ast = acorn.parse(code, { ecmaVersion: 2024, sourceType: 'module', ranges: true, allowReturnOutsideFunction: true });
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  const mod = sm.globalScope.childScopes.find((c) => c.type === 'module');
  return { declared: mod.variables.map((v) => v.name), free: [...new Set(sm.globalScope.through.map((r) => r.identifier.name))] };
}
const EXTERNAL = {
  three: 'const three = require("three");',
  three_addons_utils_BufferGeometryUtils_js: 'const three_addons_utils_BufferGeometryUtils_js = require("three/addons/utils/BufferGeometryUtils.js");',
  three_addons_geometries_RoundedBoxGeometry_js: 'const three_addons_geometries_RoundedBoxGeometry_js = require("three/addons/geometries/RoundedBoxGeometry.js");',
};
const kitB = (() => { const a = R('regions/kit.js.travelvan.js').split('\n'), b = R('regions/kit.js.pickup.js').split('\n');
  let i = 0; const add = []; for (const l of b) { if (i < a.length && a[i] === l) i++; else add.push(l); }
  if (i !== a.length) throw new Error('kit v2 is not kit v1 plus lines'); return add.join('\n') + '\n'; })();
const carKit = R('heads/hatchback.js').slice(0, 24400);

// each piece: its document, version, label, body (the copy's text), its deps (pieces it may take names from, in order)
export const P = {
  carkit:  { doc: 'carkit', v: 1, from: 'the seven cars v3 (hatchback, sedan, SUV, taxi, police car, ambulance, delivery van)', body: carKit, deps: [] },
  kitA:    { doc: 'kit', v: 1, from: 'travel van v1, truck v2, Fiat 500 F v1 (src/lib/assets/kit.js)', body: R('regions/kit.js.travelvan.js'), deps: [] },
  kitB:    { doc: 'kit', v: 2, from: 'Pickup v1 and Power Cube v3 (src/lib/assets/kit.js): v1 and the lines it adds (LAYER_FX, smoothstep, Flow)', body: kitB, deps: ['kitA'], reexport: 'kitA' },
  parts:   { doc: 'parts', v: 1, from: 'travel van v1, Pickup v1, truck v2, Fiat 500 F v1, Power Cube v3 (src/lib/assets/parts.js)', body: R('regions/parts.js.travelvan.js'), deps: ['kitA'] },
  veh1:    { doc: 'vehicle', v: 1, from: 'truck v2 (src/lib/machines/vehicle.js, legacy 86b44da17e4d)', body: R('regions/vehicle.js.truck.js'), deps: ['kitA'] },
  veh2:    { doc: 'vehicle', v: 2, from: 'travel van v1 and Fiat 500 F v1 (src/lib/machines/vehicle.js, legacy 963cc9dfc684); the Pickup v1\'s copy is it less three helpers', body: R('regions/vehicle.js.travelvan.js'), deps: ['kitA'] },
  pc1:     { doc: 'powercube', v: 1, from: 'Power Cube v3 (src/lib/machines/powercube.js)', body: R('regions/powercube.js.powercube.js'), deps: ['kitB', 'parts'] },
  pc2:     { doc: 'powercube', v: 2, from: 'Pickup v1 (src/lib/machines/powercube.js)', body: R('regions/powercube.js.pickup.js'), deps: ['kitB', 'parts'] },
  click1:  { doc: 'clicklock', v: 1, from: 'BatteryCube v10 (src/lib/actors/clicklock.js)', body: R('regions/clicklock.js.batterycube.js'), deps: [] },
  click2:  { doc: 'clicklock', v: 2, from: 'BatteryPack v11 (src/lib/actors/clicklock.js)', body: R('regions/clicklock.js.batterypack.js'), deps: [] },
  exc1:    { doc: 'excavator', v: 1, from: 'BatteryCube v10 (src/lib/actors/excavator-rig.js)', body: R('regions/excavator-rig.js.batterycube.js'), deps: [] },
  exc2:    { doc: 'excavator', v: 2, from: 'BatteryPack v11 (src/lib/actors/excavator-rig.js)', body: R('regions/excavator-rig.js.batterypack.js'), deps: [] },
  dqs:     { doc: 'dqs', v: 1, from: 'BatteryPack v11 (src/lib/actors/dqs.ts)', body: region(R('heads/batterypack.js'), 'src/lib/actors/dqs.ts').body, deps: [] },
  rig:     { doc: 'rig', v: 1, from: 'BatteryPack v11 (src/lib/actors/rig.ts)', body: R('regions/rig.ts.batterypack.js'), deps: ['dqs'] },
  aparts:  { doc: 'aparts', v: 1, from: 'BatteryPack v11 (src/lib/actors/parts.js)', body: region(R('heads/batterypack.js'), 'src/lib/actors/parts.js').body, deps: [] },
  bp1:     { doc: 'batterypack', v: 1, from: 'BatteryCube v10 (src/lib/actors/batterypack.js)', body: R('regions/batterypack.js.batterycube.js'), deps: ['click1', 'exc1'] },
  bp2:     { doc: 'batterypack', v: 2, from: 'BatteryPack v11 (src/lib/actors/batterypack.js)', body: R('regions/batterypack.js.batterypack.js'), deps: ['click2', 'exc2', 'rig', 'aparts'] },
};
export const LABEL = { carkit: 'City-car kit', kit: 'Asset kit (kit.js)', parts: 'Asset parts (parts.js)', vehicle: 'Vehicle base (vehicle.js)', powercube: 'Power Cube (machines/powercube.js)', clicklock: 'ClickLock (clicklock.js)', excavator: 'Excavator rig helpers (excavator-rig.js)', dqs: 'Dual-quaternion skinning (dqs.ts)', rig: 'Actor rig (rig.ts)', aparts: 'Actor parts (actors/parts.js)', batterypack: 'Battery pack (actors/batterypack.js)' };
// each host: its file, and the regions it names as pieces (null: the car kit, its first 24,400 characters)
export const H = {
  hatchback: { car: true }, sedan: { car: true }, suv: { car: true }, taxi: { car: true }, police: { car: true }, ambulance: { car: true }, van: { car: true },
  travelvan: { regions: { 'src/lib/assets/kit.js': 'kitA', 'src/lib/assets/parts.js': 'parts', 'src/lib/machines/vehicle.js': 'veh2' } },
  fiat:      { regions: { 'src/lib/assets/kit.js': 'kitA', 'src/lib/assets/parts.js': 'parts', 'src/lib/machines/vehicle.js': 'veh2' } },
  truck:     { regions: { 'src/lib/assets/kit.js': 'kitA', 'src/lib/assets/parts.js': 'parts', 'src/lib/machines/vehicle.js': 'veh1' } },
  pickup:    { regions: { 'src/lib/assets/kit.js': 'kitB', 'src/lib/assets/parts.js': 'parts', 'src/lib/machines/powercube.js': 'pc2', 'src/lib/machines/vehicle.js': 'veh2' } },
  powercube: { regions: { 'src/lib/assets/kit.js': 'kitB', 'src/lib/assets/parts.js': 'parts', 'src/lib/machines/powercube.js': 'pc1' } },
  batterycube: { regions: { 'src/lib/actors/excavator-rig.js': 'exc1', 'src/lib/actors/clicklock.js': 'click1', 'src/lib/actors/batterypack.js': 'bp1' } },
  batterypack: { regions: { 'src/lib/actors/dqs.ts': 'dqs', 'src/lib/actors/rig.ts': 'rig', 'src/lib/actors/excavator-rig.js': 'exc2', 'src/lib/actors/parts.js': 'aparts', 'src/lib/actors/clicklock.js': 'click2', 'src/lib/actors/batterypack.js': 'bp2' } },
};
const destructure = (names, hash) => `const { ${names.join(', ')} } = require("${hash}");`;
// make the pieces, deps first
const made = {};
function make(k) {
  if (made[k]) return made[k];
  const p = P[k]; for (const d of p.deps) make(d);
  const s = scope(p.body);
  const exports = new Set(s.declared); if (p.reexport) for (const n of made[p.reexport].exports) exports.add(n);
  const head = []; const taken = new Set(); const need = new Set(s.free);
  for (const n of Object.keys(EXTERNAL)) if (need.has(n) && !s.declared.includes(n)) { head.push(EXTERNAL[n]); taken.add(n); }
  for (const d of p.deps) { const got = [...need].filter((n) => !taken.has(n) && made[d].exports.has(n)); got.forEach((n) => taken.add(n)); if (got.length) head.push(destructure(got, made[d].hash)); else if (!p.reexport) throw new Error(`${k}: takes nothing from ${d}`); }
  const left = [...need].filter((n) => !taken.has(n));
  const tail = p.reexport ? `module.exports = { ...require("${made[p.reexport].hash}"), ${s.declared.join(', ')} };` : `module.exports = { ${s.declared.join(', ')} };`;
  const comment = `// The piece "${LABEL[p.doc]}", version ${p.v}: below its requires, the text of the copy in ${p.from}, as it was.\n`;
  const src = comment + (head.length ? head.join('\n') + '\n' : '') + p.body + (p.body.endsWith('\n') ? '' : '\n') + tail + '\n';
  return (made[k] = { key: k, doc: p.doc, v: p.v, hash: h(src), src, exports, free: left, copy: p.body.length });
}
for (const k of Object.keys(P)) make(k);
if (process.argv[1]?.endsWith("build.mjs")) {
for (const m of Object.values(made)) writeFileSync(`out/pieces/${m.key}.js`, m.src);
const GLOBALS_OK = (n, orig) => orig.has(n);
const plan = { pieces: Object.values(made).map(({ key, doc, v, hash, free, copy, src }) => ({ key, doc, v, hash, copy, bytes: src.length, freeGlobals: free })), hosts: {} };
for (const [host, cfg] of Object.entries(H)) {
  const orig = R(`heads/${host}.js`); const origFree = new Set(scope(orig).free);
  let out, used = [], copies = 0;
  if (cfg.car) {
    const rest = orig.slice(24400); const s = scope(rest);
    const names = s.free.filter((n) => made.carkit.exports.has(n));
    out = `/* 1. THE CAR KIT: the piece "City-car kit" v1, by its hash */\n` + destructure(names, made.carkit.hash) + '\n' + rest;
    used = ['carkit']; copies = 24400;
  } else {
    // replace each region's body by a placeholder, then work out what the rest needs from each piece
    const list = Object.entries(cfg.regions).map(([name, k]) => ({ name, k, r: region(orig, name) })).sort((a, b) => a.r.start - b.r.start);
    let text = ''; let at = 0; const marks = [];
    for (const x of list) { text += orig.slice(at, x.r.bodyStart); marks.push({ k: x.k, mark: `/*@@${x.k}@@*/\n` }); text += marks.at(-1).mark; at = x.r.end - '//#endregion'.length; copies += x.r.body.length; used.push(x.k); }
    text += orig.slice(at);
    const s = scope(text); const need = s.free.filter((n) => !origFree.has(n) || !s.declared.includes(n)).filter((n) => !origFree.has(n));
    const taken = new Set();
    // every name the rest needs, from the first piece (in the host's order) that exports it
    const each = Object.fromEntries(list.map((x) => [x.k, []]));
    for (const n of need) { const x = list.find((x) => made[x.k].exports.has(n)); if (!x) throw new Error(`${host}: nothing gives ${n}`); each[x.k].push(n); taken.add(n); }
    out = text;
    for (const m of marks) { const names = each[m.k]; const line = (names.length ? destructure(names, made[m.k].hash) : `require("${made[m.k].hash}");`) + '\n'; out = out.replace(m.mark, line); }
  }
  const s2 = scope(out); const extra = s2.free.filter((n) => !origFree.has(n));
  if (extra.length) throw new Error(`${host}: unresolved after cut: ${extra.join(' ')}`);
  writeFileSync(`out/hosts/${host}.js`, out);
  plan.hosts[host] = { head: orig.length, next: out.length, copies, shrink: orig.length - out.length, requires: used.length, overhead: copies - (orig.length - out.length), pieces: used.map((k) => made[k].hash), headBytes: Buffer.byteLength(orig), nextBytes: Buffer.byteLength(out) };
}
writeFileSync('out/plan.json', JSON.stringify(plan, null, 1));
console.table(plan.pieces.map(({ key, doc, v, hash, copy, bytes, freeGlobals }) => ({ key, doc, v, hash: hash.slice(0, 12), copy, bytes, free: freeGlobals.join(' ').slice(0, 60) })));
console.table(Object.entries(plan.hosts).map(([k, x]) => ({ host: k, head: x.head, next: x.next, copies: x.copies, overhead: x.overhead, requires: x.requires })));
}

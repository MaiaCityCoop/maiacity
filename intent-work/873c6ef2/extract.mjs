import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { blake3 } from '@noble/hashes/blake3';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
export const h = (s) => bytesToHex(blake3(utf8ToBytes(s)));
// region body: the text between "//#region X\n" and "//#endregion"
export function region(src, name) {
  const open = `//#region ${name}\n`; const a = src.indexOf(open); if (a < 0) return null;
  const b = src.indexOf('//#endregion', a); return { start: a, bodyStart: a + open.length, end: b + '//#endregion'.length, body: src.slice(a + open.length, b) };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync('regions', { recursive: true });
  const hosts = ['batterycube','batterypack','powercube','pickup','travelvan','truck','fiat'];
  const names = ['src/lib/assets/kit.js','src/lib/assets/parts.js','src/lib/machines/vehicle.js','src/lib/machines/powercube.js','src/lib/actors/batterypack.js','src/lib/actors/clicklock.js','src/lib/actors/rig.ts','src/lib/actors/excavator-rig.js'];
  for (const n of names) { const seen = new Map();
    for (const host of hosts) { const r = region(readFileSync(`heads/${host}.js`,'utf8'), n); if (!r) continue;
      const k = h(r.body); if (!seen.has(k)) seen.set(k, []); seen.get(k).push(host);
      writeFileSync(`regions/${n.split('/').pop()}.${host}.js`, r.body); }
    console.log(n); for (const [k, v] of seen) console.log('  ', k.slice(0,12), v.join(','), readFileSync(`regions/${n.split('/').pop()}.${v[0]}.js`,'utf8').length);
  }
}

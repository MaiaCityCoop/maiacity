// Build a Person head piece's skin for a look, CPU only (no rendering): its smoothed positions and colours, for bake.py.
//   node head-piece.cjs <piece.js> <out-prefix> [look.json]  ->  <out>.pos.f32, <out>.col.f32
// The piece is fetched from play by hash (GET /api/files/<hash>); require('three') comes from play/site's node_modules.
const fs = require('fs'), path = require('path'), Module = require('module');
const SITE = path.join(__dirname, '../../play/site/node_modules/');
const three = require(SITE + 'three/build/three.cjs');
function load(file) { const m = { exports: {} }; new Function('require', 'module', 'exports', fs.readFileSync(file, 'utf8'))((n) => n === 'three' ? three : require(n), m, m.exports); return m.exports; }
module.exports = { load, three };
const HEAD_BASE = (H) => H; // (the base positions come from bake.py's own decoding of HEAD_PEOPLE)
if (require.main === module) {
  const [file, out, lookJson] = process.argv.slice(2);
  const H = load(file); const look = Object.assign({ face: 'man', skin: '#e0b49a', lips: '#c07a70', brows: '#7a4a2a', hairColour: '#8a5a3a', hair: 'none' }, lookJson ? JSON.parse(fs.readFileSync(lookJson, 'utf8')) : {});
  const ps = H.headPieces(look, 10); const skin = ps[0]; const P = skin.geo.attributes.position.array;
  const C = Array.from({ length: P.length / 3 }, (_, i) => skin.color(null, i)).flatMap((c) => [c.r, c.g, c.b]);
  fs.writeFileSync(out + '.pos.f32', Buffer.from(new Float32Array(P).buffer)); fs.writeFileSync(out + '.col.f32', Buffer.from(new Float32Array(C).buffer));
  const I = skin.geo.index ? Array.from(skin.geo.index.array) : Array.from({ length: P.length / 3 }, (_, i) => i);
  fs.writeFileSync(out + '.tris.json', JSON.stringify(I));
  console.log(file, 'pieces', ps.length, 'skin vertices', P.length / 3, 'crown', H.crownOf('man'));
}

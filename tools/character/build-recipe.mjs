// Build an asset's recipe in node, CPU only (no rendering): three and its addons from play/site, every piece by hash
// (from a local folder first, else play's files with PLAY_MCP_TOKEN). Prints what it built.
//   node build-recipe.mjs <recipe.js> <pieces-folder> [params as JSON]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const SITE = new URL("../../play/site/node_modules/three/", import.meta.url).pathname;
const THREE = await import(SITE + "build/three.module.js");
const addons = { "three/addons/utils/BufferGeometryUtils.js": await import(SITE + "examples/jsm/utils/BufferGeometryUtils.js"), "three/addons/geometries/RoundedBoxGeometry.js": await import(SITE + "examples/jsm/geometries/RoundedBoxGeometry.js") };
const [recipe, folder, paramsJson] = process.argv.slice(2);
const cache = {};
async function source(hash) {
  const f = join(folder, hash + ".js");
  if (!existsSync(f)) {
    const r = await fetch(`https://play.maia.city/api/files/${hash}`, { headers: { Authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}` } });
    if (!r.ok) throw new Error(`piece ${hash}: ${r.status}`); writeFileSync(f, await r.text());
  }
  return readFileSync(f, "utf8");
}
// pieces are required synchronously: fetch every hash a source names first, recursively
async function prefetch(src) { for (const h of src.match(/require\('([0-9a-f]{64})'\)/g) ?? []) { const k = h.slice(9, 73); if (!(k in cache)) { cache[k] = await source(k); await prefetch(cache[k]); } } }
const mods = {};
function req(name) {
  if (name === "three") return THREE; if (addons[name]) return addons[name];
  if (/^[0-9a-f]{64}$/.test(name)) { if (!mods[name]) { const m = { exports: {} }; mods[name] = m; new Function("require", "module", "exports", cache[name])(req, m, m.exports); } return mods[name].exports; }
  throw new Error("not allowed: " + name);
}
const src = readFileSync(recipe, "utf8"); await prefetch(src);
const m = { exports: {} }; new Function("require", "module", "exports", src)(req, m, m.exports);
const r = m.exports.recipe("x", 1, undefined); const params = paramsJson ? JSON.parse(paramsJson) : r.meta.params.map((p) => p.value);
const t0 = Date.now(); const built = r.build(...params);
let verts = 0, meshes = 0, skinned = 0; const box = new THREE.Box3().setFromObject(built.rig.object);
built.rig.object.traverse((o) => { if (o.isMesh) { meshes++; verts += o.geometry.attributes.position.count; if (o.isSkinnedMesh) skinned++; } });
console.log(JSON.stringify({ label: r.meta.label, ms: Date.now() - t0, meshes, skinned, vertices: verts, height: +(box.max.y - box.min.y).toFixed(3), clips: Object.keys(built.clips ?? {}).length }));

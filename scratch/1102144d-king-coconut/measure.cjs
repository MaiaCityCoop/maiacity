// node measure.cjs <file> <v> [stages...]: top of fronds × crown width per stage, seed maia
const Module = require('module');
const path = '/home/user/maiacity/play/site/node_modules';
process.env.NODE_PATH = path; Module._initPaths();
const THREE = require('three');
const [file, v, ...st] = process.argv.slice(2);
const m = require(require('path').resolve(file));
const r = m.recipe('king-coconut', +v);
const params = r.meta.params;
const names = (params?.find?.(p => p.id === 'stage')?.names) || [];
const max = params?.find?.(p => p.id === 'stage')?.max ?? 9;
const list = st.length ? st.map(Number) : [...Array(max + 1).keys()];
for (const s of list) {
  const t0 = Date.now();
  const g = r.build(s, 'maia', 1, 0);
  const box = new THREE.Box3(); let tris = 0;
  g.traverse(o => { if (o.geometry) { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); const ix = o.geometry.index; tris += (ix ? ix.count : o.geometry.attributes.position.count) / 3; } });
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9; const p=new THREE.Vector3();
  g.updateMatrixWorld(true);
  g.traverse(o => { if (!o.geometry) return; const a=o.geometry.attributes.position; for (let i=0;i<a.count;i++){ p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld); if(p.y<0.02) continue; x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);z0=Math.min(z0,p.z);z1=Math.max(z1,p.z);} });
  const w = Math.max(x1-x0, z1-z0);
  console.log(`${s}\t${(names[s]||'').padEnd(14)}\ttop ${box.max.y.toFixed(2)}\tcrown ${w.toFixed(2)}\ttris ${Math.round(tris)}\t${Date.now()-t0}ms\t${g.userData.trunk??''}`);
}

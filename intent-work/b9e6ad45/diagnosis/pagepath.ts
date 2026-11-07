// the page's path on the CPU: the box's posed scene serialized, rebuilt as the page does, the box's bone TRS put on it
// as hero.js follow() does, then skinned by dual quaternions as dqs.ts does; compared with the box's own skin
import * as THREE from '/home/user/maiacity/play/site/node_modules/three/build/three.module.js';
const W = '/tmp/claude-0/-home-user-maiacity/57d33399-c97d-520e-8b25-943ecdefd62b/scratchpad/pm/play/actors-work/';
const { piece, run } = await import(W + 'box.mjs');
const { serialize } = await import('/home/user/maiacity/play/site/src/lib/content/assets/box/serialize.js');
const { rebuild } = await import('/home/user/maiacity/play/site/src/lib/content/assets/box/rebuild.js');
const { trsOf } = await import('/home/user/maiacity/play/site/src/lib/content/assets/box/bake.js');
const fs = await import('node:fs');
const H = JSON.parse(fs.readFileSync(W + 'pieces/out/hashes.json', 'utf8'));
for (const n of Object.keys(H)) piece(W + `pieces/out/${n}.js`);
const code = fs.readFileSync(W + 'assets/stand-in.js', 'utf8').replace(/require\('@piece:([a-z-]+)'\)/g, (_, n) => `require('${H[n]}')`);
const cast = run(code).recipe('x', 12, null).build();
const root = new THREE.Group(); root.add(cast.rig.object); root.updateMatrixWorld(true);
const { data } = await serialize(root, {});
const page = rebuild(data);
console.log('rebuilt', Object.keys(page));
// the page's nodes in the same order as the box's (both walk the tree the same way)
const boxNodes: any[] = []; root.traverse((o) => boxNodes.push(o));
const pageNodes: any[] = []; page.traverse((o) => pageNodes.push(o));
console.log('nodes', boxNodes.length, pageNodes.length);
const clip = process.argv[2] ?? 'wave', t = +(process.argv[3] ?? 1);
cast.rig.pose(cast.clips[clip](t)); root.updateMatrixWorld(true);
// hero.js follow(): every node's own TRS from the box onto the page's copy
const T = new Float32Array(10);
boxNodes.forEach((o, i) => { trsOf(o, T, 0); const p = pageNodes[i]; p.position.set(T[0], T[1], T[2]); p.quaternion.set(T[3], T[4], T[5], T[6]).normalize(); p.scale.set(T[7], T[8], T[9]); if (!p.matrixAutoUpdate) p.updateMatrix(); });
page.updateMatrixWorld(true);
const skinOf = (r: any) => { let m: any; r.traverse((o: any) => o.isSkinnedMesh && (m = o)); return m; };
const dq = (m: any) => {
  const sk = m.skeleton; sk.update();
  const B = sk.bones.map((b: any, i: number) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, sk.boneInverses[i]));
  const pos = m.geometry.attributes.position, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
  const out = new Float32Array(pos.count * 3); const v = new THREE.Vector3(), q = new THREE.Quaternion(), tr = new THREE.Vector3(), sc = new THREE.Vector3();
  for (let k = 0; k < pos.count; k++) {
    v.fromBufferAttribute(pos, k).applyMatrix4(m.bindMatrix);
    let r = [0, 0, 0, 0], d = [0, 0, 0, 0], first: any = null;
    for (let c = 0; c < 4; c++) { const w = sw.getComponent(k, c); if (w <= 0) continue; B[si.getComponent(k, c)].decompose(tr, q, sc); if (!first) first = q.clone(); const kk = q.dot(first) < 0 ? -w : w;
      const dd = [0.5 * (tr.x * q.w + tr.y * q.z - tr.z * q.y), 0.5 * (tr.y * q.w + tr.z * q.x - tr.x * q.z), 0.5 * (tr.z * q.w + tr.x * q.y - tr.y * q.x), -0.5 * (tr.x * q.x + tr.y * q.y + tr.z * q.z)];
      r = [r[0] + kk * q.x, r[1] + kk * q.y, r[2] + kk * q.z, r[3] + kk * q.w]; d = d.map((x, i) => x + kk * dd[i]); }
    const L = Math.hypot(...r); r = r.map((x) => x / L); d = d.map((x) => x / L);
    const mv = new THREE.Vector3(2 * (r[3] * d[0] - d[3] * r[0] + (r[1] * d[2] - r[2] * d[1])), 2 * (r[3] * d[1] - d[3] * r[1] + (r[2] * d[0] - r[0] * d[2])), 2 * (r[3] * d[2] - d[3] * r[2] + (r[0] * d[1] - r[1] * d[0])));
    const o = v.clone().applyQuaternion(new THREE.Quaternion(r[0], r[1], r[2], r[3])).add(mv).applyMatrix4(m.bindMatrixInverse).applyMatrix4(m.matrixWorld);
    out.set([o.x, o.y, o.z], k * 3);
  }
  return out;
};
const a = dq(skinOf(root)), b = dq(skinOf(page));
let worst = 0, sum = 0; for (let k = 0; k < a.length / 3; k++) { const e = Math.hypot(a[k * 3] - b[k * 3], a[k * 3 + 1] - b[k * 3 + 1], a[k * 3 + 2] - b[k * 3 + 2]); worst = Math.max(worst, e); sum += e; }
console.log(clip, t, 'verts', a.length / 3, 'box vs page skin: mean', (sum / (a.length / 3) * 100).toFixed(2), 'cm, worst', (worst * 100).toFixed(2), 'cm');

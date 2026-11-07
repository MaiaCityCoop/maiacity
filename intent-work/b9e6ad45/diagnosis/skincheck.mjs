// the body skinned on the CPU as the shader does (dual quaternions), posed by a clip: does the skin follow its bones?
import { piece, run, THREE } from './box.mjs';
import { readFileSync } from 'node:fs';
const H = JSON.parse(readFileSync('pieces/out/hashes.json'));
for (const n of Object.keys(H)) piece(`pieces/out/${n}.js`);
const asset = process.argv[2] ?? 'stand-in', clip = process.argv[3] ?? 'idle', t = +(process.argv[4] ?? 0.5);
const code = readFileSync(`assets/${asset}.js`, 'utf8').replace(/require\('@piece:([a-z-]+)'\)/g, (_, n) => `require('${H[n]}')`);
const cast = run(code).recipe('x', 12, null).build();
const root = cast.rig.object;
root.updateMatrixWorld(true);
const meshes = []; root.traverse((o) => o.isSkinnedMesh && meshes.push(o));
const sp = clip === 'walk' ? 1.4 : 0;
const pose = clip === 'rest' ? {} : cast.clips[clip](t, { dist: sp * t, speed: sp });
cast.rig.pose(pose); root.updateMatrixWorld(true);
const { Matrix4, Quaternion, Vector3 } = THREE;
const acc = {};
for (const m of meshes) {
  const sk = m.skeleton; sk.update();
  const B = sk.bones.map((b, i) => new Matrix4().multiplyMatrices(b.matrixWorld, sk.boneInverses[i]));
  const pos = m.geometry.attributes.position, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
  const v = new Vector3(), q = new Quaternion(), tr = new Vector3(), sc = new Vector3();
  for (let k = 0; k < pos.count; k++) {
    v.fromBufferAttribute(pos, k).applyMatrix4(m.bindMatrix);
    // dual quaternion blend
    let r = [0, 0, 0, 0], d = [0, 0, 0, 0], first = null, top = -1, topW = 0;
    for (let c = 0; c < 4; c++) {
      const w = sw.getComponent(k, c); if (w <= 0) continue;
      const bi = si.getComponent(k, c); B[bi].decompose(tr, q, sc);
      if (!first) first = q.clone();
      const kk = q.dot(first) < 0 ? -w : w;
      const dq = [0.5 * (tr.x * q.w + tr.y * q.z - tr.z * q.y), 0.5 * (tr.y * q.w + tr.z * q.x - tr.x * q.z), 0.5 * (tr.z * q.w + tr.x * q.y - tr.y * q.x), -0.5 * (tr.x * q.x + tr.y * q.y + tr.z * q.z)];
      r = [r[0] + kk * q.x, r[1] + kk * q.y, r[2] + kk * q.z, r[3] + kk * q.w]; d = d.map((x, i) => x + kk * dq[i]);
      if (w > topW) (topW = w), (top = bi);
    }
    const L = Math.hypot(...r); r = r.map((x) => x / L); d = d.map((x) => x / L);
    const R = new Quaternion(r[0], r[1], r[2], r[3]);
    const mv = new Vector3(2 * (r[3] * d[0] - d[3] * r[0] + (r[1] * d[2] - r[2] * d[1])), 2 * (r[3] * d[1] - d[3] * r[1] + (r[2] * d[0] - r[0] * d[2])), 2 * (r[3] * d[2] - d[3] * r[2] + (r[0] * d[1] - r[1] * d[0])));
    const out = v.clone().applyQuaternion(R).add(mv).applyMatrix4(m.bindMatrixInverse).applyMatrix4(m.matrixWorld);
    // the same vertex carried rigidly by its heaviest bone alone
    const rigid = v.clone().applyMatrix4(B[top]).applyMatrix4(m.bindMatrixInverse).applyMatrix4(m.matrixWorld);
    const name = sk.bones[top].name;
    const a = (acc[name] ??= { n: 0, off: 0, worst: 0, c: new Vector3() });
    const e = out.distanceTo(rigid); a.n++; a.off += e; a.worst = Math.max(a.worst, e); a.c.add(out);
  }
}
const joints = {}; for (const m of meshes) for (const b of m.skeleton.bones) joints[b.name] = new Vector3().setFromMatrixPosition(b.matrixWorld);
console.log(asset, clip, t, 'meshes', meshes.length);
for (const [n, a] of Object.entries(acc)) if (!/Proximal|Intermediate|Distal|Metacarpal/.test(n)) console.log(n.padEnd(16), 'verts', String(a.n).padStart(5), 'mean off rigid', (a.off / a.n * 100).toFixed(1), 'cm  worst', (a.worst * 100).toFixed(1), 'cm  centroid-joint', (a.c.divideScalar(a.n).distanceTo(joints[n]) * 100).toFixed(0), 'cm');

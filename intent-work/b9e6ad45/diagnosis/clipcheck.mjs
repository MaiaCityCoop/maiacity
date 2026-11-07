// the published clip data through the target's FK: posture numbers
import { THREE } from './mocap.mjs';
import { targetFK, T } from './retarget.mjs';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const { Quaternion, Vector3 } = THREE;
const deg = (r) => (r * 180) / Math.PI;
for (const set of ['man', 'elder', 'actions']) {
  const C = req(`./pieces/clips-${set}.js`);
  for (const [name, c] of Object.entries(C)) {
    const n = c.frames; let tilt = 0, back = 0, kneeMin = 9, cross = 0, handUp = -9;
    for (let i = 0; i < n; i++) {
      const q = {};
      for (const [b, L] of Object.entries(c.turns)) { const x = L[i*3]/1e4, y = L[i*3+1]/1e4, z = L[i*3+2]/1e4; q[b] = new Quaternion(x, y, z, Math.sqrt(Math.max(0, 1-x*x-y*y-z*z))); }
      const h = new Vector3(c.hips[i*3]/1e3, c.hips[i*3+1]/1e3, c.hips[i*3+2]/1e3).add(T.hips.v);
      const { P } = targetFK(q, h);
      const up = P.neck.clone().sub(P.hips); tilt = Math.max(tilt, deg(up.angleTo(new Vector3(0,1,0))));
      // pelvis behind shoulders, along the body's facing (hips' +z)
      const fwd = new Vector3(0,0,1).applyQuaternion(q.hips ?? new Quaternion()); fwd.y = 0; fwd.normalize();
      const sh = P.leftUpperArm.clone().add(P.rightUpperArm).multiplyScalar(0.5);
      back = Math.max(back, sh.clone().sub(P.hips).dot(fwd));
      const right = new Vector3().crossVectors(new Vector3(0,1,0), fwd); // +x side = left
      const kn = P.leftLowerLeg.clone().sub(P.rightLowerLeg).dot(right); kneeMin = Math.min(kneeMin, kn);
      const fl = P.leftFoot.clone().sub(P.hips).dot(right), fr = P.rightFoot.clone().sub(P.hips).dot(right);
      cross = Math.max(cross, Math.max(-fl, fr));
      handUp = Math.max(handUp, P.rightHand.y - P.rightUpperArm.y, P.leftHand.y - P.leftUpperArm.y);
    }
    console.log(set.padEnd(8), name.padEnd(9), `tilt ${tilt.toFixed(0)}°  shoulders ahead ${(back*100).toFixed(0)}cm  knees apart min ${(kneeMin*100).toFixed(0)}cm  foot over line ${(cross*100).toFixed(0)}cm  hand-shoulder max ${(handUp*100).toFixed(0)}cm`);
  }
}

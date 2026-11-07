// twist: a hinge's bend axis (from the joints' places) against the bone's own across axis (its x, the person's left at
// rest) as the clip turns it. Rigid hinges (knee, elbow) bend about their across axis, so with the twist right the two
// agree (0°); a bone rolled about its own length shows the roll here though every direction is right.
import { THREE } from './mocap.mjs';
import { targetFK, T } from './retarget.mjs';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const { Quaternion, Vector3 } = THREE;
const HINGES = { leftLowerLeg: ['leftUpperLeg', 'leftLowerLeg', 'leftFoot'], rightLowerLeg: ['rightUpperLeg', 'rightLowerLeg', 'rightFoot'], leftLowerArm: ['leftUpperArm', 'leftLowerArm', 'leftHand'], rightLowerArm: ['rightUpperArm', 'rightLowerArm', 'rightHand'], leftIndexIntermediate: ['leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal'] };
for (const set of ['man', 'elder', 'actions']) {
  const C = req(`./pieces/clips-${set}.js`);
  for (const [name, c] of Object.entries(C)) {
    const worst = {};
    for (let i = 0; i < c.frames; i++) {
      const q = {};
      for (const [b, L] of Object.entries(c.turns)) { const x = L[i*3]/1e4, y = L[i*3+1]/1e4, z = L[i*3+2]/1e4; q[b] = new Quaternion(x, y, z, Math.sqrt(Math.max(0, 1-x*x-y*y-z*z))); }
      const { P, Q } = targetFK(q, T.hips.v.clone());
      for (const [bn, [a, b, cc]] of Object.entries(HINGES)) {
        if (!P[cc]) continue;
        const u = P[b].clone().sub(P[a]), l = P[cc].clone().sub(P[b]);
        const bend = u.angleTo(l); if (bend < 0.35) continue; // bent 20°+
        const n = new Vector3().crossVectors(u, l).normalize();
        const x = new Vector3(1, 0, 0).applyQuaternion(Q[b]);
        const d = Math.min(x.angleTo(n), x.angleTo(n.clone().negate())) * 180 / Math.PI;
        worst[bn] = Math.max(worst[bn] ?? 0, d);
      }
    }
    console.log(set.padEnd(8), name.padEnd(9), Object.entries(worst).map(([k, v]) => `${k} ${v.toFixed(0)}°`).join('  '));
  }
}

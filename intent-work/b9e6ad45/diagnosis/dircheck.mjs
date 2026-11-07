// retarget() vs source FK: per mapped bone, angle between the target bone's direction (to its child) and the source's
import { readBVH, readGLB, fk, jointIndex, THREE } from './mocap.mjs';
import { retarget, targetFK, MAPS, T, TIPS } from './retarget.mjs';
const [kind, file, t0 = 0, t1 = 1e9] = process.argv.slice(2);
const src = kind === 'ual' ? readGLB(file.split('#')[0], file.split('#')[1]) : readBVH(file);
const a = Math.floor(t0 * src.fps), b = Math.min(src.frames.length, Math.ceil(t1 * src.fps));
const r = retarget(src, kind, { frames: [a, b] });
const map = MAPS[kind];
const TCHILD = { hips: 'spine', spine: 'chest', chest: 'upperChest', upperChest: 'neck', neck: 'head', head: 'head.tip' };
for (const s of ['left', 'right']) Object.assign(TCHILD, { [`${s}Shoulder`]: `${s}UpperArm`, [`${s}UpperArm`]: `${s}LowerArm`, [`${s}LowerArm`]: `${s}Hand`, [`${s}UpperLeg`]: `${s}LowerLeg`, [`${s}LowerLeg`]: `${s}Foot`, [`${s}Foot`]: `${s}Toes` });
const spos = (o, n) => { if (n.endsWith('.tip')) { const k = jointIndex(src, n.slice(0, -4)); return (src.joints[k].tip ?? src.joints[k].offset).clone().multiplyScalar(src.unit).applyQuaternion(o.q[k]).add(o.p[k]); } return o.p[jointIndex(src, n)]; };
const worst = {}; let o;
r.frames.forEach((F, i) => {
  o = fk(src, src.frames[a + i], o);
  const { P } = targetFK(F.q, F.hips);
  for (const [bn, c] of Object.entries(TCHILD)) {
    const m = map[bn]; if (!m || !m[2]) continue;
    const ds = spos(o, m[2]).clone().sub(spos(o, m[1])).normalize();
    const dt = P[c].clone().sub(P[bn]).normalize();
    const ang = (ds.angleTo(dt) * 180) / Math.PI;
    if (!(worst[bn] >= ang)) worst[bn] = ang;
  }
});
console.log(kind, file.split('/').pop(), 'frames', r.frames.length);
for (const [k, v] of Object.entries(worst)) console.log(k.padEnd(14), v.toFixed(1));

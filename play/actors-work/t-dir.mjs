import { readBVH, fk, jointIndex, THREE } from './mocap.mjs';
import { retarget, targetFK, MAPS } from './retarget.mjs';
const [kind, file, t] = process.argv.slice(2);
const src = readBVH(file);
const f = Math.round(+t * src.fps);
const r = retarget(src, kind, { frames: [f, f + 1] });
const o = fk(src, src.frames[f]);
const { P } = targetFK(r.frames[0].q, r.frames[0].hips);
const pos = (n) => (n.endsWith('.tip') ? null : o.p[jointIndex(src, n)]);
const TD = { hips: ['hips', 'spine'], spine: ['spine', 'chest'], chest: ['chest', 'upperChest'], upperChest: ['upperChest', 'neck'], neck: ['neck', 'head'], leftUpperArm: ['leftUpperArm', 'leftLowerArm'], leftLowerArm: ['leftLowerArm', 'leftHand'], leftUpperLeg: ['leftUpperLeg', 'leftLowerLeg'], leftLowerLeg: ['leftLowerLeg', 'leftFoot'], leftShoulder: ['leftShoulder', 'leftUpperArm'] };
for (const [b, [a, c]] of Object.entries(TD)) {
	const m = MAPS[kind][b];
	const sa = pos(m[1]), sc = pos(m[2]);
	if (!sa || !sc) continue;
	const ds = sc.clone().sub(sa).normalize(), dt = P[c].clone().sub(P[a]).normalize();
	console.log(b.padEnd(14), 'angle', (ds.angleTo(dt) * 180 / Math.PI).toFixed(1), '°  src', ds.toArray().map((x) => x.toFixed(2)).join(','), 'tgt', dt.toArray().map((x) => x.toFixed(2)).join(','));
}
const sc = r.scale;
for (const n of ['spine', 'chest', 'upperChest', 'neck', 'head']) console.log(n, 'tgt', P[n].toArray().map((x) => x.toFixed(3)).join(','));
for (const n of ['Hips', 'ToSpine', 'Spine', 'Spine1', 'Neck', 'Head']) console.log(n, 'src', o.p[jointIndex(src, n)].clone().multiplyScalar(sc).toArray().map((x) => x.toFixed(3)).join(','));
console.log('tgt hips', P.hips.toArray().map((x) => x.toFixed(3)).join(','));

import { piece, run, THREE } from './box.mjs';
import { readFileSync } from 'node:fs';
const H = JSON.parse(readFileSync('pieces/out/hashes.json'));
for (const n of Object.keys(H)) piece(`pieces/out/${n}.js`);
const code = readFileSync('assets/stand-in.js', 'utf8').replace(/require\('@piece:([a-z-]+)'\)/g, (_, n) => `require('${H[n]}')`);
const R = run(code).recipe('x', 12, null);
const look = R.meta.params.slice(1, 13).map((p) => p.value);
const cast = R.build(1.7, ...look, 1, +(process.argv[2] ?? 0), +(process.argv[3] ?? 0.15));
const IK = run(`module.exports=require('${H.ik}')`);
const P = run(`module.exports=require('${H.person}')`);
const s = 1.7 / 1.7978;
const sk = IK.skeleton(P.BONES.map((b) => ({ ...b, at: b.at.map((x) => x * s) })));
for (const t of [2.8, 2.9, 3.0, 3.1]) {
	const dist = 1.0 * t;
	const pose = cast.clips.walk(t, { dist, speed: 1.0 });
	const hip = sk.joint(pose, 'leftUpperLeg'), knee = sk.joint(pose, 'leftLowerLeg'), ank = sk.joint(pose, 'leftFoot');
	console.log(t, 'root', pose.root.map((x) => x.toFixed(3)).join(','), 'hip', hip.y.toFixed(3), 'knee', knee.y.toFixed(3), knee.z.toFixed(3), 'ankle', ank.y.toFixed(3), (ank.z + dist).toFixed(3), 'hip-ankle', hip.distanceTo(ank).toFixed(3), 'leftLowerLeg', pose.leftLowerLeg.map((x) => x.toFixed(2)).join(','));
}

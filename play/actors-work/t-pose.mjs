import { piece, run } from './box.mjs';
import { readFileSync } from 'node:fs';
const H = JSON.parse(readFileSync('pieces/out/hashes.json'));
for (const n of Object.keys(H)) piece(`pieces/out/${n}.js`);
const code = readFileSync('assets/stand-in.js', 'utf8').replace(/require\('@piece:([a-z-]+)'\)/g, (_, n) => `require('${H[n]}')`);
const cast = run(code).recipe('x', 12, null).build();
const IK = run(`module.exports=require('${H.ik}')`);
const P = run(`module.exports=require('${H.person}')`);
const sk = IK.skeleton(P.BONES.map((b) => ({ ...b, at: b.at.map((x) => x * 1.7 / 1.7978) })));
for (const clip of process.argv.slice(2)) {
	const p = cast.clips[clip](0.5, { dist: 0.3, speed: 1.4 });
	const j = (n) => sk.joint(p, n).toArray().map((x) => x.toFixed(2)).join(',');
	console.log(clip, 'hips', j('hips'), 'lHand', j('leftHand'), 'rHand', j('rightHand'), 'lFoot', j('leftFoot'), 'head', j('head'), 'upperArm', p.leftUpperArm?.map((x) => x.toFixed(2)));
}
// the same frame by the data's own reckoning
const { targetFK } = await import('./retarget.mjs');
const { THREE } = await import('./mocap.mjs');
const M = run(`module.exports=require('${H.motion}')`);
const D = run(`module.exports=require('${H['clips-man']}')`);
const c = M.decode(D.idle, 1);
const q = {}, h = new THREE.Vector3();
M.sample(c, 7.5, q, h);
const qq = Object.fromEntries(Object.entries(q).map(([k, v]) => [k, new THREE.Quaternion(v.x, v.y, v.z, v.w)]));
const { P: PP } = targetFK(qq, new THREE.Vector3(0, 0.98, 0).add(new THREE.Vector3(h.x, h.y, h.z)));
console.log("data idle@0.5s lHand", PP.leftHand.toArray().map((x) => x.toFixed(2)).join(','));
const p2 = cast.clips.idle(0.5);
const sk2 = IK.skeleton(run(`module.exports=require('${H.person}')`).BONES);
console.log('piece idle@0.5s (1.80 m) lHand', sk2.joint(p2, 'leftHand').toArray().map((x) => x.toFixed(2)).join(','), 'pose lUA', p2.leftUpperArm.map((x) => x.toFixed(2)), 'data lUA', new THREE.Euler().setFromQuaternion(qq.leftUpperArm).toArray().slice(0, 3).map((x) => x.toFixed(2)));

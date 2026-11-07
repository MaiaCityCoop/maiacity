// the clips as the runtime plays them (the asset's cast.clips -> pose -> the skeleton's own reckoning): posture numbers
import { piece, run, THREE } from './box.mjs';
import { readFileSync } from 'node:fs';
const H = JSON.parse(readFileSync('pieces/out/hashes.json'));
for (const n of Object.keys(H)) piece(`pieces/out/${n}.js`);
const asset = process.argv[2] ?? 'stand-in';
const code = readFileSync(`assets/${asset}.js`, 'utf8').replace(/require\('@piece:([a-z-]+)'\)/g, (_, n) => `require('${H[n]}')`);
const cast = run(code).recipe('x', 12, null).build();
const IK = run(`module.exports=require('${H.ik}')`);
const P = run(`module.exports=require('${H.person}')`);
const sk = IK.skeleton(P.BONES);
const V = THREE.Vector3;
const dur = { idle: 4, walk: 2, run: 2, wave: 2, start: 2, stop: 2.5 };
for (const name of Object.keys(cast.clips)) {
  let tilt = 0, back = 0, kneeMin = 9, cross = 0, handUp = -9;
  for (let t = 0; t < (dur[name] ?? 2); t += 1 / 30) {
    const sp = name === 'run' ? 3 : name === 'walk' ? 1.4 : 0;
    const p = process.env.NOM ? cast.clips[name](t) : cast.clips[name](t, { dist: sp * t, speed: sp });
    const J = (n) => sk.joint(p, n);
    const hips = J('hips'), neck = J('neck');
    tilt = Math.max(tilt, (neck.clone().sub(hips).angleTo(new V(0, 1, 0)) * 180) / Math.PI);
    const L = J('leftUpperLeg'), R = J('rightUpperLeg');
    const across = L.clone().sub(R); across.y = 0; across.normalize();
    const fwd = new V().crossVectors(across, new V(0, 1, 0)).normalize().negate();
    const sh = J('leftUpperArm').add(J('rightUpperArm')).multiplyScalar(0.5);
    back = Math.max(back, sh.clone().sub(hips).dot(fwd));
    kneeMin = Math.min(kneeMin, J('leftLowerLeg').sub(J('rightLowerLeg')).dot(across));
    cross = Math.max(cross, -J('leftFoot').sub(hips).dot(across), J('rightFoot').sub(hips).dot(across));
    handUp = Math.max(handUp, J('rightHand').y - J('rightUpperArm').y, J('leftHand').y - J('leftUpperArm').y);
  }
  console.log(asset, name.padEnd(10), `tilt ${tilt.toFixed(0)}°  shoulders ahead ${(back * 100).toFixed(0)}cm  knees apart min ${(kneeMin * 100).toFixed(0)}cm  foot over line ${(cross * 100).toFixed(0)}cm  hand-shoulder max ${(handUp * 100).toFixed(0)}cm`);
}

// the clips as the page plays them: written down by the box (box/clips.js motionOf), played back (clips.js playerOf)
import { piece, run, THREE } from './box.mjs';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const A = '/home/user/maiacity/play/site/src/lib/content/assets/';
const { motionOf } = await import(pathToFileURL(A + 'box/clips.js').href);
const { playerOf } = await import(pathToFileURL(A + 'clips.js').href);
const H = JSON.parse(readFileSync('pieces/out/hashes.json'));
for (const n of Object.keys(H)) piece(`pieces/out/${n}.js`);
const asset = process.argv[2] ?? 'stand-in';
const code = readFileSync(`assets/${asset}.js`, 'utf8').replace(/require\('@piece:([a-z-]+)'\)/g, (_, n) => `require('${H[n]}')`);
const cast = run(code).recipe('x', 12, null).build();
const IK = run(`module.exports=require('${H.ik}')`);
const sk = IK.skeleton(cast.rig.names.map((n) => null).length ? run(`module.exports=require('${H.person}')`).BONES.map((b) => ({ ...b, at: b.at.map((x) => (x * 1.7) / 1.7978) })) : []);
const only = process.argv[3]?.split(',');
const sub = { ...cast, clips: Object.fromEntries(Object.entries(cast.clips).filter(([k]) => !only || only.includes(k))) };
const M = motionOf(sub, 1.7);
const P = playerOf(M, cast.rig.names);
const names = cast.rig.names.filter((n) => !/Proximal|Intermediate|Distal|Metacarpal/.test(n));
for (const name of Object.keys(P)) {
  let worst = 0, wb = '', wt = 0, hand = -9, handD = -9;
  const sp = name === 'run' ? 3 : name === 'walk' ? 1.4 : 0;
  for (let t = 0; t < 3; t += 1 / 30) {
    const m = { dist: sp * t, speed: sp };
    const a = cast.clips[name](t, m), b = P[name](t, m);
    for (const n of names) { const d = sk.joint(a, n).distanceTo(sk.joint(b, n)); if (d > worst) (worst = d), (wb = n), (wt = t); }
    hand = Math.max(hand, sk.joint(b, 'rightHand').y - sk.joint(b, 'rightUpperArm').y);
    handD = Math.max(handD, sk.joint(a, 'rightHand').y - sk.joint(a, 'rightUpperArm').y);
  }
  console.log(asset, name.padEnd(10), `worst joint off ${(worst * 100).toFixed(1)} cm (${wb} at ${wt.toFixed(2)} s)  hand over shoulder: direct ${(handD * 100).toFixed(0)} played ${(hand * 100).toFixed(0)} cm`);
}

// the walk straight from the clip (no tables): each heel's and ball's slide while touching, at 60 fps
import { piece, run, THREE } from './box.mjs';
import { readFileSync } from 'node:fs';
const H = JSON.parse(readFileSync('pieces/out/hashes.json'));
for (const n of Object.keys(H)) piece(`pieces/out/${n}.js`);
const code = readFileSync(`assets/${process.argv[2] ?? 'stand-in'}.js`, 'utf8').replace(/require\('@piece:([a-z-]+)'\)/g, (_, n) => `require('${H[n]}')`);
const cast = run(code).recipe('x', 12, null).build();
const IK = run(`module.exports=require('${H.ik}')`);
const P = run(`module.exports=require('${H.person}')`);
const s = 1.7 / 1.7978;
const sk = IK.skeleton(P.BONES.map((b) => ({ ...b, at: b.at.map((x) => x * s) })));
const speed = +(process.argv[3] ?? 1.4), clip = process.argv[4] ?? 'walk';
const pts = { heel: [0, -0.085 * s, -0.065 * s], ball: null };
const res = {};
for (const side of ['left']) {
	let at = { heel: null, ball: null }, most = { heel: [0], ball: [0] };
	for (let i = 0; i < 600; i++) {
		const t = i / 60, dist = speed * t;
		const pose = cast.clips[clip](t, { dist, speed, turn: 0 });
		const F = sk.frame(pose, `${side}Foot`), Tm = sk.frame(pose, `${side}Toes`);
		const heel = new THREE.Vector3(...pts.heel).applyMatrix4(F); heel.z += dist;
		const ball = new THREE.Vector3(0, -0.022 * s, 0).applyMatrix4(Tm); ball.z += dist;
		for (const [k, p] of [['heel', heel], ['ball', ball]]) {
			if (p.y < 0.01) { at[k] ??= p.clone(); const d = Math.hypot(p.x - at[k].x, p.z - at[k].z); if (d > most[k][0]) most[k] = [d, t.toFixed(2), p.y.toFixed(3)]; } else at[k] = null;
		}
	}
	res[side] = { heel: [(most.heel[0] * 100).toFixed(2) + ' cm', most.heel[1]], ball: [(most.ball[0] * 100).toFixed(2) + ' cm', most.ball[1]] };
}
console.log(clip, speed, JSON.stringify(res));
if (process.argv[5]) {
	const [a, b] = process.argv[5].split('-').map(Number);
	for (let i = Math.round(a * 60); i <= b * 60; i++) {
		const t = i / 60, dist = speed * t;
		const pose = cast.clips[clip](t, { dist, speed, turn: 0 });
		const F = sk.frame(pose, 'leftFoot'), Tm = sk.frame(pose, 'leftToes');
		const heel = new THREE.Vector3(...pts.heel).applyMatrix4(F); heel.z += dist;
		const ball = new THREE.Vector3(0, -0.022 * s, 0).applyMatrix4(Tm); ball.z += dist;
		const ank = new THREE.Vector3().setFromMatrixPosition(F); ank.z += dist;
		console.log(t.toFixed(3), 'phase', ((dist / (1.5 * s)) % 1).toFixed(3), 'heel', heel.y.toFixed(3), heel.z.toFixed(3), 'ball', ball.y.toFixed(3), ball.z.toFixed(3), 'ankle', ank.y.toFixed(3), ank.z.toFixed(3));
	}
}

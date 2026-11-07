import { THREE } from './mocap.mjs';
import { targetFK } from './retarget.mjs';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const D = req('./pieces/clips-man.js');
for (const clip of ['idle', 'walk']) {
	const c = D[clip];
	const q = {};
	for (const [b, l] of Object.entries(c.turns)) { const x = l[0] / 1e4, y = l[1] / 1e4, z = l[2] / 1e4; q[b] = new THREE.Quaternion(x, y, z, Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z))); }
	const h = new THREE.Vector3(c.hips[0] / 1000, 0.98 + c.hips[1] / 1000, c.hips[2] / 1000);
	const { P } = targetFK(q, h);
	console.log(clip, 'lHand', P.leftHand.toArray().map((x) => x.toFixed(2)).join(','), 'head', P.head.toArray().map((x) => x.toFixed(2)).join(','), 'lUA', new THREE.Euler().setFromQuaternion(q.leftUpperArm).toArray().slice(0, 3).map((x) => x.toFixed(2)));
}

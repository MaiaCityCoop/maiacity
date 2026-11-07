// candidate gait cycles of a capture: left touchdowns, each cycle's speed, straightness and loop error
import { readBVH } from './mocap.mjs';
import { retarget } from './retarget.mjs';
const [file, kind = 'style'] = process.argv.slice(2);
const src = readBVH(file);
const r = retarget(src, kind);
const F = r.frames, fps = r.fps;
const h = F.map((f) => f.feet.left.y);
const floor = Math.min(...h);
// touchdowns: the ankle comes down to within 3 cm of its floor after being 8 cm above it
const down = [];
let up = false;
for (let i = 0; i < F.length; i++) {
	const y = F[i].feet.left.y - floor;
	if (y > 0.05) up = true;
	if (up && y < 0.02) { down.push(i); up = false; }
}
const ang = (q) => q;
const rows = [];
for (let k = 0; k + 1 < down.length; k++) {
	const a = down[k], b = down[k + 1];
	const d = F[b].hips.clone().sub(F[a].hips); d.y = 0;
	const dur = (b - a) / fps;
	// straightness: the previous and next cycles' direction
	const prev = k > 0 ? F[a].hips.clone().sub(F[down[k - 1]].hips) : null;
	let turn = 0; if (prev) { prev.y = 0; turn = Math.abs(Math.atan2(prev.x * d.z - prev.z * d.x, prev.x * d.x + prev.z * d.z)) * 180 / Math.PI; }
	// loop error: summed angle between local turns at a and b
	let err = 0; for (const n of r.bones) err += F[a].q[n].angleTo(F[b].q[n]);
	rows.push({ k, a, t: (a / fps).toFixed(2), dur: dur.toFixed(2), stride: d.length().toFixed(2), speed: (d.length() / dur).toFixed(2), turn: turn.toFixed(1), err: err.toFixed(2) });
}
console.log('floor', floor.toFixed(3), 'cycles', rows.length);
for (const x of rows) console.log(JSON.stringify(x));

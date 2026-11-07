import { readBVH } from './mocap.mjs';
import { retarget } from './retarget.mjs';
const src = readBVH(process.argv[2]); const r = retarget(src, process.argv[3] ?? 'style'); const F = r.frames, fps = r.fps;
const W = Math.round(fps);
for (let i = 0; i + W < F.length; i += W * 4) {
	const d = F[i + W].hips.clone().sub(F[i].hips); d.y = 0;
	let lo = 9, hi = -9; for (let k = i; k < i + W; k++) { lo = Math.min(lo, F[k].feet.left.y); hi = Math.max(hi, F[k].feet.left.y); }
	// foot in stance: its world speed at its lowest frame
	let kmin = i; for (let k = i; k < i + W; k++) if (F[k].feet.left.y < F[kmin].feet.left.y) kmin = k;
	const fs = F[Math.min(F.length - 1, kmin + 2)].feet.left.clone().sub(F[Math.max(0, kmin - 2)].feet.left).length() * fps / 4;
	console.log((i / fps).toFixed(0) + 's', 'hips', d.length().toFixed(2), 'm/s; ankle', lo.toFixed(3), '…', hi.toFixed(3), 'stance foot speed', fs.toFixed(2), 'hips y', F[i].hips.y.toFixed(3));
}

import { readBVH } from './mocap.mjs';
import { retarget } from './retarget.mjs';
const src = readBVH(process.argv[2]); const r = retarget(src, process.argv[3] ?? 'style'); const F = r.frames, fps = r.fps;
const W = Math.round(fps * 1.5), out = [];
for (let i = 0; i + W < F.length; i += Math.round(fps / 4)) { const d = F[i + W].hips.clone().sub(F[i].hips); d.y = 0; out.push([d.length() / 1.5, i / fps]); }
out.sort((a, b) => b[0] - a[0]);
const hist = {}; for (const [v] of out) { const k = (Math.floor(v * 5) / 5).toFixed(1); hist[k] = (hist[k] ?? 0) + 1; }
console.log(process.argv[2].split('/').pop(), 'top', out.slice(0, 6).map(([v, t]) => `${v.toFixed(2)}@${t.toFixed(1)}`).join(' '), JSON.stringify(hist));

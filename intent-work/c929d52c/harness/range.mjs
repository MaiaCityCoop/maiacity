// the clouds' gradient noise in plain arithmetic (the shader's sums), sampled densely: its true range
const fract = (x) => x - Math.floor(x), dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
const grad = (ix, iy) => { let p = [fract(ix * 0.1031), fract(iy * 0.103), fract(ix * 0.0973)]; const d = p[0] * (p[1] + 33.33) + p[1] * (p[2] + 33.33) + p[2] * (p[0] + 33.33); p = p.map((v) => v + d); return [fract((p[0] + p[1]) * p[2]) * 2 - 1, fract((p[0] + p[2]) * p[1]) * 2 - 1]; };
const noise = (x, y, per, seed) => { const fx = fract(x), fy = fract(y), q = (t) => t * t * t * (t * (t * 6 - 15) + 10), ux = q(fx), uy = q(fy);
  const m = (v) => ((v % per) + per) % per, ax = m(Math.floor(x)), ay = m(Math.floor(y)), bx = m(ax + 1), by = m(ay + 1);
  const n = (cx, cy, ox, oy) => dot2(grad(cx + seed, cy + seed), [fx - ox, fy - oy]);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(n(ax, ay, 0, 0), n(bx, ay, 1, 0), ux), l(n(ax, by, 0, 1), n(bx, by, 1, 1), ux), uy) * 1.6; };
let lo = 0, hi = 0;
for (const [per, seed] of [[16, 0], [32, 19], [64, 38], [128, 57], [256, 76]])
  for (let x = 0; x < per; x += 0.05) for (let y = 0; y < per; y += 0.05) { const v = noise(x, y, per, seed); lo = Math.min(lo, v); hi = Math.max(hi, v); }
console.log('noise range', lo.toFixed(3), hi.toFixed(3));

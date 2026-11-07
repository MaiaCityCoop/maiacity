// retargeted stick figures: node tsticks.mjs kind file t0 dur out step [anim]
import { readBVH, readGLB } from './mocap.mjs';
import { retarget, targetFK, TARGET } from './retarget.mjs';
import { createRequire } from 'node:module';
const require = createRequire('/home/user/maiacity/play/site/x.js');
const [kind, file, t0, dur, out, step = 0.2, anim] = process.argv.slice(2);
const src = kind === 'ual' ? readGLB(file, anim) : readBVH(file);
const a = Math.round(+t0 * src.fps), b = Math.min(src.frames.length, Math.round((+t0 + +dur) * src.fps));
const r = retarget(src, kind, { frames: [a, b] });
const cells = [];
for (let t = 0; t < +dur - 1e-6; t += +step) {
	const f = r.frames[Math.min(r.frames.length - 1, Math.round(t * src.fps))];
	const { P } = targetFK(f.q, f.hips);
	const c = P.hips;
	const line = (ax) => TARGET.map((bn) => (!bn.parent ? '' : `<line x1="${60 + (P[bn.parent][ax] - c[ax]) * 60}" y1="${130 - P[bn.parent].y * 60}" x2="${60 + (P[bn.name][ax] - c[ax]) * 60}" y2="${130 - P[bn.name].y * 60}" stroke="${/^left/.test(bn.name) ? '#c33' : /^right/.test(bn.name) ? '#33c' : '#333'}" stroke-width="2"/>`)).join('');
	cells.push(`<svg width="240" height="150"><text x="2" y="12" font-size="11">${(+t0 + t).toFixed(1)}s</text><g>${line('x')}</g><g transform="translate(120 0)">${line('z')}</g></svg>`);
}
const { chromium } = require('playwright');
const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1220, height: 200 } });
await p.setContent(`<body style="margin:0;display:flex;flex-wrap:wrap;width:1220px">${cells.join('')}</body>`);
await p.screenshot({ path: out, fullPage: true }); await br.close(); console.log(out, 'scale', r.scale.toFixed(3));

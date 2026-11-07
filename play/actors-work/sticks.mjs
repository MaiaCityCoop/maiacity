// a contact sheet of stick figures (front and side) of a BVH from t0 for dur seconds: node sticks.mjs file t0 dur out.png
import { readBVH, fk } from './mocap.mjs';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/home/user/maiacity/play/site/x.js');
const [file, t0 = 0, dur = 3, out = '/tmp/sticks.png', step = 0.2] = process.argv.slice(2);
const s = readBVH(file);
const cells = [];
for (let t = +t0; t < +t0 + +dur; t += +step) {
	const f = Math.min(s.frames.length - 1, Math.round(t * s.fps));
	const o = fk(s, s.frames[f]);
	const c = o.p[0];
	const line = (ax) => s.joints.map((j, k) => (j.parent < 0 ? '' : `<line x1="${60 + (o.p[j.parent][ax] - c[ax]) * 60}" y1="${130 - o.p[j.parent].y * 60}" x2="${60 + (o.p[k][ax] - c[ax]) * 60}" y2="${130 - o.p[k].y * 60}" stroke="${/Left/.test(j.name) ? '#c33' : /Right/.test(j.name) ? '#33c' : '#333'}" stroke-width="2"/>`)).join('');
	cells.push(`<svg width="240" height="150"><text x="2" y="12" font-size="11">${t.toFixed(1)}s</text><g>${line('x')}</g><g transform="translate(120 0)">${line('z')}</g></svg>`);
}
const { chromium } = require('playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1220, height: 200 } });
await p.setContent(`<body style="margin:0;display:flex;flex-wrap:wrap;width:1220px">${cells.join('')}</body>`);
await p.screenshot({ path: out, fullPage: true }); await b.close(); console.log(out);

// stick figures of a converted clip: node dsticks.mjs man walk out.png [step frames]
import { THREE } from './mocap.mjs';
import { targetFK, TARGET } from './retarget.mjs';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const require2 = createRequire('/home/user/maiacity/play/site/x.js');
const [set, name, out, step = 3] = process.argv.slice(2);
const c = req(`./pieces/clips-${set}.js`)[name];
const cells = [];
for (let i = 0; i < c.frames; i += +step) {
	const q = {};
	for (const [b, l] of Object.entries(c.turns)) { const x = l[i * 3] / 1e4, y = l[i * 3 + 1] / 1e4, z = l[i * 3 + 2] / 1e4; q[b] = new THREE.Quaternion(x, y, z, Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z))); }
	const h = new THREE.Vector3(c.hips[i * 3] / 1000, 0.98 + c.hips[i * 3 + 1] / 1000, c.hips[i * 3 + 2] / 1000);
	const { P } = targetFK(q, h);
	const line = (ax, o) => TARGET.map((bn) => (!bn.parent ? '' : `<line x1="${60 + (P[bn.parent][ax] - o) * 60}" y1="${130 - P[bn.parent].y * 60}" x2="${60 + (P[bn.name][ax] - o) * 60}" y2="${130 - P[bn.name].y * 60}" stroke="${/^left/.test(bn.name) ? '#c33' : /^right/.test(bn.name) ? '#33c' : '#333'}" stroke-width="2"/>`)).join('');
	cells.push(`<svg width="240" height="150"><text x="2" y="12" font-size="11">${i}</text><line x1="0" y1="130" x2="240" y2="130" stroke="#aaa"/><g>${line('x', 0)}</g><g transform="translate(120 0)">${line('z', 0)}</g></svg>`);
}
const { chromium } = require2('playwright');
const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1220, height: 200 } });
await p.setContent(`<body style="margin:0;display:flex;flex-wrap:wrap;width:1220px">${cells.join('')}</body>`);
await p.screenshot({ path: out, fullPage: true }); await br.close(); console.log(out);

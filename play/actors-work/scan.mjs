import { readBVH, fk, jointIndex } from './mocap.mjs';
import { execSync } from 'node:child_process';
const files = execSync('find /tmp/claude-0/data/accad -name "*.bvh"').toString().trim().split('\n').filter((f) => /D\d|Gesture|Random|Victory|Wait|Look|Stand/.test(f));
for (const f of files) {
	const s = readBVH(f);
	const H = jointIndex(s, 'Head'), L = jointIndex(s, 'LeftHand'), R = jointIndex(s, 'RightHand');
	let up = { L: 0, R: 0 }, n = s.frames.length;
	for (let i = 0; i < n; i += 2) { const o = fk(s, s.frames[i]); if (o.p[L].y > o.p[H].y) up.L++; if (o.p[R].y > o.p[H].y) up.R++; }
	console.log(f.split('/').pop(), (n / s.fps).toFixed(1) + 's', 'hand above head L', (up.L * 2 / s.fps).toFixed(1), 'R', (up.R * 2 / s.fps).toFixed(1));
}

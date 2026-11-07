import { readBVH, fk, jointIndex } from './mocap.mjs';
for (const f of process.argv.slice(2)) {
	const s = readBVH(f);
	for (const side of ['Left', 'Right']) {
		const S = jointIndex(s, side + 'Arm'), Hd = jointIndex(s, side + 'Hand'), E = jointIndex(s, side + 'ForeArm');
		let run = [];
		const seg = [];
		for (let i = 0; i < s.frames.length; i++) {
			const o = fk(s, s.frames[i]);
			const up = o.p[Hd].y > o.p[S].y + 0.05;
			if (up) run.push(o.p[Hd].x - o.p[E].x); else if (run.length) { seg.push([i - run.length, run]); run = []; }
		}
		if (run.length) seg.push([s.frames.length - run.length, run]);
		for (const [at, r] of seg) {
			if (r.length / s.fps < 0.8) continue;
			let flips = 0; const m = r.reduce((a, b) => a + b) / r.length;
			for (let k = 1; k < r.length; k++) if ((r[k] - m) * (r[k - 1] - m) < 0) flips++;
			console.log(f.split('/').pop(), side, 'from', (at / s.fps).toFixed(1), 'for', (r.length / s.fps).toFixed(1), 's, crossings', flips);
		}
	}
}

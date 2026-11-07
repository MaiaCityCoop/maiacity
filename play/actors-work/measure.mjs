// c3/c4 from the bench's motion.json: each foot's contacts (its ankle within 1 cm of the height it stands at over the
// ground under it), how far its bone moves during each, and how far its sole is off the ground
// node measure.mjs motion.json [--height 1.7 --face man] [--slope deg] [--step m --going m]
import { readFileSync } from 'node:fs';
const file = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? +process.argv[i + 1] : d; };
const crown = { man: 1.7978, woman: 1.7353 };
const face = process.argv.includes('woman') ? 'woman' : 'man';
const s = arg('height', 1.7) / crown[face];
const slope = Math.tan((arg('slope', 0) * Math.PI) / 180), rise = arg('step', 0), going = (arg('going', 1.5) * s) / 2;
const origin = arg('origin', 0);
const ground = (z) => slope * z + (rise ? rise * Math.max(0, Math.round((z - origin) / going) + 1) : 0);
const M = JSON.parse(readFileSync(file, 'utf8'));
const from = arg('from', 0), to = arg('to', 1e9);
M.frames = M.frames.filter((f) => f.t >= from && f.t <= to);
const pos = (m) => [m[12], m[13], m[14]];
const apply = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
const ankleUp = 0.085 * s;
const out = {};
/** a sole point's slide: while it touches the ground (within 1 cm), how far it moves from where it touched down */
function pointSlide(F, key) {
	let most = 0, at = null, worst = '';
	for (const f of F) {
		const p = f[key], on = p[1] - ground(p[2]) < 0.01;
		if (on && !at) at = p;
		if (on) { const d = Math.hypot(p[0] - at[0], p[2] - at[2]); if (d > most) (most = d), (worst = f.t.toFixed(2)); }
		if (!on) at = null;
	}
	return { cm: +(most * 100).toFixed(2), at: worst };
}
for (const side of ['left', 'right']) {
	const F = M.frames.map((f) => {
		const a = pos(f.bones[`${side}Foot`]);
		// the sole under the heel and under the ball, from the foot's and the toes' bones (their rest offsets, model space)
		const heel = apply(f.bones[`${side}Foot`], [0, -0.085 * s, -0.065 * s]);
		const ball = apply(f.bones[`${side}Toes`], [0, -0.022 * s, 0]);
		return { t: f.t, a, heel, ball, clip: f.clip };
	});
	out[side] = { heelSlide: pointSlide(F, 'heel'), ballSlide: pointSlide(F, 'ball') };
	// flat: heel and ball both on the ground; the foot's bone, how far it moves while it stays flat
	const flats = [];
	let fl = null;
	for (const f of F) {
		const on = Math.max(f.heel[1] - ground(f.heel[2]), f.ball[1] - ground(f.ball[2])) < 0.01;
		if (on && !fl) fl = { start: f.a, most: 0 };
		if (on) fl.most = Math.max(fl.most, Math.hypot(f.a[0] - fl.start[0], f.a[2] - fl.start[2]));
		if (!on && fl) (flats.push(fl), (fl = null));
	}
	if (fl) flats.push(fl);
	out[side].flat = { contacts: flats.length, boneSlideCm: +(Math.max(0, ...flats.map((c) => c.most)) * 100).toFixed(2) };
	const contacts = [];
	let cur = null;
	for (const f of F) {
		// in contact: its sole's lowest point (heel or ball) within 1 cm of the ground under it
		const on = Math.min(f.heel[1] - ground(f.heel[2]), f.ball[1] - ground(f.ball[2])) < 0.01;
		if (on && !cur) cur = { from: f.t, start: f.a, most: 0, soleOff: 0, n: 0 };
		if (on) {
			const d = Math.hypot(f.a[0] - cur.start[0], f.a[2] - cur.start[2]);
			cur.most = Math.max(cur.most, d);
			// the sole's lowest point (heel or ball: the foot rolls over one of them) off the ground under it
			cur.soleOff = Math.max(cur.soleOff, Math.min(Math.abs(f.heel[1] - ground(f.heel[2])), Math.abs(f.ball[1] - ground(f.ball[2]))));
			cur.below = Math.min(cur.below ?? 0, f.heel[1] - ground(f.heel[2]), f.ball[1] - ground(f.ball[2]));
			cur.n++;
			cur.to = f.t;
		}
		if (!on && cur) (contacts.push(cur), (cur = null));
	}
	if (cur) contacts.push(cur);
	// a contact still on at the end, or that began at the very start, is measured too
	const full = contacts.filter((c) => c.n >= 3);
	out[side] = { ...out[side], contacts: full.length, slideMostCm: +(Math.max(0, ...full.map((c) => c.most)) * 100).toFixed(2), soleOffMostCm: +(Math.max(0, ...full.map((c) => c.soleOff)) * 100).toFixed(2), throughMostCm: +(-Math.min(0, ...full.map((c) => c.below)) * 100).toFixed(2), each: full.map((c) => `${c.from.toFixed(2)}–${c.to.toFixed(2)} s: ${(c.most * 100).toFixed(1)} cm`) };
}
const last = M.frames.at(-1);
if (process.argv.includes('--trace')) for (const f of M.frames.filter((_, i) => i % 3 === 0)) { const h = apply(f.bones.leftFoot, [0, -0.085 * s, -0.065 * s]), b = apply(f.bones.leftToes, [0, -0.022 * s, 0]); console.log(f.t.toFixed(2), 'heel', (h[1] - ground(h[2])).toFixed(3), h[2].toFixed(3), 'ball', (b[1] - ground(b[2])).toFixed(3), b[2].toFixed(3), 'g', ground(h[2]).toFixed(2)); }
console.log(JSON.stringify({ file: file.split('/').pop(), frames: M.frames.length, fps: M.plan.fps, distance: last.dist, left: { ...out.left, each: out.left.each.slice(0, 4) }, right: { ...out.right, each: out.right.each.slice(0, 4) } }, null, 1));

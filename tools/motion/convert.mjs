// The clips: cut from the captures, retargeted, settled and written as readable data pieces (pieces/clips-*.js), and
// beside each, what the source itself does in it (sources/<set>.json.gz: every mapped bone's direction each frame, by
// the source's own forward kinematics, turned as the clip is), what check.ts holds the clips to.
//   node tools/motion/convert.mjs [set]   (the captures under $MOCAP, /tmp/claude-0/data by default: README.md)
import { readBVH, readGLB, THREE } from './mocap.mjs';
import { retarget, targetFK, T, TARGET } from './retarget.mjs';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { execSync } from 'node:child_process';
const { Vector3, Quaternion } = THREE;
const DATA = process.env.MOCAP ?? '/tmp/claude-0/data';
const HERE = new URL('.', import.meta.url).pathname;
const accad = (n) => execSync(`find ${DATA}/accad -name ${n}.bvh`).toString().trim();
const style = (n) => `${DATA}/style/100STYLE/${n.split('_')[0]}/${n}.bvh`;
const UAL = (rm) => `${DATA}/ual/x/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard${rm ? '_RM' : ''}.glb`;

/** each performer standing relaxed, arms hanging, as the target rests: [kind, file, second] */
const STANDS = { Male2: ['accad', 'Male2_B1_StandToWalk', 0.1], Female1: ['accad', 'Female1_B01_StandToWalk', 0.1], style: ['style', 'Neutral_ID', 15.1], ual: ['ual', 'Idle_Loop', 0] };
const stands = {};
function standOf(kind, file) {
	const who = kind === 'accad' ? file.split('/').pop().split('_')[0] : kind;
	if (stands[who]) return stands[who];
	const [k, f, t] = STANDS[who];
	const src = k === 'ual' ? readGLB(UAL(false), f) : readBVH(k === 'accad' ? accad(f) : style(f));
	return (stands[who] = { src, frame: Math.round(t * src.fps) });
}

/** a capture's frames from t0 to t1 (s), resampled to fps: the target's turns, and the source's own bone directions */
export function cut(kind, file, t0, t1, anim, fps = 30) {
	const src = kind === 'ual' ? readGLB(file, anim) : readBVH(file);
	const a = Math.max(0, Math.floor(t0 * src.fps) - 1), b = Math.min(src.frames.length, Math.ceil(t1 * src.fps) + 2);
	const r = retarget(src, kind, { frames: [a, b], stand: standOf(kind, file) });
	const n = Math.round((t1 - t0) * fps) + 1;
	const out = [];
	for (let i = 0; i < n; i++) {
		const x = (t0 + i / fps) * src.fps - a;
		const k = Math.max(0, Math.min(r.frames.length - 2, Math.floor(x))), u = Math.max(0, Math.min(1, x - k));
		const f0 = r.frames[k], f1 = r.frames[k + 1];
		const q = {}, dir = {};
		for (const bn of r.bones) {
			q[bn] = f0.q[bn].clone().slerp(f1.q[bn], u);
			dir[bn] = f0.dir[bn].clone().lerp(f1.dir[bn], u).normalize();
		}
		out.push({ q, dir, hips: f0.hips.clone().lerp(f1.hips, u) });
	}
	return { frames: out, bones: r.bones, fps };
}

/** turned and moved so it starts facing +z with its hips over the origin; a cycle also has its march taken out */
export function settle(c, { cycle = false } = {}) {
	const F = c.frames, n = F.length;
	const dir = cycle ? F[n - 1].hips.clone().sub(F[0].hips) : new Vector3(0, 0, 1).applyQuaternion(F[0].q.hips);
	dir.y = 0;
	const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.atan2(dir.x, dir.z));
	const o = F[0].hips.clone();
	const step = cycle ? F[n - 1].hips.clone().sub(F[0].hips).divideScalar(n - 1) : new Vector3();
	step.y = 0;
	for (let i = 0; i < n; i++) {
		F[i].q.hips = turn.clone().multiply(F[i].q.hips);
		for (const bn in F[i].dir) F[i].dir[bn].applyQuaternion(turn);
		const p = F[i].hips.clone().sub(o).sub(step.clone().multiplyScalar(i)).applyQuaternion(turn);
		F[i].hips = new Vector3(p.x, F[i].hips.y, p.z);
	}
	c.stride = cycle ? step.length() * (n - 1) : 0;
	return c;
}

/** its last frame made its first again: what is off between them spread over the clip from both ends, in the world
 *  (half taken from the start, half from the end: a loop that does not jump, no bone further from the capture than half
 *  its own seam, the seams of the bones above it not added to its own) */
export function close(c) {
	const F = c.frames, n = F.length;
	const w = (i) => i / (n - 1) - 0.5;
	const W = F.map((f) => targetFK(f.q).Q);
	const used = new Set(c.bones);
	for (let i = 0; i < n; i++) {
		const now = {};
		for (const b of TARGET) {
			const p = b.parent ? now[b.parent] : new Quaternion();
			if (!used.has(b.name)) {
				now[b.name] = p.clone();
				continue;
			}
			const d = W[0][b.name].clone().multiply(W[n - 1][b.name].clone().invert());
			if (d.w < 0) d.set(-d.x, -d.y, -d.z, -d.w);
			const k = w(i), part = k < 0 ? new Quaternion().slerp(d.clone().invert(), -k) : new Quaternion().slerp(d, k);
			now[b.name] = part.multiply(W[i][b.name]);
			F[i].q[b.name] = p.clone().invert().multiply(now[b.name]);
		}
	}
	const dh = F[0].hips.clone().sub(F[n - 1].hips);
	for (let i = 0; i < n; i++) F[i].hips.add(dh.clone().multiplyScalar(w(i)));
	F.pop();
	return c;
}

/** the spine, neck and head */
export const BACK = ['spine', 'chest', 'upperChest', 'neck', 'head'];
/** a clip's trunk eased k of the way to upright (an old person's capture, which leans further than a person we show):
 *  the line from the hips to the neck turned k of the way to vertical at the spine, the neck and head k of the way back
 *  to the chest's line, the shoulders keeping their turn in the world (the arms hang as they were captured). Its back's
 *  bones are not held to its source's directions there. */
export function eased(c, k) {
	const up = new Vector3(0, 1, 0);
	for (const f of c.frames) {
		const { P, Q } = targetFK(f.q);
		const was = { left: Q.leftShoulder.clone(), right: Q.rightShoulder.clone() };
		const lean = P.neck.clone().sub(P.hips).normalize();
		const turn = new Quaternion().slerp(new Quaternion().setFromUnitVectors(lean, up), k);
		// the spine turned in the world by `turn`, about its own joint
		f.q.spine = Q.hips.clone().invert().multiply(turn).multiply(Q.hips).multiply(f.q.spine ?? new Quaternion());
		for (const b of ['neck', 'head']) f.q[b] = new Quaternion().slerp(f.q[b] ?? new Quaternion(), 1 - k);
		const now = targetFK(f.q).Q;
		for (const s of ['left', 'right']) f.q[`${s}Shoulder`] = now.upperChest.clone().invert().multiply(was[s]);
	}
	c.eased = BACK;
	return c;
}

/** the floor under it: where its ankles are lowest, as the target's ankle stands at rest */
function floorOf(c) {
	let lo = Infinity;
	for (const f of c.frames) {
		const { P } = targetFK(f.q, f.hips);
		lo = Math.min(lo, P.leftFoot.y, P.rightFoot.y);
	}
	return lo - T.leftFoot.v.y;
}
const q4 = (q) => {
	const s = q.w < 0 ? -1 : 1;
	return [Math.round(q.x * s * 1e4), Math.round(q.y * s * 1e4), Math.round(q.z * s * 1e4)];
};
const rows = (list, indent, w = 110) => {
	const out = [];
	let line = '';
	for (const x of list) {
		const s = `${x},`;
		if (line.length + s.length > w) (out.push(line), (line = ''));
		line += s;
	}
	if (line) out.push(line);
	return out.map((l) => indent + l).join('\n');
};

/** one clip as data: the bones it turns (others at rest), each frame's turn as x, y, z of a unit quaternion (w ≥ 0)
 *  in ten-thousandths; the hips' place in millimetres from the hips at rest (a person of 1.80 m) */
function write(name, c, meta) {
	const floor = floorOf(c);
	const F = c.frames;
	const used = c.bones.filter((bn) => F.some((f) => f.q[bn].angleTo(new Quaternion()) > 2e-3));
	const hips = F.flatMap((f) => [Math.round((f.hips.x - T.hips.v.x) * 1000), Math.round((f.hips.y - floor - T.hips.v.y) * 1000), Math.round((f.hips.z - T.hips.v.z) * 1000)]);
	const lines = [`\t${JSON.stringify(name)}: {`];
	for (const [k, v] of Object.entries({ ...meta, fps: c.fps, frames: F.length })) lines.push(`\t\t${k}: ${JSON.stringify(v)},`);
	lines.push(`\t\thips: [\n${rows(hips, '\t\t\t')}\n\t\t],`);
	lines.push('\t\tturns: {');
	for (const bn of used) lines.push(`\t\t\t${bn}: [\n${rows(F.flatMap((f) => q4(f.q[bn])), '\t\t\t\t')}\n\t\t\t],`);
	lines.push('\t\t}\n\t},');
	return lines.join('\n');
}

const BY = { accad: 'ACCAD Open Motion Project', style: '100STYLE', ual: "Quaternius' Universal Animation Library (Standard)" };
const LIC = { accad: 'CC BY 3.0', style: 'CC BY 4.0', ual: 'CC0 1.0' };
/** [name, kind, file, t0, t1, { cycle, loop, anim, fps, ease, kind }] */
export const CLIPS = {
	man: [
		['walk', 'accad', 'Male2_B3_Walk', 317 / 120, 437 / 120, { kind: 'cycle' }],
		['run', 'accad', 'Male2_C3_Run', 11.6 / 30, 34.4 / 30, { kind: 'cycle' }],
		['idle', 'style', 'Neutral_ID', 15.1, 21.2, { kind: 'loop', fps: 15 }],
		['start', 'accad', 'Male2_B1_StandToWalk', 0.4, 2.4, { kind: 'once' }],
		['stop', 'accad', 'Male2_B2_WalkToStand', 0.6, 3.2, { kind: 'once' }]
	],
	elder: [
		['walk', 'accad', 'Female1_B14_WalkTurnRight135', 214 / 30, 250 / 30, { kind: 'cycle' }],
		['run', 'style', 'Old_FR', 869 / 60, 915 / 60, { kind: 'cycle', ease: 0.5 }],
		['idle', 'style', 'Old_ID', 22.5, 28.5, { kind: 'loop', fps: 15, ease: 1 }],
		['start', 'accad', 'Male2_B1_StandToWalk', 0.4, 2.4, { kind: 'once' }],
		['stop', 'accad', 'Female1_B02_WalkToStandT2', 0.8, 3.4, { kind: 'once' }]
	],
	actions: [
		['sit down', 'ual', 'Sitting_Enter', 0, 1.3, { kind: 'once' }],
		['sitting', 'ual', 'Sitting_Idle_Loop', 0, 1.6667, { kind: 'loop' }],
		['stand up', 'ual', 'Sitting_Exit', 0, 1.0333, { kind: 'once' }],
		['hands', 'ual', 'Idle_Loop', 0, 0, { kind: 'pose' }],
		['wave', 'accad', 'Female1_D1_Urban', 0.7, 2.7, { kind: 'once' }],
		['pick up', 'accad', 'Male2_A5_PickUpBox', 1.2, 4.8, { kind: 'once' }]
	]
};
const HEAD = {
	man: "MOTION: A MAN'S GAIT — walk, run, idle, start and stop",
	elder: "MOTION: AN ELDER'S GAIT — walk, a hurried shuffle, idle, start and stop",
	actions: 'MOTION: EVERYDAY ACTIONS — sit down, sitting, stand up, the hands at rest, a wave, pick up'
};
export function make(kind, file, t0, t1, o) {
	const c = cut(kind, kind === 'ual' ? UAL(o.kind === 'cycle') : kind === 'accad' ? accad(file) : style(file), t0, t1, kind === 'ual' ? file : undefined, o.fps ?? 30);
	settle(c, { cycle: o.kind === 'cycle' });
	if ((o.kind === 'cycle' || o.kind === 'loop') && !process.env.NOCLOSE) close(c);
	if (o.ease) eased(c, o.ease);
	return c;
}
if (process.argv[1] === new URL(import.meta.url).pathname)
	for (const [set, list] of Object.entries(CLIPS)) {
		if (process.argv[2] && process.argv[2] !== set) continue;
		const parts = [], sources = {};
		for (const [name, kind, file, t0, t1, o] of list) {
			const c = make(kind, file, t0, t1, o);
			const from = `${BY[kind]}, ${kind === 'ual' ? file : `${file}.bvh`}, ${t0.toFixed(2)}–${t1.toFixed(2)} s${o.ease ? `, its back eased ${Math.round(o.ease * 100)}% of the way upright` : ''}`;
			const meta = { kind: o.kind, from, licence: LIC[kind], ...(o.kind === 'cycle' ? { stride: +c.stride.toFixed(3) } : {}) };
			parts.push(write(name, c, meta));
			sources[name] = { from, eased: c.eased ?? [], bones: c.bones, dirs: c.frames.map((f) => c.bones.flatMap((b) => f.dir[b].toArray().map((x) => Math.round(x * 1e4)))) };
			console.log(set, name, c.frames.length, 'frames', meta.stride ? `stride ${meta.stride} m` : '');
		}
		const text = `/*
 * ${HEAD[set]}, as data: motion capture retargeted onto the VRM humanoid skeleton (the piece "Person skeleton"),
 * every bone lined up with its source's by a whole frame (where it points and how it is rolled), at 30 frames a
 * second (an idle at 15). Each clip names where it was cut from and its licence (CC0, CC BY or public domain only;
 * the credits are on the cards and in the data sheet). Its turns: for each bone it moves, each frame's turn from its
 * rest as the x, y and z of a unit quaternion (w ≥ 0) in ten-thousandths; its hips: their place in millimetres from
 * where they rest, in a person of 1.80 m standing on the floor at y 0 and facing +z. A cycle is one stride (left foot
 * down to left foot down) with its march taken out, \`stride\` metres long as it was captured; a loop repeats; once
 * plays once. Made by tools/motion/convert.mjs (intent b9e6ad45).
 */
module.exports = {
${parts.join('\n')}
};
`;
		writeFileSync(`${HERE}pieces/clips-${set}.js`, text);
		writeFileSync(`${HERE}sources/${set}.json.gz`, gzipSync(JSON.stringify(sources)));
		console.log(`pieces/clips-${set}.js`, (text.length / 1024).toFixed(0), 'kB');
	}

// The clips, cut from the captures, retargeted, cleaned and written as readable data pieces (pieces/clips-*.js).
import { readBVH, readGLB, THREE } from './mocap.mjs';
import { retarget, targetFK, TARGET, T } from './retarget.mjs';
import { writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
const { Vector3, Quaternion } = THREE;
const FPS = 30;
const accad = (n) => execSync(`find /tmp/claude-0/data/accad -name ${n}.bvh`).toString().trim();
const style = (n) => `/tmp/claude-0/data/style/100STYLE/${n.split('_')[0]}/${n}.bvh`;
const UAL = '/tmp/claude-0/data/ual/x/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb';

/** a capture's frames from t0 to t1 (s), resampled to FPS */
export function cut(kind, file, t0, t1, anim, FPS = 30) {
	const src = kind === 'ual' ? readGLB(file, anim) : readBVH(file);
	const a = Math.max(0, Math.floor(t0 * src.fps) - 1), b = Math.min(src.frames.length, Math.ceil(t1 * src.fps) + 2);
	const r = retarget(src, kind, { frames: [a, b] });
	const n = Math.round((t1 - t0) * FPS) + 1;
	const out = [];
	for (let i = 0; i < n; i++) {
		const x = (t0 + i / FPS) * src.fps - a;
		const k = Math.max(0, Math.min(r.frames.length - 2, Math.floor(x))), u = Math.max(0, Math.min(1, x - k));
		const f0 = r.frames[k], f1 = r.frames[k + 1];
		const q = {};
		for (const bn of r.bones) q[bn] = f0.q[bn].clone().slerp(f1.q[bn], u);
		out.push({ q, hips: f0.hips.clone().lerp(f1.hips, u) });
	}
	return { frames: out, bones: r.bones, src, fps: FPS };
}

/** turned and moved so it starts facing +z with its hips over the origin; a cycle also has its march taken out
 *  (`march`: the average step per frame removed) */
export function settle(c, { cycle = false } = {}) {
	const F = c.frames, n = F.length;
	const fwd = (q) => new Vector3(0, 0, 1).applyQuaternion(q);
	let dir;
	if (cycle) dir = F[n - 1].hips.clone().sub(F[0].hips);
	else dir = fwd(F[0].q.hips);
	dir.y = 0;
	const yaw = Math.atan2(dir.x, dir.z);
	const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -yaw);
	const o = F[0].hips.clone();
	const step = cycle ? F[n - 1].hips.clone().sub(F[0].hips).divideScalar(n - 1) : new Vector3();
	step.y = 0;
	for (let i = 0; i < n; i++) {
		F[i].q.hips = turn.clone().multiply(F[i].q.hips);
		const p = F[i].hips.clone().sub(o).sub(step.clone().multiplyScalar(i));
		p.applyQuaternion(turn);
		F[i].hips = new Vector3(p.x, F[i].hips.y, p.z);
	}
	c.stride = cycle ? step.length() * (n - 1) : 0;
	return c;
}

/** its last frame made its first again: what is off between them spread over the clip (a loop that does not jump) */
export function close(c) {
	const F = c.frames, n = F.length;
	for (const bn of c.bones) {
		const d = F[0].q[bn].clone().multiply(F[n - 1].q[bn].clone().invert()); // end → start
		if (d.w < 0) d.set(-d.x, -d.y, -d.z, -d.w);
		for (let i = 0; i < n; i++) {
			const k = i / (n - 1);
			const part = new Quaternion().slerp(d, k);
			F[i].q[bn] = part.multiply(F[i].q[bn]);
		}
	}
	const dh = F[0].hips.clone().sub(F[n - 1].hips);
	for (let i = 0; i < n; i++) F[i].hips.add(dh.clone().multiplyScalar(i / (n - 1)));
	F.pop(); // the last is the first again
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
/** numbers written as rows no longer than `w` characters */
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

export /** the spine, neck and head */
const BACK = ['spine', 'chest', 'upperChest', 'neck', 'head'];
/** an old person's stoop, as 100STYLE's Old idle holds it (10–18 s, past its calibration): each of BACK's turns,
 *  averaged */
let stoopCache = null;
function stoop() {
	if (stoopCache) return stoopCache;
	const c = settle(cut('style', style('Old_ID'), 10, 18, undefined, 15));
	stoopCache = {};
	for (const b of BACK) {
		const sum = new THREE.Vector4();
		for (const f of c.frames) {
			const q = f.q[b];
			const sgn = q.w < 0 ? -1 : 1;
			sum.add(new THREE.Vector4(q.x * sgn, q.y * sgn, q.z * sgn, q.w * sgn));
		}
		sum.normalize();
		stoopCache[b] = new Quaternion(sum.x, sum.y, sum.z, sum.w);
	}
	return stoopCache;
}
/** k of the old stoop laid over a clip's back (an elder's: half) */
export function stooped(c, k = 0.5) {
	const S = stoop();
	for (const f of c.frames) for (const b of BACK) f.q[b] = new Quaternion().slerp(S[b], k).multiply(f.q[b]);
	return c;
}
/** a clip's back eased k of the way to upright (the Old style's, which leans further than a person we show) */
export function eased(c, k = 0.5) {
	for (const f of c.frames) for (const b of BACK) f.q[b] = new Quaternion().slerp(f.q[b], k);
	return c;
}

export const CLIPS = {
	man: [
		['walk', () => close(settle(cut('accad', accad('Male2_B3_Walk'), 195 / 120, 315 / 120), { cycle: true })), { kind: 'cycle', from: 'ACCAD Open Motion Project, Male2_B3_Walk.bvh, 1.62–2.62 s', licence: 'CC BY 3.0' }],
		['run', () => close(settle(cut('accad', accad('Male2_C3_Run'), 6 / 120, 6 / 120 + 0.8), { cycle: true })), { kind: 'cycle', from: 'ACCAD Open Motion Project, Male2_C3_Run.bvh, 0.05–0.85 s', licence: 'CC BY 3.0' }],
		['idle', () => close(settle(cut('style', style('Neutral_ID'), 9, 17, undefined, 15))), { kind: 'loop', from: '100STYLE, Neutral_ID.bvh, 9–17 s', licence: 'CC BY 4.0' }],
		['start', () => settle(cut('accad', accad('Male2_B1_StandToWalk'), 0.4, 2.4)), { kind: 'once', from: 'ACCAD Open Motion Project, Male2_B1_StandToWalk.bvh, 0.4–2.4 s', licence: 'CC BY 3.0' }],
		['stop', () => settle(cut('accad', accad('Male2_B2_WalkToStand'), 0.6, 3.2)), { kind: 'once', from: 'ACCAD Open Motion Project, Male2_B2_WalkToStand.bvh, 0.6–3.2 s', licence: 'CC BY 3.0' }]
	],
	elder: [
		['walk', () => stooped(close(settle(cut('accad', accad('Female1_B03_Walk1'), 12 / 30, 12 / 30 + 1.4333), { cycle: true }))), { kind: 'cycle', from: 'ACCAD Open Motion Project, Female1_B03_Walk1.bvh, 0.40–1.83 s, with half the stoop of 100STYLE Old_ID.bvh (10–18 s) laid over its back', licence: 'CC BY 3.0; CC BY 4.0' }],
		['run', () => eased(close(settle(cut('style', style('Old_FR'), 869 / 60, 915 / 60), { cycle: true }))), { kind: 'cycle', from: '100STYLE, Old_FR.bvh, 14.48–15.25 s (an old person hurrying), its back eased half way upright', licence: 'CC BY 4.0' }],
		['idle', () => eased(close(settle(cut('style', style('Old_ID'), 10, 18, undefined, 15)))), { kind: 'loop', from: '100STYLE, Old_ID.bvh, 10–18 s, its back eased half way upright', licence: 'CC BY 4.0' }],
		['start', () => stooped(settle(cut('accad', accad('Female1_B01_StandToWalk'), 0.6, 2.8))), { kind: 'once', from: 'ACCAD Open Motion Project, Female1_B01_StandToWalk.bvh, 0.6–2.8 s, with half the Old stoop', licence: 'CC BY 3.0; CC BY 4.0' }],
		['stop', () => stooped(settle(cut('accad', accad('Female1_B02_WalkToStand'), 0.8, 3.4))), { kind: 'once', from: 'ACCAD Open Motion Project, Female1_B02_WalkToStand.bvh, 0.8–3.4 s, with half the Old stoop', licence: 'CC BY 3.0; CC BY 4.0' }]
	],
	actions: [
		['sit down', () => settle(cut('ual', UAL, 0, 1.3, 'Sitting_Enter')), { kind: 'once', from: 'Quaternius Universal Animation Library (Standard), Sitting_Enter', licence: 'CC0 1.0' }],
		['sitting', () => close(settle(cut('ual', UAL, 0, 1.6667, 'Sitting_Idle_Loop'))), { kind: 'loop', from: 'Quaternius Universal Animation Library (Standard), Sitting_Idle_Loop', licence: 'CC0 1.0' }],
		['stand up', () => settle(cut('ual', UAL, 0, 1.0333, 'Sitting_Exit')), { kind: 'once', from: 'Quaternius Universal Animation Library (Standard), Sitting_Exit', licence: 'CC0 1.0' }],
		['hands', () => settle(cut('ual', UAL, 0, 0, 'Idle_Loop')), { kind: 'pose', from: 'Quaternius Universal Animation Library (Standard), Idle_Loop, first frame (the fingers at rest)', licence: 'CC0 1.0' }],
		['wave', () => settle(cut('accad', accad('Female1_D1_Urban'), 0.7, 2.7)), { kind: 'once', from: 'ACCAD Open Motion Project, Female1_D1_Urban.bvh, 0.7–2.7 s (a hand raised in greeting)', licence: 'CC BY 3.0' }],
		['pick up', () => settle(cut('accad', accad('Male2_A5_PickUpBox'), 1.2, 4.8)), { kind: 'once', from: 'ACCAD Open Motion Project, Male2_A5_PickUpBox.bvh, 1.2–4.8 s', licence: 'CC BY 3.0' }]
	]
};
const HEAD = {
	man: 'MOTION: A MAN\'S GAIT — walk, run, idle, start and stop',
	elder: 'MOTION: AN ELDER\'S GAIT — walk, a hurried shuffle, idle, start and stop',
	actions: 'MOTION: EVERYDAY ACTIONS — sit down, sitting, stand up, the hands at rest, a wave, pick up'
};
if (!process.env.NOWRITE) for (const [set, list] of Object.entries(CLIPS)) {
	if (process.argv[2] && process.argv[2] !== set) continue;
	const parts = [];
	for (const [name, make, meta] of list) {
		const c = make();
		if (meta.kind === 'cycle') meta.stride = +c.stride.toFixed(3);
		console.log(set, name, c.frames.length, 'frames', meta.stride ? `stride ${meta.stride} m` : '');
		parts.push(write(name, c, meta));
	}
	const text = `/*
 * ${HEAD[set]}, as data: motion capture retargeted onto the VRM humanoid skeleton (the piece "Person skeleton"),
 * at 30 frames a second (an idle at 15). Each clip names where it was cut from and its licence (CC0, CC BY or public domain only;
 * the credits are on the cards and in the data sheet). Its turns: for each bone it moves, each frame's turn from its
 * rest as the x, y and z of a unit quaternion (w ≥ 0) in ten-thousandths; its hips: their place in millimetres from
 * where they rest, in a person of 1.80 m standing on the floor at y 0 and facing +z. A cycle is one stride (left foot
 * down to left foot down) with its march taken out, \`stride\` metres long as it was captured; a loop repeats; once
 * plays once. Made by the retargeter kept on the branch intent/99b612ec-people-move (play/actors-work/convert.mjs).
 */
module.exports = {
${parts.join('\n')}
};
`;
	writeFileSync(`pieces/clips-${set}.js`, text);
	console.log(`pieces/clips-${set}.js`, (text.length / 1024).toFixed(0), 'kB');
}

// Retargeting a capture onto the VRM skeleton (pieces/skeleton.js). Every target bone takes its source joint's turn in
// the world since the source stood still (`stand`: a frame of the same performer standing relaxed, arms hanging, as the
// target rests; a capture's own zero pose need not be a pose at all: ACCAD's leans its back 54° and lays its hips
// across z), applied to the target's rest after the two are lined up bone by bone by a whole frame: the bone's
// direction (to its child, or its tip) and the body's forward made square to it (the body's up where the bone points
// forward: a foot, a toe). So a bone's roll is lined up too, not only where it points: a knee bends forward, a palm
// faces in. One way for every source (ACCAD's and 100STYLE's BVH, Quaternius' glTF) and every bone. Gives each frame's
// local turns (quaternions, relative to the target's rest) and the hips' place.
import { THREE, fk, jointIndex } from './mocap.mjs';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const SK = req('./pieces/skeleton.js');
const { Vector3, Quaternion, Matrix4 } = THREE;

export const TARGET = SK.bones();
export const TIPS = SK.tips();
export const T = Object.fromEntries(TARGET.map((b, i) => [b.name, { ...b, i, v: new Vector3(...b.at) }]));
const tv = (n) => (n.endsWith('.tip') ? new Vector3(...TIPS[n.slice(0, -4)]) : T[n].v);

/** the target's own line for each bone: [from, to] (a bone's place, or '<bone>.tip' where it ends); the hips' across
 *  them, the line every source's hips carry rigidly (ACCAD's back turns apart from its hips) */
export const LINE = { hips: ['rightUpperLeg', 'leftUpperLeg'], spine: ['spine', 'chest'], chest: ['chest', 'upperChest'], upperChest: ['upperChest', 'neck'], neck: ['neck', 'head'], head: ['head', 'head.tip'] };
/** each source's joints for the target's bones: [the joint whose turn it takes, from, to] (`to` a joint or
 *  '<joint>.tip', its end site) */
export const MAPS = {
	style: { hips: ['Hips', 'RightHip', 'LeftHip'], spine: ['Chest', 'Chest', 'Chest2'], chest: ['Chest2', 'Chest2', 'Chest3'], upperChest: ['Chest4', 'Chest4', 'Neck'], neck: ['Neck', 'Neck', 'Head'], head: ['Head', 'Head', 'Head.tip'] },
	accad: { hips: ['Hips', 'RightUpLeg', 'LeftUpLeg'], spine: ['Spine', 'Spine', 'Spine1'], chest: ['Spine1', 'Spine1', 'Neck'], upperChest: ['Spine1', 'Spine1', 'Neck'], neck: ['Neck', 'Neck', 'Head'], head: ['Head', 'Head', 'Head.tip'] },
	ual: { hips: ['pelvis', 'thigh_r', 'thigh_l'], spine: ['spine_01', 'spine_01', 'spine_02'], chest: ['spine_02', 'spine_02', 'spine_03'], upperChest: ['spine_03', 'spine_03', 'neck_01'], neck: ['neck_01', 'neck_01', 'Head'], head: ['Head', 'Head', 'Head.tip'] }
};
/** the joints each source names its hips' left and right by, for its forward */
const HIPS = { style: ['LeftHip', 'RightHip'], accad: ['LeftUpLeg', 'RightUpLeg'], ual: ['thigh_l', 'thigh_r'] };
for (const [kind, o] of Object.entries(MAPS))
	for (const [s, S, l] of [['left', 'Left', 'l'], ['right', 'Right', 'r']]) {
		const j = {
			style: { sh: `${S}Collar`, ua: `${S}Shoulder`, la: `${S}Elbow`, h: `${S}Wrist`, ul: `${S}Hip`, ll: `${S}Knee`, f: `${S}Ankle`, t: `${S}Toe` },
			accad: { sh: `${S}Shoulder`, ua: `${S}Arm`, la: `${S}ForeArm`, h: `${S}Hand`, ul: `${S}UpLeg`, ll: `${S}Leg`, f: `${S}Foot`, t: `${S}ToeBase` },
			ual: { sh: `clavicle_${l}`, ua: `upperarm_${l}`, la: `lowerarm_${l}`, h: `hand_${l}`, ul: `thigh_${l}`, ll: `calf_${l}`, f: `foot_${l}`, t: `ball_${l}` }
		}[kind];
		const hand = kind === 'ual' ? `middle_01_${l}` : `${j.h}.tip`, toe = kind === 'ual' ? `ball_leaf_${l}` : `${j.t}.tip`;
		Object.assign(o, {
			[`${s}Shoulder`]: [j.sh, j.sh, j.ua], [`${s}UpperArm`]: [j.ua, j.ua, j.la], [`${s}LowerArm`]: [j.la, j.la, j.h], [`${s}Hand`]: [j.h, j.h, hand],
			[`${s}UpperLeg`]: [j.ul, j.ul, j.ll], [`${s}LowerLeg`]: [j.ll, j.ll, j.f], [`${s}Foot`]: [j.f, j.f, j.t], [`${s}Toes`]: [j.t, j.t, toe]
		});
		Object.assign(LINE, {
			[`${s}Shoulder`]: [`${s}Shoulder`, `${s}UpperArm`], [`${s}UpperArm`]: [`${s}UpperArm`, `${s}LowerArm`], [`${s}LowerArm`]: [`${s}LowerArm`, `${s}Hand`], [`${s}Hand`]: [`${s}Hand`, `${s}MiddleProximal`],
			[`${s}UpperLeg`]: [`${s}UpperLeg`, `${s}LowerLeg`], [`${s}LowerLeg`]: [`${s}LowerLeg`, `${s}Foot`], [`${s}Foot`]: [`${s}Foot`, `${s}Toes`], [`${s}Toes`]: [`${s}Toes`, `${s}Toes.tip`]
		});
		for (const [f, u] of Object.entries({ thumb: 'thumb', index: 'index', middle: 'middle', ring: 'ring', little: 'pinky' })) {
			const names = SK.FINGERS[f].bones.map((b) => `${s}${SK.cap(f)}${b}`);
			names.forEach((n, k) => {
				LINE[n] = [n, k < 2 ? names[k + 1] : `${n}.tip`];
				if (kind === 'ual') o[n] = [`${u}_0${k + 1}_${l}`, `${u}_0${k + 1}_${l}`, k < 2 ? `${u}_0${k + 2}_${l}` : `${u}_04_leaf_${l}`];
			});
		}
	}

/** a frame from a bone's direction and the body's forward made square to it (its up where the bone points along it;
 *  with no `up`, `fwd` taken as it is: a hinge's axis) */
function frame(d, fwd, up) {
	const x = d.clone().normalize();
	const a = up && Math.abs(x.dot(fwd)) > 0.7 ? up : fwd;
	const z = new Vector3().crossVectors(x, a).normalize();
	return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, new Vector3().crossVectors(z, x), z));
}
/** each hinge's upper bone: [the bone below it, the bone below that, the way it flexes about (u × l as it bends: a knee
 *  +x, an elbow −x, a left finger −z and a right +z, the hands hanging palm in)]; its axis the skeleton's own, from how
 *  its rest is bent where it bends that way (the knee's plane turned out 11°), else that way */
export const HINGE = {};
for (const [s, k] of [['left', -1], ['right', 1]]) {
	Object.assign(HINGE, { [`${s}UpperLeg`]: [`${s}LowerLeg`, `${s}Foot`, new Vector3(1, 0, 0)], [`${s}UpperArm`]: [`${s}LowerArm`, `${s}Hand`, new Vector3(-1, 0, 0)] });
	for (const f of ["Index", "Middle", "Ring", "Little"]) HINGE[`${s}${f}Proximal`] = [`${s}${f}Intermediate`, `${s}${f}Distal`, new Vector3(0, 0, k)];
}
for (const [n, [m, e, way]] of Object.entries(HINGE)) {
	const u = T[m].v.clone().sub(T[n].v), l = T[e].v.clone().sub(T[m].v), x = new Vector3().crossVectors(u, l);
	// (only a bend in the way it flexes: a finger's rest spreads it sideways, which is no hinge)
	HINGE[n][2] = u.angleTo(l) > 0.035 && Math.abs(x.normalize().dot(way)) > 0.7 ? x.multiplyScalar(Math.sign(x.dot(way))) : way;
}
/** a hinge's axis in its upper joint's own frame, averaged over every frame bent 20° or more (null where too few) */
function hingeAxis(frames, pos, j, top, mid, end) {
	const sum = new Vector3();
	let n = 0;
	for (const o of frames) {
		const u = pos(o, mid).clone().sub(pos(o, top)), l = pos(o, end).clone().sub(pos(o, mid));
		if (u.angleTo(l) < 0.35) continue;
		sum.add(new Vector3().crossVectors(u, l).normalize().applyQuaternion(o.q[j].clone().invert()));
		n++;
	}
	return n >= 5 && sum.length() > n * 0.5 ? sum.normalize() : null;
}
/** the body's forward and up at rest, from the skeleton itself (a capture's rest need not stand up in its world):
 *  up from the hips to the neck, made square to the line from its right hip to its left; forward across them */
function bodyAxes(left, right, hips, neck) {
	const across = left.clone().sub(right).normalize();
	const up = neck.clone().sub(hips);
	up.sub(across.clone().multiplyScalar(up.dot(across))).normalize();
	return { fwd: new Vector3().crossVectors(across, up).normalize(), up };
}

/** a source retargeted (`stand`: { src, frame }, the performer standing; the same skeleton): { frames: [{ q: { bone:
 *  Quaternion }, dir: { bone: its source's line }, hips: Vector3, feet }], fps, scale, bones } */
export function retarget(src, kind, { frames: range, stand } = {}) {
	const map = MAPS[kind];
	const pos = (o, name) => {
		if (!name.endsWith('.tip')) return o.p[jointIndex(src, name)];
		const k = jointIndex(src, name.slice(0, -4));
		return (src.joints[k].tip ?? src.joints[k].offset).clone().multiplyScalar(src.unit).applyQuaternion(o.q[k]).add(o.p[k]);
	};
	const rest = fk(stand.src, stand.src.frames[stand.frame]);
	const leg = (P, a, b, c) => P(a).distanceTo(P(b)) + P(b).distanceTo(P(c));
	const scale = leg(tv, 'leftUpperLeg', 'leftLowerLeg', 'leftFoot') / leg((n) => pos(rest, n), map.leftUpperLeg[0], map.leftLowerLeg[0], map.leftFoot[0]);
	const S = bodyAxes(pos(rest, HIPS[kind][0]), pos(rest, HIPS[kind][1]), pos(rest, map.hips[0]), pos(rest, map.neck[1]));
	const Tb = bodyAxes(tv('leftUpperLeg'), tv('rightUpperLeg'), tv('hips'), tv('neck'));
	// each bone's line-up: A turns the target's rest frame of the bone into the source's, standing
	const bones = TARGET.map((b) => b.name).filter((n) => map[n]);
	const [a, b] = range ?? [0, src.frames.length];
	const all = [];
	for (let f = a; f < b; f++) all.push(fk(src, src.frames[f]));
	// the whole take, for how its hinges hinge
	const whole = src.frames.filter((_, i) => i % 2 === 0).map((fr) => fk(src, fr));
	const A = {}, J = {}, R0i = {};
	for (const n of bones) {
		const [j, f, t] = map[n], [tf, tt] = LINE[n];
		J[n] = jointIndex(src, j);
		R0i[n] = rest.q[J[n]].clone().invert();
		const dt = tv(tt).clone().sub(tv(tf)), ds = pos(rest, t).clone().sub(pos(rest, f));
		// a hinge's upper bone is rolled by the hinge itself where the capture bends it (its axis found in the bone's own
		// frame, how it really hinges, whatever roll the performer stood in): the knee, the elbow, a finger's first joint
		const h = HINGE[n] && map[HINGE[n][0]] && hingeAxis(whole, (o, x) => pos(o, x), J[n], map[n][1], map[HINGE[n][0]][1], map[HINGE[n][0]][2]);
		if (h) {
			A[n] = frame(ds, h.clone().applyQuaternion(rest.q[J[n]]), null).multiply(frame(dt, HINGE[n][2], null).invert());
			continue;
		}
		// otherwise the target's frame chooses forward or up; the source's takes the same
		const useUp = Math.abs(dt.clone().normalize().dot(Tb.fwd)) > 0.7;
		const fs = useUp ? frame(ds, S.up, S.up) : frame(ds, S.fwd, S.fwd), ft = useUp ? frame(dt, Tb.up, Tb.up) : frame(dt, Tb.fwd, Tb.fwd);
		A[n] = fs.multiply(ft.invert());
	}
	const hipsJ = J.hips;
	const parentOf = Object.fromEntries(TARGET.map((b) => [b.name, b.parent]));
	const out = [];
	for (let f = a; f < b; f++) {
		const o = all[f - a];
		const G = {};
		for (const n of bones) G[n] = o.q[J[n]].clone().multiply(R0i[n]).multiply(A[n]);
		const q = {};
		for (const n of bones) {
			// the nearest mapped parent's world turn (a bone without a source of its own rests under it)
			let p = parentOf[n];
			while (p && !G[p]) p = parentOf[p];
			q[n] = (p ? G[p].clone().invert() : new Quaternion()).multiply(G[n]);
		}
		const at = (j) => pos(o, j).clone().multiplyScalar(scale);
		// the source's own line for each bone, what the clip is held to
		const dir = Object.fromEntries(bones.map((n) => [n, pos(o, map[n][2]).clone().sub(pos(o, map[n][1])).normalize()]));
		// and where its joints are (m, at the target's size), to draw it beside the person
		const pts = Object.fromEntries(bones.flatMap((n) => map[n].slice(1)).map((j) => [j, at(j)]));
		out.push({ q, dir, pts, hips: o.p[hipsJ].clone().multiplyScalar(scale), feet: { left: at(map.leftFoot[0]), right: at(map.rightFoot[0]), leftToe: at(map.leftToes[0]), rightToe: at(map.rightToes[0]) } });
	}
	return { frames: out, fps: src.fps, scale, bones };
}

/** the target's world places and turns in a pose (local quats by bone; the hips' place absolute, metres) */
export function targetFK(q, hips) {
	const P = {}, Q = {};
	for (const b of TARGET) {
		const lq = q[b.name] ?? new Quaternion();
		if (!b.parent) {
			Q[b.name] = lq.clone();
			P[b.name] = hips ? hips.clone() : T[b.name].v.clone();
		} else {
			P[b.name] = T[b.name].v.clone().sub(T[b.parent].v).applyQuaternion(Q[b.parent]).add(P[b.parent]);
			Q[b.name] = Q[b.parent].clone().multiply(lq);
		}
	}
	for (const [n, tip] of Object.entries(TIPS)) P[`${n}.tip`] = new Vector3(...tip).sub(T[n].v).applyQuaternion(Q[n]).add(P[n]);
	return { P, Q };
}

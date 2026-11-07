// Retargeting a capture onto the VRM skeleton (pieces/skeleton.js): each target bone takes its source joint's turn in
// the world since the source's rest (T-pose), applied to the target's rest after the two rests are lined up bone by
// bone (the bone's direction, and for the hips and chest the line across them too). Gives each frame's local turns
// (quaternions, relative to the target's rest) and the hips' place.
import { THREE, fk, restFrame, jointIndex } from './mocap.mjs';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const SK = req('./pieces/skeleton.js');
const { Vector3, Quaternion, Matrix4 } = THREE;

export const TARGET = SK.bones();
export const TIPS = SK.tips();
export const T = Object.fromEntries(TARGET.map((b, i) => [b.name, { ...b, i, v: new Vector3(...b.at) }]));
const tv = (n) => (T[n] ? T[n].v : new Vector3(...TIPS[n]));

/** the target's own directions for a bone: [from, to, acrossFrom?, acrossTo?] */
const DIRS = {};
const TDIR0 = {
	hips: ['hips', 'spine', 'rightUpperLeg', 'leftUpperLeg'],
	spine: ['spine', 'chest', 'rightUpperLeg', 'leftUpperLeg'],
	chest: ['chest', 'upperChest', 'rightUpperArm', 'leftUpperArm'],
	upperChest: ['upperChest', 'neck', 'rightUpperArm', 'leftUpperArm'],
	neck: ['neck', 'head'],
	head: ['neck', 'head', 'rightUpperArm', 'leftUpperArm']
};
/** each source's joints for the target's bones: [joint, from, to, acrossFrom?, acrossTo?] (directions between joints'
 *  places, the target's own between its bones; `to` a joint or '<joint>.tip' its end site) */
export const MAPS = {
	style: {
		hips: ['Hips', 'Hips', 'Chest', 'RightHip', 'LeftHip'],
		spine: ['Chest', 'Chest', 'Chest2', 'RightHip', 'LeftHip'],
		chest: ['Chest2', 'Chest2', 'Chest3', 'RightCollar', 'LeftCollar'],
		upperChest: ['Chest4', 'Chest4', 'Neck', 'RightCollar', 'LeftCollar'],
		neck: ['Neck', 'Neck', 'Head'],
		head: ['Head', 'Head', 'Head.tip'],
		...side('style')
	},
	accad: {
		// ACCAD's hips joint is twisted and its ToSpine untwists it: the back is read from where its joints are
		hips: ['@pos', 'Hips', 'Spine', 'RightUpLeg', 'LeftUpLeg'],
		spine: ['@pos', 'Spine', 'Spine1', 'RightUpLeg', 'LeftUpLeg'],
		chest: ['@pos', 'Spine', 'Spine1', 'RightArm', 'LeftArm'],
		upperChest: ['@pos', 'Spine1', 'Neck', 'RightArm', 'LeftArm'],
		neck: ['@pos', 'Neck', 'Head', 'RightArm', 'LeftArm'],
		head: ['Head', 'Head', 'Head.tip'],
		...side('accad')
	},
	ual: {
		hips: ['pelvis', 'pelvis', 'spine_01', 'thigh_r', 'thigh_l'],
		spine: ['spine_01', 'spine_01', 'spine_02', 'thigh_r', 'thigh_l'],
		chest: ['spine_02', 'spine_02', 'spine_03', 'clavicle_r', 'clavicle_l'],
		upperChest: ['spine_03', 'spine_03', 'neck_01', 'clavicle_r', 'clavicle_l'],
		neck: ['neck_01', 'neck_01', 'Head'],
		head: ['Head', null],
		...side('ual')
	}
};
function side(kind) {
	const o = {}, TDIR = (DIRS[kind] ??= { ...TDIR0 });
	for (const [s, S] of [['left', 'Left'], ['right', 'Right']]) {
		const l = s === 'left' ? 'l' : 'r';
		const j =
			kind === 'style'
				? { sh: `${S}Collar`, ua: `${S}Shoulder`, la: `${S}Elbow`, h: `${S}Wrist`, ul: `${S}Hip`, ll: `${S}Knee`, f: `${S}Ankle`, t: `${S}Toe` }
				: kind === 'accad'
					? { sh: `${S}Shoulder`, ua: `${S}Arm`, la: `${S}ForeArm`, h: `${S}Hand`, ul: `${S}UpLeg`, ll: `${S}Leg`, f: `${S}Foot`, t: `${S}ToeBase` }
					: { sh: `clavicle_${l}`, ua: `upperarm_${l}`, la: `lowerarm_${l}`, h: `hand_${l}`, ul: `thigh_${l}`, ll: `calf_${l}`, f: `foot_${l}`, t: `ball_${l}` };
		o[`${s}Shoulder`] = [j.sh, j.sh, j.ua];
		o[`${s}UpperArm`] = [j.ua, j.ua, j.la];
		o[`${s}LowerArm`] = [j.la, j.la, j.h];
		o[`${s}Hand`] = kind === 'ual' ? [j.h, j.h, `middle_01_${l}`, `index_01_${l}`, `pinky_01_${l}`] : [j.h, j.h, `${j.h}.tip`];
		o[`${s}UpperLeg`] = [j.ul, j.ul, j.ll];
		o[`${s}LowerLeg`] = [j.ll, j.ll, j.f];
		o[`${s}Foot`] = [j.f, j.f, j.t];
		o[`${s}Toes`] = [j.t, j.t, kind === 'ual' ? `ball_leaf_${l}` : `${j.t}.tip`];
		TDIR[`${s}Shoulder`] = [`${s}Shoulder`, `${s}UpperArm`];
		TDIR[`${s}UpperArm`] = [`${s}UpperArm`, `${s}LowerArm`];
		TDIR[`${s}LowerArm`] = [`${s}LowerArm`, `${s}Hand`];
		TDIR[`${s}Hand`] = kind === 'ual' ? [`${s}Hand`, `${s}MiddleProximal`, `${s}IndexProximal`, `${s}LittleProximal`] : [`${s}Hand`, `${s}MiddleProximal`];
		TDIR[`${s}UpperLeg`] = [`${s}UpperLeg`, `${s}LowerLeg`];
		TDIR[`${s}LowerLeg`] = [`${s}LowerLeg`, `${s}Foot`];
		TDIR[`${s}Foot`] = [`${s}Foot`, `${s}Toes`];
		TDIR[`${s}Toes`] = [`${s}Toes`, `${s}Toes`];
		if (kind === 'ual') {
			const F = { thumb: 'thumb', index: 'index', middle: 'middle', ring: 'ring', little: 'pinky' };
			for (const [f, u] of Object.entries(F)) {
				const names = SK.FINGERS[f].bones.map((b) => `${s}${SK.cap(f)}${b}`);
				names.forEach((n, k) => {
					o[n] = [`${u}_0${k + 1}_${l}`, `${u}_0${k + 1}_${l}`, k < 2 ? `${u}_0${k + 2}_${l}` : `${u}_04_leaf_${l}`];
					TDIR[n] = [n, k < 2 ? names[k + 1] : n];
				});
			}
		}
	}
	return o;
}

const basis = (d, a) => {
	const x = d.clone().normalize();
	if (!a || a.lengthSq() < 1e-10) return null;
	const z = new Vector3().crossVectors(x, a).normalize();
	const y = new Vector3().crossVectors(z, x);
	return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
};

/** a source retargeted: { frames: [{ q: { bone: Quaternion }, hips: Vector3 }], fps, scale, floor } */
export function retarget(src, kind, { frames: range } = {}) {
	const map = MAPS[kind];
	const pos = (o, name) => {
		if (name.endsWith('.tip')) {
			const k = jointIndex(src, name.slice(0, -4));
			const tip = src.joints[k].tip ?? src.joints[k].offset;
			return tip.clone().multiplyScalar(src.unit).applyQuaternion(o.q[k]).add(o.p[k]);
		}
		return o.p[jointIndex(src, name)];
	};
	const rest = fk(src, restFrame(src));
	// the scale: the target's leg (hip to ankle) over the source's
	const lenS = pos(rest, map.leftUpperLeg[0]).distanceTo(pos(rest, map.leftLowerLeg[0])) + pos(rest, map.leftLowerLeg[0]).distanceTo(pos(rest, map.leftFoot[0]));
	const lenT = tv('leftUpperLeg').distanceTo(tv('leftLowerLeg')) + tv('leftLowerLeg').distanceTo(tv('leftFoot'));
	const scale = lenT / lenS;
	// each bone's line-up: A maps the target's rest frame to the source's
	const bones = TARGET.map((b) => b.name).filter((n) => map[n]);
	const A = {}, J = {}, R0 = {}, POS = {};
	for (const n of bones) {
		const [j, f, t, af, at] = map[n];
		const [tf, tt, taf, tat] = DIRS[kind][n];
		if (j === '@pos') {
			// read from places: the source's frame of (dir, across) now, over the target's at rest
			const bt = basis(tv(tt).clone().sub(tv(tf)), tv(tat ?? 'leftUpperArm').clone().sub(tv(taf ?? 'rightUpperArm')));
			POS[n] = { f, t, af, at, inv: bt.invert() };
			continue;
		}
		J[n] = jointIndex(src, j);
		R0[n] = rest.q[J[n]].clone();
		// a leaf with nothing of its own to line up by: lined up as its parent is
		if (f === null) {
			A[n] = A[TARGET.find((b) => b.name === n).parent].clone();
			continue;
		}
		let ds = pos(rest, t).clone().sub(pos(rest, f));
		let dt = tv(tt).clone().sub(tv(tf));
		if (n.endsWith('Toes')) dt = new Vector3(...TIPS[n]).sub(tv(n));
		if (dt.lengthSq() < 1e-12 || ds.lengthSq() < 1e-12) {
			A[n] = new Quaternion();
			continue;
		}
		const bs = af ? basis(ds, pos(rest, at).clone().sub(pos(rest, af))) : null;
		const bt = taf ? basis(dt, tv(tat).clone().sub(tv(taf))) : null;
		A[n] = bs && bt ? bs.multiply(bt.invert()) : new Quaternion().setFromUnitVectors(dt.clone().normalize(), ds.clone().normalize());
	}
	const hipsJ = jointIndex(src, map.hips[0] === '@pos' ? map.hips[1] : map.hips[0]);
	const parentOf = Object.fromEntries(TARGET.map((b) => [b.name, b.parent]));
	const out = [];
	const [a, b] = range ?? [0, src.frames.length];
	let o;
	for (let f = a; f < b; f++) {
		o = fk(src, src.frames[f], o);
		const G = {};
		for (const n of bones) {
			if (POS[n]) {
				const x = POS[n];
				G[n] = basis(pos(o, x.t).clone().sub(pos(o, x.f)), pos(o, x.at).clone().sub(pos(o, x.af))).multiply(x.inv);
				continue;
			}
			G[n] = o.q[J[n]].clone().multiply(R0[n].clone().invert()).multiply(A[n]);
		}
		const q = {};
		for (const n of bones) {
			// the nearest mapped parent's world turn (a bone without a source of its own rests under it)
			let p = parentOf[n];
			let Gp = new Quaternion();
			while (p) {
				if (G[p]) {
					Gp = G[p];
					break;
				}
				p = parentOf[p];
			}
			q[n] = Gp.clone().invert().multiply(G[n]);
		}
		out.push({ q, hips: o.p[hipsJ].clone().multiplyScalar(scale), feet: { left: pos(o, map.leftFoot[0]).clone().multiplyScalar(scale), right: pos(o, map.rightFoot[0]).clone().multiplyScalar(scale), leftToe: pos(o, map.leftToes[0]).clone().multiplyScalar(scale), rightToe: pos(o, map.rightToes[0]).clone().multiplyScalar(scale) } });
	}
	return { frames: out, fps: src.fps, scale, bones };
}

/** the target's world places in a pose (local quats by bone; hips place absolute, metres) */
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
	for (const [n, tip] of Object.entries(TIPS)) {
		const owner = n; // a tip hangs from its bone
		P[`${n}.tip`] = new Vector3(...tip).sub(T[owner].v).applyQuaternion(Q[owner]).add(P[owner]);
	}
	return { P, Q };
}

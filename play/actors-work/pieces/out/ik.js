/*
 * GAIT AND REACH — how an actor's limbs are placed: a skeleton posed by reckoning (`skeleton`), two bones bent so the
 * far end reaches a point (`reach`: a thigh and a shin to where a foot is put down, a neck's two halves to a beak), a
 * bone pointed along a direction (`aim`, `point`), and the animals' gaits by distance (`foot`, `footAt`, `bobOf`).
 * The animals' own module ($lib/actors/motion.ts, as their versions were built with it), word for word: one IK for
 * people and animals alike, kept once here.
 */
const three = require('three');

const TAU = /* @__PURE__ */ (() => Math.PI * 2)();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => {
	const t = clamp(x, 0, 1);
	return t * t * (3 - 2 * t);
};
const frac = (x) => x - Math.floor(x);
/** A skeleton at rest, to pose by reckoning: where each bone's joint goes when the bones above it are turned. */
function skeleton(bones) {
	const by = new Map(bones.map((b) => [b.name, b]));
	const root = bones[0].name;
	const e = new three.Euler(), q = new three.Quaternion(), v = new three.Vector3(), s = new three.Vector3(), own = new three.Matrix4();
	/** the frame of a bone as posed: its joint at the origin, turned as it and every bone above it are (model space) */
	const frame = (pose, name, out = new three.Matrix4()) => {
		const b = by.get(name);
		if (b.parent) frame(pose, b.parent, out);
		const t = pose[name];
		q.setFromEuler(e.set(t?.[0] ?? 0, t?.[1] ?? 0, t?.[2] ?? 0));
		const k = t?.[3] ?? 1;
		s.set(k, k, k);
		if (!b.parent) {
			const r = pose.root ?? [
				0,
				0,
				0
			];
			return out.compose(v.set(b.at[0] + r[0], b.at[1] + r[1], b.at[2] + r[2]), q, s);
		}
		const p = by.get(b.parent);
		return out.multiply(own.compose(v.set(b.at[0] - p.at[0], b.at[1] - p.at[1], b.at[2] - p.at[2]), q, s));
	};
	/** where a bone's joint is, as posed */
	const joint = (pose, name) => new three.Vector3().setFromMatrixPosition(frame(pose, name));
	/** the frame a bone turns in: its parent's, moved to its joint */
	const seat = (pose, name) => {
		const b = by.get(name);
		if (!b.parent) {
			const r = pose.root ?? [
				0,
				0,
				0
			];
			return new three.Matrix4().makeTranslation(b.at[0] + r[0], b.at[1] + r[1], b.at[2] + r[2]);
		}
		const p = by.get(b.parent);
		return frame(pose, b.parent).multiply(new three.Matrix4().makeTranslation(b.at[0] - p.at[0], b.at[1] - p.at[1], b.at[2] - p.at[2]));
	};
	return {
		root,
		at: (name) => by.get(name).at,
		has: (name) => by.has(name),
		frame,
		joint,
		seat
	};
}
const phi = (y, z) => Math.atan2(z, y);
const setTurn = (pose, name, x) => {
	const t = pose[name] ?? [
		0,
		0,
		0
	];
	pose[name] = [
		x,
		t[1],
		t[2],
		...t.length === 4 ? [t[3]] : []
	];
};
/**
* Two bones (a thigh and a shin, a neck's two halves) bent so the far end of the second reaches `target` (model
* space): the pair swung the shortest way to point at it, then the joint between them bent, on the side it bends at
* rest, just enough for the far end to arrive. In three dimensions — a foot under a rolling body, a waddle's — and the
* bones twisted no more than the swing needs. `end`: the joint at the far end (the next bone's, or a point).
*/
function reach(sk, pose, a, b, end, target) {
	const A = sk.at(a), Bj = sk.at(b);
	const knee = new three.Vector3(Bj[0] - A[0], Bj[1] - A[1], Bj[2] - A[2]);
	const tip = new three.Vector3(end[0] - A[0], end[1] - A[1], end[2] - A[2]);
	const shin = tip.clone().sub(knee);
	const la = knee.length(), lb = shin.length();
	const to = target.clone().applyMatrix4(sk.seat(pose, a).invert());
	const d = clamp(to.length(), Math.abs(la - lb) * 1.01 + 1e-6, (la + lb) * .9995);
	const dir = to.normalize();
	const swing = new three.Quaternion().setFromUnitVectors(tip.clone().normalize(), dir);
	const k1 = knee.clone().applyQuaternion(swing).normalize();
	const axis = dir.clone().cross(k1);
	if (axis.lengthSq() < 1e-12) axis.set(1, 0, 0).applyQuaternion(swing);
	axis.normalize();
	const open = Math.acos(clamp((la * la + d * d - lb * lb) / (2 * la * d), -1, 1));
	const kd = dir.clone().applyAxisAngle(axis, open);
	const qa = new three.Quaternion().setFromUnitVectors(k1, kd).multiply(swing);
	const want = dir.multiplyScalar(d).sub(kd.multiplyScalar(la)).applyQuaternion(qa.clone().invert()).normalize();
	const qb = new three.Quaternion().setFromUnitVectors(shin.normalize(), want);
	setQuat(pose, a, qa);
	setQuat(pose, b, qb);
}
const euler = /* @__PURE__ */ (() => new three.Euler())();
/** a bone's turn as a quaternion (its size kept) */
function setQuat(pose, name, q) {
	euler.setFromQuaternion(q);
	const t = pose[name];
	pose[name] = [
		euler.x,
		euler.y,
		euler.z,
		...t && t.length === 4 ? [t[3]] : []
	];
}
/**
* A bone turned (about x, in its swing plane) so that it points along `dir` (model space), whatever its parents do:
* `tip`, the point it points to at rest.
*/
function aim(sk, pose, bone, tip, dir) {
	const at = sk.at(bone);
	const m = sk.seat(pose, bone);
	const local = dir.clone().transformDirection(m.invert());
	setTurn(pose, bone, phi(local.y, local.z) - phi(tip[1] - at[1], tip[2] - at[2]));
}
/**
* A bone turned (any way) so that it points along `dir` (model space), whatever its parents do: `tip`, the point it
* points to at rest. For limbs that do not swing in one plane (a frog's, folded out to the side).
*/
function point(sk, pose, bone, tip, dir) {
	const at = sk.at(bone);
	const local = dir.clone().transformDirection(sk.seat(pose, bone).invert());
	const rest = new three.Vector3(tip[0] - at[0], tip[1] - at[1], tip[2] - at[2]).normalize();
	setQuat(pose, bone, new three.Quaternion().setFromUnitVectors(rest, local));
}
/** A direction: the rest direction from a to b, turned by `angle` about x (positive: its far end swings back). */
const swung = (a, b, angle) => new three.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize().applyAxisAngle(new three.Vector3(1, 0, 0), angle);
/** A foot in the cycle: on the ground (`stance` true) or carried, how far through that it is (0…1). */
function foot(g, m, leg) {
	const p = frac(m.dist / g.stride + 1 - (g.feet[leg] ?? 0));
	return p < g.duty ? {
		stance: true,
		u: p / g.duty
	} : {
		stance: false,
		u: (p - g.duty) / (1 - g.duty)
	};
}
/**
* Where a foot is, from where it rests: forward (z) and up (y) in the body's frame. On the ground it slides back
* under the body exactly as the body moves on (it stays where it was put down); carried, it swings forward and up.
* `pace`: 0…1, how much of the gait is in it (0 standing: the foot at rest).
*/
function footAt(g, m, leg, pace = 1) {
	const f = foot(g, m, leg);
	const sweep = g.stride * g.duty;
	if (f.stance) return {
		...f,
		z: sweep * (.5 - f.u) * pace,
		y: 0
	};
	const u = smooth(f.u);
	const up = Math.sin(Math.PI * Math.pow(f.u, .75));
	return {
		...f,
		z: sweep * (u - .5) * pace,
		y: g.lift * up * Math.min(1, pace * 2)
	};
}
/** a motion at a pace on the spot: for showing a gait where nothing moves the actor (the Actors gallery) */
const onTheSpot = (t, speed, m) => m ?? {
	dist: t * speed,
	speed
};
/** the body's rise and fall over a stride: twice per cycle (a walk's), or `per` times */
const bobOf = (g, m, at = 0, per = 2) => Math.cos(TAU * per * (m.dist / g.stride - at));
/** a chain's segments swaying as a wave runs down it: `amp` at the root growing by `grow` a segment, `lag` (rad) a segment */
function wave(names, t, freq, amp, axis, lag = .6, grow = 1.25) {
	const out = {};
	names.forEach((n, i) => {
		const r = [
			0,
			0,
			0
		];
		r[axis] = amp * Math.pow(grow, i) * Math.sin(TAU * freq * t - lag * i);
		out[n] = r;
	});
	return out;
}


module.exports = { TAU, clamp, smooth, frac, skeleton, reach, setQuat, aim, point, swung, foot, footAt, onTheSpot, bobOf, wave };

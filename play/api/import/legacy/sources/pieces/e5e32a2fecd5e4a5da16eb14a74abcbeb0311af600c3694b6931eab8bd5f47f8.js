	const mound = new three.LatheGeometry(prof, 160);
	const pos = mound.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
		pos.setY(i, y * (1 - .04 * (.5 + .5 * noise3(x * 14, y * 14, z * 14, 5))));
	}
	mound.computeVertexNormals();
	const needle = (p) => {
		const h = hash(Math.round(p.x * 900) * 73856093 ^ Math.round(p.y * 900) * 19349663 ^ Math.round(p.z * 900) * 83492791, 11);
		return h < .42 ? "#6a4228" : h < .72 ? "#8a5230" : h < .95 ? "#3a2618" : "#a88a5a";
	};
	parts.push({
		geo: mound,
		color: needle,
		bone: "mound"
	});
	for (let k = 0; k < 26; k++) {
		const a = hash(k, 21) * Math.PI * 2, d = Math.sqrt(hash(k, 22)) * R * .9;
		const c = new three.Vector3(Math.cos(a) * d, surface(d) + .004, Math.sin(a) * d);
		const dir = new three.Vector3(Math.cos(a + 1.3 + hash(k, 23)), 0, Math.sin(a + 1.3 + hash(k, 23))).multiplyScalar(.04 + .05 * hash(k, 24));
		const a2 = c.clone().sub(dir).toArray(), b2 = c.clone().add(dir).toArray();
		parts.push({
			geo: limb(a2, b2, .003, .0025, { seg: 4 }),
			color: "#5a4030",
			bone: "mound"
		});
	}
	for (let k = 0; k < 14; k++) {
		const a = hash(k, 31) * Math.PI * 2, d = (.15 + .7 * hash(k, 32)) * R;
		parts.push({
			geo: egg([
				Math.cos(a) * d,
				surface(d) + .001,
				Math.sin(a) * d
			], [
				.012,
				.004,
				.012
			], [
				0,
				0,
				0
			], [8, 5]),
			color: "#120c08",
			bone: "mound"
		});
	}
	/** @type {{ name: string, d: number, way: number, speed: number, phase: number }[]} */
	const ants = [];
	for (let i = 0; i < 84; i++) {
		const d = i >= ON ? R * (1.1 + .5 * hash(i, 41)) : R * (.08 + .85 * Math.sqrt(hash(i, 41)));
		const way = hash(i, 42) < .5 ? 1 : -1;
		const name = `ant${i}`;
		bones.push({
			name,
			parent: "mound",
			at: [
				0,
				0,
				0
			]
		});
		parts.push(...antParts([
			d,
			surface(d) + .001,
			0
		], -way, 0, name, { low: true }));
		ants.push({
			name,
			d,
			way,
			speed: (.03 + .03 * hash(i, 43)) / d,
			phase: hash(i, 44) * 100
		});
	}
	const r = rig(bones, parts, animalMaterials(.8, {}));
	r.object.name = "ant-hill";
	/** how far an ant has gone round by t: on, a stop, on again; now and then the other way */
	const travel = (a, t, busy) => {
		const u = t + a.phase;
		const go = Math.max(0, wander(u, 2.5, a.phase * 7) + busy - .2);
		return a.way * a.speed * (u * .6 * busy + go * 1.8 + .4 * Math.sin(u * .7));
	};
	/** the colony in the sun @type {Clip} */
	const busy = (t) => Object.fromEntries(ants.map((a) => [a.name, [
		0,
		travel(a, t, 1) + a.phase,
		0
	]]));
	/** a cool morning: most still, a few moving @type {Clip} */
	const calm = (t) => Object.fromEntries(ants.map((a) => [a.name, [
		0,
		travel(a, t, .15) + a.phase,
		0
	]]));
	return {
		rig: r,
		clips: {
			busy,
			calm
		},
		first: "busy"
	};
}

//#endregion
//#region src/lib/actors/motion.ts
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

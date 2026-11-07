/*
 * A PERSON'S MOTION — clips of motion capture (the pieces "Motion: …", as data) played on a person's body (the piece
 * "Person body"), with their feet put down by the actors' one IK (`reach`, the piece "Gait and reach") so that a foot
 * on the ground stays where it was put down. Nothing here is drawn by hand: every turn of every bone comes from a
 * capture, and what this adds is how they are played and joined:
 *
 * - **walk** and **run**: one move each, blended by speed with the idle (idle below ~0.6 m/s, its stride above it),
 *   and with each other by whoever plays them (a world, a film: walk to about 2 m/s, run from there), each stride
 *   played by the distance walked (one stride every
 *   `stride` metres, the person's own, not the capture's: the feet are put back where the stride puts them). A foot
 *   on the ground is held there, a foot in the air carried from where it lifted to where it lands, and the hips
 *   lowered as far as the legs need. On a slope (`slope`, degrees, uphill ahead) or up stairs (`step`, the rise of
 *   each, one a step) each foot lands on the ground under it and the sole lies along it.
 * - **idle**, **sitting**: loops, in time. **start**, **stop**, **sit down**, **stand up**, **wave**, **pick up**:
 *   played once, in time, their feet held where they stand.
 * - **turn left**, **turn right**: a quarter turn on the spot over 1.6 s, the body from the idle, each foot stepped
 *   round by reach in turn, the inner foot first.
 *
 * `moves(build, { gait, actions, gears, strides, run, ground })`: { clips, gears } for an actor's cast, every clip
 * (t, m?) → its pose (each bone's turn as x, y, z angles, the root's place), m how it moves ({ dist, speed, turn }).
 */
const three = require('three');
const IK = require('87f6540d15a24f7164ff7080290b56bd1067a8e5e1a0357848f06b5314b41bdd');

const { Quaternion, Vector3, Matrix4 } = three;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => {
	const t = clamp((x - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
};
const frac = (x) => x - Math.floor(x);
const SIDES = ['left', 'right'];

/** one clip's data as numbers: each moved bone's quaternions (x, y, z, w) and the hips' place (m, scaled by s) */
function decode(c, s) {
	const n = c.frames;
	const turns = {};
	for (const [bone, list] of Object.entries(c.turns)) {
		const q = new Float32Array(n * 4);
		for (let i = 0; i < n; i++) {
			const x = list[i * 3] / 1e4, y = list[i * 3 + 1] / 1e4, z = list[i * 3 + 2] / 1e4;
			q[i * 4] = x;
			q[i * 4 + 1] = y;
			q[i * 4 + 2] = z;
			q[i * 4 + 3] = Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z));
		}
		turns[bone] = q;
	}
	const hips = Float32Array.from(c.hips, (x) => (x / 1000) * s);
	return { ...c, n, turns, hips, fps: c.fps };
}

/** a clip at frame x (a cycle or a loop wrapped round, once held at its ends): each bone's turn into `q` (a map of
 *  Quaternions), the hips' place into `h` */
function sample(c, x, q, h) {
	const n = c.n;
	let i, u, j;
	if (c.kind === 'once' || c.kind === 'pose') {
		x = clamp(x, 0, n - 1);
		i = Math.min(n - 1, Math.floor(x));
		j = Math.min(n - 1, i + 1);
		u = x - i;
	} else {
		x = frac(x / n) * n;
		i = Math.floor(x) % n;
		j = (i + 1) % n;
		u = x - Math.floor(x);
	}
	for (const bone in c.turns) {
		const T = c.turns[bone];
		const a = (q[bone] ??= new Quaternion());
		a.set(T[i * 4], T[i * 4 + 1], T[i * 4 + 2], T[i * 4 + 3]);
		qb.set(T[j * 4], T[j * 4 + 1], T[j * 4 + 2], T[j * 4 + 3]);
		a.slerp(qb, u);
	}
	const H = c.hips;
	// a cycle's hips come back round to where they started; once, hold the end
	h.set(H[i * 3] + (H[j * 3] - H[i * 3]) * u, H[i * 3 + 1] + (H[j * 3 + 1] - H[i * 3 + 1]) * u, H[i * 3 + 2] + (H[j * 3 + 2] - H[i * 3 + 2]) * u);
	return q;
}
const qb = new Quaternion();

/** quaternion `a` (at index a*4 of A) slerped towards b (at B[b*4]) by t, in place: three's Quaternion.slerp by the
 *  same sums, on numbers in arrays instead of objects (the box plays a move some 10,000 times) */
function slerpAt(A, a, B, b, t) {
	const i = a * 4, j = b * 4;
	let x = B[j], y = B[j + 1], z = B[j + 2], w = B[j + 3];
	let dot = A[i] * x + A[i + 1] * y + A[i + 2] * z + A[i + 3] * w;
	if (dot < 0) (x = -x), (y = -y), (z = -z), (w = -w), (dot = -dot);
	let s = 1 - t;
	if (dot < 0.9995) {
		// t 0 or 1: three's sums give A or B exactly (sin(0) / sin = 0, sin(theta) / sin = 1), so no sines are taken
		if (t === 0) return;
		if (t === 1) {
			A[i] = A[i] * 0 + x;
			A[i + 1] = A[i + 1] * 0 + y;
			A[i + 2] = A[i + 2] * 0 + z;
			A[i + 3] = A[i + 3] * 0 + w;
			return;
		}
		const theta = Math.acos(dot), sin = Math.sin(theta);
		s = Math.sin(s * theta) / sin;
		t = Math.sin(t * theta) / sin;
		A[i] = A[i] * s + x * t;
		A[i + 1] = A[i + 1] * s + y * t;
		A[i + 2] = A[i + 2] * s + z * t;
		A[i + 3] = A[i + 3] * s + w * t;
	} else {
		A[i] = A[i] * s + x * t;
		A[i + 1] = A[i + 1] * s + y * t;
		A[i + 2] = A[i + 2] * s + z * t;
		A[i + 3] = A[i + 3] * s + w * t;
		let l = Math.sqrt(A[i] * A[i] + A[i + 1] * A[i + 1] + A[i + 2] * A[i + 2] + A[i + 3] * A[i + 3]);
		if (l === 0) (A[i] = 0), (A[i + 1] = 0), (A[i + 2] = 0), (A[i + 3] = 1);
		else (l = 1 / l), (A[i] *= l), (A[i + 1] *= l), (A[i + 2] *= l), (A[i + 3] *= l);
	}
}
/** a clip at frame x as `sample` plays it, into Q (four numbers a bone, by the bone's index); with no Q its hips
 *  alone */
function sampleAt(c, x, Q) {
	const n = c.n;
	let i, u, j;
	if (c.kind === 'once' || c.kind === 'pose') {
		x = clamp(x, 0, n - 1);
		i = Math.min(n - 1, Math.floor(x));
		j = Math.min(n - 1, i + 1);
		u = x - i;
	} else {
		x = frac(x / n) * n;
		i = Math.floor(x) % n;
		j = (i + 1) % n;
		u = x - Math.floor(x);
	}
	const list = Q ? c.list : [];
	for (let k = 0; k < list.length; k += 2) {
		const b = list[k] * 4, T = list[k + 1];
		Q[b] = T[i * 4];
		Q[b + 1] = T[i * 4 + 1];
		Q[b + 2] = T[i * 4 + 2];
		Q[b + 3] = T[i * 4 + 3];
		tmpQ[0] = T[j * 4];
		tmpQ[1] = T[j * 4 + 1];
		tmpQ[2] = T[j * 4 + 2];
		tmpQ[3] = T[j * 4 + 3];
		slerpAt(Q, list[k], tmpQ, 0, u);
	}
	const H = c.hips;
	return [H[i * 3] + (H[j * 3] - H[i * 3]) * u, H[i * 3 + 1] + (H[j * 3 + 1] - H[i * 3 + 1]) * u, H[i * 3 + 2] + (H[j * 3 + 2] - H[i * 3 + 2]) * u];
}
const tmpQ = new Float64Array(4);
/** bone b's four numbers of B into bone a's of A */
function copy4(A, a, B, b) {
	(a *= 4), (b *= 4);
	A[a] = B[b];
	A[a + 1] = B[b + 1];
	A[a + 2] = B[b + 2];
	A[a + 3] = B[b + 3];
}

/**
 * The cast's moves. `build`: the person (the piece "Person body"'s `person`), `gait`: its walk, run, idle, start and
 * stop (data), `actions`: the everyday actions (data), `gears`: the speeds its walk and run are played at (m/s),
 * `strides`: its own stride (m, two steps) walking and running, `width`: how much further out each foot is set walking and
 * running than the capture sets it (m, at 1.80 m: a wider step), `ground`: { slope, step } under it, for checking it on a slope or up stairs.
 */
function moves(build, { gait, actions, gears = { walk: 1.4, run: 3 }, strides = { walk: 1.5, run: 2.3 }, width = 0, ground = {} }) {
	const M = build.measure, s = M.s;
	const bones = M.bones;
	const by = Object.fromEntries(bones.map((b) => [b.name, b]));
	const names = bones.map((b) => b.name);
	const sk = IK.skeleton(bones);
	const C = {};
	for (const [k, c] of Object.entries(gait)) C[k] = decode(c, s);
	for (const [k, c] of Object.entries(actions)) C[k] = decode(c, s);
	const index = Object.fromEntries(names.map((n, i) => [n, i]));
	const NB = names.length;
	for (const c of Object.values(C)) {
		c.list = [];
		for (const [bone, T] of Object.entries(c.turns)) if (bone in index) c.list.push(index[bone], T);
	}
	const hands = {};
	sample(C.hands, 0, hands, new Vector3());
	for (const n of Object.keys(hands)) if (!/(Thumb|Index|Middle|Ring|Little)/.test(n)) delete hands[n];
	const slope = Math.tan(((ground.slope ?? 0) * Math.PI) / 180);
	const rise = ground.step ?? 0;

	// ---- reckoning: world turns and places of a pose given as quaternions, for the feet ----
	const order = names;
	/** world quaternions and places of every bone from local quaternions `q` and the hips' place `h` (model space) */
	function world(q, h, out = { Q: {}, P: {} }) {
		for (const n of order) {
			const b = by[n];
			const lq = q[n] ?? I;
			const Q = (out.Q[n] ??= new Quaternion()), P = (out.P[n] ??= new Vector3());
			if (!b.parent) {
				Q.copy(lq);
				P.set(b.at[0] + h.x, b.at[1] + h.y, b.at[2] + h.z);
			} else {
				const pb = by[b.parent];
				P.set(b.at[0] - pb.at[0], b.at[1] - pb.at[1], b.at[2] - pb.at[2]).applyQuaternion(out.Q[b.parent]).add(out.P[b.parent]);
				Q.copy(out.Q[b.parent]).multiply(lq);
			}
		}
		return out;
	}
	const I = new Quaternion();
	const ankleRest = by.leftFoot.at[1];

	// ---- each clip's feet, frame by frame: where each ankle is and how each foot is turned in the world, and
	//      whether it is on the ground; a cycle's grounded feet put back on its own stride ----
	/** the heel's and each ball's place from the ankle, the foot at rest */
	const soleOf = { heel: new Vector3(0, -by.leftFoot.at[1], -0.065 * s) };
	for (const side of SIDES) soleOf[`${side}Ball`] = new Vector3(by[`${side}Toes`].at[0] - by[`${side}Foot`].at[0], by[`${side}Toes`].at[1] - by[`${side}Foot`].at[1] - 0.022 * s, by[`${side}Toes`].at[2] - by[`${side}Foot`].at[2]);
	const feet = {};
	for (const [key, c] of Object.entries(C)) {
		if (key === 'hands') continue;
		const F = { left: [], right: [] };
		const q = {}, h = new Vector3();
		for (let i = 0; i < c.n; i++) {
			sample(c, i, q, h);
			const w = world(q, h);
			for (const side of SIDES) F[side].push({ p: w.P[`${side}Foot`].clone(), Q: w.Q[`${side}Foot`].clone() });
		}
		for (const side of SIDES) {
			const L = F[side];
			const lo = Math.min(...L.map((f) => f.p.y));
			// on the ground: within 2.5 cm of its lowest and slow (a cycle's march taken out: moving back at its pace)
			const back = c.kind === 'cycle' ? (c.stride * s) / c.n : 0;
			L.forEach((f, i) => {
				const nx = L[(i + 1) % L.length].p, pv = L[(i - 1 + L.length) % L.length].p;
				const v = Math.hypot(nx.x - pv.x, nx.z + back * 2 - pv.z) / 2;
				f.down = f.p.y < lo + 0.025 * s && (c.kind === 'cycle' || v < 0.012 * s || i === 0 || i === L.length - 1);
			});
			// a stride's foot is down from the moment its sole first touches (its heel, landing) to when it last does
			// (its ball, pushing off): within 1.5 cm of the lowest its sole comes
			if (c.kind === 'cycle') {
				const low = (f) => Math.min(f.p.y + soleOf.heel.clone().applyQuaternion(f.Q).y, f.p.y + soleOf[`${side}Ball`].clone().applyQuaternion(f.Q).y);
				const floor = Math.min(...L.map(low));
				L.forEach((f) => (f.down = low(f) < floor + 0.015 * s));
			}
		}
		feet[key] = F;
	}

	/** where each sole's heel and ball are from its ankle, the foot at rest (model space) */
	const sole = { heel: new Vector3(0, -by.leftFoot.at[1], -0.065 * s) };
	for (const side of SIDES) {
		const f = by[`${side}Foot`].at, t = by[`${side}Toes`].at;
		sole[`${side}Ball`] = new Vector3(t[0] - f[0], t[1] - f[1] - 0.022 * s, t[2] - f[2]);
	}

	/**
	 * A cycle's foot track at its own stride: for each side, at each frame, the ankle's place in the body's frame
	 * (planted feet moving back exactly as the body moves on: `stride` m a cycle), whether down, and the phases where
	 * it lands and lifts.
	 */
	function track(key, stride) {
		const c = C[key], F = feet[key], n = c.n, out = {};
		const k = stride / (c.stride * s);
		for (const side of SIDES) {
			const L = F[side];
			// the stance: the longest run of frames down, round the loop
			let best = [0, 0];
			for (let a = 0; a < n; a++) {
				if (!L[a].down || L[(a - 1 + n) % n].down) continue;
				let b = a;
				while (L[(b + 1) % n].down && b - a < n - 1) b++;
				if (b - a > best[1] - best[0]) best = [a, b];
			}
			const [a, b] = best; // lands at a, lifts after b (b may pass n)
			const len = b - a + 1;
			const mid = a + (len - 1) / 2;
			let zc = 0, xc = 0;
			for (let i = a; i <= b; i++) (zc += L[i % n].p.z + ((i - mid) * stride) / n), (xc += L[i % n].p.x);
			zc /= len;
			// set `width` further out to its own side than the capture puts it (a wider step), swing and all
			xc = xc / len + (side === 'left' ? 1 : -1) * width * s;
			const P = [];
			// on the ground first: it rolls on what touches, the heel while it is lower than the ball, then the ball;
			// both rest where the foot lies flat at the middle of its time down, the body moving on over them
			const Qm = L[Math.round(mid) % n].Q;
			for (let r = 0; r < len; r++) {
				const i = (a + r) % n, Qi = L[i].Q;
				const ankle = new Vector3(xc, ankleRest, zc - ((a + r - mid) * stride) / n);
				const heelAt = ankle.clone().add(sole.heel.clone().applyQuaternion(Qm));
				const ballAt = ankle.clone().add(sole[`${side}Ball`].clone().applyQuaternion(Qm));
				const hi = sole.heel.clone().applyQuaternion(Qi), bi = sole[`${side}Ball`].clone().applyQuaternion(Qi);
				const at = heelAt.sub(hi).lerp(ballAt.sub(bi), smooth(-0.008 * s, 0.008 * s, hi.y - bi.y));
				P[i] = { z: at.z, x: at.x, y: at.y, down: 1, Q: Qi };
			}
			// in the air: the capture's swing, stretched to this stride, joined to where it lifted and where it lands
			// (a stride on, ahead in the body's frame)
			const lift = P[(a + len - 1) % n], land = P[a];
			const dLift = L[(a + len - 1) % n].p, dLand = L[a].p;
			for (let r = len; r < n; r++) {
				const i = (a + r) % n;
				const u = (r - len + 1) / (n - len + 1);
				const d = L[i].p;
				const zs = dLift.z + (d.z - dLift.z) * k, zEnd = dLift.z + (dLand.z - dLift.z) * k;
				const z0 = lift.z, z1 = land.z;
				// eased, so the foot leaves and meets the ground at the capture's own pace, not with a jolt
				const e = smooth(0, 1, u);
				const corrZ = (z0 - dLift.z) * (1 - e) + (z1 - zEnd) * e;
				const corrY = (lift.y - dLift.y) * (1 - e) + (land.y - dLand.y) * e;
				const corrX = (lift.x - dLift.x) * (1 - e) + (land.x - dLand.x) * e;
				P[i] = { z: zs + corrZ, x: d.x + corrX, y: d.y + corrY, down: 0, Q: L[i].Q, u };
			}
			// the heel coming down: within 3 cm of the ground it is drawn to where it will rest once it lands (its place
			// at the landing, the body still coming on to it), so it lands still, not skidding
			const heelLand = sole.heel.clone().applyQuaternion(land.Q).add(new Vector3(land.x, land.y, land.z));
			for (let r = n - 1; r >= len; r--) {
				const i = (a + r) % n, A = P[i];
				const heel = sole.heel.clone().applyQuaternion(A.Q).add(new Vector3(A.x, A.y, A.z));
				const w = smooth(0.03 * s, 0.005 * s, heel.y);
				if (w <= 0) break;
				const ahead = ((n - r) * stride) / n;
				A.x += (heelLand.x - heel.x) * w;
				A.z += (heelLand.z + ahead - heel.z) * w;
			}
			out[side] = { P, land: a / n, lift: ((b + 1) % n) / n, stance: len / n };
		}
		return out;
	}
	const tracks = {};
	for (const g of ['walk', 'run']) tracks[g] = track(g, strides[g] * s);

	/** the ground's height at a place in the world (the person walks towards +z from z 0): a slope, or stairs of one
	 *  step a stride's half, each tread centred under where a foot comes down flat (the left foot's first, past z 0) */
	const going = (strides.walk * s) / 2;
	const LT = tracks.walk.left, Lw = strides.walk * s;
	const flat = LT.P[Math.round(frac(LT.land + LT.stance / 2) * C.walk.n) % C.walk.n];
	const origin = frac(LT.land + LT.stance / 2) * Lw + flat.z + 0.07 * s + Lw;
	const heightAt = (z) => slope * z + (rise ? rise * Math.max(0, Math.round((z - origin) / going) + 1) : 0);
	/** the hips' ground: stairs smoothed into their slope */
	const hipsGround = (z) => slope * z + (rise ? (rise * Math.max(0, z - origin + going * 1.5)) / going : 0);
	const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.atan(slope));

	// ---- one pose as the rig takes it ----
	/** a turn as x, y, z angles (XYZ): three's Euler.setFromQuaternion by the same sums, without its matrix */
	const euler = (q) => eulerOf(q._x, q._y, q._z, q._w);
	const eulerOf = (x, y, z, w) => {
		const x2 = x + x, y2 = y + y, z2 = z + z;
		const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2;
		const wx = w * x2, wy = w * y2, wz = w * z2;
		const m11 = 1 - (yy + zz), m12 = xy - wz, m13 = xz + wy, m22 = 1 - (xx + zz), m23 = yz - wx, m32 = yz + wx, m33 = 1 - (xx + yy);
		const ey = Math.asin(clamp(m13, -1, 1));
		return Math.abs(m13) < 0.9999999 ? [Math.atan2(-m23, m33), ey, Math.atan2(-m12, m11)] : [Math.atan2(m32, m22), ey, 0];
	};
	function out(q, h, legs, flatFeet) {
		// q: each bone's turn by its name, or (a move's) as numbers by its index in `names` ({ Q, has })
		const N = q.Q, has = q.has;
		const pose = {};
		for (let i = 0; i < names.length; i++) {
			const n = names[i];
			if (n === 'hips') continue;
			if (N) {
				if (has[i]) pose[n] = eulerOf(N[i * 4], N[i * 4 + 1], N[i * 4 + 2], N[i * 4 + 3]);
				continue;
			}
			const x = q[n];
			if (x) pose[n] = euler(x);
		}
		const hb = index.hips;
		pose.hips = N ? (has[hb] ? eulerOf(N[hb * 4], N[hb * 4 + 1], N[hb * 4 + 2], N[hb * 4 + 3]) : euler(I)) : euler(q.hips ?? I);
		pose.root = [h.x, h.y, h.z];
		if (legs) place(pose, legs, flatFeet);
		return pose;
	}

	/** each leg bent by reach so its ankle is at its target, and its foot turned as the world turn asks; the hips
	 *  lowered first as far as the farther leg needs */
	const tv = new Vector3(), m4 = new Matrix4(), qw = new Quaternion(), vHeel = new Vector3(), vBall = new Vector3();
	function place(pose, legs) {
		// each sole on the ground: a foot down set on the lowest of its heel and its ball, no foot ever through it
		for (const side of SIDES) {
			const L = legs[side];
			const heel = vHeel.copy(sole.heel).applyQuaternion(L.Q).add(L.p), ball = vBall.copy(sole[`${side}Ball`]).applyQuaternion(L.Q).add(L.p);
			const g = L.ground ?? ((z) => heightAt(z));
			const low = Math.min(heel.y - g(heel.z), ball.y - g(ball.z));
			const down = L.down ?? 0;
			if (low < 0) L.p.y -= low;
			else if (down > 0) L.p.y -= low * down;
			// a foot carried clears the ground by 2 cm at least (a toe's clearance), never scuffing it
			const clear = 0.02 * s;
			if (down < 0.5 && L.swing && low < clear) L.p.y += (clear - Math.max(0, low)) * (1 - 2 * down);
		}
		let drop = 0;
		for (const side of SIDES) {
			const hip = sk.joint(pose, `${side}UpperLeg`);
			const la = len[side][0], lb = len[side][1];
			const d = hip.distanceTo(legs[side].p);
			// a leg reaches 99.7% of its length at most (a knee bent about 9°, as a person stands): 97.5% bent every
			// standing knee 26°, a half squat (intent b9e6ad45)
			const most = (la + lb) * 0.997;
			if (d > most) {
				const dy = legs[side].p.y - hip.y;
				const dxz = Math.hypot(legs[side].p.x - hip.x, legs[side].p.z - hip.z);
				const need = -dy - Math.sqrt(Math.max(0, most * most - dxz * dxz));
				drop = Math.max(drop, need);
			}
		}
		if (drop > 0) pose.root[1] -= drop;
		for (const side of SIDES) {
			const L = legs[side];
			IK.reach(sk, pose, `${side}UpperLeg`, `${side}LowerLeg`, by[`${side}Foot`].at, L.p);
			// the foot's turn in the world, made local under the bent shin
			m4.copy(sk.frame(pose, `${side}LowerLeg`));
			qw.setFromRotationMatrix(m4);
			pose[`${side}Foot`] = euler(qw.invert().multiply(L.Q));
		}
	}
	const len = {};
	for (const side of SIDES) {
		const a = by[`${side}UpperLeg`].at, b = by[`${side}LowerLeg`].at, f = by[`${side}Foot`].at;
		len[side] = [Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), Math.hypot(b[0] - f[0], b[1] - f[1], b[2] - f[2])];
	}

	// ---- the moves ----
	const ha = new Vector3(), hr = new Vector3(), hi = new Vector3(), hg = new Vector3(), qTilt = new Quaternion();
	const handNames = Object.keys(hands);
	// the moves' bones as numbers by index (sampleAt, blendInto), and which bones each clip turns
	const Qi = new Float64Array(NB * 4), Qa = new Float64Array(NB * 4), Qr = new Float64Array(NB * 4);
	const hasOf = (c) => {
		const has = new Uint8Array(NB);
		for (let k = 0; k < c.list.length; k += 2) has[c.list[k]] = 1;
		return has;
	};
	const hasI = hasOf(C.idle), hasA = hasOf(C.walk), hasR = hasOf(C.run), hasQ = new Uint8Array(NB), hasGo = new Uint8Array(NB);
	const handIdx = handNames.filter((n) => n in index).map((n) => index[n]);
	for (const b of handIdx) hasI[b] = 1;
	const handQ = new Float64Array(NB * 4);
	for (const n of handNames) if (n in index) handQ.set([hands[n].x, hands[n].y, hands[n].z, hands[n].w], index[n] * 4);
	/** slerpInto on numbers: every bone B has blended into A by w (one A lacks taken as B's), every bone only A has
	 *  turned towards rest by w */
	const REST = Float64Array.of(0, 0, 0, 1);
	function blendInto(A, hasA_, B, hasB, w) {
		for (let b = 0; b < NB; b++) {
			if (hasB[b]) {
				if (!hasA_[b]) {
					copy4(A, b, B, b);
					slerpAt(A, b, REST, 0, 0);
					hasA_[b] = 1;
				}
				slerpAt(A, b, B, b, w);
			} else if (hasA_[b]) slerpAt(A, b, REST, 0, w);
		}
	}
	/** blendInto at w 1, the turns under it unread: every bone B has is B's, every other bone of A's at rest */
	function takeAll(A, hasA_, B, hasB) {
		for (let b = 0; b < NB; b++) {
			if (hasB[b]) {
				copy4(A, b, B, b);
				hasA_[b] = 1;
			} else if (hasA_[b]) copy4(A, b, REST, 0);
		}
	}
	/** the turns of a move as `out` reads them: four numbers a bone by its index, and which bones have one */
	const qView = { Q: Qi, has: hasQ };
	// what one step of a move reuses, not made anew at every call (the box plays each move some 10,000 times)
	const h = new Vector3(), Pw = new Vector3(), Qw = new Quaternion();
	const legsOut = { left: { p: new Vector3(), Q: new Quaternion() }, right: { p: new Vector3(), Q: new Quaternion() } };
	let distNow = 0;
	const groundNow = (z) => heightAt(distNow + z);
	/** a gait's legs at a phase: each ankle (model space, before the ground) and the foot's world turn, and the
	 *  phases it landed and lifts, for the ground under it */
	const legsPool = {};
	function legsOf(g, phase, pos) {
		const T = tracks[g], c = C[g];
		const out = (legsPool[g] ??= { left: { p: new Vector3(), Q: new Quaternion(), side: 'left' }, right: { p: new Vector3(), Q: new Quaternion(), side: 'right' } });
		for (const side of SIDES) {
			const P = T[side].P, x = phase * c.n, i = Math.floor(x) % c.n, j = (i + 1) % c.n, u = x - Math.floor(x);
			const A = P[i], B = P[j], L = out[side];
			L.p.set(A.x + (B.x - A.x) * u, A.y + (B.y - A.y) * u, A.z + (B.z - A.z) * u);
			L.Q.copy(A.Q).slerp(B.Q, u);
			L.down = A.down * (1 - u) + B.down * u;
			L.T = T[side];
		}
		return out;
	}
	/** the ground under a gait's foot: where it stands, or between where it lifted and where it lands */
	function grounded(L, g, phase, dist) {
		const stride = strides[g] * s;
		const T = L.T;
		if (L.down > 0.5) {
			const z = dist + L.p.z;
			L.p.y += heightAt(z) + (slope ? ankleRest * (1 / Math.cos(Math.atan(slope)) - 1) : 0);
			L.Q.premultiply(tilt);
			return;
		}
		// in the air: carried from the ground where it lifted to the ground where it lands
		const n = C[g].n, P = T.P;
		const since = frac(phase - T.lift), until = frac(T.land - phase), all = since + until || 1;
		const u = since / all;
		const zLift = dist - since * stride + P[(Math.round(T.lift * n) - 1 + n) % n].z;
		const zLand = dist + until * stride + P[Math.round(T.land * n) % n].z;
		const gy = heightAt(zLift) + (heightAt(zLand) - heightAt(zLift)) * smooth(0, 1, u);
		L.p.y += gy + (rise ? rise * 0.6 * Math.sin(Math.PI * u) : 0);
		L.Q.premultiply(qTilt.identity().slerp(tilt, Math.abs(0.5 - u) * 2));
	}
	/** walking or running, blended by speed, by the distance come */
	const move = (gait) => (t, m) => {
		const v = m?.speed ?? gears[gait];
		const dist = m?.dist ?? v * t;
		const wGo = smooth(0.05, 0.6, v), wRun = gait === 'run' ? 1 : 0;
		const pw = frac(dist / (strides.walk * s)), pr = frac(dist / (strides.run * s));
		// each bone's turn as numbers (four a bone, by its index), and which bones each has: the idle and the hands,
		// the walk, the run; the walk blended into the run, then the idle into both (a bone one lacks turns to rest)
		// A clip blended in all the way (w 1) leaves of the one under it only its bones' places at rest, and turns that
		// read the same (±q, the same angles): those turns are not sampled, only its hips
		const Hi = sampleAt(C.idle, t * C.idle.fps, wGo === 1 ? null : Qi);
		const Ha = sampleAt(C.walk, pw * C.walk.n, wRun === 1 ? null : Qa), Hr = sampleAt(C.run, pr * C.run.n, Qr);
		hasGo.set(hasA);
		if (wRun === 1) takeAll(Qa, hasGo, Qr, hasR);
		else if (wRun > 0) blendInto(Qa, hasGo, Qr, hasR, wRun);
		hasQ.set(hasI);
		if (wGo === 1) takeAll(Qi, hasQ, Qa, hasGo);
		else {
			for (const b of handIdx) copy4(Qi, b, handQ, b);
			if (wGo > 0) blendInto(Qi, hasQ, Qa, hasGo, wGo);
		}
		for (const b of handIdx) copy4(Qi, b, handQ, b);
		const q = qView;
		hi.set(Hi[0], Hi[1], Hi[2]);
		ha.set(Ha[0], Ha[1], Ha[2]);
		hr.set(Hr[0], Hr[1], Hr[2]);
		h.copy(hi).lerp(hg.copy(ha).lerp(hr, wRun), wGo);
		h.y += hipsGround(dist);
		// the legs: standing feet as the idle has them, stepping feet as the stride puts them
		const legs = legsOut;
		distNow = dist;
		const lw = legsOf('walk', pw), lr = legsOf('run', pr);
		const fi = feet.idle;
		const ii = Math.floor(frac((t * C.idle.fps) / C.idle.n) * C.idle.n);
		for (const side of SIDES) {
			grounded(lw[side], 'walk', pw, dist);
			grounded(lr[side], 'run', pr, dist);
			const p = Pw.copy(lw[side].p).lerp(lr[side].p, wRun);
			const Q = Qw.copy(lw[side].Q).slerp(lr[side].Q, wRun);
			const L = legs[side];
			const ip = L.p.copy(fi[side][ii].p);
			ip.y += heightAt(dist + ip.z);
			const iQ = L.Q.copy(fi[side][ii].Q).premultiply(tilt);
			L.down = (fi[side][ii].down ? 1 : 0) * (1 - wGo) + (lw[side].down * (1 - wRun) + lr[side].down * wRun) * wGo;
			ip.lerp(p, wGo);
			iQ.slerp(Q, wGo);
			L.swing = wGo > 0.5;
			L.ground = groundNow;
		}
		return out(q, h, legs);
	};
	const timedQ = {}, timedH = {};
	/** a clip in time, its feet held where it has them */
	const timed = (key, { loop = false } = {}) => (t) => {
		const c = C[key];
		const x = loop ? t * c.fps : clamp(t * c.fps, 0, c.n - 1);
		const q = (timedQ[key] ??= {}), h = (timedH[key] ??= new Vector3());
		sample(c, x, q, h);
		if (!Object.keys(c.turns).some((n) => /Index|Thumb/.test(n))) for (const n of handNames) q[n] = (q[n] ??= new Quaternion()).copy(hands[n]);
		h.y += hipsGround(0);
		const F = feet[key];
		const i = loop ? Math.floor(frac(x / c.n) * c.n) : Math.min(c.n - 1, Math.floor(x));
		const j = loop ? (i + 1) % c.n : Math.min(c.n - 1, i + 1), u = x - Math.floor(x);
		const legs = {};
		for (const side of SIDES) {
			const A = F[side][i], B = F[side][j];
			const p = A.p.clone().lerp(B.p, u);
			// held: a foot down keeps the place it was put down at (the middle of its time down)
			const held = heldAt(F[side], i, loop);
			if (held && A.down) p.set(held.x, ankleRest, held.z);
			p.y += heightAt(p.z);
			legs[side] = { p, Q: A.Q.clone().slerp(B.Q, u).premultiply(tilt), down: A.down ? 1 : 0 };
		}
		return out(q, h, legs);
	};
	/** where a foot down at frame i is held: the middle of its run of frames down */
	const heldCache = new Map();
	function heldAt(L, i, loop) {
		if (!heldCache.has(L)) {
			const n = L.length, at = new Array(n).fill(null);
			for (let a = 0; a < n; a++) {
				if (!L[a].down || at[a]) continue;
				let b = a;
				while (b + 1 < n && L[b + 1].down) b++;
				let x = 0, z = 0;
				for (let k = a; k <= b; k++) (x += L[k].p.x), (z += L[k].p.z);
				const p = new Vector3(x / (b - a + 1), 0, z / (b - a + 1));
				for (let k = a; k <= b; k++) at[k] = p;
			}
			heldCache.set(L, at);
		}
		return heldCache.get(L)[i];
	}
	/** a quarter turn on the spot: the body from the idle turned round by its hips, each foot stepped round by reach */
	const quarter = (way) => (t) => {
		const T = 1.6, u = clamp(t / T, 0, 1);
		const yaw = way * (Math.PI / 2) * smooth(0.1, 0.9, u);
		const c = C.idle;
		const q = {}, h = new Vector3();
		sample(c, t * c.fps, q, h);
		for (const n of Object.keys(hands)) q[n] = hands[n].clone();
		const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
		q.hips = turn.clone().multiply(q.hips ?? I);
		h.applyAxisAngle(new Vector3(0, 1, 0), yaw);
		const legs = {};
		const inner = way > 0 ? 'left' : 'right';
		for (const side of SIDES) {
			// its steps: the inner foot first, then the other, each lifted 6 cm on the way
			const [a, b] = side === inner ? [0.12, 0.55] : [0.45, 0.88];
			const k = smooth(a, b, u);
			const rest = by[`${side}Foot`].at;
			const from = new Vector3(rest[0], ankleRest, rest[2] + 0.02 * s);
			const to = from.clone().applyAxisAngle(new Vector3(0, 1, 0), way * (Math.PI / 2));
			const p = from.clone().lerp(to, k);
			// carried round on an arc, not across
			p.applyAxisAngle(new Vector3(0, 1, 0), 0).setLength(from.length());
			p.y = ankleRest + 0.06 * s * Math.sin(Math.PI * clamp((u - a) / (b - a), 0, 1));
			const Q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), way * (Math.PI / 2) * k);
			legs[side] = { p, Q, down: u <= a || u >= b ? 1 : 0 };
		}
		return out(q, h, legs);
	};
	const clips = {
		idle: timed('idle', { loop: true }),
		walk: move('walk'),
		run: move('run'),
		start: timed('start'),
		stop: timed('stop'),
		'turn left': quarter(1),
		'turn right': quarter(-1),
		'sit down': timed('sit down'),
		sitting: timed('sitting', { loop: true }),
		'stand up': timed('stand up'),
		wave: timed('wave'),
		'pick up': timed('pick up')
	};
	/** how long each clip played once lasts (s) */
	const lengths = Object.fromEntries(['start', 'stop', 'sit down', 'stand up', 'wave', 'pick up'].map((k) => [k, (C[k].n - 1) / C[k].fps]));
	lengths['turn left'] = lengths['turn right'] = 1.6;
	return { clips, gears: { walk: gears.walk, run: gears.run }, lengths, names, stairs: rise ? { origin, going, rise } : null };
}

module.exports = { moves, decode, sample };
